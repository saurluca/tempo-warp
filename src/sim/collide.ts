import { tuning } from "../tuning";
import type { Obstacle, PlayerState } from "./types";

/**
 * Shape-aware collision. Hit volumes are slightly smaller than visuals
 * so you don't shatter on empty neon glow / ring holes.
 */
export function playerHitsObstacle(p: PlayerState, o: Obstacle): boolean {
  const pr = tuning.playerRadius * tuning.hitboxScale;
  const dx = p.x - o.x;
  const dz = p.z - o.z;
  const dist = Math.hypot(dx, dz);

  if (o.kind === "ring") {
    // Annulus: pass through the hole, clip the rim only
    const outer = o.hitR + pr;
    const inner = Math.max(0, o.hitInnerR - pr);
    return dist <= outer && dist >= inner;
  }

  // Solid kinds — circle vs circle (tight core)
  return dist < pr + o.hitR;
}

/** True if player overlaps any hazard (used to clear the post-hit latch). */
export function playerOverlapsAny(p: PlayerState, obstacles: Obstacle[]): boolean {
  for (const o of obstacles) {
    if (playerHitsObstacle(p, o)) return true;
  }
  return false;
}

/** Nudge player out of the first overlapping hazard. */
export function separatePlayer(p: PlayerState, obstacles: Obstacle[]): void {
  const pr = tuning.playerRadius * tuning.hitboxScale;
  for (const o of obstacles) {
    if (!playerHitsObstacle(p, o)) continue;
    const dx = p.x - o.x;
    const dz = p.z - o.z;
    let dist = Math.hypot(dx, dz);
    if (dist < 1e-5) {
      p.x += pr + o.hitR + 0.05;
      return;
    }
    if (o.kind === "ring") {
      // Push to nearest safe side of the rim (into the hole or outward)
      const mid = (o.hitInnerR + o.hitR) * 0.5;
      const target = dist < mid ? Math.max(0.01, o.hitInnerR - pr - 0.08) : o.hitR + pr + 0.08;
      const s = target / dist;
      p.x = o.x + dx * s;
      p.z = o.z + dz * s;
      return;
    }
    const need = pr + o.hitR + 0.08;
    const s = need / dist;
    p.x = o.x + dx * s;
    p.z = o.z + dz * s;
    return;
  }
}
