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
  /** Lateral / aim assist push (keeps turns lively without hard accel) */
  steerAccel: 16,
  /**
   * How quickly velocity rotates toward aim (1/s). Higher = snappier turning
   * without adding much forward speed.
   */
  turnAgility: 7.5,
  /** Low coast drag (1/s). Higher = stops sooner. Keep low for car glide. */
  coastDrag: 0.35,
  /** Extra drag only used as soft speed limiter near max */
  speedLimitDrag: 1.8,

  playerRadius: 0.42,
  /** Collision smaller than glow so neon edges don't fake-hit */
  hitboxScale: 0.82,

  /** Visual */
  hushColor: 0x3a6b8c,
  surgeColor: 0xff9a3c,
  clearColor: 0x0a0e14,
  playerEmissiveHush: 0x1a3a55,
  playerEmissiveSurge: 0xff6a1a,
  stretchMax: 1.85,
  warpMax: 1,
  /** Lower = see farther; keep hazards readable before they reach you */
  fogDensity: 0.008,

  /** Camera — larger viewSize = wider overview (everything reads smaller) */
  cameraHeight: 52,
  cameraLookOffset: 0,
  cameraFollow: 6,

  /** Fail */
  shatterRecover: 0.55,
  shatterInvuln: 0.4,

  /** Audio */
  audioFilterOpen: 1400,

  /**
   * Sparse obstacles — spawn OUTSIDE the visible ortho frame so they
   * scroll into view with reaction time (not pop onto the player).
   * With cameraHeight ~52, half-view ≈ 26; keep spawnRingMin above that.
   */
  densityMin: 2,
  densityMax: 6,
  spawnSpacingMax: 22,
  spawnSpacingMin: 10,
  spawnRingMin: 44,
  spawnRingMax: 72,
  clearBubble: 14,
  cullRadius: 90,
  safeRingCount: 3,
  safeRingRadius: 48,
  /** Bias spawns into the travel/aim cone (0 = full ring, 1 = only ahead) */
  spawnForwardBias: 0.72,
  moverChanceMin: 0.08,
  moverChanceMax: 0.35,
  obstacleHalfMin: 0.85,
  obstacleHalfMax: 1.9,
} as const;
