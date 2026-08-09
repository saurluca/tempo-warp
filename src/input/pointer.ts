import * as THREE from "three";

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

export function createPointer(canvas: HTMLElement, camera: THREE.Camera): PointerState {
  const ndc = new THREE.Vector2(0, 0);
  let haveNdc = false;
  /** When true, syncFromPlayer won't overwrite (debug __tempoAim). */
  let pinnedWorld = false;

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
    if (!haveNdc || pinnedWorld) return;
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

  const onMove = (e: PointerEvent) => {
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
    project(e.clientX, e.clientY);
  };

  const onUp = (e: PointerEvent) => {
    if (e.button !== 0) return;
    state.boosting = false;
    project(e.clientX, e.clientY);
  };

  const onLeave = () => {
    // Keep last aim; stop boost if capture lost
  };

  canvas.addEventListener("pointermove", onMove);
  canvas.addEventListener("pointerdown", onDown);
  canvas.addEventListener("pointerup", onUp);
  canvas.addEventListener("pointercancel", onUp);
  canvas.addEventListener("lostpointercapture", onLeave);
  // Avoid browser drag/select stealing boost
  canvas.style.touchAction = "none";
  canvas.style.userSelect = "none";

  return state;
}
