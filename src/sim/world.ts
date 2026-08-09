import { tuning } from "../tuning";

/** Ease-out so early boost stays timid; late boost gets dense. */
export function densityAt(speed01: number): number {
  const t = Math.min(1, Math.max(0, speed01));
  const curved = 1 - (1 - t) * (1 - t);
  return (
    tuning.densityMin + (tuning.densityMax - tuning.densityMin) * curved
  );
}

/** Spacing between spawn attempts — shrinks as density rises. */
export function spawnSpacingAt(speed01: number): number {
  const d = densityAt(speed01);
  const t = (d - tuning.densityMin) / Math.max(0.0001, tuning.densityMax - tuning.densityMin);
  return tuning.spawnSpacingMax + (tuning.spawnSpacingMin - tuning.spawnSpacingMax) * t;
}

/** Ground warp amplitude 0..1 from speed. */
export function warpAt(speed01: number): number {
  const t = Math.min(1, Math.max(0, speed01));
  return t * t * tuning.warpMax;
}

/** Fraction of obstacles that should be movers at this speed. */
export function moverChanceAt(speed01: number): number {
  const t = Math.min(1, Math.max(0, speed01));
  return tuning.moverChanceMin + (tuning.moverChanceMax - tuning.moverChanceMin) * t;
}
