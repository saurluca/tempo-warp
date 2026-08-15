import { describe, expect, it } from "vitest";
import { applyImpact, createPlayer, stepPlayer } from "../../src/sim/player";
import { tuning } from "../../src/tuning";

function hold(seconds: number, boosting: boolean) {
  const p = createPlayer();
  const dt = 1 / 60;
  const steps = Math.round(seconds / dt);
  for (let i = 0; i < steps; i++) {
    // Aim ahead of the craft (same as real pointer chase), not a fixed world point
    stepPlayer(p, dt, p.x + 40, p.z, boosting, true);
  }
  return p;
}

describe("car-like throttle", () => {
  it("short hold has less throttle than long hold", () => {
    const short = hold(0.35, true);
    const long = hold(2.4, true);
    expect(short.throttle).toBeLessThan(0.3);
    expect(long.throttle).toBeGreaterThan(0.85);
    expect(short.speed01).toBeLessThan(long.speed01);
  });

  it("coasts after release instead of stopping immediately", () => {
    const p = hold(2.8, true);
    const speedAtRelease = p.speed01;
    expect(speedAtRelease).toBeGreaterThan(0.35);

    const dt = 1 / 60;
    for (let i = 0; i < 90; i++) {
      // still aim, but not holding — spool down + coast
      stepPlayer(p, dt, p.x + 40, p.z, false, true);
    }
    expect(p.throttle).toBeLessThan(speedAtRelease);
    expect(p.throttle).toBeLessThan(0.7);
    expect(p.speed01).toBeGreaterThan(0.25);
    expect(p.speed01).toBeGreaterThan(speedAtRelease * 0.35);
  });

  it("aiming on top of the craft does not cancel velocity", () => {
    const p = hold(2.5, true);
    const before = Math.hypot(p.vx, p.vz);
    expect(before).toBeGreaterThan(5);
    const dt = 1 / 60;
    for (let i = 0; i < 45; i++) {
      // pointer on the blob + still holding
      stepPlayer(p, dt, p.x + 0.2, p.z - 0.1, true, true);
    }
    expect(Math.hypot(p.vx, p.vz)).toBeGreaterThan(before * 0.5);
  });

  it("near-cursor aim orbit does not dump speed", () => {
    const p = hold(2.5, true);
    const before = Math.hypot(p.vx, p.vz);
    expect(before).toBeGreaterThan(5);
    const dt = 1 / 60;
    const r = tuning.aimDeadzone + 0.4;
    for (let i = 0; i < 90; i++) {
      const a = i * 0.35;
      stepPlayer(p, dt, p.x + Math.cos(a) * r, p.z + Math.sin(a) * r, true, true);
    }
    // Soft zone used to let this fall to ~5% of speed
    expect(Math.hypot(p.vx, p.vz)).toBeGreaterThan(before * 0.55);
  });

  it("aim fixed behind the craft does not reverse-thrust dump speed", () => {
    const p = hold(2.5, true);
    const before = Math.hypot(p.vx, p.vz);
    expect(before).toBeGreaterThan(5);
    const dt = 1 / 60;
    // Stale mouse: world aim stays behind while craft keeps moving
    const aimX = p.x - 5;
    const aimZ = p.z;
    for (let i = 0; i < 90; i++) {
      stepPlayer(p, dt, aimX, aimZ, true, true);
    }
    expect(Math.hypot(p.vx, p.vz)).toBeGreaterThan(before * 0.55);
  });

  it("aim behind the craft still steers", () => {
    const p = hold(2.5, true);
    const beforeVx = p.vx;
    expect(beforeVx).toBeGreaterThan(5);
    const dt = 1 / 60;
    for (let i = 0; i < 45; i++) {
      stepPlayer(p, dt, p.x - 20, p.z + 12, true, true);
    }
    expect(p.vz).not.toBeCloseTo(0, 1);
    expect(Math.hypot(p.vx, p.vz)).toBeGreaterThan(beforeVx * 0.55);
  });

  it("impact knocks outward instead of freezing", () => {
    const p = hold(2.5, true);
    applyImpact(p, p.x - 1, p.z);
    expect(Math.hypot(p.vx, p.vz)).toBeGreaterThanOrEqual(tuning.impactMinSpeed - 0.01);
    expect(p.vx).toBeGreaterThan(0); // pushed away from obstacle on the left
  });

  it("impact bounces in place and does not teleport", () => {
    const p = createPlayer();
    const midSurge = (tuning.bandEdges[1]! + tuning.bandEdges[2]!) * 0.5;
    p.x = midSurge;
    p.z = 0;
    p.vx = 20;
    applyImpact(p, midSurge + 1, 0);
    expect(p.x).toBeCloseTo(midSurge);
    expect(p.z).toBeCloseTo(0);
    expect(p.vx).toBeLessThan(0);
    expect(Math.hypot(p.vx, p.vz)).toBeGreaterThanOrEqual(tuning.impactMinSpeed - 0.01);
  });
});
