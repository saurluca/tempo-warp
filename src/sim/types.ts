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
}

export interface Obstacle {
  id: number;
  x: number;
  z: number;
  halfW: number;
  halfD: number;
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
