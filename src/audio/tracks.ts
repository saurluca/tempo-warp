/** DJ set order — adjacent BPM/key stay close so spinNext blends. */
export const TRACK_IDS = [
  "veil",
  "ember",
  "ash",
  "drift",
  "tide",
  "pulse",
  "quartz",
  "lumen",
  "coil",
  "neon",
  "halo",
  "nudge",
  "bloom",
  "viper",
  "surge",
  "razor",
] as const;
export type TrackId = (typeof TRACK_IDS)[number];

export interface TrackDef {
  id: TrackId;
  label: string;
  /** Base BPM — can breathe slightly with speed */
  bpm: number;
  /** Kick pattern: 1 = hit, 0 = rest (16th notes, 1+ bars) */
  kick: number[];
  snare: number[];
  hat: number[];
  /** Bass notes per 16th (null = rest) */
  bass: (string | null)[];
  /** Lead/arp notes per 16th */
  lead: (string | null)[];
  /** Pad chord root drone */
  pad: string;
  color: string;
}

/** x = hit, - = rest. Spaces/newlines ignored. */
function hit(s: string): number[] {
  const out: number[] = [];
  for (const c of s) {
    if (c === "x") out.push(1);
    else if (c === "-") out.push(0);
  }
  return out;
}

/** `.` is a rest. Each row is one bar — padded/trimmed to 16 so phrases stay on grid. */
function bars(...rows: string[]): (string | null)[] {
  return rows.flatMap((s) => {
    const row = s
      .trim()
      .split(/\s+/)
      .map((n) => (n === "." ? null : n));
    while (row.length < 16) row.push(null);
    row.length = 16;
    return row;
  });
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
  pulse: {
    id: "pulse",
    label: "PULSE",
    bpm: 110,
    color: "#c45cff",
    kick: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 1, 0],
    snare: [0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0],
    hat: [0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 1, 1, 0, 1, 0, 1],
    bass: ["A1", null, "A1", null, "A1", "C2", null, "E2", "A1", null, "G1", null, "A1", null, "C2", "A1"],
    lead: [
      "A3",
      null,
      "C4",
      null,
      "E4",
      null,
      null,
      "C4",
      "A3",
      null,
      "G3",
      null,
      "A3",
      "C4",
      null,
      "E4",
    ],
    pad: "A2",
  },
  veil: {
    id: "veil",
    label: "VEIL",
    bpm: 78,
    color: "#7ec8ff",
    kick: [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0],
    snare: [0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0],
    hat: [0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1, 0],
    bass: ["D2", null, null, null, "A1", null, null, null, "F1", null, null, "A1", null, null, "D2", null],
    lead: [
      "D4",
      null,
      null,
      null,
      "F4",
      null,
      null,
      "A4",
      null,
      null,
      "G4",
      null,
      "F4",
      null,
      null,
      null,
    ],
    pad: "D3",
  },
  razor: {
    id: "razor",
    label: "RAZOR",
    bpm: 155,
    color: "#ff3d6e",
    kick: [1, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 1, 0, 0, 1],
    snare: [0, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 1, 0, 1],
    hat: [1, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 1, 0, 1, 1],
    bass: ["G1", "G1", null, "A#1", "G1", null, "D2", "G1", null, "G2", "F2", null, "D2", "A#1", null, "G1"],
    lead: [
      "G4",
      null,
      "A#4",
      "D5",
      null,
      "G5",
      null,
      "F5",
      "D5",
      null,
      "A#4",
      null,
      "G4",
      "A#4",
      null,
      "D5",
    ],
    pad: "G2",
  },

  /** Warm dust — 2 bars, sits on veil's D */
  ember: {
    id: "ember",
    label: "EMBER",
    bpm: 84,
    color: "#ff8a4a",
    kick: hit("x------- ----x--- x------- ---x--x-"),
    snare: hit("-------- x------- ------x- x-------"),
    hat: hit("--x---x- --x---x- --x-x-x- --x---x-"),
    bass: bars("D2 . . . A1 . . D2 . . F1 . A1 . D2 .", "D2 . . A1 . . . F1 . . . A1 . C2 ."),
    lead: bars("D4 . . F4 . . A4 . . G4 . F4 . . .", "D4 . . . F4 . A4 . C5 . A4 . G4 . F4 ."),
    pad: "D3",
  },
  /** Trip-hop limp — 2 bars */
  ash: {
    id: "ash",
    label: "ASH",
    bpm: 90,
    color: "#9a8b7a",
    kick: hit("x------- x------- ----x--- x---x---"),
    snare: hit("-------- x------- -------- x------x"),
    hat: hit("--x---x- --x---x- --x-x-x- --x---x-"),
    bass: bars("A1 . . . A1 . C2 . E2 . . C2 . . A1 .", "G1 . . . A1 . . C2 . E2 . C2 . A1 ."),
    lead: bars("A3 . . C4 . . E4 . . C4 . A3 . . .", "G3 . . A3 . C4 . E4 . . D4 . C4 . A3 ."),
    pad: "A2",
  },
  /** Rolling dub — 2 bars */
  tide: {
    id: "tide",
    label: "TIDE",
    bpm: 100,
    color: "#2ec8a0",
    kick: hit("x------- x------- x------- x-----x-"),
    snare: hit("-------- ----x--- -------- ----x---"),
    hat: hit("--x---x- --x---x- --x---xx --x---x-"),
    bass: bars("G1 . G1 . A#1 . C2 . D2 . C2 . G1 . F1 .", "G1 . F1 . G1 . A#1 . C2 . D2 . C2 . G1 ."),
    lead: bars("G4 . . . A#4 . . D5 . . C5 . A#4 . G4 .", "F4 . G4 . A#4 . D5 . C5 . A#4 . G4 . ."),
    pad: "G2",
  },
  /** Crystal four-on-the-floor — 4 bars, fill on 4 */
  quartz: {
    id: "quartz",
    label: "QUARTZ",
    bpm: 120,
    color: "#d4e8ff",
    kick: hit("x---x--- x---x--- x---x--- x---x--- x---x--- x---x--- x---x--- x-x-x--x"),
    snare: hit("----x--- ----x--- ----x--- ----x--- ----x--- ----x--- ----x--- ----x-x-"),
    hat: hit("-x-x-x-x -x-x-x-x -x-x-x-x -x-x-xxx -x-x-x-x -x-x-x-x -x-x-x-x x-x-x-x-"),
    bass: bars(
      "G1 . D2 . G1 . . D2 G1 . A1 . D2 . G1 .",
      "G1 . D2 . G1 . C2 . B1 . A1 . G1 . D2 .",
      "G1 . D2 . G1 . D2 . G1 . F1 . D2 . G1 .",
      "G1 D2 G1 D2 A1 . B1 . C2 D2 B1 A1 G1 . D2 .",
    ),
    lead: bars(
      "G4 . . B4 . . D5 . . B4 . G4 . . .",
      "G4 . A4 . B4 . D5 . . C5 . B4 . A4 .",
      "G4 . . D5 . B4 . G4 . A4 . B4 . D5 .",
      "D5 . B4 . G4 . . E5 D5 B4 A4 G4 . D5 .",
    ),
    pad: "G3",
  },
  /** Bright electro — 2 bars */
  lumen: {
    id: "lumen",
    label: "LUMEN",
    bpm: 124,
    color: "#ffe566",
    kick: hit("x-----x- x---x--- x-----x- x---x--x"),
    snare: hit("----x--- ----x--- ----x--- --x-x---"),
    hat: hit("x-x-x-xx x-x-x-x- x-x-xx-x x-x-x-xx"),
    bass: bars("C2 . C1 . G1 . C2 . E2 . C2 . G1 . C2 .", "C1 . C2 . G1 . A1 . C2 . E2 . C2 . G1 ."),
    lead: bars("C5 . E4 . G4 . C5 . E5 . D5 . C5 . G4 .", "E4 . C5 . G4 . A4 . C5 . E5 . D5 . C5 ."),
    pad: "C3",
  },
  /** Acid walk — 2 bars */
  coil: {
    id: "coil",
    label: "COIL",
    bpm: 126,
    color: "#ff5ad5",
    kick: hit("x---x--- x---x--- x---x--- x---x--x"),
    snare: hit("----x--- ----x--- ----x--- ----x-x-"),
    hat: hit("x-xxx-x- x-x-x-xx x-xxx-x- x-x-xxxx"),
    bass: bars("A1 A#1 C2 A1 D2 C2 A1 G1 A1 C2 D2 E2 D2 C2 A1 G1", "A1 . C2 A1 D2 . E2 D2 C2 A1 G1 A1 C2 . A1 ."),
    lead: bars("A4 . C5 . E5 . A4 . G4 . E4 . C5 . A4 .", "A4 C5 . D5 E5 . D5 C5 . A4 . G4 E4 A4 . C5 ."),
    pad: "A2",
  },
  /** Two-step skip — 2 bars */
  halo: {
    id: "halo",
    label: "HALO",
    bpm: 130,
    color: "#a8f0ff",
    kick: hit("x------- ----x--- x------- ------x-"),
    snare: hit("-------- x------- -------- x---x---"),
    hat: hit("--x-x-x- --x---x- --x-x-xx --x---x-"),
    bass: bars("E1 . . . E2 . . B1 . . E1 . G1 . A1 .", "E1 . . E2 . . . B1 . G1 . A1 . B1 ."),
    lead: bars("E4 . . G#4 . . B4 . . A4 . G#4 . E4 .", "B3 . E4 . G#4 . B4 . E5 . B4 . A4 . ."),
    pad: "E3",
  },
  /** Garage shuffle — 2 bars */
  nudge: {
    id: "nudge",
    label: "NUDGE",
    bpm: 132,
    color: "#ffb347",
    kick: hit("x------- --x----- x------- --x---x-"),
    snare: hit("----x--- ----x-x- ----x--- ----x--x"),
    hat: hit("xxx-xx-x xxx-x-x- xxx-xx-x xx-xxx-x"),
    bass: bars("F1 . . F2 . . G#1 . A#1 . . C2 . A#1 .", "F1 . . . F2 . G#1 . A#1 . C2 . A#1 . F1 ."),
    lead: bars("F4 . G#4 . C5 . F4 . D#5 . C5 . A#4 . G#4 .", "F4 . F4 G#4 . A#4 C5 . D#5 C5 A#4 . G#4 . ."),
    pad: "F2",
  },
  /** Dreamy broken beat — 4 bars */
  bloom: {
    id: "bloom",
    label: "BLOOM",
    bpm: 136,
    color: "#ff7eb6",
    kick: hit("x-----x- ------x- x------- --x---x- x------- ----x--- x-----x- ------x-"),
    snare: hit("----x--- -------- ----x--- x------- ----x--- ------x- ----x--- --x-----"),
    hat: hit("--x-x-x- --x---x- --x-xx-x --x-x-x- --x-x-x- --xx--x- --x-x-xx --x---x-"),
    bass: bars(
      "D2 . . A1 . . F1 . D2 . . . A1 . C2 .",
      "D2 . F2 . A1 . . D2 . C2 . A1 . F1 .",
      "D2 . . A1 . F2 . D2 . A1 . C2 . A1 .",
      "D2 . A1 . F1 . D2 . C2 . A1 . F1 . D2 .",
    ),
    lead: bars(
      "D4 . . F4 . A4 . . C5 . A4 . F4 . D4 .",
      "F4 . . A4 . C5 . D5 . C5 . A4 . F4 .",
      "D4 . . F4 A4 . C5 . A4 . F4 . D4 . .",
      "F4 . A4 . C5 . D5 . A4 . F4 . D4 . .",
    ),
    pad: "D3",
  },
  /** Half-time snake — 2 bars */
  viper: {
    id: "viper",
    label: "VIPER",
    bpm: 140,
    color: "#c8ff3d",
    kick: hit("x------- -------- x------- ----x---"),
    snare: hit("-------- x------- -------- x-------"),
    hat: hit("x-x-x-x- x-x-xx-x x-x-x-x- x-xxx-x-"),
    bass: bars("E1 . . . E1 . G1 . A1 . . B1 . A1 .", "E1 . . E2 . D2 . B1 . A1 . G1 . E1 ."),
    lead: bars("E4 . G4 . B4 . E5 . . D5 . B4 . A4 .", "G4 . E4 . G4 . B4 . D5 . E5 . B4 . A4 ."),
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
