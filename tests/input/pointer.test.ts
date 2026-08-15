import { describe, expect, it } from "vitest";
import { stickAim } from "../../src/input/pointer";

describe("stickAim", () => {
  it("deadzone leaves aim unchanged", () => {
    expect(stickAim(10, 4, 3, 2, 80, 12, 8)).toBeNull();
  });

  it("drag left aims world −X", () => {
    const a = stickAim(0, 0, -40, 0, 80, 12, 8);
    expect(a).not.toBeNull();
    expect(a!.x).toBeLessThan(0);
    expect(a!.z).toBeCloseTo(0);
  });

  it("throw past radius matches a saturated throw", () => {
    const sat = stickAim(0, 0, -80, 0, 80, 12, 8);
    const over = stickAim(0, 0, -240, 0, 80, 12, 8);
    expect(sat).not.toBeNull();
    expect(over).not.toBeNull();
    expect(over!.x).toBeCloseTo(sat!.x);
    expect(over!.z).toBeCloseTo(sat!.z);
  });
});
