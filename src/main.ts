import * as THREE from "three";
import { createAudioBus } from "./audio/bus";
import { createDebugOverlay } from "./debug/overlay";
import { readFlags } from "./flags";
import { createPointer } from "./input/pointer";
import { startLoop } from "./loop";
import { playerHitsObstacle, playerOverlapsAny, separatePlayer } from "./sim/collide";
import { createObstacleField } from "./sim/obstacles";
import { applyImpact, createPlayer, stepPlayer } from "./sim/player";
import { densityAt, warpAt } from "./sim/world";
import { tuning } from "./tuning";
import { colorForSpeed, emissiveForSpeed } from "./view/colors";
import { createGroundWarp } from "./view/groundWarp";
import { createObstacleViews } from "./view/obstaclesView";
import { createPlayerTail } from "./view/playerTail";
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
const burst = createShatterBurst(game.scene);
const tail = createPlayerTail(game.scene);
const pointer = createPointer(game.renderer.domElement, game.camera);
const player = createPlayer();
const field = createObstacleField(flags.seed);
const obstacleViews = createObstacleViews(game.scene);
const audio = createAudioBus(flags.track);
const debug = createDebugOverlay(flags.debug, () => {
  const id = audio.cycleTrack();
  console.info("[tempo-warp] track", id);
});
console.info("[tempo-warp] music", flags.track);
const baseClear = new THREE.Color(tuning.clearColor);
const flashClear = new THREE.Color(0x1a3048);
const clearMix = new THREE.Color();

let simTime = 0;
let shatterCount = 0;
let fpsSmooth = 60;
let invuln = 0;
let flashT = 0;
// ponytail: one boolean + button; no settings store
let bgFollow = true;

const bgBtn = document.createElement("button");
bgBtn.type = "button";
bgBtn.textContent = "BG: sticky";
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
    pointer.worldX = x;
    pointer.worldZ = z;
    pointer.boosting = boosting;
    pointer.active = true;
  };
}

startLoop(
  (dt) => {
    simTime += dt;
    if (invuln > 0) invuln = Math.max(0, invuln - dt);

    stepPlayer(player, dt, pointer.worldX, pointer.worldZ, pointer.boosting, pointer.active);
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
    audio.setFromSpeed(player.speed01, player.shatterT > 0);
  },
  (_alpha, dtReal) => {
    fpsSmooth = fpsSmooth * 0.9 + (1 / Math.max(dtReal, 1 / 240)) * 0.1;

    game.player.position.x = player.x;
    game.player.position.z = player.z;
    game.player.position.y = tuning.playerRadius;

    const speed = player.speed01;
    const shattered = player.shatterT > 0;
    const stretch = shattered
      ? 0.75 + Math.sin(simTime * 40) * 0.08
      : 1 + (tuning.stretchMax - 1) * Math.max(speed, player.throttle * 0.85);
    const yaw = Math.atan2(player.vx, player.vz || 0.0001);
    game.player.rotation.set(0, yaw, 0);
    game.player.scale.set(
      shattered ? 1.15 : 1 / Math.sqrt(stretch),
      shattered ? 0.55 : 1,
      shattered ? 1.15 : stretch,
    );

    const c = colorForSpeed(shattered ? 0 : speed);
    const e = emissiveForSpeed(shattered ? 0 : speed);
    game.playerMat.color.copy(c);
    game.playerMat.emissive.copy(e);
    game.playerMat.emissiveIntensity = shattered ? 0.25 : 1.2 + speed * 1.1;
    game.playerMat.opacity = shattered ? 0.4 : 1;
    game.playerMat.transparent = shattered;
    game.playerMat.roughness = shattered ? 0.9 : 0.25;
    game.ringMat.color.copy(c);
    game.ringMat.opacity = shattered ? 0.12 : 0.4 + speed * 0.4;

    const flash = flashT / 0.22;
    if (flash > 0) {
      clearMix.copy(baseClear).lerp(flashClear, flash);
      game.renderer.setClearColor(clearMix);
    } else {
      game.renderer.setClearColor(baseClear);
    }
    if (game.scene.fog instanceof THREE.FogExp2) {
      game.scene.fog.density =
        tuning.fogDensity + (shattered ? 0.01 : 0) + speed * 0.002;
    }

    const warp = shattered ? 0 : warpAt(speed);
    groundWarp.setWarp(warp, simTime);
    // Mesh always under you (endless); sticky vs world is just UV scroll
    const worldFixed = !bgFollow;
    groundWarp.follow(player.x, player.z, worldFixed);
    game.placeGround(player.x, player.z, worldFixed);

    tail.update(player.x, player.z, player.vx, player.vz, shattered ? 0 : speed);

    obstacleViews.sync(field.obstacles);
    game.followPlayer(player.x, player.z, dtReal);

    game.renderer.render(game.scene, game.camera);
    debug.update(player, fpsSmooth, {
      obstacleCount: field.obstacles.length,
      densityTarget: densityAt(player.speed01),
      warp,
      track: audio.track,
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
      densityTarget: densityAt(player.speed01),
      warp,
      track: audio.track,
    };
  },
);
