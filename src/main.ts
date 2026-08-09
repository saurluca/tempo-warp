import { readFlags } from "./flags";
import { createGameScene } from "./view/scene";

const flags = readFlags();
console.info("[tempo-warp] boot", flags);

const host = document.querySelector<HTMLElement>("#app");
if (!host) {
  throw new Error("#app missing");
}

const game = createGameScene(host);

// Idle pulse so the stack is visibly alive before gameplay lands
let t = 0;
function frame(now: number) {
  const dt = Math.min(0.05, (now - t) / 1000 || 0.016);
  t = now;
  game.player.rotation.y += dt * 0.8;
  game.player.position.y = 0.55 + Math.sin(now * 0.003) * 0.06;
  game.renderer.render(game.scene, game.camera);
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);

if (flags.debug) {
  const el = document.createElement("div");
  el.id = "debug";
  el.style.cssText =
    "position:fixed;left:8px;top:8px;color:#9ec9ff;font:12px/1.4 monospace;opacity:0.85;pointer-events:none;z-index:10";
  el.textContent = `debug seed=${flags.seed} audio=${flags.audio}`;
  document.body.appendChild(el);
}
