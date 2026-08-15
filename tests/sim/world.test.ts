import { describe, expect, it } from "vitest";
import {
  applyCurrent,
  bandAt,
  currentIndex,
  currentStrength,
  densityAt,
  inwardBandRadius,
  moverChanceAt,
  radius01At,
  spawnSpacingAt,
  warpAt,
} from "../../src/sim/world";
import { createPlayer } from "../../src/sim/player";
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

  it("density stays high past the outer rim", () => {
    expect(densityAt(0.5, tuning.sanctuaryRadius + 400)).toBeGreaterThan(densityAt(0.5, 400));
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

  it("current carries the fast out and slips the slow back", () => {
    const edge = tuning.bandEdges[0]!;
    const slow = createPlayer();
    slow.x = edge;
    slow.vx = tuning.maxSpeed * 0.25;
    slow.speed01 = 0.25;
    applyCurrent(slow, 1);
    expect(slow.vx).toBeLessThan(tuning.maxSpeed * 0.25);

    const fast = createPlayer();
    fast.x = edge;
    fast.vx = tuning.maxSpeed * 0.8;
    fast.speed01 = 0.8;
    applyCurrent(fast, 1);
    expect(fast.vx).toBeGreaterThan(tuning.maxSpeed * 0.8);
  });

  it("currents keep appearing past the last band", () => {
    const last = tuning.bandEdges[tuning.bandEdges.length - 1]!;
    const next = last + tuning.currentRepeat;
    expect(currentStrength(next)).toBeCloseTo(1);
    expect(currentIndex(next)).toBeGreaterThan(currentIndex(last));
  });

  it("current leaves homebound traffic alone", () => {
    const edge = tuning.bandEdges[0]!;
    const home = createPlayer();
    home.x = edge;
    home.vx = -tuning.maxSpeed * 0.8;
    home.speed01 = 0.8;
    applyCurrent(home, 1);
    expect(home.vx).toBeCloseTo(-tuning.maxSpeed * 0.8);
  });
});
