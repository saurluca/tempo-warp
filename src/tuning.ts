/** All feel numbers live here — never bury magic values in the render loop. */

export const tuning = {
  /** World units per second at speed01 = 1 */
  maxSpeed: 28,
  chaseAccel: 55,
  boostAccelMult: 2.4,
  drag: 3.2,
  playerRadius: 0.55,

  /** Visual */
  hushColor: 0x3a6b8c,
  surgeColor: 0xff9a3c,
  clearColor: 0x0a0e14,
  playerEmissiveHush: 0x1a3a55,
  playerEmissiveSurge: 0xff6a1a,
  stretchMax: 1.65,
  warpMax: 1,

  /** Camera */
  cameraHeight: 32,
  cameraLookOffset: 0,
  cameraFollow: 8,

  /** Fail */
  shatterRecover: 0.55,
  shatterInvuln: 0.35,

  /** Audio */
  audioFilterOpen: 1400,

  /** Obstacle field — density is target count near player */
  densityMin: 6,
  densityMax: 42,
  spawnSpacingMax: 7,
  spawnSpacingMin: 1.6,
  spawnRingMin: 12,
  spawnRingMax: 26,
  clearBubble: 5.5,
  cullRadius: 40,
  safeRingCount: 6,
  safeRingRadius: 9,
  moverChanceMin: 0.1,
  moverChanceMax: 0.55,
} as const;
