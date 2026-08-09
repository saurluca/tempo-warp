import * as Tone from "tone";
import type { AudioMode } from "../flags";
import { tuning } from "../tuning";

export interface AudioBus {
  unlocked: boolean;
  muted: boolean;
  unlock: () => Promise<void>;
  setFromSpeed: (speed01: number, shattered: boolean) => void;
  setMuted: (m: boolean) => void;
}

export function createAudioBus(mode: AudioMode): AudioBus {
  let unlocked = false;
  let muted = false;

  const master = new Tone.Gain(0).toDestination();

  // Procedural bed (also used as stem placeholder until real files land)
  const hushFilter = new Tone.Filter({ frequency: 420, type: "lowpass", Q: 0.7 });
  const hush = new Tone.Oscillator({ frequency: 55, type: "sine" });
  const hushGain = new Tone.Gain(0);
  hush.connect(hushFilter);
  hushFilter.connect(hushGain);
  hushGain.connect(master);

  const pulse = new Tone.Oscillator({ frequency: 110, type: "triangle" });
  const pulseFilter = new Tone.Filter({ frequency: 200, type: "lowpass" });
  const pulseGain = new Tone.Gain(0);
  pulse.connect(pulseFilter);
  pulseFilter.connect(pulseGain);
  pulseGain.connect(master);

  const danger = new Tone.Oscillator({ frequency: 220, type: "sawtooth" });
  const dangerFilter = new Tone.Filter({ frequency: 180, type: "lowpass" });
  const dangerGain = new Tone.Gain(0);
  danger.connect(dangerFilter);
  dangerFilter.connect(dangerGain);
  dangerGain.connect(master);

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
      unlocked = true;
      master.gain.rampTo(muted ? 0 : 0.35, 0.05);
      if (mode === "proc") {
        // Slightly brighter baseline for proc mode
        pulseFilter.frequency.value = 280;
      }
    },
    setMuted(m: boolean) {
      muted = m;
      if (unlocked) {
        master.gain.rampTo(m ? 0 : 0.35, 0.08);
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
        hushGain.gain.rampTo(0.22, 0.05);
        pulseGain.gain.rampTo(0, 0.08);
        dangerGain.gain.rampTo(0, 0.05);
        heartAcc += 0.016;
        if (heartAcc > 0.55) {
          heartAcc = 0;
          heart.triggerAttackRelease("C1", "16n");
        }
        return;
      }

      heartGain.gain.rampTo(0, 0.2);

      const hushAmt = 0.12 + (1 - speed01) * 0.12;
      const pulseAmt = speed01 * 0.18;
      const dangerAmt = Math.max(0, speed01 - 0.55) * 0.35;

      hushGain.gain.rampTo(hushAmt, 0.08);
      pulseGain.gain.rampTo(pulseAmt, 0.08);
      dangerGain.gain.rampTo(dangerAmt, 0.1);

      pulseFilter.frequency.rampTo(200 + speed01 * tuning.audioFilterOpen, 0.1);
      dangerFilter.frequency.rampTo(160 + speed01 * 900, 0.1);
      pulse.frequency.rampTo(110 + speed01 * 40, 0.1);
    },
  };

  return bus;
}
