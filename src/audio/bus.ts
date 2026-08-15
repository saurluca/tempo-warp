import * as Tone from "tone";
import { tuning } from "../tuning";
import { djHoldFor, KITS, nextTrack, stemOpen, STEMS, TRACKS, type Kit, type LeadKind, type TrackId } from "./tracks";

export interface AudioBus {
  unlocked: boolean;
  muted: boolean;
  track: TrackId;
  musicHold: number;
  /** Stem-open curve — time on this track, not distance. */
  arrange01: number;
  /** Seconds the current arrangement has been building. */
  arrangeT: number;
  kick: number;
  snare: number;
  hat: number;
  bass: number;
  lead: number;
  voice: number;
  /** Beats since transport start — visuals lock to this, not wall time. */
  beatPhase: number;
  unlock: () => Promise<void>;
  /** Screen-off / standby: cut output and stop Transport so it can't glitch. */
  sleep: () => void;
  wake: () => Promise<void>;
  setFromPlay: (speed01: number, radius01: number, shattered: boolean, dt: number) => void;
  setMuted: (m: boolean) => void;
  setTrack: (id: TrackId) => void;
  cycleTrack: () => TrackId;
  /** Crossfade into the next track; incoming starts at the hush bed. */
  spinNext: () => TrackId;
}

/**
 * One journey mix. Time on the track opens stems;
 * speed01 opens intensity. The outer rim does not mute the groove.
 */
export function createAudioBus(initialTrack: TrackId): AudioBus {
  const MASTER = 0.55;
  let unlocked = false;
  let muted = false;
  let sleeping = false;
  let trackId: TrackId = initialTrack;
  let speed01 = 0;
  /** Always a hush bed — never start (or decay) to silence. */
  const hushBed = 0.24;
  let musicHold = hushBed;
  let arrangeT = 0;
  let shattered = false;
  let lastShattered = false;
  /** idle | ducking outgoing | opening incoming */
  let spin: "idle" | "out" | "in" = "idle";
  let pendingTrack: TrackId | null = null;
  let mixOut = 0;
  let onTrack = 0;

  const arrange01Of = () => {
    const build = STEMS[STEMS.length - 1]!.t;
    return hushBed + (1 - hushBed) * Math.min(1, arrangeT / Math.max(0.001, build));
  };

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
  const grit = new Tone.Distortion(0.35);
  grit.wet.value = 0;
  grit.connect(bassGain);
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
  }).connect(grit);

  const lead = new Tone.Synth({
    oscillator: { type: "triangle" },
    envelope: { attack: 0.01, decay: 0.12, sustain: 0.15, release: 0.2 },
  }).connect(leadGain);

  const leadFm = new Tone.FMSynth({
    harmonicity: 3.2,
    modulationIndex: 8,
    oscillator: { type: "sine" },
    envelope: { attack: 0.008, decay: 0.22, sustain: 0.08, release: 0.18 },
    modulation: { type: "square" },
  }).connect(leadGain);

  const leadAm = new Tone.AMSynth({
    harmonicity: 2.4,
    oscillator: { type: "sine" },
    envelope: { attack: 0.02, decay: 0.28, sustain: 0.12, release: 0.3 },
  }).connect(leadGain);

  const leadPluck = new Tone.PluckSynth({
    attackNoise: 1,
    dampening: 3800,
    resonance: 0.82,
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
  let kickPulse = 0;
  let snarePulse = 0;
  let hatPulse = 0;
  let bassPulse = 0;
  let leadPulse = 0;
  let voicePulse = 0;
  let kit: Kit = KITS.neon;
  let leadKind: LeadKind = "tri";

  const fireLead = (note: string, time: number, vel: number) => {
    if (leadKind === "fm") leadFm.triggerAttackRelease(note, "16n", time, vel);
    else if (leadKind === "am") leadAm.triggerAttackRelease(note, "16n", time, vel);
    else if (leadKind === "pluck") leadPluck.triggerAttackRelease(note, "16n", time, vel);
    else lead.triggerAttackRelease(note, "16n", time, vel);
  };

  const applyKit = (id: TrackId) => {
    kit = KITS[TRACKS[id].kit];
    leadKind = kit.lead;
    kick.set({ pitchDecay: kit.kickDecay, octaves: kit.kickOct });
    snare.set({ noise: { type: kit.snare }, envelope: { decay: kit.snareDecay } });
    hat.set({
      envelope: { decay: kit.hatDecay },
      harmonicity: kit.hatHarm,
      resonance: kit.hatRes,
    });
    bass.oscillator.type = kit.bass;
    bass.filter.Q.value = kit.bassQ;
    bass.envelope.decay = kit.bassDecay;
    bass.filterEnvelope.octaves = kit.bassFiltOct;
    if (kit.lead === "saw") lead.oscillator.type = "sawtooth";
    else if (kit.lead === "square") lead.oscillator.type = "square";
    else lead.oscillator.type = "triangle";
    lead.envelope.decay = kit.leadDecay;
    pad.type = kit.pad;
    voice.oscillator.type = kit.voice;
    grit.wet.rampTo(kit.grit, 0.25);
  };

  const hushVoices = () => {
    kick.triggerRelease();
    snare.triggerRelease();
    hat.triggerRelease();
    bass.triggerRelease();
    lead.triggerRelease();
    leadFm.triggerRelease();
    leadAm.triggerRelease();
    voice.triggerRelease();
    heart.triggerRelease();
  };

  const tearLoop = () => {
    if (loop) {
      loop.stop();
      loop.dispose();
      loop = null;
    }
    Tone.Transport.stop();
    Tone.Transport.cancel(0);
  };

  const applyMix = () => {
    if (!unlocked || muted || sleeping) return;
    const s = shattered ? 0 : speed01;
    const h = shattered ? arrange01Of() * 0.35 : arrange01Of();
    const fade = mixOut * mixOut * (3 - 2 * mixOut);
    const duckAmt = (shattered ? 0.12 : 1) * (1 - fade * 0.94);

    duck.gain.rampTo(duckAmt, 0.35);

    const kickOn = stemOpen(arrangeT, "kick");
    const snareOn = stemOpen(arrangeT, "snare");
    const hatOn = stemOpen(arrangeT, "hat");
    const bassOn = stemOpen(arrangeT, "bass");
    const leadOn = stemOpen(arrangeT, "lead");
    const voiceOn = stemOpen(arrangeT, "voice");

    kickGain.gain.rampTo(kickOn ? 0.42 + s * 0.38 : 0, 0.12);
    snareGain.gain.rampTo(snareOn ? 0.16 + s * 0.4 : 0, 0.12);
    hatGain.gain.rampTo(hatOn ? 0.06 + s * 0.4 : 0, 0.12);
    bassGain.gain.rampTo(shattered ? 0.06 : bassOn ? 0.18 + s * 0.26 : 0, 0.14);
    leadGain.gain.rampTo(leadOn ? s * s * 0.36 : 0, 0.16);
    voiceGain.gain.rampTo(voiceOn ? 0.1 + s * 0.18 : 0, 0.2);
    padGain.gain.rampTo(0, 0.12);
    resolveGain.gain.rampTo(0, 0.2);

    const open = shattered ? 280 : 1100 + s * 4400 + h * 400;
    mixFilter.frequency.rampTo(open * (1 - fade * 0.78), 0.45);
    padFilter.frequency.rampTo(320 + s * 900 + h * 200, 0.25);

    const def = TRACKS[trackId];
    Tone.Transport.bpm.rampTo(def.bpm * (1 + s * 0.05), 1.8);
    const padHz = Tone.Frequency(def.pad).toFrequency();
    pad.frequency.rampTo(padHz * (1 + h * 0.28), 0.7);
    resolve.frequency.rampTo(padHz * 1.5, 0.8);
  };

  const buildLoop = (id: TrackId) => {
    const def = TRACKS[id];
    if (loop) {
      loop.dispose();
      loop = null;
    }

    applyKit(id);
    if (Tone.Transport.state !== "started") {
      Tone.Transport.bpm.value = def.bpm;
    }
    pad.frequency.value = def.pad;

    const steps = def.kick.map((_, i) => i);
    loop = new Tone.Sequence(
      (time, step) => {
        const i = step as number;
        const s = speed01;
        if (shattered) return;

        if (stemOpen(arrangeT, "kick") && def.kick[i]) {
          kick.triggerAttackRelease(kit.kickNote, "8n", time, 0.7 + s * 0.3);
          kickPulse = 1;
        }
        if (stemOpen(arrangeT, "snare") && def.snare[i]) {
          snare.triggerAttackRelease("16n", time, 0.45 + s * 0.4);
          snarePulse = 1;
        }
        if (stemOpen(arrangeT, "hat") && def.hat[i]) {
          hat.triggerAttackRelease("C5", "32n", time, 0.22 + s * 0.55);
          hatPulse = 1;
        }

        const bassNote = def.bass[i % def.bass.length];
        if (stemOpen(arrangeT, "bass") && bassNote) {
          bass.triggerAttackRelease(bassNote, "8n", time, 0.5 + s * 0.35);
          bassPulse = 1;
        }

        const leadNote = def.lead[i % def.lead.length];
        if (stemOpen(arrangeT, "lead") && leadNote && s > 0.08) {
          fireLead(leadNote, time, 0.28 + s * 0.5);
          leadPulse = 1;
        }
        if (stemOpen(arrangeT, "voice") && leadNote && i % 4 === 0) {
          voice.triggerAttackRelease(leadNote, "8n", time, 0.22 + s * 0.3);
          voicePulse = 1;
        }
      },
      steps,
      "16n",
    );
    loop.start(0);
  };

  Tone.getContext().rawContext.addEventListener("statechange", () => {
    const state = Tone.getContext().rawContext.state as string;
    if ((state === "interrupted" || state === "suspended") && unlocked && !sleeping) {
      sleeping = true;
      master.gain.cancelScheduledValues(0);
      master.gain.value = 0;
      hushVoices();
      tearLoop();
    }
  });

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
    get arrange01() {
      return arrange01Of();
    },
    get arrangeT() {
      return arrangeT;
    },
    get kick() {
      return kickPulse;
    },
    get snare() {
      return snarePulse;
    },
    get hat() {
      return hatPulse;
    },
    get bass() {
      return bassPulse;
    },
    get lead() {
      return leadPulse;
    },
    get voice() {
      return voicePulse;
    },
    get beatPhase() {
      if (!unlocked) return 0;
      return Tone.Transport.seconds * (Tone.Transport.bpm.value / 60);
    },
    async unlock() {
      if (unlocked) {
        if (sleeping) await bus.wake();
        return;
      }
      try {
        await Tone.start();
        const ctx = Tone.getContext();
        if (ctx.state !== "running") await ctx.resume();
        if (ctx.state !== "running") return;
      } catch {
        return;
      }
      buildLoop(trackId);
      if (Tone.Transport.state !== "started") {
        Tone.Transport.start();
      }
      unlocked = true;
      master.gain.rampTo(muted ? 0 : MASTER, 0.08);
      applyMix();
    },
    sleep() {
      if (!unlocked || sleeping) return;
      sleeping = true;
      master.gain.cancelScheduledValues(0);
      master.gain.value = 0;
      hushVoices();
      tearLoop();
      const raw = Tone.getContext().rawContext as AudioContext;
      if (raw.state === "running") void raw.suspend();
    },
    async wake() {
      if (!unlocked || !sleeping) return;
      try {
        const ctx = Tone.getContext();
        if (ctx.state !== "running") await ctx.resume();
        if (ctx.state !== "running") return;
      } catch {
        return;
      }
      Tone.Transport.cancel(0);
      buildLoop(trackId);
      if (Tone.Transport.state !== "started") Tone.Transport.start();
      sleeping = false;
      master.gain.rampTo(muted ? 0 : MASTER, 0.12);
      applyMix();
    },
    setMuted(m: boolean) {
      muted = m;
      if (unlocked && !sleeping) {
        master.gain.rampTo(m ? 0 : MASTER, 0.08);
      }
    },
    setTrack(id: TrackId) {
      if (id === trackId) return;
      trackId = id;
      onTrack = 0;
      arrangeT = 0;
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
    spinNext() {
      if (spin !== "idle" || onTrack < djHoldFor(arrangeT)) return trackId;
      pendingTrack = nextTrack(trackId);
      spin = "out";
      console.info("[tempo-warp] spin", pendingTrack);
      return pendingTrack;
    },
    setFromPlay(s: number, r01: number, isShattered: boolean, dt: number) {
      speed01 = s;
      if (r01 > musicHold) musicHold = r01;
      else {
        const decay = isShattered ? tuning.musicHoldDecayShatter : tuning.musicHoldDecay;
        musicHold = Math.max(hushBed, r01, musicHold - decay * dt);
      }

      if (spin === "out") {
        mixOut = Math.min(1, mixOut + dt / Math.max(0.05, tuning.djFadeOut));
        if (mixOut >= 1 && pendingTrack) {
          trackId = pendingTrack;
          pendingTrack = null;
          arrangeT = 0;
          onTrack = 0;
          if (unlocked) buildLoop(trackId);
          spin = "in";
        }
      } else if (spin === "in") {
        mixOut = Math.max(0, mixOut - dt / Math.max(0.05, tuning.djFadeIn));
        if (mixOut <= 0) spin = "idle";
      }

      if (isShattered && !lastShattered) onTrack = 0;
      shattered = isShattered;
      if (unlocked && spin !== "out" && !isShattered) arrangeT += dt;
      if (unlocked && spin === "idle" && !isShattered) {
        onTrack += dt;
        if (onTrack >= djHoldFor(arrangeT)) bus.spinNext();
      }

      if (!unlocked || muted || sleeping) return;

      kickPulse = Math.max(0, kickPulse - dt * 7);
      snarePulse = Math.max(0, snarePulse - dt * 9);
      hatPulse = Math.max(0, hatPulse - dt * 14);
      bassPulse = Math.max(0, bassPulse - dt * 6);
      leadPulse = Math.max(0, leadPulse - dt * 8);
      voicePulse = Math.max(0, voicePulse - dt * 5);

      if (isShattered && !lastShattered) {
        heartGain.gain.rampTo(0.5, 0.02);
        heart.triggerAttackRelease("C1", "8n");
        heartAcc = 0;
        kickPulse = 1;
      }
      lastShattered = isShattered;

      if (isShattered) {
        heartAcc += dt;
        if (heartAcc > 0.52) {
          heartAcc = 0;
          heart.triggerAttackRelease("C1", "16n");
          kickPulse = 0.7;
        }
      } else {
        heartGain.gain.rampTo(0, 0.2);
      }

      applyMix();
    },
  };

  return bus;
}
