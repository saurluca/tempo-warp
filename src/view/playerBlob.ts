import * as THREE from "three";
import { tuning } from "../tuning";
import { colorForJourney } from "./colors";

const RING = 40;

export interface PlayerBlob {
  root: THREE.Mesh;
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

/** Flat 2D tadpole — fat head, fluid tail. No lighting. */
export function createPlayerBlob(scene: THREE.Scene): PlayerBlob {
  const verts = RING + 1;
  const positions = new Float32Array(verts * 3);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));

  const index: number[] = [];
  for (let i = 0; i < RING; i++) {
    index.push(0, 1 + i, 1 + ((i + 1) % RING));
  }
  geo.setIndex(index);

  const mat = new THREE.MeshBasicMaterial({
    color: tuning.hushColor,
    transparent: true,
    opacity: 0.94,
    depthTest: false,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.renderOrder = 10;
  mesh.position.y = 1.2;
  scene.add(mesh);

  let wobble = 0;

  return {
    root: mesh,
    update(x, z, vx, vz, speed01, throttle, shatterT, radius, dt) {
      const shattered = shatterT > 0;
      const visualSpeed = shattered ? 0 : Math.max(speed01, throttle * 0.85);
      const sanctuary = Math.min(1, Math.max(0, (radius / tuning.sanctuaryRadius - 0.88) / 0.12));
      wobble += dt * (3.2 + visualSpeed * 4) * (1 - sanctuary);

      // Same envelope at any speed — only the teardrop bias changes.
      const R = tuning.blobRadius;
      const e = (0.18 + visualSpeed * 0.72) * (1 - sanctuary);
      const waveAmp = 0.04 * (1 - sanctuary);

      positions[0] = 0;
      positions[1] = 0;
      positions[2] = R * 0.18;

      for (let i = 0; i < RING; i++) {
        const t = (i / RING) * Math.PI * 2;
        const wave = Math.sin(wobble + t * 2.5) * waveAmp;
        const r = (R * (1 + e * Math.cos(t))) / (1 + e) * (1 + wave);
        const o = (1 + i) * 3;
        positions[o] = Math.sin(t) * r;
        positions[o + 1] = 0;
        positions[o + 2] = Math.cos(t) * r;
      }
      geo.attributes.position!.needsUpdate = true;
      geo.computeBoundingSphere();

      const spd = Math.hypot(vx, vz);
      if (spd > 0.15) {
        mesh.rotation.y = Math.atan2(vx, vz);
      }
      mesh.position.x = x;
      mesh.position.z = z;

      mat.color.copy(colorForJourney(visualSpeed, radius));
      mat.opacity = shattered ? 0.4 : 0.94 + sanctuary * 0.04;
    },
    dispose() {
      scene.remove(mesh);
      geo.dispose();
      mat.dispose();
    },
  };
}
