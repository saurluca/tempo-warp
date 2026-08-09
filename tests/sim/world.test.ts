import { describe, expect, it } from "vitest";
import { densityAt, moverChanceAt, spawnSpacingAt, warpAt } from "../../src/sim/world";

describe("world curves", () => {
  it("density increases with speed01", () => {
    expect(densityAt(0)).toBeLessThan(densityAt(0.5));
    expect(densityAt(0.5)).toBeLessThan(densityAt(1));
  });

  it("spawn spacing shrinks with speed01", () => {
    expect(spawnSpacingAt(0)).toBeGreaterThan(spawnSpacingAt(1));
  });

  it("warp is zero at rest and max at full speed", () => {
    expect(warpAt(0)).toBe(0);
    expect(warpAt(1)).toBeGreaterThan(0);
    expect(warpAt(0.2)).toBeLessThan(warpAt(0.9));
  });

  it("mover chance rises with speed", () => {
    expect(moverChanceAt(0)).toBeLessThan(moverChanceAt(1));
  });
});
