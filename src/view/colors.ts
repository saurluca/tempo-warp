import * as THREE from "three";
import { tuning } from "../tuning";

const hush = new THREE.Color(tuning.hushColor);
const surge = new THREE.Color(tuning.surgeColor);
const hushE = new THREE.Color(tuning.playerEmissiveHush);
const surgeE = new THREE.Color(tuning.playerEmissiveSurge);
const tmp = new THREE.Color();
const tmpE = new THREE.Color();

export function colorForSpeed(speed01: number): THREE.Color {
  return tmp.copy(hush).lerp(surge, speed01);
}

export function emissiveForSpeed(speed01: number): THREE.Color {
  return tmpE.copy(hushE).lerp(surgeE, speed01);
}
