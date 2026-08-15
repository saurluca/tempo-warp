import * as THREE from "three";
import { colorForJourney } from "./colors";

const N = 180;

export interface BeatWave {
  update: (
    x: number,
    z: number,
    halfW: number,
    kick: number,
    snare: number,
    hat: number,
    beatPhase: number,
    speed01: number,
    radius: number,
    dt: number,
  ) => void;
  setActive: (on: boolean) => void;
  dispose: () => void;
}

/** Camera-locked guitar string — standing wave, not a scrolling scope. */
export function createBeatWave(scene: THREE.Scene): BeatWave {
  const positions = new Float32Array(N * 3);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const mat = new THREE.LineBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.5,
    depthTest: false,
    depthWrite: false,
  });
  const line = new THREE.Line(geo, mat);
  line.renderOrder = 1;
  line.visible = false;
  line.frustumCulled = false;
  scene.add(line);

  let a1 = 0;
  let a2 = 0;
  let a3 = 0;
  let lastKick = 0;
  let lastSnare = 0;

  return {
    setActive(on) {
      line.visible = on;
    },
    update(x, z, halfW, kick, snare, hat, beatPhase, speed01, radius, dt) {
      if (!line.visible) return;

      if (kick > 0.75 && lastKick < 0.35) a1 = Math.min(1.2, a1 + 0.95);
      if (snare > 0.75 && lastSnare < 0.35) a2 = Math.min(1, a2 + 0.7);
      a3 = Math.max(a3, hat * 0.45);
      lastKick = kick;
      lastSnare = snare;

      const decay = Math.exp(-3.2 * dt);
      a1 *= decay;
      a2 *= decay;
      a3 *= decay;

      const span = halfW;
      const amp = 3.4 + speed01 * 2.2;
      const w = beatPhase * Math.PI * 2;

      for (let i = 0; i < N; i++) {
        const t = i / (N - 1);
        const s1 = Math.sin(Math.PI * t);
        const s2 = Math.sin(Math.PI * 2 * t);
        const s3 = Math.sin(Math.PI * 3 * t);
        const y =
          a1 * s1 * Math.cos(w) +
          a2 * s2 * Math.cos(w * 2.02) * 0.55 +
          a3 * s3 * Math.cos(w * 3.1) * 0.28;
        const o = i * 3;
        positions[o] = x + (t - 0.5) * 2 * span;
        positions[o + 1] = 1.05;
        positions[o + 2] = z + y * amp;
      }
      geo.attributes.position!.needsUpdate = true;
      mat.color.copy(colorForJourney(speed01, radius));
      mat.opacity = 0.32 + (a1 + a2 * 0.5) * 0.35;
    },
    dispose() {
      scene.remove(line);
      geo.dispose();
      mat.dispose();
    },
  };
}
