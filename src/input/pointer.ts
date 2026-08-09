import * as THREE from "three";

export interface PointerState {
  /** World XZ on the play plane (y = 0). */
  worldX: number;
  worldZ: number;
  /** Primary button held (boost). */
  boosting: boolean;
  /** Pointer has entered the canvas at least once. */
  active: boolean;
}

export function createPointer(canvas: HTMLElement, camera: THREE.Camera): PointerState {
  const state: PointerState = {
    worldX: 0,
    worldZ: 0,
    boosting: false,
    active: false,
  };

  const ndc = new THREE.Vector2();
  const raycaster = new THREE.Raycaster();
  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const hit = new THREE.Vector3();

  const project = (clientX: number, clientY: number) => {
    const rect = canvas.getBoundingClientRect();
    const x = ((clientX - rect.left) / Math.max(rect.width, 1)) * 2 - 1;
    const y = -(((clientY - rect.top) / Math.max(rect.height, 1)) * 2 - 1);
    ndc.set(x, y);
    raycaster.setFromCamera(ndc, camera);
    if (raycaster.ray.intersectPlane(plane, hit)) {
      state.worldX = hit.x;
      state.worldZ = hit.z;
      state.active = true;
    }
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
