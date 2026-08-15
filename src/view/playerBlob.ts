import * as THREE from "three";
import { tuning } from "../tuning";
import { colorForJourney } from "./colors";

const RING = 48;
const LAYERS = [
  { scale: 1, dark: 0.45, light: 0, opacity: 0.72 },
  { scale: 0.68, dark: 0, light: 0.08, opacity: 0.92 },
  { scale: 0.36, dark: 0, light: 0.55, opacity: 1 },
] as const;

export interface PlayerBlob {
  root: THREE.Group;
  update: (
    x: number,
    z: number,
    vx: number,
    vz: number,
    speed01: number,
    throttle: number,
    shatterT: number,
    radius: number,
    dt: number,
  ) => void;
  dispose: () => void;
}

function writeComet(
  positions: Float32Array,
  scale: number,
  visualSpeed: number,
  sanctuary: number,
  wobble: number,
): void {
  const R = tuning.blobRadius * scale;
  const s01 = visualSpeed * (1 - sanctuary);
  const headR = R * (0.58 - s01 * 0.22);
  const tailLen = R * (0.45 + s01 * 1.55) * (1 - sanctuary * 0.85);
  const headSquash = 1 - s01 * 0.28;

  positions[0] = 0;
  positions[1] = 0;
  positions[2] = 0;

  for (let i = 0; i < RING; i++) {
    const t = (i / RING) * Math.PI * 2;
    const c = Math.cos(t);
    const s = Math.sin(t);
    const o = (1 + i) * 3;
    let x: number;
    let z: number;
    if (c > -0.18) {
      x = s * headR * headSquash;
      z = c * headR;
    } else {
      const u = (-c - 0.18) / 0.82;
      const steps = 4 + Math.round(s01 * 3);
      const step = Math.ceil(u * steps) / steps;
      const halfW = headR * headSquash * Math.pow(1 - step, 1.15 + s01 * 0.7);
      const flicker = 1 + Math.sin(wobble * 2.4 + step * 5) * (0.04 + s01 * 0.1) * (1 - sanctuary);
      x = (s < 0 ? -1 : 1) * halfW * flicker;
      z = -headR * 0.18 - u * tailLen;
    }
    positions[o] = x;
    positions[o + 1] = 0;
    positions[o + 2] = z;
  }
}

/** Layered comet — round head, stepped tail. Journey colors, not fire. */
export function createPlayerBlob(scene: THREE.Scene): PlayerBlob {
  const root = new THREE.Group();
  root.position.y = 1.2;
  scene.add(root);

  const layers = LAYERS.map((spec, li) => {
    const positions = new Float32Array((RING + 1) * 3);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const index: number[] = [];
    for (let i = 0; i < RING; i++) index.push(0, 1 + i, 1 + ((i + 1) % RING));
    geo.setIndex(index);
    const mat = new THREE.MeshBasicMaterial({
      color: tuning.hushColor,
      transparent: true,
      opacity: spec.opacity,
      depthTest: false,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.renderOrder = 10 + li;
    root.add(mesh);
    return { positions, geo, mat, spec };
  });

  let wobble = 0;
  const mid = new THREE.Color();
  const tint = new THREE.Color();
  const white = new THREE.Color(0xffffff);

  return {
    root,
    update(x, z, vx, vz, speed01, throttle, shatterT, radius, dt) {
      const shattered = shatterT > 0;
      const visualSpeed = shattered ? 0 : Math.max(speed01, throttle * 0.85);
      wobble += dt * (3.2 + visualSpeed * 4);

      mid.copy(colorForJourney(visualSpeed, radius));
      for (const layer of layers) {
        writeComet(layer.positions, layer.spec.scale, visualSpeed, 0, wobble);
        layer.geo.attributes.position!.needsUpdate = true;
        layer.geo.computeBoundingSphere();
        tint.copy(mid).multiplyScalar(1 - layer.spec.dark).lerp(white, layer.spec.light);
        layer.mat.color.copy(tint);
        layer.mat.opacity = shattered ? 0.28 : layer.spec.opacity;
      }

      const spd = Math.hypot(vx, vz);
      if (spd > 0.15) {
        root.rotation.y = Math.atan2(vx, vz);
      }
      root.position.x = x;
      root.position.z = z;
    },
    dispose() {
      scene.remove(root);
      for (const layer of layers) {
        layer.geo.dispose();
        layer.mat.dispose();
      }
    },
  };
}
