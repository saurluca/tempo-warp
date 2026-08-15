import * as THREE from "three";
import { tuning } from "../tuning";

const COUNT = 28;

export interface ShatterBurst {
  trigger: (x: number, z: number) => void;
  update: (dt: number) => void;
  dispose: () => void;
}

export function createShatterBurst(scene: THREE.Scene): ShatterBurst {
  const positions = new Float32Array(COUNT * 3);
  const velocities: { x: number; y: number; z: number }[] = [];
  for (let i = 0; i < COUNT; i++) {
    velocities.push({ x: 0, y: 0, z: 0 });
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const mat = new THREE.PointsMaterial({
    color: tuning.hushColor,
    size: 0.35,
    transparent: true,
    opacity: 0,
    depthTest: false,
    depthWrite: false,
    sizeAttenuation: true,
  });
  const points = new THREE.Points(geo, mat);
  points.visible = false;
  scene.add(points);

  let life = 0;

  return {
    trigger(x, z) {
      for (let i = 0; i < COUNT; i++) {
        const a = Math.random() * Math.PI * 2;
        const s = 4 + Math.random() * 14;
        velocities[i]!.x = Math.cos(a) * s;
        velocities[i]!.y = 2 + Math.random() * 6;
        velocities[i]!.z = Math.sin(a) * s;
        positions[i * 3] = x;
        positions[i * 3 + 1] = tuning.playerRadius;
        positions[i * 3 + 2] = z;
      }
      geo.attributes.position!.needsUpdate = true;
      life = tuning.shatterRecover * 1.1;
      mat.opacity = 0.95;
      mat.color.setHex(tuning.hushColor);
      points.visible = true;
    },
    update(dt) {
      if (life <= 0) {
        points.visible = false;
        return;
      }
      life -= dt;
      for (let i = 0; i < COUNT; i++) {
        const v = velocities[i]!;
        v.y -= 12 * dt;
        positions[i * 3]! += v.x * dt;
        positions[i * 3 + 1]! += v.y * dt;
        positions[i * 3 + 2]! += v.z * dt;
        v.x *= 0.96;
        v.z *= 0.96;
      }
      geo.attributes.position!.needsUpdate = true;
      mat.opacity = Math.max(0, life / tuning.shatterRecover);
    },
    dispose() {
      scene.remove(points);
      geo.dispose();
      mat.dispose();
    },
  };
}
