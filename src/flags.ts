import { pickRandomTrack, TRACK_IDS, type TrackId } from "./audio/tracks";

export interface Flags {
  debug: boolean;
  seed: number;
  track: TrackId;
}

function parseTrack(value: string | null, seed: number): TrackId {
  if (value && (TRACK_IDS as readonly string[]).includes(value)) {
    return value as TrackId;
  }
  return pickRandomTrack(seed);
}

/** Touch phone/tablet — not a mouse desktop, even if the window is narrow. */
export function isMobile(): boolean {
  if (typeof matchMedia !== "function") return false;
  return matchMedia("(hover: none) and (pointer: coarse)").matches;
}

export function readFlags(search = window.location.search): Flags {
  const params = new URLSearchParams(search);
  const seedParam = params.get("seed");
  const seed = seedParam !== null && seedParam !== "" ? Number(seedParam) : Date.now();
  const safeSeed = Number.isFinite(seed) ? seed : Date.now();

  return {
    debug: params.get("debug") === "1",
    seed: safeSeed,
    track: parseTrack(params.get("track"), safeSeed),
  };
}
