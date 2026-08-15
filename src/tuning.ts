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
  engineAccel: 16,
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
  /**
   * If the pointer is this close to the craft, ignore aim and keep coasting
   * on current velocity — prevents self-aim from cancelling all speed.
   */
  aimDeadzone: 1.35,
  /**
   * Beyond the deadzone, blend from velocity heading → full aim over this
   * distance. Stops near-cursor orbit from reverse-accel dumping speed.
   */
  aimSoftZone: 3.5,

  /** Visual */
  hushColor: 0x3a6b8c,
  surgeColor: 0xff9a3c,
  clearColor: 0x0a0e14,
  playerEmissiveHush: 0x1a3a55,
  playerEmissiveSurge: 0xff6a1a,
  stretchMax: 2.15,
  warpMax: 1,
  /** Visual blob (hitbox stays playerRadius) */
  blobRadius: 1.15,
  /** Flat 2D glyphs */
  hazardFillOpacity: 0.55,
  hazardRimOpacity: 0.95,
  /** Lower = see farther; keep hazards readable before they reach you */
  fogDensity: 0.005,

  /** Camera — larger viewSize = wider overview (everything reads smaller) */
  cameraHeight: 64,
  cameraLookOffset: 0,
  cameraFollow: 6,

  /** Impact — knockback, not a hard freeze (keeps flow) */
  shatterRecover: 0.45,
  shatterInvuln: 0.55,
  /** Keep this fraction of incoming speed as outward knockback */
  impactSpeedKeep: 0.42,
  /** Floor knockback so you never hard-stop to zero */
  impactMinSpeed: 6,
  /** Throttle left after a hit (spool not fully wiped) */
  impactThrottleKeep: 0.2,

  /** Audio */
  audioFilterOpen: 1400,

  /**
   * Sparse obstacles — spawn OUTSIDE the visible ortho frame so they
   * scroll into view with reaction time (not pop onto the player).
   * With cameraHeight ~52, half-view ≈ 26; keep spawnRingMin above that.
   */
  densityMin: 4,
  densityMax: 14,
  /** Extra bodies as you leave the origin (center stays open) */
  densityRadialReach: 2000,
  densityRadialExtra: 32,

  /**
   * Journey bands from origin. Edges = hush|drift|surge|veil then sanctuary.
   * ~50s full-send to the rim at maxSpeed 48.
   */
  bandEdges: [400, 900, 1600, 2400],
  sanctuaryRadius: 2400,
  /** Band tints: hush, drift, surge, veil, sanctuary */
  bandColors: [0x3a6b8c, 0x3dffc8, 0xff6a3a, 0x7b5cff, 0xf2e6c8],
  bandClears: [0x0a0e14, 0x08141a, 0x140c0a, 0x0c0a16, 0x12141a],
  /** Music peak-hold decay (1/s). Shatter dumps faster. */
  musicHoldDecay: 0.11,
  musicHoldDecayShatter: 0.55,
  /** After a hit, land this far through the previous band (0..1). */
  shatterInwardT: 0.55,
  spawnSpacingMax: 16,
  spawnSpacingMin: 5,
  spawnRingMin: 52,
  spawnRingMax: 88,
  clearBubble: 12,
  cullRadius: 110,
  safeRingCount: 4,
  safeRingRadius: 90,
  /** Bias spawns into the travel/aim cone (0 = full ring, 1 = only ahead) */
  spawnForwardBias: 0.78,
  moverChanceMin: 0.14,
  moverChanceMax: 0.52,
  obstacleHalfMin: 1.05,
  obstacleHalfMax: 2.5,
} as const;
