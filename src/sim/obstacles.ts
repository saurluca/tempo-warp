import { mulberry32 } from "../rng";
import { tuning } from "../tuning";
import type { Obstacle } from "./types";
import { densityAt, moverChanceAt, spawnSpacingAt } from "./world";

export interface ObstacleField {
  obstacles: Obstacle[];
  step: (dt: number, time: number, px: number, pz: number, speed01: number) => void;
}

function makeObstacle(
  id: number,
  x: number,
  z: number,
  rand: () => number,
  moving: boolean,
): Obstacle {
  const span = tuning.obstacleHalfMax - tuning.obstacleHalfMin;
  const halfW = tuning.obstacleHalfMin + rand() * span;
  const halfD = tuning.obstacleHalfMin + rand() * span;
  return {
    id,
    x,
    z,
    baseX: x,
    baseZ: z,
    halfW,
    halfD,
    moveAmp: moving ? 1.8 + rand() * 2.8 : 0,
    moveAxis: rand() > 0.5 ? "x" : "z",
    movePhase: rand() * Math.PI * 2,
    moveSpeed: 0.7 + rand() * 1.4,
    telegraphT: 0,
    moving,
  };
}

export function createObstacleField(seed: number): ObstacleField {
  const rand = mulberry32(seed >>> 0);
  const obstacles: Obstacle[] = [];
  let nextId = 1;
  let spawnAcc = 0;

  // Quiet opening: a few distant static pillars
  for (let i = 0; i < tuning.safeRingCount; i++) {
    const angle = (i / tuning.safeRingCount) * Math.PI * 2 + rand() * 0.3;
    const dist = tuning.safeRingRadius + rand() * 4;
    obstacles.push(
      makeObstacle(nextId++, Math.cos(angle) * dist, Math.sin(angle) * dist, rand, false),
    );
  }

  const recycleOrCull = (px: number, pz: number) => {
    const maxDist = tuning.cullRadius;
    for (let i = obstacles.length - 1; i >= 0; i--) {
      const o = obstacles[i]!;
      const dx = o.baseX - px;
      const dz = o.baseZ - pz;
      if (dx * dx + dz * dz > maxDist * maxDist) {
        obstacles.splice(i, 1);
      }
    }
  };

  const trySpawn = (px: number, pz: number, speed01: number) => {
    const target = Math.floor(densityAt(speed01));
    if (obstacles.length >= target) return;

    const dist = tuning.spawnRingMin + rand() * (tuning.spawnRingMax - tuning.spawnRingMin);
    const angle = rand() * Math.PI * 2;
    const x = px + Math.cos(angle) * dist;
    const z = pz + Math.sin(angle) * dist;

    // Keep a clear bubble around the player
    if (Math.hypot(x - px, z - pz) < tuning.clearBubble) return;

    // Avoid stacking on existing bases
    for (const o of obstacles) {
      if (Math.hypot(o.baseX - x, o.baseZ - z) < 4.5) return;
    }

    const moving = rand() < moverChanceAt(speed01);
    obstacles.push(makeObstacle(nextId++, x, z, rand, moving));
  };

  return {
    obstacles,
    step(dt, time, px, pz, speed01) {
      recycleOrCull(px, pz);

      const spacing = spawnSpacingAt(speed01);
      // Advance spawn accumulator by player motion proxy (speed * dt)
      spawnAcc += Math.max(speed01, 0.08) * tuning.maxSpeed * dt;
      while (spawnAcc >= spacing) {
        spawnAcc -= spacing;
        trySpawn(px, pz, speed01);
      }

      // Soft fill if too empty while boosting
      if (speed01 > 0.35 && obstacles.length < densityAt(speed01) * 0.7) {
        trySpawn(px, pz, speed01);
      }

      for (const o of obstacles) {
        if (!o.moving || o.moveAmp <= 0) {
          o.x = o.baseX;
          o.z = o.baseZ;
          o.telegraphT = 0;
          continue;
        }
        const phase = time * o.moveSpeed + o.movePhase;
        const wave = Math.sin(phase);
        // Telegraph peaks near direction changes (|cos| high)
        o.telegraphT = Math.abs(Math.cos(phase));
        if (o.moveAxis === "x") {
          o.x = o.baseX + wave * o.moveAmp;
          o.z = o.baseZ;
        } else {
          o.x = o.baseX;
          o.z = o.baseZ + wave * o.moveAmp;
        }
      }
    },
  };
}
