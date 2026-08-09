import { tuning } from "../tuning";
import type { PlayerState } from "./types";

export function createPlayer(): PlayerState {
  return {
    x: 0,
    z: 0,
    vx: 0,
    vz: 0,
    speed01: 0,
    throttle: 0,
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

  // Spool throttle like a car — reward long holds, coast on release
  if (p.boosting) {
    const rise = dt / Math.max(0.05, tuning.throttleRise);
    p.throttle = Math.min(1, p.throttle + rise);
  } else {
    const fall = dt / Math.max(0.05, tuning.throttleFall);
    p.throttle = Math.max(0, p.throttle - fall);
  }

  let nx = 0;
  let nz = 0;
  if (pointerActive) {
    const dx = targetX - p.x;
    const dz = targetZ - p.z;
    const dist = Math.hypot(dx, dz);
    if (dist > 0.001) {
      nx = dx / dist;
      nz = dz / dist;
    }
  } else if (Math.hypot(p.vx, p.vz) > 0.01) {
    // No pointer: keep facing velocity for coast
    const sp = Math.hypot(p.vx, p.vz);
    nx = p.vx / sp;
    nz = p.vz / sp;
  }

  if (nx !== 0 || nz !== 0) {
    // Redirect existing momentum toward aim (agile turn, little extra speed)
    const sp = Math.hypot(p.vx, p.vz);
    if (sp > 0.05) {
      const tx = nx * sp;
      const tz = nz * sp;
      const k = 1 - Math.exp(-tuning.turnAgility * dt);
      p.vx += (tx - p.vx) * k;
      p.vz += (tz - p.vz) * k;
    }

    // Steer always (weaker); engine only with throttle
    const steer = tuning.steerAccel * (0.45 + 0.55 * Math.max(p.throttle, 0.25));
    const engine = tuning.engineAccel * p.throttle;
    const push = steer + engine;
    p.vx += nx * push * dt;
    p.vz += nz * push * dt;
  }

  // Coast drag — gentle; not an instant stop when you let go
  const drag = Math.exp(-tuning.coastDrag * dt);
  p.vx *= drag;
  p.vz *= drag;

  // Soft cap near maxSpeed (no hard clamp that kills momentum feel)
  const speed = Math.hypot(p.vx, p.vz);
  if (speed > tuning.maxSpeed) {
    const over = speed - tuning.maxSpeed;
    const brake = Math.exp(-tuning.speedLimitDrag * (1 + over * 0.05) * dt);
    p.vx *= brake;
    p.vz *= brake;
  }

  p.x += p.vx * dt;
  p.z += p.vz * dt;

  p.speed01 = Math.min(1, Math.hypot(p.vx, p.vz) / tuning.maxSpeed);
}

export function hardShatter(p: PlayerState): void {
  p.vx = 0;
  p.vz = 0;
  p.speed01 = 0;
  p.throttle = 0;
  p.boosting = false;
  p.shatterT = tuning.shatterRecover;
}
