/** All feel numbers live here — never bury magic values in the render loop. */

export const tuning = {
  /** Top speed once throttle has fully spun up */
  maxSpeed: 48,

  /**
   * Car-like throttle: hold click to spool up, release to coast.
   * throttleRise ~ seconds toward full; throttleFall ~ seconds back to idle.
   */
  throttleRise: 2.1,
  throttleFall: 2.8,
  /** Engine push while throttling (world units / s² at full throttle) */
  engineAccel: 22,
  /** Gentle steer while coasting / aiming without full gas */
  steerAccel: 9,
  /** Low coast drag (1/s). Higher = stops sooner. Keep low for car glide. */
  coastDrag: 0.35,
  /** Extra drag only used as soft speed limiter near max */
  speedLimitDrag: 1.8,

  playerRadius: 0.55,

  /** Visual */
  hushColor: 0x3a6b8c,
  surgeColor: 0xff9a3c,
  clearColor: 0x0a0e14,
  playerEmissiveHush: 0x1a3a55,
  playerEmissiveSurge: 0xff6a1a,
  stretchMax: 1.85,
  warpMax: 1,

  /** Camera */
  cameraHeight: 36,
  cameraLookOffset: 0,
  cameraFollow: 6,

  /** Fail */
  shatterRecover: 0.55,
  shatterInvuln: 0.4,

  /** Audio */
  audioFilterOpen: 1400,

  /** Sparse, larger obstacles */
  densityMin: 2,
  densityMax: 6,
  spawnSpacingMax: 20,
  spawnSpacingMin: 9,
  spawnRingMin: 18,
  spawnRingMax: 38,
  clearBubble: 10,
  cullRadius: 56,
  safeRingCount: 2,
  safeRingRadius: 14,
  moverChanceMin: 0.08,
  moverChanceMax: 0.35,
  obstacleHalfMin: 1.15,
  obstacleHalfMax: 2.6,
} as const;
