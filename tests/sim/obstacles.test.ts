import { describe, expect, it } from "vitest";
import { dueKinds, pickKind, pickNeededKind } from "../../src/sim/obstacles";
import type { Obstacle, ObstacleKind } from "../../src/sim/types";

function counts(arrange01: number, n = 4000) {
  let i = 0;
  const rand = () => {
    i += 1;
    return ((i * 9301 + 49297) % 233280) / 233280;
  };
  const out = { spire: 0, ring: 0, shard: 0, monolith: 0 };
  for (let k = 0; k < n; k++) out[pickKind(rand, arrange01)] += 1;
  return out;
}

function stub(kind: ObstacleKind): Obstacle {
  return {
    id: 0,
    kind,
    x: 0,
    z: 0,
    size: 1,
    hitR: 1,
    hitInnerR: 0,
    baseX: 0,
    baseZ: 0,
    moveAmp: 0,
    moveAxis: "x",
    movePhase: 0,
    moveSpeed: 0,
    telegraphT: 0,
    moving: false,
  };
}

describe("pickKind follows the open stems", () => {
  it("hush bed is almost all spires (bass)", () => {
    const c = counts(0.24);
    expect(c.spire / 4000).toBeGreaterThan(0.85);
    expect(dueKinds(0.24)).toEqual(["spire"]);
  });

  it("rings show up before hats open", () => {
    expect(dueKinds(0.36)).toEqual(["spire", "ring"]);
    const c = counts(0.36);
    expect(c.ring / 4000).toBeGreaterThan(0.25);
  });

  it("mid mix is the live stems", () => {
    const c = counts(0.5);
    expect((c.spire + c.ring + c.shard) / 4000).toBeGreaterThan(0.85);
    expect(c.ring).toBeGreaterThan(c.monolith);
  });

  it("full mix uses every kind", () => {
    const c = counts(0.9);
    expect(c.spire).toBeGreaterThan(200);
    expect(c.ring).toBeGreaterThan(200);
    expect(c.shard).toBeGreaterThan(200);
    expect(c.monolith).toBeGreaterThan(200);
  });

  it("missing live kind is spawned first", () => {
    const field = [stub("spire"), stub("spire"), stub("spire")];
    expect(pickNeededKind(() => 0.9, 0.4, field)).toBe("ring");
  });
});
