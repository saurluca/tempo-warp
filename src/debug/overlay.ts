import { TRACKS, type TrackId } from "../audio/tracks";
import { isMobile } from "../flags";
import type { PlayerState } from "../sim/types";

export interface DebugExtras {
  obstacleCount?: number;
  densityTarget?: number;
  warp?: number;
  track?: TrackId;
  radius01?: number;
  musicHold?: number;
  arrange01?: number;
  beatMode?: string;
}

export interface DebugOverlay {
  update: (p: PlayerState, fps: number, extra?: DebugExtras) => void;
}

export function createTrackChip(): { update: (id: TrackId) => void } {
  const el = document.createElement("div");
  el.style.cssText = [
    "position:fixed",
    ...(isMobile() ? ["left:8px", "bottom:8px"] : ["right:8px", "top:8px"]),
    "z-index:10",
    "pointer-events:none",
    "font:12px/1.2 monospace",
    "color:#0a0e14",
    "background:#4da3ff",
    "padding:6px 10px",
    "border-radius:2px",
  ].join(";");
  document.body.appendChild(el);
  let last: TrackId | undefined;
  return {
    update(id) {
      if (id === last) return;
      last = id;
      const def = TRACKS[id];
      el.textContent = `♪ ${def.label}`;
      el.style.background = def.color;
    },
  };
}

export function createDebugOverlay(enabled: boolean, onCycleTrack?: () => void): DebugOverlay {
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

  const row = document.createElement("div");
  row.append(trackBtn);
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
        `arrange ${(extra.arrange01 ?? 0).toFixed(2)}`,
        `beat ${extra.beatMode ?? "?"}`,
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
