import * as THREE from "three";
import { tuning } from "../tuning";

const PLANE = 400;
const GRID = 48;
const TILE = PLANE / GRID;

const warpShader = {
  vertexShader: /* glsl */ `
    uniform float uWarp;
    uniform float uTime;
    uniform vec2 uOrigin;
    varying vec2 vUv;
    varying vec2 vWorld;
    void main() {
      vUv = uv;
      vec3 p = position;
      float w = uWarp;
      float wx = p.x + uOrigin.x;
      float wy = p.y - uOrigin.y;
      vWorld = vec2(wx, wy);
      p.z += sin(wx * 0.35 + uTime * 2.2) * w * 0.55;
      p.z += cos(wy * 0.28 - uTime * 1.6) * w * 0.4;
      p.y += sin(wx * 0.5 + wy * 0.5 + uTime * 3.0) * w * 0.15;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform float uWarp;
    uniform float uTime;
    uniform vec3 uHush;
    uniform vec3 uBand;
    uniform vec2 uScroll;
    uniform float uGrid;
    uniform vec4 uEdges;
    varying vec2 vUv;
    varying vec2 vWorld;
    void main() {
      vec2 g = abs(fract(vUv * 48.0 + uScroll) - 0.5);
      float grid = (1.0 - smoothstep(0.02, 0.045, min(g.x, g.y))) * uGrid;
      float r = length(vWorld);
      float d = min(min(abs(r - uEdges.x), abs(r - uEdges.y)), min(abs(r - uEdges.z), abs(r - uEdges.w)));
      float ring = 1.0 - smoothstep(2.5, 9.0, d);
      float wash = 0.5 + 0.5 * sin(vWorld.x * 0.035 + uTime * 0.35) * sin(vWorld.y * 0.035 - uTime * 0.28);
      vec3 base = mix(uHush * 0.28, uBand * 0.42, 0.55 + uWarp * 0.25 + wash * 0.12);
      vec3 col = mix(base, uBand * 0.85, max(grid * 0.7, ring * 0.9));
      col += uBand * (uWarp * 0.06 + wash * 0.04);
      gl_FragColor = vec4(col, 1.0);
    }
  `,
};

export interface GroundWarp {
  mesh: THREE.Mesh;
  setWarp: (warp01: number, time: number) => void;
  setBand: (color: THREE.Color) => void;
  setGrid: (on: boolean) => void;
  follow: (x: number, z: number, worldFixed: boolean) => void;
  dispose: () => void;
}

export function createGroundWarp(scene: THREE.Scene): GroundWarp {
  const e = tuning.bandEdges;
  const uniforms = {
    uWarp: { value: 0 },
    uTime: { value: 0 },
    uHush: { value: new THREE.Color(tuning.hushColor) },
    uBand: { value: new THREE.Color(tuning.bandColors[0]) },
    uScroll: { value: new THREE.Vector2(0, 0) },
    uOrigin: { value: new THREE.Vector2(0, 0) },
    uGrid: { value: 0 },
    uEdges: { value: new THREE.Vector4(e[0], e[1], e[2], e[3]) },
  };

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
