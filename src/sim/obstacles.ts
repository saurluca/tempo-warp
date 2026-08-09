import { mulberry32 } from "../rng";
import { tuning } from "../tuning";
import type { Obstacle } from "./types";

export function spawnPlaceholders(seed: number): Obstacle[] {
  const rand = mulberry32(seed >>> 0);
  const list: Obstacle[] = [];
  const count = tuning.placeholderObstacleCount;
  let id = 1;

  for (let i = 0; i < count; i++) {
    // Ring around origin so spawn is clear
    const angle = (i / count) * Math.PI * 2 + rand() * 0.4;
    const dist = 6 + rand() * 10;
    const x = Math.cos(angle) * dist;
    const z = Math.sin(angle) * dist;
    const halfW = 0.45 + rand() * 0.55;
    const halfD = 0.45 + rand() * 0.55;
    const moving = rand() > 0.55;
    list.push({
      id: id++,
      x,
      z,
      baseX: x,
      baseZ: z,
      halfW,
      halfD,
      moveAmp: moving ? 1.5 + rand() * 2 : 0,
      moveAxis: rand() > 0.5 ? "x" : "z",
      movePhase: rand() * Math.PI * 2,
      moveSpeed: 0.6 + rand() * 1.2,
      telegraphT: 0,
      moving,
    });
  }

  return list;
}

export function stepObstacles(obstacles: Obstacle[], _dt: number, time: number): void {
  for (const o of obstacles) {
    if (!o.moving || o.moveAmp <= 0) {
      o.x = o.baseX;
      o.z = o.baseZ;
      continue;
    }
    // Soft telegraph: brighter when near turning points — handled in view via phase
    const wave = Math.sin(time * o.moveSpeed + o.movePhase);
    if (o.moveAxis === "x") {
      o.x = o.baseX + wave * o.moveAmp;
      o.z = o.baseZ;
    } else {
      o.x = o.baseX;
      o.z = o.baseZ + wave * o.moveAmp;
    }
    o.telegraphT = Math.abs(Math.cos(time * o.moveSpeed + o.movePhase));
  }
}
