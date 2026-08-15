import { mulberry32 } from "../rng";
import { tuning } from "../tuning";
import type { Obstacle, ObstacleKind } from "./types";
import { densityAt, moverChanceAt, spawnSpacingAt } from "./world";

export interface ObstacleField {
  obstacles: Obstacle[];
  ease: number;
  noteHit: () => void;
  step: (
    dt: number,
    time: number,
    px: number,
    pz: number,
    speed01: number,
    headingX: number,
    headingZ: number,
    arrange01?: number,
  ) => void;
}

/** Same stem-open gates as audio/bus applyMix. Visible a bit before you hear them. */
const KIND_LEAD = 0.12;
const KIND_GATE: { kind: ObstacleKind; gate: number }[] = [
  { kind: "spire", gate: 0.22 },
  { kind: "ring", gate: 0.45 },
  { kind: "shard", gate: 0.62 },
  { kind: "monolith", gate: 0.78 },
];

function kindWeight(arrange01: number, gate: number): number {
  if (arrange01 >= gate - KIND_LEAD) return 1;
  const t = Math.max(0, (arrange01 - (gate - KIND_LEAD - 0.06)) / 0.06);
  return t * t * 0.1;
}

export function dueKinds(arrange01: number): ObstacleKind[] {
  return KIND_GATE.filter((k) => arrange01 >= k.gate - KIND_LEAD).map((k) => k.kind);
}

/** Live stems (and ones about to open) dominate. */
export function pickKind(rand: () => number, arrange01 = 1): ObstacleKind {
  let total = 0;
  const weights = KIND_GATE.map((k) => {
    const w = kindWeight(arrange01, k.gate);
    total += w;
    return w;
  });
  let r = rand() * Math.max(total, 1e-6);
  for (let i = 0; i < KIND_GATE.length; i++) {
    r -= weights[i]!;
    if (r <= 0) return KIND_GATE[i]!.kind;
  }
  return "spire";
}

function countKind(list: Obstacle[], kind: ObstacleKind): number {
  let n = 0;
  for (const o of list) if (o.kind === kind) n += 1;
  return n;
}

/** Prefer a live kind the field is short on, so the beat has bodies in view. */
export function pickNeededKind(rand: () => number, arrange01: number, list: Obstacle[]): ObstacleKind {
  const due = dueKinds(arrange01);
  if (due.length === 0) return pickKind(rand, arrange01);
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
  return pickKind(rand, arrange01);
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
  let ease = 0;

  for (let i = 0; i < tuning.safeRingCount; i++) {
    const angle = (i / tuning.safeRingCount) * Math.PI * 2 + rand() * 0.25;
    const dist = tuning.safeRingRadius + rand() * 8;
    const kind = pickKind(rand, 0.24);
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
    arrange01: number,
    forcedKind?: ObstacleKind,
  ) => {
    const radius = Math.hypot(px, pz);
    const target = Math.floor(densityAt(speed01, radius, ease));
    const slack = forcedKind ? 3 : 0;
    if (obstacles.length >= target + slack) return false;

    const dist = tuning.spawnRingMin + rand() * (tuning.spawnRingMax - tuning.spawnRingMin);
    const angle = pickSpawnAngle(rand, headingX, headingZ);
    const x = px + Math.cos(angle) * dist;
    const z = pz + Math.sin(angle) * dist;

    if (Math.hypot(x - px, z - pz) < tuning.clearBubble) return false;

    for (const o of obstacles) {
      if (Math.hypot(o.baseX - x, o.baseZ - z) < 5.5) return false;
    }

    const moving = rand() < moverChanceAt(speed01);
    const kind = forcedKind ?? pickNeededKind(rand, arrange01, obstacles);
    obstacles.push(makeObstacle(nextId++, x, z, rand, moving, kind));
    return true;
  };

  return {
    obstacles,
    get ease() {
      return ease;
    },
    noteHit() {
      ease = Math.min(1, ease + tuning.densityEaseHit);
    },
    step(dt, time, px, pz, speed01, headingX, headingZ, arrange01 = 1) {
      ease = Math.max(0, ease - dt * tuning.densityEaseDecay);
      recycleOrCull(px, pz);

      const radius = Math.hypot(px, pz);
      const spacing = spawnSpacingAt(speed01, radius, ease);
      spawnAcc += Math.max(speed01, 0.08) * tuning.maxSpeed * dt;
      while (spawnAcc >= spacing) {
        spawnAcc -= spacing;
        trySpawn(px, pz, speed01, headingX, headingZ, arrange01);
      }

      if (obstacles.length < densityAt(speed01, radius, ease) * 0.7) {
        trySpawn(px, pz, speed01, headingX, headingZ, arrange01);
      }

      for (const kind of dueKinds(arrange01)) {
        if (countKind(obstacles, kind) === 0) {
          trySpawn(px, pz, speed01, headingX, headingZ, arrange01, kind);
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
