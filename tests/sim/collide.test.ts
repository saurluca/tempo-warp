import { describe, expect, it } from "vitest";
import { playerHitsObstacle } from "../../src/sim/collide";
import { createPlayer } from "../../src/sim/player";
import type { Obstacle } from "../../src/sim/types";

function obs(partial: Partial<Obstacle> & Pick<Obstacle, "kind" | "x" | "z" | "hitR">): Obstacle {
  return {
    id: 1,
    size: 1,
    hitInnerR: 0,
    moveAmp: 0,
    moveAxis: "x",
    movePhase: 0,
    moveSpeed: 0,
    baseX: partial.x,
    baseZ: partial.z,
    telegraphT: 0,
    moving: false,
    ...partial,
  };
}

describe("collision shapes", () => {
  it("spire hits on the solid core only", () => {
    const p = createPlayer();
    p.x = 0;
    p.z = 0;
    const solid = obs({ kind: "spire", x: 0.5, z: 0, hitR: 0.4 });
    const far = obs({ kind: "spire", x: 3, z: 0, hitR: 0.4 });
    expect(playerHitsObstacle(p, solid)).toBe(true);
    expect(playerHitsObstacle(p, far)).toBe(false);
  });

  it("ring allows passing through the hole", () => {
    const p = createPlayer();
    p.x = 0;
    p.z = 0;
    const ring = obs({ kind: "ring", x: 0, z: 0, hitR: 2, hitInnerR: 1.2 });
    // Center of ring — should be safe
    expect(playerHitsObstacle(p, ring)).toBe(false);
    // On the rim
    p.x = 1.6;
    expect(playerHitsObstacle(p, ring)).toBe(true);
  });
});
