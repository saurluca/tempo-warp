import { isMobile } from "../flags";
import { tuning } from "../tuning";

export function maxSpeed(): number {
  return isMobile() ? tuning.maxSpeed * tuning.mobileSpeedScale : tuning.maxSpeed;
}

const clamp01 = (t: number) => Math.min(1, Math.max(0, t));

export function radiusOf(x: number, z: number): number {
  return Math.hypot(x, z);
}

/** 0 at origin, 1 at the sanctuary rim. */
export function radius01At(radius: number): number {
  return clamp01(radius / tuning.sanctuaryRadius);
}

/** Band rims plus repeats past the last edge. */
export function currentRims(radius: number): number[] {
  const edges: number[] = [...tuning.bandEdges];
  const last = edges[edges.length - 1]!;
  const step = tuning.currentRepeat;
  if (step > 0) {
    const extra = Math.max(0, Math.ceil((radius - last) / step) + 1);
    for (let k = 1; k <= extra; k++) edges.push(last + k * step);
  }
  return edges;
}

/** How many current rims you've passed (climbs forever past the last band). */
export function currentIndex(radius: number): number {
  let n = 0;
  for (const edge of currentRims(radius)) {
    if (radius >= edge) n += 1;
  }
  return n;
}

/** 0..1 — peaks on a current rim, dies outside currentWidth. */
export function currentStrength(radius: number): number {
  let best = 0;
  for (const edge of currentRims(radius)) {
    const t = 1 - Math.abs(radius - edge) / tuning.currentWidth;
    if (t > best) best = t;
  }
  return Math.max(0, best);
}

/** 0 hush … 4 sanctuary */
export function bandAt(radius: number): number {
  const edges = tuning.bandEdges;
  for (let i = 0; i < edges.length; i++) {
    if (radius < edges[i]!) return i;
  }
  return edges.length;
}

/** 0 until the last stretch, 1 inside the sanctuary. */
export function sanctuaryAt(radius: number): number {
  return clamp01((radius01At(radius) - 0.88) / 0.12);
}

/** Snap to the previous band after a shatter. Hush does not teleport. */
export function inwardBandRadius(radius: number): number {
  const edges = tuning.bandEdges;
  if (radius < edges[0]!) return radius;
  for (let i = edges.length - 1; i >= 0; i--) {
    if (radius >= edges[i]!) {
      const lo = i === 0 ? 0 : edges[i - 1]!;
      const hi = edges[i]!;
      return lo + (hi - lo) * tuning.shatterInwardT;
    }
  }
  return radius;
}

/** Objects/s added at this count. Fastest at densityMin, always > 0 while moving. */
export function densityGrowRate(density: number, speed01: number): number {
  const extra = Math.max(0, density - tuning.densityMin);
  return Math.max(0, speed01) * tuning.densityGrow / (1 + extra / tuning.densityGrowScale);
}

export function stepDensity(density: number, speed01: number, dt: number): number {
  return density + densityGrowRate(density, speed01) * dt;
}

/** Drop the current count by a fraction. Next grow uses that number — no catch-up. */
export function densityAfterHit(density: number): number {
  return Math.max(tuning.densityMin, density * (1 - tuning.densityHitCut));
}

/** Spacing between spawn attempts — shrinks toward min as the field fills. */
export function spawnSpacingAt(density: number): number {
  const extra = Math.max(0, density - tuning.densityMin);
  const t = extra / (extra + tuning.densityGrowScale);
  return tuning.spawnSpacingMax + (tuning.spawnSpacingMin - tuning.spawnSpacingMax) * t;
}

/** Ground warp amplitude 0..1 from speed. */
export function warpAt(speed01: number, _radius = 0): number {
  const t = clamp01(speed01);
  return t * t * tuning.warpMax;
}

/** Fraction of obstacles that should be movers at this speed. */
export function moverChanceAt(speed01: number): number {
  const t = clamp01(speed01);
  return tuning.moverChanceMin + (tuning.moverChanceMax - tuning.moverChanceMin) * t;
}
