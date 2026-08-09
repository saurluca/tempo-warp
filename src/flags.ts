export type AudioMode = "stems" | "proc";

export interface Flags {
  debug: boolean;
  seed: number;
  audio: AudioMode;
}

function parseAudio(value: string | null): AudioMode {
  return value === "proc" ? "proc" : "stems";
}

export function readFlags(search = window.location.search): Flags {
  const params = new URLSearchParams(search);
  const seedParam = params.get("seed");
  const seed = seedParam !== null && seedParam !== "" ? Number(seedParam) : Date.now();

  return {
    debug: params.get("debug") === "1",
    seed: Number.isFinite(seed) ? seed : Date.now(),
    audio: parseAudio(params.get("audio")),
  };
}
