import * as THREE from "three";
import { tuning } from "../tuning";

const MAX = 110;
const SPAN = 38;
const FULL_SPEED = 0.92;

export interface StarField {
  update: (
    x: number,
    z: number,
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
  for (let i = 0; i < MAX; i++) {
    lives[i] = 1;
    ages[i] = 99;
    positions[i * 3 + 1] = 0.12;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geo.setAttribute("aAge", new THREE.BufferAttribute(ages, 1));
  geo.setAttribute("aLife", new THREE.BufferAttribute(lives, 1));
  geo.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));

  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthTest: false,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: { uColor: { value: new THREE.Color(0xb8d4ff) } },
    vertexShader: /* glsl */ `
      attribute float aAge;
      attribute float aLife;
      attribute float aSize;
      varying float vFade;
      void main() {
        float t = clamp(aAge / max(aLife, 0.001), 0.0, 1.0);
        vFade = smoothstep(0.0, 0.18, t) * (1.0 - smoothstep(0.55, 1.0, t));
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = aSize * (0.15 + vFade);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      varying float vFade;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        float a = vFade * smoothstep(0.48, 0.12, d) * 0.45;
        if (a < 0.01) discard;
        gl_FragColor = vec4(uColor, a);
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

  const liveCount = () => {
    let n = 0;
    for (let i = 0; i < MAX; i++) if (ages[i]! < lives[i]!) n += 1;
    return n;
  };

  const capFor = (radius: number) => {
    const far = Math.min(1, radius / tuning.sanctuaryRadius);
    return Math.floor(10 + far * 90);
  };

  const spawn = (cx: number, cz: number, n: number, cap: number) => {
    let left = Math.min(n, Math.max(0, cap - liveCount()));
    if (left <= 0) return;
    for (let k = 0; k < left; k++) {
      const i = cursor++ % MAX;
      const ang = Math.random() * Math.PI * 2;
      const r = 6 + Math.random() * SPAN;
      positions[i * 3] = cx + Math.cos(ang) * r;
      positions[i * 3 + 1] = 0.08 + Math.random() * 0.25;
      positions[i * 3 + 2] = cz + Math.sin(ang) * r;
      ages[i] = 0;
      lives[i] = 1.1 + Math.random() * 1.8;
      sizes[i] = 3.6 + Math.random() * 3.2;
    }
    geo.attributes.position!.needsUpdate = true;
    geo.attributes.aLife!.needsUpdate = true;
    geo.attributes.aSize!.needsUpdate = true;
  };

  return {
    setBand(color) {
      (mat.uniforms.uColor!.value as THREE.Color).copy(color).lerp(white, 0.55);
    },
    update(x, z, radius, speed01, kick, snare, hat, dt) {
      const atMax = speed01 >= FULL_SPEED;
      const cap = capFor(radius);
      const burst = 2 + Math.floor(Math.min(1, radius / tuning.sanctuaryRadius) * 4);

      if (atMax) {
        if (kick > 0.75 && lastKick < 0.35) spawn(x, z, burst, cap);
        if (snare > 0.75 && lastSnare < 0.35) spawn(x, z, Math.max(1, burst - 1), cap);
        if (hat > 0.75 && lastHat < 0.35 && Math.random() < 0.65) spawn(x, z, 1, cap);
        drip += dt;
        if (drip > 0.4) {
          drip = 0;
          spawn(x, z, burst, cap);
        }
      }
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
