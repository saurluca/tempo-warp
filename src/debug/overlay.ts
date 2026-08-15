import { TRACKS, type TrackId } from "../audio/tracks";
import type { PlayerState } from "../sim/types";

export interface DebugExtras {
  obstacleCount?: number;
  densityTarget?: number;
  warp?: number;
  track?: TrackId;
  radius01?: number;
  musicHold?: number;
}

export interface DebugOverlay {
  update: (p: PlayerState, fps: number, extra?: DebugExtras) => void;
}

export function createDebugOverlay(
  enabled: boolean,
  onCycleTrack?: () => void,
  onToggleGrid?: () => boolean,
): DebugOverlay {
  if (!enabled) {
    return {
      update: () => {},
    };
  }

  const root = document.createElement("div");
  root.id = "debug";
  root.style.cssText =
    "position:fixed;left:8px;top:8px;color:#9ec9ff;font:12px/1.4 monospace;opacity:0.95;z-index:10;white-space:pre";

  const stats = document.createElement("div");
  stats.style.pointerEvents = "none";

  const trackBtn = document.createElement("button");
  trackBtn.type = "button";
  trackBtn.style.cssText = [
    "margin-top:8px",
    "pointer-events:auto",
    "cursor:pointer",
    "font:12px/1.2 monospace",
    "color:#0a0e14",
    "background:#4da3ff",
    "border:0",
    "padding:6px 10px",
    "border-radius:2px",
  ].join(";");
  trackBtn.title = "Click to cycle music track";
  trackBtn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    onCycleTrack?.();
  });
  trackBtn.addEventListener("pointerdown", (e) => {
    // Don't let the game treat this as boost
    e.stopPropagation();
  });

  const gridBtn = document.createElement("button");
  gridBtn.type = "button";
  gridBtn.textContent = "GRID: off";
  gridBtn.title = "Hide / show the ground grid";
  gridBtn.style.cssText = trackBtn.style.cssText;
  gridBtn.style.marginLeft = "6px";
  gridBtn.style.background = "#1a3048";
  gridBtn.style.color = "#9ec9ff";
  gridBtn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    const on = onToggleGrid?.() ?? true;
    gridBtn.textContent = on ? "GRID: on" : "GRID: off";
  });
  gridBtn.addEventListener("pointerdown", (e) => {
    e.stopPropagation();
  });

  const row = document.createElement("div");
  row.append(trackBtn, gridBtn);
  root.append(stats, row);
  document.body.appendChild(root);

  let lastTrack: TrackId | undefined;

  return {
    update(p: PlayerState, fps: number, extra: DebugExtras = {}) {
      stats.textContent = [
        `fps ${fps.toFixed(0)}`,
        `speed01 ${p.speed01.toFixed(2)}`,
        `throttle ${p.throttle.toFixed(2)}`,
        `hold ${p.boosting ? "ON" : "off"}`,
        `pos ${p.x.toFixed(1)}, ${p.z.toFixed(1)}`,
        `radius01 ${(extra.radius01 ?? 0).toFixed(2)}`,
        `musicHold ${(extra.musicHold ?? 0).toFixed(2)}`,
        `shatterT ${p.shatterT.toFixed(2)}`,
        `obs ${extra.obstacleCount ?? "?"} / ${extra.densityTarget?.toFixed(0) ?? "?"}`,
        `warp ${(extra.warp ?? 0).toFixed(2)}`,
      ].join("\n");

      if (extra.track && extra.track !== lastTrack) {
        lastTrack = extra.track;
        const def = TRACKS[extra.track];
        trackBtn.textContent = `♪ ${def.label}  (click)`;
        trackBtn.style.background = def.color;
      } else if (!extra.track && !trackBtn.textContent) {
        trackBtn.textContent = "♪ TRACK  (click)";
      }
    },
  };
}
