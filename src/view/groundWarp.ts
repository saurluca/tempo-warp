import * as THREE from "three";
import { tuning } from "../tuning";

const warpShader = {
  vertexShader: /* glsl */ `
    uniform float uWarp;
    uniform float uTime;
    varying vec2 vUv;
    void main() {
      vUv = uv;
      vec3 p = position;
      float w = uWarp;
      p.z += sin(p.x * 0.35 + uTime * 2.2) * w * 0.55;
      p.z += cos(p.y * 0.28 - uTime * 1.6) * w * 0.4;
      // plane is XZ after rotation; displace in local Y before rotate — use z as up in plane space
      p.y += sin(p.x * 0.5 + p.z * 0.5 + uTime * 3.0) * w * 0.15;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform float uWarp;
    uniform vec3 uHush;
    uniform vec3 uSurge;
    varying vec2 vUv;
    void main() {
      vec2 g = abs(fract(vUv * 24.0) - 0.5);
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
  follow: (x: number, z: number) => void;
  dispose: () => void;
}

export function createGroundWarp(scene: THREE.Scene): GroundWarp {
  const uniforms = {
    uWarp: { value: 0 },
    uTime: { value: 0 },
    uHush: { value: new THREE.Color(tuning.hushColor) },
    uSurge: { value: new THREE.Color(tuning.surgeColor) },
  };

  const mat = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: warpShader.vertexShader,
    fragmentShader: warpShader.fragmentShader,
  });

  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(140, 140, 64, 64), mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = 0.01;
  scene.add(mesh);

  return {
    mesh,
    setWarp(warp01, time) {
      uniforms.uWarp.value = warp01;
      uniforms.uTime.value = time;
    },
    follow(x, z) {
      mesh.position.x = x;
      mesh.position.z = z;
    },
    dispose() {
      scene.remove(mesh);
      mesh.geometry.dispose();
      mat.dispose();
    },
  };
}
