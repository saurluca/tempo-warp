import * as Tone from "tone";
import { nextTrack, TRACKS, type TrackId } from "./tracks";

export interface AudioBus {
  unlocked: boolean;
  muted: boolean;
  track: TrackId;
  unlock: () => Promise<void>;
  setFromSpeed: (speed01: number, shattered: boolean) => void;
  setMuted: (m: boolean) => void;
  setTrack: (id: TrackId) => void;
  cycleTrack: () => TrackId;
}

/**
 * Three beat-driven Tone.js tracks. Layers open with speed01;
 * shatter ducks the arrangement into hush + heartbeat.
 */
export function createAudioBus(initialTrack: TrackId): AudioBus {
  let unlocked = false;
  let muted = false;
  let trackId: TrackId = initialTrack;
  let speed01 = 0;
  let shattered = false;
  let lastShattered = false;

  const master = new Tone.Gain(0).toDestination();
  const duck = new Tone.Gain(1);
  duck.connect(master);

  const mixFilter = new Tone.Filter({ frequency: 900, type: "lowpass", Q: 0.6 });
  mixFilter.connect(duck);

  // --- Drums ---
  const kickGain = new Tone.Gain(0.7);
  const snareGain = new Tone.Gain(0.45);
  const hatGain = new Tone.Gain(0.28);
  kickGain.connect(mixFilter);
  snareGain.connect(mixFilter);
  hatGain.connect(mixFilter);

  const kick = new Tone.MembraneSynth({
    pitchDecay: 0.04,
    octaves: 4,
    oscillator: { type: "sine" },
    envelope: { attack: 0.001, decay: 0.28, sustain: 0, release: 0.08 },
  }).connect(kickGain);

  const snare = new Tone.NoiseSynth({
    noise: { type: "white" },
    envelope: { attack: 0.001, decay: 0.14, sustain: 0, release: 0.04 },
  }).connect(snareGain);

  const hat = new Tone.MetalSynth({
    envelope: { attack: 0.001, decay: 0.06, release: 0.02 },
    harmonicity: 4.5,
    modulationIndex: 22,
    resonance: 3000,
    octaves: 0.8,
  }).connect(hatGain);
  hat.volume.value = -14;

  // --- Bass / lead / pad ---
  const bassGain = new Tone.Gain(0.35);
  const leadGain = new Tone.Gain(0.0);
  const padGain = new Tone.Gain(0.12);
  bassGain.connect(mixFilter);
  leadGain.connect(mixFilter);
  padGain.connect(mixFilter);

  const bass = new Tone.MonoSynth({
    oscillator: { type: "square" },
    filter: { Q: 2, type: "lowpass", rolloff: -24 },
    envelope: { attack: 0.01, decay: 0.18, sustain: 0.2, release: 0.12 },
    filterEnvelope: { attack: 0.01, decay: 0.12, sustain: 0.2, release: 0.15, baseFrequency: 80, octaves: 2.2 },
  }).connect(bassGain);

  const lead = new Tone.Synth({
    oscillator: { type: "triangle" },
    envelope: { attack: 0.01, decay: 0.12, sustain: 0.15, release: 0.2 },
  }).connect(leadGain);

  const pad = new Tone.Oscillator({ type: "sine", frequency: "C3" });
  const padFilter = new Tone.Filter({ frequency: 420, type: "lowpass" });
  pad.connect(padFilter);
  padFilter.connect(padGain);

  // Shatter heartbeat (separate from groove kick)
  const heartGain = new Tone.Gain(0);
  heartGain.connect(master);
  const heart = new Tone.MembraneSynth({
    pitchDecay: 0.06,
    octaves: 2.2,
    envelope: { attack: 0.001, decay: 0.3, sustain: 0, release: 0.1 },
  }).connect(heartGain);

  let heartAcc = 0;
  let loop: Tone.Sequence | null = null;

  const applySpeedMix = () => {
    if (!unlocked || muted) return;
    const s = shattered ? 0 : speed01;
    const duckAmt = shattered ? 0.12 : 1;

    duck.gain.rampTo(duckAmt, 0.08);

    // Groove intensity
    kickGain.gain.rampTo(shattered ? 0 : 0.55 + s * 0.35, 0.1);
    snareGain.gain.rampTo(shattered ? 0 : 0.2 + s * 0.45, 0.1);
    hatGain.gain.rampTo(shattered ? 0 : 0.08 + s * 0.42, 0.1);
    bassGain.gain.rampTo(shattered ? 0.08 : 0.22 + s * 0.28, 0.12);
    leadGain.gain.rampTo(shattered ? 0 : s * s * 0.38, 0.15);
    padGain.gain.rampTo(shattered ? 0.18 : 0.1 + (1 - s) * 0.1 + s * 0.06, 0.15);

    mixFilter.frequency.rampTo(shattered ? 280 : 700 + s * 5200, 0.15);
    padFilter.frequency.rampTo(320 + s * 900, 0.2);

    // Slight tempo breathe with speed
    const def = TRACKS[trackId];
    Tone.Transport.bpm.rampTo(def.bpm * (1 + s * 0.06), 0.4);
  };

  const buildLoop = (id: TrackId) => {
    const def = TRACKS[id];
    if (loop) {
      loop.dispose();
      loop = null;
    }

    Tone.Transport.bpm.value = def.bpm;
    pad.frequency.value = def.pad;

    // One 16th-note sequence driving all layers
    const steps = def.kick.map((_, i) => i);
    loop = new Tone.Sequence(
      (time, step) => {
        const i = step as number;
        const velKick = 0.75 + speed01 * 0.25;
        const velHat = 0.25 + speed01 * 0.6;

        if (!shattered && def.kick[i]) {
          kick.triggerAttackRelease("C1", "8n", time, velKick);
        }
        if (!shattered && def.snare[i]) {
          snare.triggerAttackRelease("16n", time, 0.5 + speed01 * 0.4);
        }
        if (!shattered && def.hat[i]) {
          hat.triggerAttackRelease("C5", "32n", time, velHat);
        }

        const bassNote = def.bass[i % def.bass.length];
        if (!shattered && bassNote) {
          bass.triggerAttackRelease(bassNote, "8n", time, 0.55 + speed01 * 0.35);
        }

        const leadNote = def.lead[i % def.lead.length];
        if (!shattered && leadNote && speed01 > 0.12) {
          lead.triggerAttackRelease(leadNote, "16n", time, 0.3 + speed01 * 0.5);
        }
      },
      steps,
      "16n",
    );
    loop.start(0);
  };

  const bus: AudioBus = {
    get unlocked() {
      return unlocked;
    },
    get muted() {
      return muted;
    },
    get track() {
      return trackId;
    },
    async unlock() {
      if (unlocked) return;
      await Tone.start();
      pad.start();
      buildLoop(trackId);
      if (Tone.Transport.state !== "started") {
        Tone.Transport.start();
      }
      unlocked = true;
      master.gain.rampTo(muted ? 0 : 0.42, 0.08);
      applySpeedMix();
    },
    setMuted(m: boolean) {
      muted = m;
      if (unlocked) {
        master.gain.rampTo(m ? 0 : 0.42, 0.08);
      }
    },
    setTrack(id: TrackId) {
      if (id === trackId) return;
      trackId = id;
      if (unlocked) {
        buildLoop(trackId);
        applySpeedMix();
      }
    },
    cycleTrack() {
      const n = nextTrack(trackId);
      bus.setTrack(n);
      return n;
    },
    setFromSpeed(s: number, isShattered: boolean) {
      speed01 = s;
      shattered = isShattered;

      if (!unlocked || muted) return;

      if (isShattered && !lastShattered) {
        heartGain.gain.rampTo(0.5, 0.02);
        heart.triggerAttackRelease("C1", "8n");
        heartAcc = 0;
      }
      lastShattered = isShattered;

      if (isShattered) {
        heartAcc += 0.016;
        if (heartAcc > 0.52) {
          heartAcc = 0;
          heart.triggerAttackRelease("C1", "16n");
        }
      } else {
        heartGain.gain.rampTo(0, 0.2);
      }

      applySpeedMix();
    },
  };

  return bus;
}
