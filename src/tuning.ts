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

  /** Camera */
  cameraHeight: 32,
  cameraLookOffset: 0,

  /** Placeholder until obstacle system lands */
  placeholderObstacleCount: 8,
} as const;
