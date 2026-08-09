import { tuning } from "../tuning";
import type { Obstacle, PlayerState } from "./types";

/** Circle (player) vs AABB (obstacle). */
export function playerHitsObstacle(p: PlayerState, o: Obstacle): boolean {
  const r = tuning.playerRadius;
  const closestX = Math.max(o.x - o.halfW, Math.min(p.x, o.x + o.halfW));
  const closestZ = Math.max(o.z - o.halfD, Math.min(p.z, o.z + o.halfD));
  const dx = p.x - closestX;
  const dz = p.z - closestZ;
  return dx * dx + dz * dz < r * r;
}
