import { describe, expect, it } from "vitest";
import { djHoldFor, nextTrack, prevTrack, STEMS, stepBackArrange, TRACK_IDS, TRACKS } from "../../src/audio/tracks";
import { tuning } from "../../src/tuning";

describe("tracks", () => {
  it("every track is on a 16th grid and stems share a loop length", () => {
    for (const id of TRACK_IDS) {
      const t = TRACKS[id];
      expect(t.kick.length % 16, id).toBe(0);
      expect(t.snare.length, id).toBe(t.kick.length);
      expect(t.hat.length, id).toBe(t.kick.length);
      expect(t.bass.length, id).toBe(t.kick.length);
      expect(t.lead.length, id).toBe(t.kick.length);
      expect(t.kit, id).toBeTruthy();
    }
  });

  it("each track uses a different kit", () => {
    const kits = TRACK_IDS.map((id) => TRACKS[id].kit);
    expect(new Set(kits).size).toBe(TRACK_IDS.length);
  });

  it("set order walks every track once then wraps", () => {
    let id = TRACK_IDS[0]!;
    const seen = new Set<string>();
    for (let i = 0; i < TRACK_IDS.length; i++) {
      expect(seen.has(id)).toBe(false);
      seen.add(id);
      id = nextTrack(id);
    }
    expect(id).toBe(TRACK_IDS[0]);
    expect(seen.size).toBe(TRACK_IDS.length);
  });

  it("prev track steps back and stays on the first", () => {
    expect(prevTrack("veil")).toBe("veil");
    expect(prevTrack("ember")).toBe("veil");
    expect(prevTrack("razor")).toBe("surge");
  });

  it("voice is in for at least 8s before the track can spin", () => {
    const voice = STEMS[STEMS.length - 1]!.t;
    expect(djHoldFor() - voice).toBeGreaterThanOrEqual(tuning.djVoiceTail);
    expect(tuning.djVoiceTail).toBeGreaterThanOrEqual(8);
  });

  it("a hit steps the arrangement back one stem", () => {
    expect(stepBackArrange(0)).toBe(0);
    expect(stepBackArrange(10)).toBe(4);
    expect(stepBackArrange(18)).toBe(10);
    expect(stepBackArrange(40)).toBe(18);
  });

  it("stem gaps get longer each time", () => {
    const times = STEMS.map((s) => s.t);
    const gaps: number[] = [];
    for (let i = 1; i < times.length; i++) {
      const g = times[i]! - times[i - 1]!;
      if (g > 0) gaps.push(g);
    }
    for (let i = 1; i < gaps.length; i++) {
      expect(gaps[i]!).toBeGreaterThan(gaps[i - 1]!);
    }
  });

  it("adjacent BPMs stay close enough to DJ", () => {
    for (let i = 0; i < TRACK_IDS.length - 1; i++) {
      const a = TRACKS[TRACK_IDS[i]!].bpm;
      const b = TRACKS[TRACK_IDS[i + 1]!].bpm;
      expect(Math.abs(b - a), `${TRACK_IDS[i]}→${TRACK_IDS[i + 1]}`).toBeLessThanOrEqual(16);
    }
  });
});
