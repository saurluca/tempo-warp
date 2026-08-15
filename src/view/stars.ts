import * as THREE from "three";
import { tuning } from "../tuning";
import { cometTailBehind } from "./playerBlob";

const AMBIENT = 200;
const TRAIL = 420;
const MAX = AMBIENT + TRAIL;
const FULL_SPEED = 0.96;
const TRAIL_STEP = 0.28;
const TRAIL_HALF = 0.14;

export interface StarField {
  update: (
    cx: number,
    cz: number,
    halfW: number,
    halfH: number,
    px: number,
    pz: number,
    vx: number,
    vz: number,
    radius: number,
    speed01: number,
    kick: number,
    snare: number,
    hat: number,
    dt: number,
  ) => void;
  setBand: (color: THREE.Color) => void;
  dispose: () => void;
}

export function createStars(scene: THREE.Scene): StarField {
  const positions = new Float32Array(MAX * 3);
  const ages = new Float32Array(MAX);
  const lives = new Float32Array(MAX);
  const sizes = new Float32Array(MAX);
  const kinds = new Float32Array(MAX);
  for (let i = 0; i < MAX; i++) {
    lives[i] = 1;
    ages[i] = 99;
    positions[i * 3 + 1] = 0.12;
    kinds[i] = i >= AMBIENT ? 1 : 0;
    if (i >= AMBIENT) sizes[i] = 0;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geo.setAttribute("aAge", new THREE.BufferAttribute(ages, 1));
  geo.setAttribute("aLife", new THREE.BufferAttribute(lives, 1));
  geo.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
  geo.setAttribute("aKind", new THREE.BufferAttribute(kinds, 1));

  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthTest: false,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uColor: { value: new THREE.Color(0xb8d4ff) },
      uTrail: { value: new THREE.Color(0xffc56a) },
    },
    vertexShader: /* glsl */ `
      attribute float aAge;
      attribute float aLife;
      attribute float aSize;
      attribute float aKind;
      varying float vFade;
      varying float vKind;
      void main() {
        float t = clamp(aAge / max(aLife, 0.001), 0.0, 1.0);
        float ambient = 1.0 - smoothstep(0.5, 1.0, t);
        vFade = mix(ambient, 1.0 - t, aKind);
        vKind = aKind;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = aSize * (0.15 + vFade);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform vec3 uTrail;
      varying float vFade;
      varying float vKind;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        float core = mix(0.22, 0.28, vKind);
        float a = vFade * smoothstep(core, core * 0.35, d) * mix(0.7, 0.75, vKind);
        if (a < 0.01) discard;
        gl_FragColor = vec4(mix(uColor, uTrail, vKind), a);
      }
    `,
  });

  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  points.renderOrder = 1;
  scene.add(points);

  const ribPos = new Float32Array(TRAIL * 2 * 3);
  const ribCol = new Float32Array(TRAIL * 2 * 4);
  const ribGeo = new THREE.BufferGeometry();
  ribGeo.setAttribute("position", new THREE.BufferAttribute(ribPos, 3));
  ribGeo.setAttribute("aColor", new THREE.BufferAttribute(ribCol, 4));
  const ribIdx = new Uint16Array((TRAIL - 1) * 6);
  let iw = 0;
  for (let s = 0; s < TRAIL - 1; s++) {
    const a = s * 2;
    ribIdx[iw++] = a;
    ribIdx[iw++] = a + 1;
    ribIdx[iw++] = a + 2;
    ribIdx[iw++] = a + 1;
    ribIdx[iw++] = a + 3;
    ribIdx[iw++] = a + 2;
  }
  ribGeo.setIndex(new THREE.BufferAttribute(ribIdx, 1));
  const ribMat = new THREE.ShaderMaterial({
    transparent: true,
    depthTest: false,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    vertexShader: /* glsl */ `
      attribute vec4 aColor;
      varying vec4 vColor;
      void main() {
        vColor = aColor;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      varying vec4 vColor;
      void main() {
        if (vColor.a < 0.01) discard;
        gl_FragColor = vColor;
      }
    `,
  });
  const ribbon = new THREE.Mesh(ribGeo, ribMat);
  ribbon.frustumCulled = false;
  ribbon.renderOrder = 2;
  scene.add(ribbon);
  const white = new THREE.Color(0xffffff);

  let lastKick = 0;
  let lastSnare = 0;
  let lastHat = 0;
  let drip = 0;
  let cursor = 0;
  let trailCursor = 0;
  let trailCount = 0;
  let trailAcc = 0;
  let lastPx = 0;
  let lastPz = 0;
  let haveTrail = false;
  let wasMax = false;

  const liveCount = () => {
    let n = 0;
    for (let i = 0; i < AMBIENT; i++) if (ages[i]! < lives[i]!) n += 1;
    return n;
  };

  const capFor = (radius: number) => {
    const far = Math.min(1, radius / tuning.sanctuaryRadius);
    return Math.floor(22 + far * 160);
  };

  const spawn = (
    cx: number,
    cz: number,
    halfW: number,
    halfH: number,
    hx: number,
    hz: number,
    n: number,
    cap: number,
  ) => {
    let left = Math.min(n, Math.max(0, cap - liveCount()));
    if (left <= 0) return;
    for (let k = 0; k < left; k++) {
      const i = cursor++ % AMBIENT;
      let ox = (Math.random() * 2 - 1) * halfW;
      let oz = (Math.random() * 2 - 1) * halfH;
      if (hx !== 0 || hz !== 0) {
        const along = ox * hx + oz * hz;
        if (along < 0) {
          ox -= hx * along * 2;
          oz -= hz * along * 2;
        }
        const view = Math.max(halfW, halfH);
        const lead = 0.2 + Math.random() * 0.7;
        ox += hx * view * lead;
        oz += hz * view * lead;
      }
      positions[i * 3] = cx + ox;
      positions[i * 3 + 1] = 0.08 + Math.random() * 0.25;
      positions[i * 3 + 2] = cz + oz;
      ages[i] = 0;
      lives[i] = 1.4 + Math.random() * 2.0;
      sizes[i] = 7.2 + Math.random() * 5.4;
    }
    geo.attributes.position!.needsUpdate = true;
    geo.attributes.aLife!.needsUpdate = true;
    geo.attributes.aSize!.needsUpdate = true;
  };

  const resetTrail = () => {
    trailCursor = 0;
    trailCount = 0;
    trailAcc = 0;
    haveTrail = false;
    for (let i = AMBIENT; i < MAX; i++) {
      ages[i] = 99;
      lives[i] = 1;
    }
  };

  const dropTrail = (px: number, pz: number, hx: number, hz: number, speed01: number) => {
    const i = AMBIENT + (trailCursor++ % TRAIL);
    const back = cometTailBehind(speed01);
    positions[i * 3] = px - hx * back;
    positions[i * 3 + 1] = 0.12;
    positions[i * 3 + 2] = pz - hz * back;
    ages[i] = 0;
    lives[i] = 3.6;
    sizes[i] = 0;
    trailCount = Math.min(TRAIL, trailCount + 1);
  };

  const stitchRibbon = () => {
    let px = 0;
    let pz = 0;
    let have = false;
    const n = Math.min(trailCount, TRAIL);
    for (let s = 0; s < TRAIL; s++) {
      const v = s * 2;
      if (s >= n) {
        ribCol[v * 4 + 3] = 0;
        ribCol[(v + 1) * 4 + 3] = 0;
        continue;
      }
      const i = AMBIENT + ((trailCursor - 1 - s + TRAIL * 8) % TRAIL);
      const fade = Math.max(0, 1 - ages[i]! / Math.max(lives[i]!, 0.001));
      const x = positions[i * 3]!;
      const z = positions[i * 3 + 2]!;
      let sx = 0;
      let sz = 0;
      if (have) {
        const dx = px - x;
        const dz = pz - z;
        const len = Math.hypot(dx, dz);
        if (len > 0.001 && len < 5) {
          const w = TRAIL_HALF * fade;
          sx = (-dz / len) * w;
          sz = (dx / len) * w;
        }
      }
      px = x;
      pz = z;
      have = fade > 0.01;
      ribPos[v * 3] = x - sx;
      ribPos[v * 3 + 1] = 0.12;
      ribPos[v * 3 + 2] = z - sz;
      ribPos[(v + 1) * 3] = x + sx;
      ribPos[(v + 1) * 3 + 1] = 0.12;
      ribPos[(v + 1) * 3 + 2] = z + sz;
      const a = fade * fade * 0.28;
      for (let k = 0; k < 2; k++) {
        const o = (v + k) * 4;
        ribCol[o] = 1;
        ribCol[o + 1] = 0.77;
        ribCol[o + 2] = 0.42;
        ribCol[o + 3] = a;
      }
    }
    ribGeo.attributes.position!.needsUpdate = true;
    ribGeo.attributes.aColor!.needsUpdate = true;
  };

  return {
    setBand(color) {
      (mat.uniforms.uColor!.value as THREE.Color).copy(color).lerp(white, 0.55);
    },
    update(cx, cz, halfW, halfH, px, pz, vx, vz, radius, speed01, kick, snare, hat, dt) {
      const atMax = speed01 >= FULL_SPEED;
      const cap = capFor(radius);
      const burst = 4 + Math.floor(Math.min(1, radius / tuning.sanctuaryRadius) * 6);
      const spd = Math.hypot(vx, vz);
      const hx = spd > 0.05 ? vx / spd : 0;
      const hz = spd > 0.05 ? vz / spd : 0;

      if (atMax && !wasMax) {
        resetTrail();
        lastPx = px;
        lastPz = pz;
      }
      wasMax = atMax;

      if (atMax) {
        if (kick > 0.75 && lastKick < 0.35) spawn(cx, cz, halfW, halfH, hx, hz, burst, cap);
        if (snare > 0.75 && lastSnare < 0.35) spawn(cx, cz, halfW, halfH, hx, hz, Math.max(2, burst - 1), cap);
        if (hat > 0.75 && lastHat < 0.35 && Math.random() < 0.7) spawn(cx, cz, halfW, halfH, hx, hz, 2, cap);
        drip += dt;
        if (drip > 0.22) {
          drip = 0;
          spawn(cx, cz, halfW, halfH, hx, hz, burst, cap);
        }
        const dist = haveTrail ? Math.hypot(px - lastPx, pz - lastPz) : 0;
        trailAcc += dist;
        let drops = 0;
        while (trailAcc >= TRAIL_STEP && drops < 3 && (hx !== 0 || hz !== 0)) {
          trailAcc -= TRAIL_STEP;
          drops += 1;
          const t = dist > 1e-5 ? 1 - trailAcc / dist : 1;
          dropTrail(lastPx + (px - lastPx) * t, lastPz + (pz - lastPz) * t, hx, hz, speed01);
        }
        if (hx !== 0 || hz !== 0) {
          if (trailCursor === 0) dropTrail(px, pz, hx, hz, speed01);
          else {
            const i = AMBIENT + ((trailCursor - 1 + TRAIL) % TRAIL);
            const back = cometTailBehind(speed01);
            positions[i * 3] = px - hx * back;
            positions[i * 3 + 1] = 0.12;
            positions[i * 3 + 2] = pz - hz * back;
            ages[i] = 0;
          }
        }
      }
      lastPx = px;
      lastPz = pz;
      haveTrail = true;
      lastKick = kick;
      lastSnare = snare;
      lastHat = hat;

      for (let i = 0; i < MAX; i++) ages[i]! += dt;
      geo.attributes.aAge!.needsUpdate = true;
      stitchRibbon();
    },
    dispose() {
      scene.remove(points);
      scene.remove(ribbon);
      geo.dispose();
      mat.dispose();
      ribGeo.dispose();
      ribMat.dispose();
    },
  };
}
