import * as THREE from "three";
import { tuning } from "../tuning";

export interface PointerState {
  /** World XZ on the play plane (y = 0). */
  worldX: number;
  worldZ: number;
  /** Primary button held (boost). */
  boosting: boolean;
  /** Pointer has entered the canvas at least once. */
  active: boolean;
  /**
   * Recompute world aim from last screen NDC, anchored on the player.
   * Call every sim tick so a still mouse doesn't leave a stale world point
   * (craft flies past → aimDot=-1 → reverse thrust).
   */
  syncFromPlayer: (px: number, pz: number, halfW: number, halfH: number) => void;
  /** Debug / tests: pin a world aim until the next real pointer event. */
  setWorldAim: (x: number, z: number, boosting: boolean) => void;
}

/** Screen +X → world +X, screen +Y (down) → world +Z. Null inside deadzone. */
export function stickAim(
  px: number,
  pz: number,
  dx: number,
  dy: number,
  _radius: number,
  reach: number,
  deadzone: number,
): { x: number; z: number } | null {
  const len = Math.hypot(dx, dy);
  if (len < deadzone) return null;
  const nx = dx / len;
  const ny = dy / len;
  return { x: px + nx * reach, z: pz + ny * reach };
}

function clampStick(dx: number, dy: number, radius: number): { x: number; y: number } {
  const len = Math.hypot(dx, dy);
  if (len <= radius || len < 1e-6) return { x: dx, y: dy };
  const s = radius / len;
  return { x: dx * s, y: dy * s };
}

function makeStickHud(): {
  show: (ox: number, oy: number, dx: number, dy: number) => void;
  hide: () => void;
} {
  const wrap = document.createElement("div");
  wrap.style.cssText = "position:fixed;inset:0;pointer-events:none;z-index:5;display:none";
  const ring = document.createElement("div");
  const knob = document.createElement("div");
  const r = tuning.stickRadius;
  ring.style.cssText = [
    "position:absolute",
    `width:${r * 2}px`,
    `height:${r * 2}px`,
    "border-radius:50%",
    "border:2px solid #9ec9ff",
    "opacity:0.35",
    "box-sizing:border-box",
  ].join(";");
  knob.style.cssText = [
    "position:absolute",
    "width:28px",
    "height:28px",
    "margin:-14px 0 0 -14px",
    "border-radius:50%",
    "background:#9ec9ff",
    "opacity:0.55",
  ].join(";");
  wrap.append(ring, knob);
  document.body.appendChild(wrap);

  return {
    show(ox, oy, dx, dy) {
      const c = clampStick(dx, dy, r);
      wrap.style.display = "block";
      ring.style.left = `${ox - r}px`;
      ring.style.top = `${oy - r}px`;
      knob.style.left = `${ox + c.x}px`;
      knob.style.top = `${oy + c.y}px`;
    },
    hide() {
      wrap.style.display = "none";
    },
  };
}

export function createPointer(canvas: HTMLElement, camera: THREE.Camera): PointerState {
  const ndc = new THREE.Vector2(0, 0);
  let haveNdc = false;
  /** When true, syncFromPlayer won't overwrite (debug __tempoAim). */
  let pinnedWorld = false;
  let lastPx = 0;
  let lastPz = 0;
  let stickOn = false;
  let stickId: number | null = null;
  let originX = 0;
  let originY = 0;
  let stickDx = 0;
  let stickDy = 0;
  const hud = makeStickHud();

  const raycaster = new THREE.Raycaster();
  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const hit = new THREE.Vector3();

  const state: PointerState = {
    worldX: 0,
    worldZ: 0,
    boosting: false,
    active: false,
    syncFromPlayer: () => {},
    setWorldAim: () => {},
  };

  const applyStick = (px: number, pz: number) => {
    const aim = stickAim(
      px,
      pz,
      stickDx,
      stickDy,
      tuning.stickRadius,
      tuning.stickReach,
      tuning.stickDeadzone,
    );
    if (!aim) return;
    state.worldX = aim.x;
    state.worldZ = aim.z;
    state.active = true;
  };

  const readNdc = (clientX: number, clientY: number) => {
    const rect = canvas.getBoundingClientRect();
    const x = ((clientX - rect.left) / Math.max(rect.width, 1)) * 2 - 1;
    const y = -(((clientY - rect.top) / Math.max(rect.height, 1)) * 2 - 1);
    ndc.set(x, y);
    haveNdc = true;
    pinnedWorld = false;
  };

  /** Fallback sample through the live camera (first frame / resize). */
  const projectCamera = () => {
    raycaster.setFromCamera(ndc, camera);
    if (raycaster.ray.intersectPlane(plane, hit)) {
      state.worldX = hit.x;
      state.worldZ = hit.z;
      state.active = true;
    }
  };

  const project = (clientX: number, clientY: number) => {
    readNdc(clientX, clientY);
    projectCamera();
  };

  state.syncFromPlayer = (px, pz, halfW, halfH) => {
    lastPx = px;
    lastPz = pz;
    if (pinnedWorld) return;
    if (stickOn) {
      applyStick(px, pz);
      return;
    }
    if (!haveNdc) return;
    // Ortho top-down, camera.up = (0,0,-1): screen +Y → world −Z
    state.worldX = px + ndc.x * halfW;
    state.worldZ = pz - ndc.y * halfH;
    state.active = true;
  };

  state.setWorldAim = (x, z, boosting) => {
    state.worldX = x;
    state.worldZ = z;
    state.boosting = boosting;
    state.active = true;
    pinnedWorld = true;
  };

  const endStick = () => {
    stickOn = false;
    stickId = null;
    hud.hide();
  };

  const onMove = (e: PointerEvent) => {
    if (stickOn && e.pointerId === stickId) {
      stickDx = e.clientX - originX;
      stickDy = e.clientY - originY;
      applyStick(lastPx, lastPz);
      hud.show(originX, originY, stickDx, stickDy);
      return;
    }
    if (e.pointerType === "touch") return;
    project(e.clientX, e.clientY);
    state.boosting = (e.buttons & 1) === 1;
  };

  const onDown = (e: PointerEvent) => {
    if (e.button !== 0) return;
    try {
      canvas.setPointerCapture(e.pointerId);
    } catch {
      // Synthetic / non-capturable pointers still drive aim + boost.
    }
    state.boosting = true;
    pinnedWorld = false;
    if (e.pointerType === "touch") {
      if (stickId !== null) return;
      stickOn = true;
      stickId = e.pointerId;
      originX = e.clientX;
      originY = e.clientY;
      stickDx = 0;
      stickDy = 0;
      hud.show(originX, originY, 0, 0);
      return;
    }
    project(e.clientX, e.clientY);
  };

  const onUp = (e: PointerEvent) => {
    if (e.button !== 0) return;
    state.boosting = false;
    if (stickOn && e.pointerId === stickId) {
      endStick();
      return;
    }
    if (e.pointerType === "touch") return;
    project(e.clientX, e.clientY);
  };

  canvas.addEventListener("pointermove", onMove);
  canvas.addEventListener("pointerdown", onDown);
  canvas.addEventListener("pointerup", onUp);
  canvas.addEventListener("pointercancel", onUp);
  canvas.addEventListener("lostpointercapture", () => {
    if (!stickOn) return;
    state.boosting = false;
    endStick();
  });
  // Avoid browser drag/select stealing boost
  canvas.style.touchAction = "none";
  canvas.style.userSelect = "none";

  return state;
}
