import * as THREE from "three";
import { tuning } from "../tuning";

const PLANE = 800;

const warpShader = {
  vertexShader: /* glsl */ `
    uniform float uWarp;
    uniform float uTime;
    uniform float uKick;
    uniform vec2 uOrigin;
    varying vec2 vWorld;
    varying vec2 vLocal;
    void main() {
      vec3 p = position;
      vLocal = p.xy;
      float w = uWarp + uKick * 0.22;
      float wx = p.x + uOrigin.x;
      float wy = p.y - uOrigin.y;
      vWorld = vec2(wx, wy);
      float beat = uTime * 6.2831853;
      p.z += sin(wx * 0.35 + beat) * w * 0.32;
      p.z += cos(wy * 0.28 - beat * 0.75) * w * 0.22;
      p.y += sin(wx * 0.5 + wy * 0.5 + beat * 1.25) * w * 0.08;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform float uWarp;
    uniform float uTime;
    uniform float uKick;
    uniform float uSnare;
    uniform float uHat;
    uniform vec3 uHush;
    uniform vec3 uBand;
    uniform vec3 uRingR;
    uniform vec3 uRingA;
    varying vec2 vWorld;
    varying vec2 vLocal;
    void main() {
      float beat = uTime * 6.2831853;
      float wash = 0.5 + 0.5 * sin(vWorld.x * 0.035 + beat * 0.25) * sin(vWorld.y * 0.035 - beat * 0.2);
      float pr = length(vLocal);
      float lines = 0.0;
      lines += uRingA.x * (1.0 - smoothstep(0.35, 1.15, abs(pr - uRingR.x)));
      lines += uRingA.y * (1.0 - smoothstep(0.35, 1.15, abs(pr - uRingR.y)));
      lines += uRingA.z * (1.0 - smoothstep(0.35, 1.15, abs(pr - uRingR.z)));
      vec3 base = mix(uHush * 0.22, uBand * 0.3, 0.48 + uWarp * 0.12 + wash * 0.045 + uKick * 0.035);
      vec3 col = mix(base, uBand * 0.58, lines * 0.42);
      col += uBand * (uWarp * 0.025 + wash * 0.013 + uKick * 0.025 + uSnare * 0.016 + uHat * 0.008 + lines * 0.055);
      float a = 0.58 + wash * 0.08 + lines * 0.18;
      gl_FragColor = vec4(col, a);
    }
  `,
};

export interface GroundWarp {
  mesh: THREE.Mesh;
  setWarp: (warp01: number, time: number) => void;
  setBeat: (kick: number, snare: number, hat: number, lines: number, dt: number) => void;
  setBand: (color: THREE.Color) => void;
  follow: (x: number, z: number) => void;
  dispose: () => void;
}

export function createGroundWarp(scene: THREE.Scene): GroundWarp {
  const uniforms = {
    uWarp: { value: 0 },
    uTime: { value: 0 },
    uHush: { value: new THREE.Color(tuning.hushColor) },
    uBand: { value: new THREE.Color(tuning.bandColors[0]) },
    uOrigin: { value: new THREE.Vector2(0, 0) },
    uKick: { value: 0 },
    uSnare: { value: 0 },
    uHat: { value: 0 },
    uRingR: { value: new THREE.Vector3(0, 0, 0) },
    uRingA: { value: new THREE.Vector3(0, 0, 0) },
  };

  const rings = [0, 0, 0];
  const ages = [99, 99, 99];
  let slot = 0;
  let lastKick = 0;

  const mat = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: warpShader.vertexShader,
    fragmentShader: warpShader.fragmentShader,
    side: THREE.DoubleSide,
    transparent: true,
    depthWrite: false,
    depthTest: false,
  });

  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(PLANE, PLANE, 64, 64), mat);
  mesh.renderOrder = 0;
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = 0.01;
  scene.add(mesh);

  return {
    mesh,
    setWarp(warp01, time) {
      uniforms.uWarp.value = warp01;
      uniforms.uTime.value = time;
    },
    setBeat(kick, snare, hat, lines, dt) {
      uniforms.uKick.value = kick;
      uniforms.uSnare.value = snare;
      uniforms.uHat.value = hat;
      const n = Math.min(3, Math.max(0, Math.floor(lines)));
      if (kick > 0.75 && lastKick < 0.35) {
        let live = 0;
        for (let i = 0; i < 3; i++) if (ages[i]! < 1.15) live += 1;
        if (live < n) {
          rings[slot] = 1.2;
          ages[slot] = 0;
          slot = (slot + 1) % 3;
        }
      }
      lastKick = kick;
      for (let i = 0; i < 3; i++) {
        ages[i]! += dt;
        rings[i]! += dt * 38;
      }
      uniforms.uRingR.value.set(rings[0]!, rings[1]!, rings[2]!);
      uniforms.uRingA.value.set(
        ages[0]! < 1.15 ? 1 - ages[0]! / 1.15 : 0,
        ages[1]! < 1.15 ? 1 - ages[1]! / 1.15 : 0,
        ages[2]! < 1.15 ? 1 - ages[2]! / 1.15 : 0,
      );
    },
    setBand(color) {
      uniforms.uBand.value.copy(color);
    },
    follow(x, z) {
      mesh.position.x = x;
      mesh.position.z = z;
      uniforms.uOrigin.value.set(x, z);
    },
    dispose() {
      scene.remove(mesh);
      mesh.geometry.dispose();
      mat.dispose();
    },
  };
}
