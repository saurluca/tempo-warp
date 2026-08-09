/** All feel numbers live here — never bury magic values in the render loop. */

export const tuning = {
  /** Top speed once throttle has fully spun up */
  maxSpeed: 48,

  /**
   * Car-like throttle: hold click to spool up, release to coast.
   * throttleRise ~ seconds toward full; throttleFall ~ seconds back to idle.
   */
  throttleRise: 1.35,
  throttleFall: 2.4,
  /** Engine push while throttling (world units / s² at full throttle) */
  engineAccel: 38,
  /** Gentle steer while coasting / aiming without full gas */
  steerAccel: 14,
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

  /** Fewer, larger obstacles */
  densityMin: 3,
  densityMax: 12,
  spawnSpacingMax: 14,
  spawnSpacingMin: 5.5,
  spawnRingMin: 16,
  spawnRingMax: 34,
  clearBubble: 8,
  cullRadius: 52,
  safeRingCount: 3,
  safeRingRadius: 12,
  moverChanceMin: 0.08,
  moverChanceMax: 0.35,
  obstacleHalfMin: 1.15,
  obstacleHalfMax: 2.6,
} as const;
