import * as THREE from "three";
import { bandAt, radius01At } from "../sim/world";
import { tuning } from "../tuning";

const hush = new THREE.Color(tuning.hushColor);
const surge = new THREE.Color(tuning.surgeColor);
const hushE = new THREE.Color(tuning.playerEmissiveHush);
const surgeE = new THREE.Color(tuning.playerEmissiveSurge);
const tmp = new THREE.Color();
const tmpE = new THREE.Color();
const a = new THREE.Color();
const b = new THREE.Color();

export function colorForSpeed(speed01: number): THREE.Color {
  return tmp.copy(hush).lerp(surge, speed01);
}

export function emissiveForSpeed(speed01: number): THREE.Color {
  return tmpE.copy(hushE).lerp(surgeE, speed01);
}

/** Place tint from origin — lerps neighboring band colors. */
export function colorForRadius(radius: number): THREE.Color {
  const bands = tuning.bandColors;
  const edges = tuning.bandEdges;
  const i = Math.min(bandAt(radius), bands.length - 1);
  a.setHex(bands[i]!);
  if (i >= bands.length - 1) return tmp.copy(a);
  const lo = i === 0 ? 0 : edges[i - 1]!;
  const hi = edges[i]!;
  const t = (radius - lo) / Math.max(1e-3, hi - lo);
  b.setHex(bands[i + 1]!);
  return tmp.copy(a).lerp(b, Math.min(1, Math.max(0, t)));
}

export function clearForRadius(radius: number): THREE.Color {
  const clears = tuning.bandClears;
  const edges = tuning.bandEdges;
  const i = Math.min(bandAt(radius), clears.length - 1);
  a.setHex(clears[i]!);
  if (i >= clears.length - 1) return tmp.copy(a);
  const lo = i === 0 ? 0 : edges[i - 1]!;
  const hi = edges[i]!;
  const t = (radius - lo) / Math.max(1e-3, hi - lo);
  b.setHex(clears[i + 1]!);
  return tmp.copy(a).lerp(b, Math.min(1, Math.max(0, t)));
}

const hsl = { h: 0, s: 0, l: 0 };

/** Speed heats the band tint; sanctuary pulls toward the last band color. */
export function colorForJourney(speed01: number, radius: number): THREE.Color {
  const place = colorForRadius(radius);
  const heat = radius01At(radius);
  return tmp.copy(place).lerp(surge, speed01 * (0.35 + heat * 0.15));
}

/** Same journey hue, lifted so the craft stays readable on the wash. */
export function colorForBlob(speed01: number, radius: number): THREE.Color {
  colorForJourney(speed01, radius);
  tmp.getHSL(hsl);
  return tmp.setHSL(
    hsl.h,
    Math.min(1, hsl.s * 1.08),
    Math.min(0.74, Math.max(0.54, hsl.l * 1.18 + 0.1)),
  );
}
