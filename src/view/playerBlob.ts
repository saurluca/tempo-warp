import * as THREE from "three";
import { tuning } from "../tuning";
import { colorForJourney } from "./colors";

const RING = 72;
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

/** World metres from craft center to just inside the droplet tip. */
export function cometTailBehind(speed01: number): number {
  const R = tuning.blobRadius;
  const drop = speed01 * speed01 * (3 - 2 * speed01);
  const tailLen = R * (0.5 + speed01 * 1.25);
  return R + tailLen * drop - 1.05;
}

function writeComet(
  positions: Float32Array,
  scale: number,
  visualSpeed: number,
  wobble: number,
): void {
  const R = tuning.blobRadius * scale;
  const s01 = visualSpeed;
  const drop = s01 * s01 * (3 - 2 * s01);
  const tailLen = R * (0.5 + s01 * 1.25);

  positions[0] = 0;
  positions[1] = 0;
  positions[2] = 0;

  for (let i = 0; i < RING; i++) {
    const t = (i / RING) * Math.PI * 2;
    const c = Math.cos(t);
    const s = Math.sin(t);
    const o = (1 + i) * 3;
    const breathe = 1 + Math.sin(wobble * 1.7 + t * 2) * (0.03 + s01 * 0.025);
    const u = (1 - c) * 0.5;
    const pinch = Math.pow(u, 0.9) * drop;
    const halfW = R * Math.abs(s) * (1 - pinch * 0.88) * (1 - s01 * 0.1) * breathe;
    positions[o] = (s < 0 ? -1 : 1) * halfW;
    positions[o + 1] = 0;
    positions[o + 2] = c * R * breathe - tailLen * u * u * drop;
  }
}

/** Layered comet — one teardrop, no seam between head and tail. */
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
        writeComet(layer.positions, layer.spec.scale, visualSpeed, wobble);
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
