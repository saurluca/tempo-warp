import { describe, expect, it } from "vitest";
import {
  bandAt,
  currentIndex,
  currentStrength,
  densityAfterHit,
  densityGrowRate,
  inwardBandRadius,
  moverChanceAt,
  radius01At,
  spawnSpacingAt,
  stepDensity,
  warpAt,
} from "../../src/sim/world";
import { tuning } from "../../src/tuning";

describe("world curves", () => {
  it("grow rate is fastest at the start and still positive when dense", () => {
    const start = densityGrowRate(tuning.densityMin, 1);
    const mid = densityGrowRate(tuning.densityMin + 40, 1);
    const far = densityGrowRate(400, 1);
    expect(start).toBeGreaterThan(mid);
    expect(mid).toBeGreaterThan(far);
    expect(far).toBeGreaterThan(0);
  });

  it("standing still does not add objects", () => {
    expect(densityGrowRate(tuning.densityMin, 0)).toBe(0);
    expect(stepDensity(12, 0, 1)).toBe(12);
  });

  it("hit drops the current count by 18% and the next step uses that", () => {
    const before = 40;
    const after = densityAfterHit(before);
    expect(after).toBeCloseTo(before * 0.82);
    expect(densityAfterHit(tuning.densityMin)).toBe(tuning.densityMin);
    const dt = 0.5;
    expect(stepDensity(after, 1, dt)).toBeCloseTo(after + densityGrowRate(after, 1) * dt);
  });

  it("density keeps climbing with no ceiling", () => {
    let d = tuning.densityMin;
    for (let i = 0; i < 200; i++) d = stepDensity(d, 1, 1);
    expect(d).toBeGreaterThan(80);
    expect(densityGrowRate(d, 1)).toBeGreaterThan(0);
  });

  it("spawn spacing shrinks as the field fills", () => {
    expect(spawnSpacingAt(tuning.densityMin)).toBeGreaterThan(spawnSpacingAt(40));
    expect(spawnSpacingAt(40)).toBeGreaterThan(spawnSpacingAt(200));
    expect(spawnSpacingAt(200)).toBeGreaterThan(tuning.spawnSpacingMin);
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

  it("warp still works far from origin", () => {
    expect(warpAt(1, tuning.sanctuaryRadius)).toBeGreaterThan(0);
    expect(warpAt(1, 0)).toBeGreaterThan(0);
  });

  it("current peaks on a band edge and dies away from it", () => {
    expect(currentStrength(tuning.bandEdges[0]!)).toBeCloseTo(1);
    expect(currentStrength(0)).toBe(0);
    expect(currentStrength(tuning.bandEdges[0]! + tuning.currentWidth + 20)).toBe(0);
  });

  it("currents keep appearing past the last band", () => {
    const last = tuning.bandEdges[tuning.bandEdges.length - 1]!;
    const next = last + tuning.currentRepeat;
    expect(currentStrength(next)).toBeCloseTo(1);
    expect(currentIndex(next)).toBeGreaterThan(currentIndex(last));
  });

});
