export interface Vec2 {
  x: number;
  z: number;
}

export interface PlayerState {
  x: number;
  z: number;
  vx: number;
  vz: number;
  speed01: number;
  /** 0..1 spool — rises while holding, falls slowly on release */
  throttle: number;
  /** True while primary is held (input), not the same as “going fast” */
  boosting: boolean;
  /** Seconds remaining of post-shatter soft look / invuln flash. */
  shatterT: number;
  /**
   * After a hit, ignore collisions until the player is fully clear of all
   * hazards — prevents “stopped on nothing” re-shatters while overlapping.
   */
  clearOfHazards: boolean;
}

export type ObstacleKind = "spire" | "monolith" | "ring" | "shard";

export interface Obstacle {
  id: number;
  kind: ObstacleKind;
  x: number;
  z: number;
  /** Visual / placement scale */
  size: number;
  /** Collision radius (circle) or ring outer radius */
  hitR: number;
  /** Ring inner radius (pass-through hole); 0 for solid kinds */
  hitInnerR: number;
  /** Moving obstacles: amplitude along axis */
  moveAmp: number;
  moveAxis: "x" | "z";
  movePhase: number;
  moveSpeed: number;
  /** Base position before motion */
  baseX: number;
  baseZ: number;
  telegraphT: number;
  moving: boolean;
}

export interface SimState {
  player: PlayerState;
  obstacles: Obstacle[];
  shatterCount: number;
}
