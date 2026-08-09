import * as Tone from "tone";
import type { AudioMode } from "../flags";
import { tuning } from "../tuning";

export interface AudioBus {
  unlocked: boolean;
  muted: boolean;
  mode: AudioMode;
  unlock: () => Promise<void>;
  setFromSpeed: (speed01: number, shattered: boolean) => void;
  setMuted: (m: boolean) => void;
}

/** Default "stems": soft layered pads. `proc`: brighter, more synthetic bed. */
export function createAudioBus(mode: AudioMode): AudioBus {
  let unlocked = false;
  let muted = false;

  const master = new Tone.Gain(0).toDestination();

  const hushFilter = new Tone.Filter({
    frequency: mode === "proc" ? 520 : 380,
    type: "lowpass",
    Q: 0.7,
  });
  const hush = new Tone.Oscillator({
    frequency: mode === "proc" ? 48 : 55,
    type: mode === "proc" ? "square" : "sine",
  });
  const hushGain = new Tone.Gain(0);
  hush.connect(hushFilter);
  hushFilter.connect(hushGain);
  hushGain.connect(master);

  const pulse = new Tone.Oscillator({
    frequency: mode === "proc" ? 98 : 110,
    type: mode === "proc" ? "sawtooth" : "triangle",
  });
  const pulseFilter = new Tone.Filter({
    frequency: mode === "proc" ? 320 : 200,
    type: "lowpass",
  });
  const pulseGain = new Tone.Gain(0);
  const pulseFx =
    mode === "stems"
      ? new Tone.FeedbackDelay({ delayTime: 0.22, feedback: 0.18, wet: 0.2 })
      : new Tone.Distortion({ distortion: 0.12, wet: 0.15 });
  pulse.connect(pulseFilter);
  pulseFilter.connect(pulseFx);
  pulseFx.connect(pulseGain);
  pulseGain.connect(master);

  const danger = new Tone.Oscillator({
    frequency: mode === "proc" ? 180 : 220,
    type: mode === "proc" ? "square" : "sawtooth",
  });
  const dangerFilter = new Tone.Filter({ frequency: 180, type: "lowpass" });
  const dangerGain = new Tone.Gain(0);
  danger.connect(dangerFilter);
  dangerFilter.connect(dangerGain);
  dangerGain.connect(master);

  // Extra "stem" layer: soft fifth for stems mode only
  const harmony = new Tone.Oscillator({ frequency: 165, type: "sine" });
  const harmonyGain = new Tone.Gain(0);
  if (mode === "stems") {
    harmony.connect(harmonyGain);
    harmonyGain.connect(master);
  }

  const heart = new Tone.MembraneSynth({
    pitchDecay: 0.05,
    octaves: 2,
    envelope: { attack: 0.001, decay: 0.25, sustain: 0, release: 0.1 },
  });
  const heartGain = new Tone.Gain(0);
  heart.connect(heartGain);
  heartGain.connect(master);

  let heartAcc = 0;
  let lastShattered = false;

  const bus: AudioBus = {
    mode,
    get unlocked() {
      return unlocked;
    },
    get muted() {
      return muted;
    },
    async unlock() {
      if (unlocked) return;
      await Tone.start();
      hush.start();
      pulse.start();
      danger.start();
      if (mode === "stems") harmony.start();
      unlocked = true;
      master.gain.rampTo(muted ? 0 : mode === "proc" ? 0.28 : 0.32, 0.05);
    },
    setMuted(m: boolean) {
      muted = m;
      if (unlocked) {
        master.gain.rampTo(m ? 0 : mode === "proc" ? 0.28 : 0.32, 0.08);
      }
    },
    setFromSpeed(speed01: number, shattered: boolean) {
      if (!unlocked || muted) return;

      if (shattered && !lastShattered) {
        heartGain.gain.rampTo(0.45, 0.02);
        heart.triggerAttackRelease("C1", "8n");
        heartAcc = 0;
      }
      lastShattered = shattered;

      if (shattered) {
        hushGain.gain.rampTo(0.2, 0.05);
        pulseGain.gain.rampTo(0, 0.08);
        dangerGain.gain.rampTo(0, 0.05);
        harmonyGain.gain.rampTo(0, 0.05);
        heartAcc += 0.016;
        if (heartAcc > 0.55) {
          heartAcc = 0;
          heart.triggerAttackRelease("C1", "16n");
        }
        return;
      }

      heartGain.gain.rampTo(0, 0.2);

      const hushAmt = 0.1 + (1 - speed01) * 0.14;
      const pulseAmt = speed01 * (mode === "proc" ? 0.22 : 0.16);
      const dangerAmt = Math.max(0, speed01 - 0.5) * (mode === "proc" ? 0.4 : 0.28);
      const harmAmt = mode === "stems" ? speed01 * speed01 * 0.12 : 0;

      hushGain.gain.rampTo(hushAmt, 0.08);
      pulseGain.gain.rampTo(pulseAmt, 0.08);
      dangerGain.gain.rampTo(dangerAmt, 0.1);
      harmonyGain.gain.rampTo(harmAmt, 0.12);

      const open = mode === "proc" ? tuning.audioFilterOpen * 1.15 : tuning.audioFilterOpen;
      pulseFilter.frequency.rampTo(200 + speed01 * open, 0.1);
      dangerFilter.frequency.rampTo(160 + speed01 * 900, 0.1);
      pulse.frequency.rampTo((mode === "proc" ? 98 : 110) + speed01 * 40, 0.1);
    },
  };

  return bus;
}
