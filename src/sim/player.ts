import { tuning } from "../tuning";
import type { PlayerState } from "./types";

export function createPlayer(): PlayerState {
  return {
    x: 0,
    z: 0,
    vx: 0,
    vz: 0,
    speed01: 0,
    boosting: false,
    shatterT: 0,
  };
}

export function stepPlayer(
  p: PlayerState,
  dt: number,
  targetX: number,
  targetZ: number,
  boosting: boolean,
  pointerActive: boolean,
): void {
  if (p.shatterT > 0) {
    p.shatterT = Math.max(0, p.shatterT - dt);
  }

  p.boosting = boosting && pointerActive;

  if (pointerActive) {
    const dx = targetX - p.x;
    const dz = targetZ - p.z;
    const dist = Math.hypot(dx, dz);
    if (dist > 0.001) {
      const nx = dx / dist;
      const nz = dz / dist;
      const accel = tuning.chaseAccel * (p.boosting ? tuning.boostAccelMult : 1);
      p.vx += nx * accel * dt;
      p.vz += nz * accel * dt;
    }
  }

  // Exponential drag
  const drag = Math.exp(-tuning.drag * dt);
  p.vx *= drag;
  p.vz *= drag;

  const max = tuning.maxSpeed * (p.boosting ? 1 : 0.55);
  const speed = Math.hypot(p.vx, p.vz);
  if (speed > max) {
    const s = max / speed;
    p.vx *= s;
    p.vz *= s;
  }

  p.x += p.vx * dt;
  p.z += p.vz * dt;

  const softMax = tuning.maxSpeed;
  p.speed01 = Math.min(1, Math.hypot(p.vx, p.vz) / softMax);
}

export function hardShatter(p: PlayerState): void {
  p.vx = 0;
  p.vz = 0;
  p.speed01 = 0;
  p.boosting = false;
  p.shatterT = tuning.shatterRecover;
}
