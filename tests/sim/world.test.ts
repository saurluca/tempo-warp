import { describe, expect, it } from "vitest";
import {
  bandAt,
  densityAt,
  inwardBandRadius,
  moverChanceAt,
  radius01At,
  spawnSpacingAt,
  warpAt,
} from "../../src/sim/world";
import { tuning } from "../../src/tuning";

describe("world curves", () => {
  it("density increases with speed01", () => {
    expect(densityAt(0)).toBeLessThan(densityAt(0.5));
    expect(densityAt(0.5)).toBeLessThan(densityAt(1));
  });

  it("density grows with distance from origin", () => {
    expect(densityAt(0.4, 0)).toBeLessThan(densityAt(0.4, 400));
    expect(densityAt(0.4, 400)).toBeLessThan(densityAt(0.4, 1600));
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

  it("radius01 is 0 at origin and 1 at sanctuary", () => {
    expect(radius01At(0)).toBe(0);
    expect(radius01At(tuning.sanctuaryRadius)).toBe(1);
    expect(radius01At(tuning.sanctuaryRadius * 0.5)).toBeCloseTo(0.5);
  });

  it("band index climbs with radius", () => {
    expect(bandAt(0)).toBe(0);
    expect(bandAt(tuning.bandEdges[0]! + 1)).toBe(1);
    expect(bandAt(tuning.sanctuaryRadius + 10)).toBe(4);
  });

  it("shatter knocks one band inward", () => {
    const midSurge = (tuning.bandEdges[1]! + tuning.bandEdges[2]!) * 0.5;
    const dest = inwardBandRadius(midSurge);
    expect(dest).toBeLessThan(tuning.bandEdges[1]!);
    expect(dest).toBeGreaterThan(tuning.bandEdges[0]!);
    expect(inwardBandRadius(20)).toBe(20);
  });

  it("density drops in the sanctuary", () => {
    expect(densityAt(0.5, tuning.sanctuaryRadius)).toBeLessThan(densityAt(0.5, 1600));
  });

  it("warp dies in the sanctuary", () => {
    expect(warpAt(1, tuning.sanctuaryRadius)).toBe(0);
    expect(warpAt(1, 0)).toBeGreaterThan(0);
  });
});
