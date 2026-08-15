import * as THREE from "three";
import { tuning } from "../tuning";

const AMBIENT = 110;
const TRAIL = 360;
const MAX = AMBIENT + TRAIL;
const FULL_SPEED = 0.92;
const TRAIL_STEP = 0.55;

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
        float ambient = smoothstep(0.0, 0.18, t) * (1.0 - smoothstep(0.55, 1.0, t));
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
        float a = vFade * smoothstep(0.48, 0.12, d) * mix(0.45, 0.7, vKind);
        if (a < 0.01) discard;
        gl_FragColor = vec4(mix(uColor, uTrail, vKind), a);
      }
    `,
  });

  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  points.renderOrder = 1;
  scene.add(points);
  const white = new THREE.Color(0xffffff);

  let lastKick = 0;
  let lastSnare = 0;
  let lastHat = 0;
  let drip = 0;
  let cursor = 0;
  let trailCursor = 0;
  let trailAcc = 0;
  let lastPx = 0;
  let lastPz = 0;
  let haveTrail = false;

  const liveCount = () => {
    let n = 0;
    for (let i = 0; i < AMBIENT; i++) if (ages[i]! < lives[i]!) n += 1;
    return n;
  };

  const capFor = (radius: number) => {
    const far = Math.min(1, radius / tuning.sanctuaryRadius);
    return Math.floor(10 + far * 90);
  };

  const spawn = (cx: number, cz: number, halfW: number, halfH: number, n: number, cap: number) => {
    let left = Math.min(n, Math.max(0, cap - liveCount()));
    if (left <= 0) return;
    for (let k = 0; k < left; k++) {
      const i = cursor++ % AMBIENT;
      positions[i * 3] = cx + (Math.random() * 2 - 1) * halfW;
      positions[i * 3 + 1] = 0.08 + Math.random() * 0.25;
      positions[i * 3 + 2] = cz + (Math.random() * 2 - 1) * halfH;
      ages[i] = 0;
      lives[i] = 1.1 + Math.random() * 1.8;
      sizes[i] = 3.6 + Math.random() * 3.2;
    }
    geo.attributes.position!.needsUpdate = true;
    geo.attributes.aLife!.needsUpdate = true;
    geo.attributes.aSize!.needsUpdate = true;
  };

  const dropTrail = (px: number, pz: number, hx: number, hz: number) => {
    const i = AMBIENT + (trailCursor++ % TRAIL);
    const back = 0.55;
    const side = (Math.random() - 0.5) * 0.22;
    positions[i * 3] = px - hx * back - hz * side;
    positions[i * 3 + 1] = 0.1 + Math.random() * 0.16;
    positions[i * 3 + 2] = pz - hz * back + hx * side;
    ages[i] = 0;
    lives[i] = 4.2 + Math.random() * 2.2;
    sizes[i] = 3.8 + Math.random() * 2.0;
    geo.attributes.position!.needsUpdate = true;
    geo.attributes.aLife!.needsUpdate = true;
    geo.attributes.aSize!.needsUpdate = true;
  };

  return {
    setBand(color) {
      (mat.uniforms.uColor!.value as THREE.Color).copy(color).lerp(white, 0.55);
    },
    update(cx, cz, halfW, halfH, px, pz, vx, vz, radius, speed01, kick, snare, hat, dt) {
      const atMax = speed01 >= FULL_SPEED;
      const cap = capFor(radius);
      const burst = 2 + Math.floor(Math.min(1, radius / tuning.sanctuaryRadius) * 4);

      if (atMax) {
        if (kick > 0.75 && lastKick < 0.35) spawn(cx, cz, halfW, halfH, burst, cap);
        if (snare > 0.75 && lastSnare < 0.35) spawn(cx, cz, halfW, halfH, Math.max(1, burst - 1), cap);
        if (hat > 0.75 && lastHat < 0.35 && Math.random() < 0.65) spawn(cx, cz, halfW, halfH, 1, cap);
        drip += dt;
        if (drip > 0.4) {
          drip = 0;
          spawn(cx, cz, halfW, halfH, burst, cap);
        }
        const spd = Math.hypot(vx, vz);
        const hx = spd > 0.05 ? vx / spd : 0;
        const hz = spd > 0.05 ? vz / spd : 0;
        const dist = haveTrail ? Math.hypot(px - lastPx, pz - lastPz) : TRAIL_STEP;
        trailAcc += dist;
        while (trailAcc >= TRAIL_STEP && (hx !== 0 || hz !== 0)) {
          trailAcc -= TRAIL_STEP;
          const t = dist > 1e-5 ? 1 - trailAcc / dist : 1;
          dropTrail(lastPx + (px - lastPx) * t, lastPz + (pz - lastPz) * t, hx, hz);
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
    },
    dispose() {
      scene.remove(points);
      geo.dispose();
      mat.dispose();
    },
  };
}
