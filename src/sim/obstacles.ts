import { dueKindsAt } from "../audio/tracks";
import { isMobile } from "../flags";
import { mulberry32 } from "../rng";
import { tuning } from "../tuning";
import type { Obstacle, ObstacleKind } from "./types";
import { densityAfterHit, moverChanceAt, spawnSpacingAt, stepDensity } from "./world";

export interface ObstacleField {
  obstacles: Obstacle[];
  density: number;
  noteHit: () => void;
  step: (
    dt: number,
    time: number,
    px: number,
    pz: number,
    speed01: number,
    headingX: number,
    headingZ: number,
    arrangeT?: number,
  ) => void;
}

export function dueKinds(arrangeT: number): ObstacleKind[] {
  return dueKindsAt(arrangeT);
}

/** Live stems (and ones about to open) dominate. */
export function pickKind(rand: () => number, arrangeT = 99): ObstacleKind {
  const due = dueKinds(arrangeT);
  if (due.length === 0) return "spire";
  return due[Math.floor(rand() * due.length)]!;
}

function countKind(list: Obstacle[], kind: ObstacleKind): number {
  let n = 0;
  for (const o of list) if (o.kind === kind) n += 1;
  return n;
}

/** Prefer a live kind the field is short on, so the beat has bodies in view. */
export function pickNeededKind(rand: () => number, arrangeT: number, list: Obstacle[]): ObstacleKind {
  const due = dueKinds(arrangeT);
  if (due.length === 0) return pickKind(rand, arrangeT);
  let need: ObstacleKind = due[0]!;
  let needN = Infinity;
  for (const k of due) {
    const n = countKind(list, k);
    if (n < needN) {
      needN = n;
      need = k;
    }
  }
  if (needN === 0) return need;
  const fair = list.length / due.length;
  if (needN < fair * 0.45 && rand() < 0.8) return need;
  return pickKind(rand, arrangeT);
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
  const scale = isMobile() ? tuning.mobileSizeScale : 1;
  const size = (tuning.obstacleHalfMin + rand() ** tuning.obstacleSizePower * span) * scale;

  // Match the 2D glyphs, a hair inside the ink so glow doesn't fake-hit
  let hitR = size * 1.05 * 0.94;
  let hitInnerR = 0;
  if (kind === "ring") {
    hitR = size * 1.15 * 0.96;
    hitInnerR = size * 0.55 * 1.04;
  } else if (kind === "monolith") {
    hitR = Math.hypot(size * 0.42, size * 0.95) * 0.94;
  } else if (kind === "shard") {
    hitR = Math.hypot(size * 1.05 * 0.9, size * 1.05 * 0.7) * 0.94;
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
    moveAmp: moving ? tuning.moveAmpMin + rand() * (tuning.moveAmpMax - tuning.moveAmpMin) : 0,
    moveAxis: rand() > 0.5 ? "x" : "z",
    movePhase: rand() * Math.PI * 2,
    moveSpeed: tuning.moveSpeedMin + rand() * (tuning.moveSpeedMax - tuning.moveSpeedMin),
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
  let density = tuning.densityMin;

  for (let i = 0; i < tuning.safeRingCount; i++) {
    const angle = (i / tuning.safeRingCount) * Math.PI * 2 + rand() * 0.25;
    const dist = tuning.safeRingRadius + rand() * 8;
    const kind = pickKind(rand, 0);
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
    arrangeT: number,
    forcedKind?: ObstacleKind,
  ) => {
    const target = Math.floor(density);
    const slack = forcedKind ? 3 : 0;
    if (obstacles.length >= target + slack) return false;

    const dist = tuning.spawnRingMin + rand() * (tuning.spawnRingMax - tuning.spawnRingMin);
    const angle = pickSpawnAngle(rand, headingX, headingZ);
    const x = px + Math.cos(angle) * dist;
    const z = pz + Math.sin(angle) * dist;

    if (Math.hypot(x - px, z - pz) < tuning.clearBubble) return false;

    for (const o of obstacles) {
      if (Math.hypot(o.baseX - x, o.baseZ - z) < tuning.obstacleHalfMax + 2.5) return false;
    }

    const moving = rand() < moverChanceAt(speed01);
    const kind = forcedKind ?? pickNeededKind(rand, arrangeT, obstacles);
    obstacles.push(makeObstacle(nextId++, x, z, rand, moving, kind));
    return true;
  };

  return {
    obstacles,
    get density() {
      return density;
    },
    noteHit() {
      density = densityAfterHit(density);
    },
    step(dt, time, px, pz, speed01, headingX, headingZ, arrangeT = 99) {
      density = stepDensity(density, speed01, dt);
      recycleOrCull(px, pz);

      const spacing = spawnSpacingAt(density);
      spawnAcc += Math.max(speed01, 0.08) * tuning.maxSpeed * dt;
      while (spawnAcc >= spacing) {
        spawnAcc -= spacing;
        trySpawn(px, pz, speed01, headingX, headingZ, arrangeT);
      }

      if (obstacles.length < density * 0.7) {
        trySpawn(px, pz, speed01, headingX, headingZ, arrangeT);
      }

      for (const kind of dueKinds(arrangeT)) {
        if (countKind(obstacles, kind) < 2) {
          trySpawn(px, pz, speed01, headingX, headingZ, arrangeT, kind);
          trySpawn(px, pz, speed01, headingX, headingZ, arrangeT, kind);
        }
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
