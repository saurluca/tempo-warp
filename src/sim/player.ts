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
  /** 0 = coast on heading, 1 = full aim. Near-cursor stays low so orbit can't brake. */
  let aimBlend = 1;

  if (pointerActive) {
    const dx = targetX - p.x;
    const dz = targetZ - p.z;
    const aimDist = Math.hypot(dx, dz);
    const soft = Math.max(0.05, tuning.aimSoftZone);
    aimBlend = Math.min(1, Math.max(0, (aimDist - tuning.aimDeadzone) / soft));

    let hx = 0;
    let hz = 0;
    if (speed > 0.05) {
      hx = p.vx / speed;
      hz = p.vz / speed;
    }

    if (aimBlend <= 0) {
      nx = hx;
      nz = hz;
    } else if (aimDist > 1e-5) {
      const ax = dx / aimDist;
      const az = dz / aimDist;
      // Soft zone: blend velocity heading → aim (hard switch used to dump speed)
      nx = hx * (1 - aimBlend) + ax * aimBlend;
      nz = hz * (1 - aimBlend) + az * aimBlend;
      const nLen = Math.hypot(nx, nz);
      if (nLen > 1e-5) {
        nx /= nLen;
        nz /= nLen;
      } else {
        nx = ax;
        nz = az;
      }
    } else if (speed > 0.05) {
      nx = hx;
      nz = hz;
    }
  } else if (speed > 0.05) {
    nx = p.vx / speed;
    nz = p.vz / speed;
  }

  if (nx !== 0 || nz !== 0) {
    // Turn by rotating heading (preserve speed). Lerping velocity toward -v
    // used to shrink |v| and felt like a hard brake when aim was behind.
    if (speed > 0.05) {
      const hx = p.vx / speed;
      const hz = p.vz / speed;
      let tx = nx;
      let tz = nz;
      // Don't U-turn into behind-aim — keep forward hemisphere only
      const turnDot = hx * nx + hz * nz;
      if (turnDot < 0) {
        tx = hx;
        tz = hz;
      }
      const k = 1 - Math.exp(-tuning.turnAgility * dt * Math.max(aimBlend, 0.15));
      let bx = hx + (tx - hx) * k;
      let bz = hz + (tz - hz) * k;
      const bl = Math.hypot(bx, bz);
      if (bl > 1e-5) {
        p.vx = (bx / bl) * speed;
        p.vz = (bz / bl) * speed;
      }
    }

    // While recovering from impact, throttle push is weaker but not zero
    const control = p.shatterT > 0 ? 0.35 : 1;
    const near = 0.35 + 0.65 * aimBlend;
    const steer = tuning.steerAccel * (0.45 + 0.55 * Math.max(p.throttle, 0.25)) * control * near;
    const engine = tuning.engineAccel * p.throttle * control;

    // Engine along current velocity — never reverse-thrust toward aim.
    const spd2 = Math.hypot(p.vx, p.vz);
    let fx = nx;
    let fz = nz;
    if (spd2 > 0.05) {
      fx = p.vx / spd2;
      fz = p.vz / spd2;
    }
    p.vx += fx * engine * dt;
    p.vz += fz * engine * dt;

    // Lateral steer only (no braking component)
    let sx = nx;
    let sz = nz;
    if (spd2 > 0.05) {
      const along = sx * fx + sz * fz;
      sx -= fx * along;
      sz -= fz * along;
    }
    p.vx += sx * steer * dt;
    p.vz += sz * steer * dt;
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
