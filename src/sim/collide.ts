import { tuning } from "../tuning";
import type { Obstacle, PlayerState } from "./types";

function playerR(): number {
  return tuning.playerRadius * tuning.hitboxScale;
}

function ringBand(o: Obstacle, pr: number): { inner: number; outer: number } {
  return { outer: o.hitR + pr, inner: Math.max(0, o.hitInnerR - pr) };
}

function inRing(dist: number, o: Obstacle, pr: number): boolean {
  const { inner, outer } = ringBand(o, pr);
  return dist <= outer && dist >= inner;
}

function closestOnSeg(
  ax: number,
  az: number,
  bx: number,
  bz: number,
  px: number,
  pz: number,
): { x: number; z: number } {
  const dx = bx - ax;
  const dz = bz - az;
  const len2 = dx * dx + dz * dz;
  if (len2 < 1e-12) return { x: ax, z: az };
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / len2));
  return { x: ax + dx * t, z: az + dz * t };
}

/**
 * Shape-aware collision. Hit volumes are slightly smaller than visuals
 * so you don't shatter on empty neon glow / ring holes.
 */
export function playerHitsObstacle(p: PlayerState, o: Obstacle): boolean {
  return hitsAt(p.x, p.z, o);
}

export function hitsAt(x: number, z: number, o: Obstacle): boolean {
  const pr = playerR();
  const dist = Math.hypot(x - o.x, z - o.z);
  if (o.kind === "ring") return inRing(dist, o, pr);
  return dist < pr + o.hitR;
}

/** Segment vs glyph — catches thin rims skipped between frames. */
export function playerSweptObstacle(
  x0: number,
  z0: number,
  x1: number,
  z1: number,
  o: Obstacle,
): boolean {
  if (hitsAt(x0, z0, o) || hitsAt(x1, z1, o)) return true;
  const pr = playerR();
  const near = closestOnSeg(x0, z0, x1, z1, o.x, o.z);
  const dc = Math.hypot(near.x - o.x, near.z - o.z);
  if (o.kind === "ring") {
    const { inner, outer } = ringBand(o, pr);
    if (dc <= outer && dc >= inner) return true;
    const d0 = Math.hypot(x0 - o.x, z0 - o.z);
    const d1 = Math.hypot(x1 - o.x, z1 - o.z);
    return (d0 > outer && d1 < inner) || (d0 < inner && d1 > outer);
  }
  return dc < pr + o.hitR;
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
  const pr = playerR();
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
