import * as THREE from "three";
import { createAudioBus } from "./audio/bus";
import { createDebugOverlay, createTrackChip } from "./debug/overlay";
import { readFlags } from "./flags";
import { createPointer } from "./input/pointer";
import { startLoop } from "./loop";
import { playerHitsObstacle, playerOverlapsAny, separatePlayer } from "./sim/collide";
import { createObstacleField } from "./sim/obstacles";
import { applyImpact, createPlayer, stepPlayer } from "./sim/player";
import { applyCurrent, currentStrength, densityAt, radius01At, radiusOf, warpAt } from "./sim/world";
import { tuning } from "./tuning";
import { clearForRadius, colorForRadius } from "./view/colors";
import { createBeatWave } from "./view/beatWave";
import { createGroundWarp } from "./view/groundWarp";
import { createLandmarks } from "./view/landmarks";
import { createObstacleViews } from "./view/obstaclesView";
import { createPlayerBlob } from "./view/playerBlob";
import { createGameScene } from "./view/scene";
import { createShatterBurst } from "./view/shatterBurst";

const flags = readFlags();
console.info("[tempo-warp] boot", flags);

const host = document.querySelector<HTMLElement>("#app");
if (!host) {
  throw new Error("#app missing");
}

const game = createGameScene(host);
const groundWarp = createGroundWarp(game.scene);
const beatWave = createBeatWave(game.scene);
const beatMode = (flags.seed >>> 0) % 2 === 0 ? "rings" : "wave";
beatWave.setActive(beatMode === "wave");
console.info("[tempo-warp] beat", beatMode);
const burst = createShatterBurst(game.scene);
const craft = createPlayerBlob(game.scene);
createLandmarks(game.scene);
const audio = createAudioBus(flags.track);
const pointer = createPointer(game.renderer.domElement, game.camera, () => {
  void audio.unlock();
});
const player = createPlayer();
const field = createObstacleField(flags.seed);
const obstacleViews = createObstacleViews(game.scene);
const debug = createDebugOverlay(flags.debug, () => {
  const id = audio.cycleTrack();
  console.info("[tempo-warp] track", id);
});
const trackChip = createTrackChip();
trackChip.update(audio.track);
console.info("[tempo-warp] music", flags.track);
const flashClear = new THREE.Color(0x1a3048);
const clearMix = new THREE.Color();

let simTime = 0;
let shatterCount = 0;
let fpsSmooth = 60;
let invuln = 0;
let flashT = 0;

const canvas = game.renderer.domElement;
const tryUnlock = () => {
  if (audio.unlocked) return;
  void audio.unlock();
};
canvas.addEventListener("pointerdown", tryUnlock);
canvas.addEventListener("pointerup", tryUnlock);
canvas.addEventListener("touchstart", tryUnlock, { passive: true });
canvas.addEventListener("touchend", tryUnlock, { passive: true });
canvas.addEventListener("click", tryUnlock);
const sleepAudio = () => audio.sleep();
const wakeAudio = () => {
  void audio.wake();
  tryUnlock();
};
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") sleepAudio();
  else wakeAudio();
});
window.addEventListener("pagehide", sleepAudio);
window.addEventListener("pageshow", wakeAudio);
document.addEventListener("freeze", sleepAudio);
document.addEventListener("resume", wakeAudio);

obstacleViews.sync(field.obstacles);

if (flags.debug) {
  (window as unknown as { __tempoAim: (x: number, z: number, boosting: boolean) => void }).__tempoAim = (
    x,
    z,
    boosting,
  ) => {
    pointer.setWorldAim(x, z, boosting);
  };
}

let lastFrame = performance.now();
startLoop(
  (dt) => {
    simTime += dt;
    if (invuln > 0) invuln = Math.max(0, invuln - dt);

    // Still mouse must not freeze a world aim point behind the craft
    const halfW = (game.camera.right - game.camera.left) * 0.5;
    const halfH = (game.camera.top - game.camera.bottom) * 0.5;
    pointer.syncFromPlayer(player.x, player.z, halfW, halfH);

    stepPlayer(player, dt, pointer.worldX, pointer.worldZ, pointer.boosting, pointer.active);
    applyCurrent(player, dt);
    // Prefer velocity heading; fall back to aim so spawns load ahead of the camera
    let hx = player.vx;
    let hz = player.vz;
    if (Math.hypot(hx, hz) < 0.4 && pointer.active) {
      hx = pointer.worldX - player.x;
      hz = pointer.worldZ - player.z;
    }
    field.step(dt, simTime, player.x, player.z, player.speed01, hx, hz, audio.arrange01);

    // Latch: after a hit, ignore collisions until fully clear (fixes ghost re-stops)
    if (!player.clearOfHazards) {
      if (!playerOverlapsAny(player, field.obstacles)) {
        player.clearOfHazards = true;
      }
    } else if (invuln <= 0 && player.shatterT <= 0) {
      for (const o of field.obstacles) {
        if (playerHitsObstacle(player, o)) {
          const hx = player.x;
          const hz = player.z;
          applyImpact(player, o.x, o.z);
          separatePlayer(player, field.obstacles);
          burst.trigger(hx, hz);
          obstacleViews.pulse(hx, hz);
          flashT = 0.22;
          shatterCount += 1;
          field.noteHit();
          invuln = tuning.shatterInvuln;
          break;
        }
      }
    }

    burst.update(dt);
    if (flashT > 0) flashT = Math.max(0, flashT - dt);
    const radius = radiusOf(player.x, player.z);
    audio.setFromPlay(player.speed01, radius01At(radius), player.shatterT > 0, dt);
  },
  (_alpha, dtReal) => {
    const now = performance.now();
    if (now - lastFrame > 2000) {
      audio.sleep();
      if (document.visibilityState !== "hidden") void audio.wake();
    }
    lastFrame = now;
    fpsSmooth = fpsSmooth * 0.9 + (1 / Math.max(dtReal, 1 / 240)) * 0.1;

    const speed = player.speed01;
    const shattered = player.shatterT > 0;
    const radius = radiusOf(player.x, player.z);

    craft.update(
      player.x,
      player.z,
      player.vx,
      player.vz,
      speed,
      player.throttle,
      player.shatterT,
      radius,
      dtReal,
    );

    const flash = flashT / 0.22;
    const placeClear = clearForRadius(radius);
    if (flash > 0) {
      clearMix.copy(placeClear).lerp(flashClear, flash);
      game.renderer.setClearColor(clearMix);
    } else {
      game.renderer.setClearColor(placeClear);
    }
    if (game.scene.fog instanceof THREE.FogExp2) {
      game.scene.fog.color.copy(placeClear);
      game.scene.fog.density =
        tuning.fogDensity + (shattered ? 0.01 : 0) + speed * 0.002;
    }

    const current = currentStrength(radius);
    const warp = shattered ? 0 : warpAt(speed, radius) + current * 0.22;
    groundWarp.setBand(colorForRadius(radius));
    groundWarp.setWarp(warp, audio.unlocked ? audio.beatPhase : simTime);
    const hold = audio.arrange01;
    const beatLines =
      beatMode === "rings" ? (hold < 0.4 ? 1 : hold < 0.7 ? 2 : 3) + (current > 0.35 ? 1 : 0) : 0;
    groundWarp.setBeat(audio.kick, audio.snare, audio.hat, beatLines, dtReal);
    groundWarp.follow(player.x, player.z);
    game.placeGround(player.x, player.z);

    obstacleViews.sync(field.obstacles, dtReal, {
      bass: audio.bass,
      lead: audio.lead,
      voice: audio.voice,
      hat: audio.hat,
    });
    game.followPlayer(player.x, player.z, dtReal);
    const halfW = (game.camera.right - game.camera.left) * 0.5;
    beatWave.update(
      game.camera.position.x,
      game.camera.position.z,
      halfW,
      audio.kick,
      audio.snare,
      audio.hat,
      audio.beatPhase,
      speed,
      radius,
      dtReal,
    );

    game.renderer.render(game.scene, game.camera);
    trackChip.update(audio.track);
    debug.update(player, fpsSmooth, {
      obstacleCount: field.obstacles.length,
      densityTarget: densityAt(player.speed01, radius, field.ease),
      warp,
      track: audio.track,
      radius01: radius01At(radius),
      musicHold: audio.musicHold,
      arrange01: audio.arrange01,
      beatMode,
    });

    (window as unknown as { __tempo: unknown }).__tempo = {
      speed01: player.speed01,
      throttle: player.throttle,
      boosting: player.boosting,
      x: player.x,
      z: player.z,
      shatterCount,
      shatterT: player.shatterT,
      audioUnlocked: audio.unlocked,
      obstacleCount: field.obstacles.length,
      densityTarget: densityAt(player.speed01, radius, field.ease),
      warp,
      track: audio.track,
      radius01: radius01At(radius),
      musicHold: audio.musicHold,
      arrange01: audio.arrange01,
      beatMode,
    };
  },
);
