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
    clearOfHazards: true,
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

  const speed = Math.hypot(p.vx, p.vz);
  let nx = 0;
  let nz = 0;

  if (pointerActive) {
    const dx = targetX - p.x;
    const dz = targetZ - p.z;
    const aimDist = Math.hypot(dx, dz);
    // Critical: aiming on top of yourself used to cancel all velocity
    if (aimDist > tuning.aimDeadzone) {
      nx = dx / aimDist;
      nz = dz / aimDist;
    } else if (speed > 0.05) {
      nx = p.vx / speed;
      nz = p.vz / speed;
    }
  } else if (speed > 0.05) {
    nx = p.vx / speed;
    nz = p.vz / speed;
  }

  if (nx !== 0 || nz !== 0) {
    if (speed > 0.05) {
      const tx = nx * speed;
      const tz = nz * speed;
      const k = 1 - Math.exp(-tuning.turnAgility * dt);
      p.vx += (tx - p.vx) * k;
      p.vz += (tz - p.vz) * k;
    }

    // While recovering from impact, throttle push is weaker but not zero
    const control = p.shatterT > 0 ? 0.35 : 1;
    const steer = tuning.steerAccel * (0.45 + 0.55 * Math.max(p.throttle, 0.25)) * control;
    const engine = tuning.engineAccel * p.throttle * control;
    const push = steer + engine;
    p.vx += nx * push * dt;
    p.vz += nz * push * dt;
  }

  const drag = Math.exp(-tuning.coastDrag * dt);
  p.vx *= drag;
  p.vz *= drag;

  const spd = Math.hypot(p.vx, p.vz);
  if (spd > tuning.maxSpeed) {
    const over = spd - tuning.maxSpeed;
    const brake = Math.exp(-tuning.speedLimitDrag * (1 + over * 0.05) * dt);
    p.vx *= brake;
    p.vz *= brake;
  }

  p.x += p.vx * dt;
  p.z += p.vz * dt;

  p.speed01 = Math.min(1, Math.hypot(p.vx, p.vz) / tuning.maxSpeed);
}

/** Soft impact: knock outward, keep moving — never freeze to a dead stop. */
export function applyImpact(p: PlayerState, fromX: number, fromZ: number): void {
  let dx = p.x - fromX;
  let dz = p.z - fromZ;
  let dist = Math.hypot(dx, dz);
  if (dist < 1e-5) {
    dx = 1;
    dz = 0;
    dist = 1;
  }
  const nx = dx / dist;
  const nz = dz / dist;

  const incoming = Math.hypot(p.vx, p.vz);
  const keep = Math.max(tuning.impactMinSpeed, incoming * tuning.impactSpeedKeep);
  p.vx = nx * keep;
  p.vz = nz * keep;
  p.throttle = Math.max(p.throttle * tuning.impactThrottleKeep, 0);
  p.speed01 = Math.min(1, keep / tuning.maxSpeed);
  p.boosting = false;
  p.shatterT = tuning.shatterRecover;
  p.clearOfHazards = false;
}
