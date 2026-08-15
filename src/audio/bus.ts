import * as Tone from "tone";
import { tuning } from "../tuning";
import { nextTrack, TRACKS, type TrackId } from "./tracks";

export interface AudioBus {
  unlocked: boolean;
  muted: boolean;
  track: TrackId;
  musicHold: number;
  unlock: () => Promise<void>;
  setFromPlay: (speed01: number, radius01: number, shattered: boolean, dt: number) => void;
  setMuted: (m: boolean) => void;
  setTrack: (id: TrackId) => void;
  cycleTrack: () => TrackId;
}

/**
 * One journey mix. radius01 (peak-held) opens stems;
 * speed01 opens intensity; sanctuary resolves to a held chord.
 */
export function createAudioBus(initialTrack: TrackId): AudioBus {
  let unlocked = false;
  let muted = false;
  let trackId: TrackId = initialTrack;
  let speed01 = 0;
  let radius01 = 0;
  /** Always a hush bed — never start (or decay) to silence. */
  const hushBed = 0.24;
  let musicHold = hushBed;
  let shattered = false;
  let lastShattered = false;

  const master = new Tone.Gain(0).toDestination();
  const duck = new Tone.Gain(1);
  duck.connect(master);

  const mixFilter = new Tone.Filter({ frequency: 900, type: "lowpass", Q: 0.6 });
  mixFilter.connect(duck);

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

  const bassGain = new Tone.Gain(0.35);
  const leadGain = new Tone.Gain(0.0);
  const voiceGain = new Tone.Gain(0.0);
  const padGain = new Tone.Gain(0.12);
  const resolveGain = new Tone.Gain(0);
  bassGain.connect(mixFilter);
  leadGain.connect(mixFilter);
  voiceGain.connect(mixFilter);
  padGain.connect(mixFilter);
  resolveGain.connect(mixFilter);

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

  const voice = new Tone.Synth({
    oscillator: { type: "sine" },
    envelope: { attack: 0.02, decay: 0.28, sustain: 0.1, release: 0.35 },
  }).connect(voiceGain);

  const pad = new Tone.Oscillator({ type: "sine", frequency: "C3" });
  const padFilter = new Tone.Filter({ frequency: 420, type: "lowpass" });
  pad.connect(padFilter);
  padFilter.connect(padGain);

  const resolve = new Tone.Oscillator({ type: "sine", frequency: "G3" });
  const resolveFilter = new Tone.Filter({ frequency: 720, type: "lowpass" });
  resolve.connect(resolveFilter);
  resolveFilter.connect(resolveGain);

  const heartGain = new Tone.Gain(0);
  heartGain.connect(master);
  const heart = new Tone.MembraneSynth({
    pitchDecay: 0.06,
    octaves: 2.2,
    envelope: { attack: 0.001, decay: 0.3, sustain: 0, release: 0.1 },
  }).connect(heartGain);

  let heartAcc = 0;
  let loop: Tone.Sequence | null = null;

  const applyMix = () => {
    if (!unlocked || muted) return;
    const s = shattered ? 0 : speed01;
    const h = shattered ? musicHold * 0.35 : musicHold;
    const sanctuary = !shattered && radius01 > 0.9;
    const duckAmt = shattered ? 0.12 : 1;

    duck.gain.rampTo(duckAmt, 0.08);

    const kickOn = !sanctuary && h > 0.12;
    const snareOn = !sanctuary && h > 0.28;
    const hatOn = !sanctuary && h > 0.45;
    const bassOn = h > 0.22;
    const leadOn = !sanctuary && h > 0.62;
    const voiceOn = !sanctuary && h > 0.78;

    kickGain.gain.rampTo(kickOn ? 0.42 + s * 0.38 : 0, 0.12);
    snareGain.gain.rampTo(snareOn ? 0.16 + s * 0.4 : 0, 0.12);
    hatGain.gain.rampTo(hatOn ? 0.06 + s * 0.4 : 0, 0.12);
    bassGain.gain.rampTo(shattered ? 0.06 : bassOn ? 0.18 + s * 0.26 : 0.05, 0.14);
    leadGain.gain.rampTo(leadOn ? s * s * 0.36 : 0, 0.16);
    voiceGain.gain.rampTo(voiceOn ? 0.1 + s * 0.18 : 0, 0.2);
    padGain.gain.rampTo(sanctuary ? 0.34 : shattered ? 0.18 : 0.16 + (1 - s) * 0.1 + h * 0.06, 0.2);
    resolveGain.gain.rampTo(sanctuary ? 0.2 : 0, 0.45);

    mixFilter.frequency.rampTo(shattered ? 280 : sanctuary ? 1400 : 1100 + s * 4400 + h * 400, 0.18);
    padFilter.frequency.rampTo(sanctuary ? 880 : 320 + s * 900 + h * 200, 0.25);

    const def = TRACKS[trackId];
    Tone.Transport.bpm.rampTo(def.bpm * (1 + s * 0.05) * (sanctuary ? 0.92 : 1), 0.45);
    const padHz = Tone.Frequency(def.pad).toFrequency();
    pad.frequency.rampTo(padHz * (1 + h * 0.28), 0.5);
    resolve.frequency.rampTo(padHz * 1.5, 0.6);
  };

  const buildLoop = (id: TrackId) => {
    const def = TRACKS[id];
    if (loop) {
      loop.dispose();
      loop = null;
    }

    Tone.Transport.bpm.value = def.bpm;
    pad.frequency.value = def.pad;

    const steps = def.kick.map((_, i) => i);
    loop = new Tone.Sequence(
      (time, step) => {
        const i = step as number;
        const s = speed01;
        const h = musicHold;
        const sanctuary = !shattered && radius01 > 0.9;
        if (shattered || sanctuary) return;

        if (h > 0.12 && def.kick[i]) {
          kick.triggerAttackRelease("C1", "8n", time, 0.7 + s * 0.3);
        }
        if (h > 0.28 && def.snare[i]) {
          snare.triggerAttackRelease("16n", time, 0.45 + s * 0.4);
        }
        if (h > 0.45 && def.hat[i]) {
          hat.triggerAttackRelease("C5", "32n", time, 0.22 + s * 0.55);
        }

        const bassNote = def.bass[i % def.bass.length];
        if (h > 0.22 && bassNote) {
          bass.triggerAttackRelease(bassNote, "8n", time, 0.5 + s * 0.35);
        }

        const leadNote = def.lead[i % def.lead.length];
        if (h > 0.62 && leadNote && s > 0.08) {
          lead.triggerAttackRelease(leadNote, "16n", time, 0.28 + s * 0.5);
        }
        if (h > 0.78 && leadNote && i % 4 === 0) {
          voice.triggerAttackRelease(leadNote, "8n", time, 0.22 + s * 0.3);
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
    get musicHold() {
      return musicHold;
    },
    async unlock() {
      if (unlocked) return;
      await Tone.start();
      pad.start();
      resolve.start();
      buildLoop(trackId);
      if (Tone.Transport.state !== "started") {
        Tone.Transport.start();
      }
      unlocked = true;
      master.gain.rampTo(muted ? 0 : 0.42, 0.08);
      applyMix();
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
        applyMix();
      }
    },
    cycleTrack() {
      const n = nextTrack(trackId);
      bus.setTrack(n);
      return n;
    },
    setFromPlay(s: number, r01: number, isShattered: boolean, dt: number) {
      speed01 = s;
      radius01 = r01;
      if (r01 > musicHold) musicHold = r01;
      else {
        const decay = isShattered ? tuning.musicHoldDecayShatter : tuning.musicHoldDecay;
        musicHold = Math.max(hushBed, r01, musicHold - decay * dt);
      }
      shattered = isShattered;

      if (!unlocked || muted) return;

      if (isShattered && !lastShattered) {
        heartGain.gain.rampTo(0.5, 0.02);
        heart.triggerAttackRelease("C1", "8n");
        heartAcc = 0;
      }
      lastShattered = isShattered;

      if (isShattered) {
        heartAcc += dt;
        if (heartAcc > 0.52) {
          heartAcc = 0;
          heart.triggerAttackRelease("C1", "16n");
        }
      } else {
        heartGain.gain.rampTo(0, 0.2);
      }

      applyMix();
    },
  };

  return bus;
}
