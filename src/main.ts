import * as THREE from "three";
import { createAudioBus } from "./audio/bus";
import { createDebugOverlay } from "./debug/overlay";
import { readFlags } from "./flags";
import { createPointer } from "./input/pointer";
import { startLoop } from "./loop";
import { playerHitsObstacle, playerOverlapsAny, separatePlayer } from "./sim/collide";
import { createObstacleField } from "./sim/obstacles";
import { applyImpact, createPlayer, stepPlayer } from "./sim/player";
import { applyCurrent, bandAt, currentStrength, densityAt, radius01At, radiusOf, warpAt } from "./sim/world";
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
const pointer = createPointer(game.renderer.domElement, game.camera);
const player = createPlayer();
const field = createObstacleField(flags.seed);
const obstacleViews = createObstacleViews(game.scene);
const audio = createAudioBus(flags.track);
let gridOn = false;
const debug = createDebugOverlay(
  flags.debug,
  () => {
    const id = audio.cycleTrack();
    console.info("[tempo-warp] track", id);
  },
  () => {
    gridOn = !gridOn;
    game.setGrid(gridOn);
    groundWarp.setGrid(gridOn);
    return gridOn;
  },
);
console.info("[tempo-warp] music", flags.track);
const flashClear = new THREE.Color(0x1a3048);
const clearMix = new THREE.Color();

let simTime = 0;
let shatterCount = 0;
let fpsSmooth = 60;
let invuln = 0;
let flashT = 0;
let lastBand = 0;
// ponytail: one boolean + button; no settings store
let bgFollow = false;

const bgBtn = document.createElement("button");
bgBtn.type = "button";
bgBtn.textContent = "BG: world";
bgBtn.title = "Sticky = grid rides with you · World = endless fixed grid";
bgBtn.style.cssText = [
  "position:fixed",
  "right:8px",
  "top:8px",
  "z-index:10",
  "cursor:pointer",
  "font:12px/1.2 monospace",
  "color:#9ec9ff",
  "background:#122033",
  "border:1px solid #1a3048",
  "padding:6px 10px",
].join(";");
const stopBoost = (e: Event) => {
  e.preventDefault();
  e.stopPropagation();
};
bgBtn.addEventListener("pointerdown", stopBoost);
bgBtn.addEventListener("click", (e) => {
  stopBoost(e);
  bgFollow = !bgFollow;
  bgBtn.textContent = bgFollow ? "BG: sticky" : "BG: world";
});
document.body.appendChild(bgBtn);

const unlockOnce = () => {
  void audio.unlock();
  game.renderer.domElement.removeEventListener("pointerdown", unlockOnce);
};
game.renderer.domElement.addEventListener("pointerdown", unlockOnce);

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
    field.step(dt, simTime, player.x, player.z, player.speed01, hx, hz);

    // Latch: after a hit, ignore collisions until fully clear (fixes ghost re-stops)
    if (!player.clearOfHazards) {
      if (!playerOverlapsAny(player, field.obstacles)) {
        player.clearOfHazards = true;
      }
    } else if (invuln <= 0 && player.shatterT <= 0) {
      for (const o of field.obstacles) {
        if (playerHitsObstacle(player, o)) {
          applyImpact(player, o.x, o.z);
          separatePlayer(player, field.obstacles);
          burst.trigger(player.x, player.z);
          flashT = 0.22;
          shatterCount += 1;
          invuln = tuning.shatterInvuln;
          break;
        }
      }
    }

    burst.update(dt);
    if (flashT > 0) flashT = Math.max(0, flashT - dt);
    const radius = radiusOf(player.x, player.z);
    const band = bandAt(radius);
    if (band > lastBand && player.speed01 >= tuning.currentRideSpeed && player.shatterT <= 0) {
      console.info("[tempo-warp] spin", audio.spinNext());
    }
    lastBand = band;
    audio.setFromPlay(player.speed01, radius01At(radius), player.shatterT > 0, dt);
  },
  (_alpha, dtReal) => {
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
    const halfW = (game.camera.right - game.camera.left) * 0.5;
    beatWave.update(
      player.x,
      player.z,
      halfW,
      audio.kick,
      audio.snare,
      audio.hat,
      audio.beatPhase,
      speed,
      radius,
      dtReal,
    );
    // Mesh always under you (endless); sticky vs world is just UV scroll
    const worldFixed = !bgFollow;
    groundWarp.follow(player.x, player.z, worldFixed);
    game.placeGround(player.x, player.z, worldFixed);

    obstacleViews.sync(field.obstacles);
    game.followPlayer(player.x, player.z, dtReal);

    game.renderer.render(game.scene, game.camera);
    debug.update(player, fpsSmooth, {
      obstacleCount: field.obstacles.length,
      densityTarget: densityAt(player.speed01, radius),
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
      densityTarget: densityAt(player.speed01, radius),
      warp,
      track: audio.track,
      radius01: radius01At(radius),
      musicHold: audio.musicHold,
      arrange01: audio.arrange01,
      beatMode,
    };
  },
);
