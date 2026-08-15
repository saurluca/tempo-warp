import * as THREE from "three";
import { tuning } from "../tuning";

const PLANE = 800;
const GRID = 48;
const TILE = PLANE / GRID;

const warpShader = {
  vertexShader: /* glsl */ `
    uniform float uWarp;
    uniform float uTime;
    uniform float uKick;
    uniform vec2 uOrigin;
    varying vec2 vUv;
    varying vec2 vWorld;
    varying vec2 vLocal;
    void main() {
      vUv = uv;
      vec3 p = position;
      vLocal = p.xy;
      float w = uWarp + uKick * 0.22;
      float wx = p.x + uOrigin.x;
      float wy = p.y - uOrigin.y;
      vWorld = vec2(wx, wy);
      float beat = uTime * 6.2831853;
      p.z += sin(wx * 0.35 + beat) * w * 0.55;
      p.z += cos(wy * 0.28 - beat * 0.75) * w * 0.4;
      p.y += sin(wx * 0.5 + wy * 0.5 + beat * 1.25) * w * 0.15;
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
    uniform vec2 uScroll;
    uniform float uGrid;
    uniform vec3 uRingR;
    uniform vec3 uRingA;
    varying vec2 vUv;
    varying vec2 vWorld;
    varying vec2 vLocal;
    void main() {
      vec2 g = abs(fract(vUv * 48.0 + uScroll) - 0.5);
      float grid = (1.0 - smoothstep(0.02, 0.045, min(g.x, g.y))) * uGrid;
      float beat = uTime * 6.2831853;
      float wash = 0.5 + 0.5 * sin(vWorld.x * 0.035 + beat * 0.25) * sin(vWorld.y * 0.035 - beat * 0.2);
      float pr = length(vLocal);
      float lines = 0.0;
      lines += uRingA.x * (1.0 - smoothstep(0.35, 1.15, abs(pr - uRingR.x)));
      lines += uRingA.y * (1.0 - smoothstep(0.35, 1.15, abs(pr - uRingR.y)));
      lines += uRingA.z * (1.0 - smoothstep(0.35, 1.15, abs(pr - uRingR.z)));
      vec3 base = mix(uHush * 0.28, uBand * 0.42, 0.55 + uWarp * 0.25 + wash * 0.12 + uKick * 0.06);
      vec3 col = mix(base, uBand * 0.7, max(grid * 0.7, lines * 0.45));
      col += uBand * (uWarp * 0.06 + wash * 0.04 + uKick * 0.05 + uSnare * 0.03 + uHat * 0.015 + lines * 0.06);
      gl_FragColor = vec4(col, 1.0);
    }
  `,
};

export interface GroundWarp {
  mesh: THREE.Mesh;
  setWarp: (warp01: number, time: number) => void;
  setBeat: (kick: number, snare: number, hat: number, lines: number, dt: number) => void;
  setBand: (color: THREE.Color) => void;
  setGrid: (on: boolean) => void;
  follow: (x: number, z: number, worldFixed: boolean) => void;
  dispose: () => void;
}

export function createGroundWarp(scene: THREE.Scene): GroundWarp {
  const uniforms = {
    uWarp: { value: 0 },
    uTime: { value: 0 },
    uHush: { value: new THREE.Color(tuning.hushColor) },
    uBand: { value: new THREE.Color(tuning.bandColors[0]) },
    uScroll: { value: new THREE.Vector2(0, 0) },
    uOrigin: { value: new THREE.Vector2(0, 0) },
    uGrid: { value: 0 },
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
    setGrid(on) {
      uniforms.uGrid.value = on ? 1 : 0;
    },
    follow(x, z, worldFixed) {
      mesh.position.x = x;
      mesh.position.z = z;
      if (worldFixed) {
        uniforms.uScroll.value.set(x / TILE, -z / TILE);
        uniforms.uOrigin.value.set(x, z);
      } else {
        uniforms.uScroll.value.set(0, 0);
        uniforms.uOrigin.value.set(0, 0);
      }
    },
    dispose() {
      scene.remove(mesh);
      mesh.geometry.dispose();
      mat.dispose();
    },
  };
}
