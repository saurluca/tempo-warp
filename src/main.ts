import { createAudioBus } from "./audio/bus";
import { createDebugOverlay } from "./debug/overlay";
import { readFlags } from "./flags";
import { createPointer } from "./input/pointer";
import { startLoop } from "./loop";
import { playerHitsObstacle } from "./sim/collide";
import { spawnPlaceholders, stepObstacles } from "./sim/obstacles";
import { createPlayer, hardShatter, stepPlayer } from "./sim/player";
import { tuning } from "./tuning";
import { colorForSpeed, emissiveForSpeed } from "./view/colors";
import { createObstacleViews } from "./view/obstaclesView";
import { createGameScene } from "./view/scene";

const flags = readFlags();
console.info("[tempo-warp] boot", flags);

const host = document.querySelector<HTMLElement>("#app");
if (!host) {
  throw new Error("#app missing");
}

const game = createGameScene(host);
const pointer = createPointer(game.renderer.domElement, game.camera);
const player = createPlayer();
const obstacles = spawnPlaceholders(flags.seed);
const obstacleViews = createObstacleViews(game.scene);
const audio = createAudioBus(flags.audio);
const debug = createDebugOverlay(flags.debug);

let simTime = 0;
let shatterCount = 0;
let fpsSmooth = 60;
let invuln = 0;

// Unlock audio on first gesture (browser policy)
const unlockOnce = () => {
  void audio.unlock();
  game.renderer.domElement.removeEventListener("pointerdown", unlockOnce);
};
game.renderer.domElement.addEventListener("pointerdown", unlockOnce);

obstacleViews.sync(obstacles);

startLoop(
  (dt) => {
    simTime += dt;
    if (invuln > 0) invuln = Math.max(0, invuln - dt);

    stepPlayer(player, dt, pointer.worldX, pointer.worldZ, pointer.boosting, pointer.active);
    stepObstacles(obstacles, dt, simTime);

    if (invuln <= 0 && player.shatterT <= 0) {
      for (const o of obstacles) {
        if (playerHitsObstacle(player, o)) {
          hardShatter(player);
          shatterCount += 1;
          invuln = tuning.shatterInvuln;
          break;
        }
      }
    }

    audio.setFromSpeed(player.speed01, player.shatterT > 0);
  },
  (_alpha, dtReal) => {
    fpsSmooth = fpsSmooth * 0.9 + (1 / Math.max(dtReal, 1 / 240)) * 0.1;

    game.player.position.x = player.x;
    game.player.position.z = player.z;
    game.player.position.y = tuning.playerRadius;

    const speed = player.speed01;
    const stretch = 1 + (tuning.stretchMax - 1) * speed * (player.boosting ? 1 : 0.5);
    const yaw = Math.atan2(player.vx, player.vz || 0.0001);
    game.player.rotation.set(0, yaw, 0);
    game.player.scale.set(1 / Math.sqrt(stretch), 1, stretch);

    const c = colorForSpeed(player.shatterT > 0 ? 0 : speed);
    const e = emissiveForSpeed(player.shatterT > 0 ? 0 : speed);
    game.playerMat.color.copy(c);
    game.playerMat.emissive.copy(e);
    game.playerMat.emissiveIntensity = player.shatterT > 0 ? 0.35 : 1.2 + speed * 1.1;
    game.playerMat.opacity = player.shatterT > 0 ? 0.55 : 1;
    game.playerMat.transparent = player.shatterT > 0;
    game.playerMat.roughness = player.shatterT > 0 ? 0.85 : 0.25;
    game.ringMat.color.copy(c);
    game.ringMat.opacity = player.shatterT > 0 ? 0.2 : 0.4 + speed * 0.4;

    obstacleViews.sync(obstacles);
    game.followPlayer(player.x, player.z, dtReal);
    game.ground.position.x = player.x;
    game.ground.position.z = player.z;
    game.parallax.position.x = player.x * 0.85;
    game.parallax.position.z = player.z * 0.85;

    game.renderer.render(game.scene, game.camera);
    debug.update(player, fpsSmooth);

    // Probe surface for browser automation
    (window as unknown as { __tempo: unknown }).__tempo = {
      speed01: player.speed01,
      boosting: player.boosting,
      x: player.x,
      z: player.z,
      shatterCount,
      shatterT: player.shatterT,
      audioUnlocked: audio.unlocked,
    };
  },
);
