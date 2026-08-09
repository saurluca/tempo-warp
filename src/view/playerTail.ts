import * as THREE from "three";
import { tuning } from "../tuning";
import { colorForSpeed } from "./colors";

const N = 64;

export interface PlayerTail {
  update: (x: number, z: number, vx: number, vz: number, speed01: number) => void;
  dispose: () => void;
}

/** Comet streak: history ring — stretches in world space when you go fast. */
export function createPlayerTail(scene: THREE.Scene): PlayerTail {
  const positions = new Float32Array(N * 3);
  const colors = new Float32Array(N * 3);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));

  const lineMat = new THREE.LineBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 0.95,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const pointsMat = new THREE.PointsMaterial({
    vertexColors: true,
    size: 0.55,
    transparent: true,
    opacity: 0.85,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true,
  });
  const line = new THREE.Line(geo, lineMat);
  const points = new THREE.Points(geo, pointsMat);
  scene.add(line, points);

  const c = new THREE.Color();
  let seeded = false;

  return {
    update(x, z, vx, vz, speed01) {
      for (let i = N - 1; i > 0; i--) {
        const to = i * 3;
        const from = (i - 1) * 3;
        positions[to] = positions[from]!;
        positions[to + 1] = positions[from + 1]!;
        positions[to + 2] = positions[from + 2]!;
      }

      const y = tuning.playerRadius * 0.85;
      const spd = Math.hypot(vx, vz);
      if (spd > 0.15) {
        const inv = 1 / spd;
        positions[0] = x - vx * inv * tuning.playerRadius * 1.1;
        positions[2] = z - vz * inv * tuning.playerRadius * 1.1;
      } else {
        positions[0] = x;
        positions[2] = z;
      }
      positions[1] = y;

      if (!seeded) {
        for (let i = 1; i < N; i++) {
          positions[i * 3] = positions[0]!;
          positions[i * 3 + 1] = y;
          positions[i * 3 + 2] = positions[2]!;
        }
        seeded = true;
      }

      c.copy(colorForSpeed(speed01));
      for (let i = 0; i < N; i++) {
        const t = 1 - i / (N - 1);
        const fade = t * t * (0.25 + speed01 * 0.85);
        colors[i * 3] = c.r * fade;
        colors[i * 3 + 1] = c.g * fade;
        colors[i * 3 + 2] = c.b * fade;
      }

      geo.attributes.position!.needsUpdate = true;
      geo.attributes.color!.needsUpdate = true;
      const on = speed01 > 0.03;
      line.visible = on;
      points.visible = on;
      lineMat.opacity = 0.3 + speed01 * 0.7;
      pointsMat.opacity = 0.35 + speed01 * 0.65;
      pointsMat.size = 0.35 + speed01 * 0.85;
    },
    dispose() {
      scene.remove(line, points);
      geo.dispose();
      lineMat.dispose();
      pointsMat.dispose();
    },
  };
}
