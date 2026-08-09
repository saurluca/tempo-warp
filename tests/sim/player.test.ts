import { describe, expect, it } from "vitest";
import { createPlayer, stepPlayer } from "../../src/sim/player";

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
});
