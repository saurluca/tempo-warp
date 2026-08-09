import { mulberry32 } from "../rng";
import { tuning } from "../tuning";
import type { Obstacle, ObstacleKind } from "./types";
import { densityAt, moverChanceAt, spawnSpacingAt } from "./world";

export interface ObstacleField {
  obstacles: Obstacle[];
  step: (
    dt: number,
    time: number,
    px: number,
    pz: number,
    speed01: number,
    headingX: number,
    headingZ: number,
  ) => void;
}

function pickKind(rand: () => number): ObstacleKind {
  const r = rand();
  if (r < 0.28) return "spire";
  if (r < 0.5) return "monolith";
  if (r < 0.74) return "ring";
  return "shard";
}

function makeObstacle(
  id: number,
  x: number,
  z: number,
  rand: () => number,
  moving: boolean,
  kind: ObstacleKind = pickKind(rand),
): Obstacle {
  const span = tuning.obstacleHalfMax - tuning.obstacleHalfMin;
  const size = tuning.obstacleHalfMin + rand() * span;

  // Match neon meshes — oversized pads felt like ghost hits in empty air
  let hitR = size * 0.72;
  let hitInnerR = 0;
  if (kind === "ring") {
    // TorusGeometry(size * 1.05, size * 0.22)
    hitR = size * 1.05 + size * 0.22;
    hitInnerR = Math.max(0, size * 1.05 - size * 0.22);
  } else if (kind === "monolith") {
    // BoxGeometry half-extent on XZ is size * 0.35
    hitR = size * 0.35;
  } else if (kind === "shard") {
    hitR = size * 0.5;
  }

  return {
    id,
    kind,
    x,
    z,
    size,
    hitR,
    hitInnerR,
    baseX: x,
    baseZ: z,
    moveAmp: moving ? 1.4 + rand() * 2.2 : 0,
    moveAxis: rand() > 0.5 ? "x" : "z",
    movePhase: rand() * Math.PI * 2,
    moveSpeed: 0.7 + rand() * 1.4,
    telegraphT: 0,
    moving,
  };
}

function pickSpawnAngle(rand: () => number, headingX: number, headingZ: number): number {
  const hLen = Math.hypot(headingX, headingZ);
  if (hLen < 0.05 || tuning.spawnForwardBias <= 0) {
    return rand() * Math.PI * 2;
  }
  const base = Math.atan2(headingZ, headingX);
  if (rand() < tuning.spawnForwardBias) {
    const halfCone = (Math.PI * 2) / 5;
    return base + (rand() * 2 - 1) * halfCone;
  }
  return rand() * Math.PI * 2;
}

export function createObstacleField(seed: number): ObstacleField {
  const rand = mulberry32(seed >>> 0);
  const obstacles: Obstacle[] = [];
  let nextId = 1;
  let spawnAcc = 0;

  for (let i = 0; i < tuning.safeRingCount; i++) {
    const angle = (i / tuning.safeRingCount) * Math.PI * 2 + rand() * 0.25;
    const dist = tuning.safeRingRadius + rand() * 8;
    // Opening ring: readable solids, no rings (teach collision first)
    const kind: ObstacleKind = rand() > 0.5 ? "spire" : "monolith";
    obstacles.push(
      makeObstacle(
        nextId++,
        Math.cos(angle) * dist,
        Math.sin(angle) * dist,
        rand,
        false,
        kind,
      ),
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

  const trySpawn = (
    px: number,
    pz: number,
    speed01: number,
    headingX: number,
    headingZ: number,
  ) => {
    const target = Math.floor(densityAt(speed01));
    if (obstacles.length >= target) return;

    const dist = tuning.spawnRingMin + rand() * (tuning.spawnRingMax - tuning.spawnRingMin);
    const angle = pickSpawnAngle(rand, headingX, headingZ);
    const x = px + Math.cos(angle) * dist;
    const z = pz + Math.sin(angle) * dist;

    if (Math.hypot(x - px, z - pz) < tuning.clearBubble) return;

    for (const o of obstacles) {
      if (Math.hypot(o.baseX - x, o.baseZ - z) < 5.5) return;
    }

    const moving = rand() < moverChanceAt(speed01);
    obstacles.push(makeObstacle(nextId++, x, z, rand, moving));
  };

  return {
    obstacles,
    step(dt, time, px, pz, speed01, headingX, headingZ) {
      recycleOrCull(px, pz);

      const spacing = spawnSpacingAt(speed01);
      spawnAcc += Math.max(speed01, 0.08) * tuning.maxSpeed * dt;
      while (spawnAcc >= spacing) {
        spawnAcc -= spacing;
        trySpawn(px, pz, speed01, headingX, headingZ);
      }

      if (speed01 > 0.35 && obstacles.length < densityAt(speed01) * 0.7) {
        trySpawn(px, pz, speed01, headingX, headingZ);
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
