import * as THREE from "three";
import { tuning } from "../tuning";

const PLANE = 140;
const GRID = 24;
const TILE = PLANE / GRID;

const warpShader = {
  vertexShader: /* glsl */ `
    uniform float uWarp;
    uniform float uTime;
    uniform vec2 uOrigin;
    varying vec2 vUv;
    void main() {
      vUv = uv;
      vec3 p = position;
      float w = uWarp;
      // uOrigin world-locks the waves when the mesh rides under the player
      float wx = p.x + uOrigin.x;
      float wy = p.y - uOrigin.y;
      p.z += sin(wx * 0.35 + uTime * 2.2) * w * 0.55;
      p.z += cos(wy * 0.28 - uTime * 1.6) * w * 0.4;
      p.y += sin(wx * 0.5 + wy * 0.5 + uTime * 3.0) * w * 0.15;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform float uWarp;
    uniform vec3 uHush;
    uniform vec3 uSurge;
    uniform vec2 uScroll;
    varying vec2 vUv;
    void main() {
      vec2 g = abs(fract(vUv * 24.0 + uScroll) - 0.5);
      float line = 1.0 - smoothstep(0.02, 0.045, min(g.x, g.y));
      vec3 base = mix(uHush, uSurge, uWarp * 0.85);
      vec3 col = mix(base * 0.22, base * 0.9, line);
      col += uSurge * uWarp * 0.08;
      gl_FragColor = vec4(col, 1.0);
    }
  `,
};

export interface GroundWarp {
  mesh: THREE.Mesh;
  setWarp: (warp01: number, time: number) => void;
  /** Mesh always under player; worldFixed scrolls pattern so ground looks world-locked. */
  follow: (x: number, z: number, worldFixed: boolean) => void;
  dispose: () => void;
}

export function createGroundWarp(scene: THREE.Scene): GroundWarp {
  const uniforms = {
    uWarp: { value: 0 },
    uTime: { value: 0 },
    uHush: { value: new THREE.Color(tuning.hushColor) },
    uSurge: { value: new THREE.Color(tuning.surgeColor) },
    uScroll: { value: new THREE.Vector2(0, 0) },
    uOrigin: { value: new THREE.Vector2(0, 0) },
  };

  const mat = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: warpShader.vertexShader,
    fragmentShader: warpShader.fragmentShader,
  });

  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(PLANE, PLANE, 64, 64), mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = 0.01;
  scene.add(mesh);

  return {
    mesh,
    setWarp(warp01, time) {
      uniforms.uWarp.value = warp01;
      uniforms.uTime.value = time;
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
