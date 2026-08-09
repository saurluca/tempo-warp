import type { PlayerState } from "../sim/types";

export function createDebugOverlay(enabled: boolean) {
  if (!enabled) {
    return {
      update: (_p: PlayerState, _fps: number) => {},
    };
  }

  const el = document.createElement("div");
  el.id = "debug";
  el.style.cssText =
    "position:fixed;left:8px;top:8px;color:#9ec9ff;font:12px/1.4 monospace;opacity:0.9;pointer-events:none;z-index:10;white-space:pre";
  document.body.appendChild(el);

  return {
    update(p: PlayerState, fps: number) {
      el.textContent = [
        `fps ${fps.toFixed(0)}`,
        `speed01 ${p.speed01.toFixed(2)}`,
        `boost ${p.boosting ? "ON" : "off"}`,
        `pos ${p.x.toFixed(1)}, ${p.z.toFixed(1)}`,
        `shatterT ${p.shatterT.toFixed(2)}`,
      ].join("\n");
    },
  };
}
