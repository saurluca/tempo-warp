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

/** Ease-out so early boost stays timid; late boost gets dense. Radius = |origin|. */
export function densityAt(speed01: number, radius = 0, ease = 0): number {
  const t = clamp01(speed01);
  const curved = 1 - (1 - t) * (1 - t);
  const bySpeed = tuning.densityMin + (tuning.densityMax - tuning.densityMin) * curved;
  const radialT = clamp01(radius / tuning.densityRadialReach);
  const raw = bySpeed + tuning.densityRadialExtra * radialT * radialT;
  return raw * (1 - clamp01(ease) * tuning.densityEaseCut);
}

/** Spacing between spawn attempts — shrinks as density rises. */
export function spawnSpacingAt(speed01: number, radius = 0, ease = 0): number {
  const d = densityAt(speed01, radius, ease);
  const dMax = tuning.densityMax + tuning.densityRadialExtra;
  const t = (d - tuning.densityMin) / Math.max(0.0001, dMax - tuning.densityMin);
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
