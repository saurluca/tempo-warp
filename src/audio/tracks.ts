export const TRACK_IDS = ["neon", "drift", "surge"] as const;
export type TrackId = (typeof TRACK_IDS)[number];

export interface TrackDef {
  id: TrackId;
  label: string;
  /** Base BPM — can breathe slightly with speed */
  bpm: number;
  /** Kick pattern: 1 = hit, 0 = rest (16th notes, 1 bar) */
  kick: number[];
  snare: number[];
  hat: number[];
  /** Bass notes per 8th (null = rest) */
  bass: (string | null)[];
  /** Lead/arp notes per 16th */
  lead: (string | null)[];
  /** Pad chord root drone */
  pad: string;
  color: string;
}

export const TRACKS: Record<TrackId, TrackDef> = {
  neon: {
    id: "neon",
    label: "NEON",
    bpm: 128,
    color: "#4da3ff",
    kick: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1],
    snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
    hat: [1, 0, 1, 0, 1, 0, 1, 1, 1, 0, 1, 0, 1, 0, 1, 1],
    bass: ["C2", null, "C2", "G1", "A#1", null, "C2", null, "C2", null, "D#2", "C2", "G1", null, "A#1", null],
    lead: [
      "C4",
      null,
      "D#4",
      null,
      "G4",
      null,
      "D#4",
      "C4",
      null,
      "A#3",
      null,
      "G3",
      "A#3",
      null,
      "C4",
      null,
    ],
    pad: "C3",
  },
  drift: {
    id: "drift",
    label: "DRIFT",
    bpm: 92,
    color: "#3dffc8",
    kick: [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0],
    snare: [0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0],
    hat: [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 1, 0, 1, 0],
    bass: ["F1", null, null, "F1", null, null, "G#1", null, "A#1", null, null, "G#1", null, "F1", null, null],
    lead: [
      "F4",
      null,
      null,
      "G#4",
      null,
      null,
      "C5",
      null,
      null,
      "A#4",
      null,
      "G#4",
      null,
      "F4",
      null,
      null,
    ],
    pad: "F2",
  },
  surge: {
    id: "surge",
    label: "SURGE",
    bpm: 142,
    color: "#ff6a3a",
    kick: [1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 0],
    snare: [0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 1, 0, 1, 0, 1, 0],
    hat: [1, 1, 0, 1, 1, 0, 1, 1, 1, 0, 1, 1, 0, 1, 1, 1],
    bass: ["E1", "E1", null, "E2", "G1", null, "A1", null, "E1", null, "E2", "D2", "B1", null, "A1", "G1"],
    lead: [
      "E4",
      "G4",
      null,
      "B4",
      "E5",
      null,
      "D5",
      "B4",
      null,
      "A4",
      "G4",
      null,
      "E4",
      null,
      "G4",
      "A4",
    ],
    pad: "E2",
  },
};

export function pickRandomTrack(seed?: number): TrackId {
  const n = seed !== undefined ? Math.abs(seed) : Math.floor(Math.random() * 1e9);
  return TRACK_IDS[n % TRACK_IDS.length]!;
}

export function nextTrack(current: TrackId): TrackId {
  const i = TRACK_IDS.indexOf(current);
  return TRACK_IDS[(i + 1) % TRACK_IDS.length]!;
}
