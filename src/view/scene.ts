import * as THREE from "three";
import { tuning } from "../tuning";

const GROUND_PLANE = 800;
/** Higher repeat = smaller world-space grid cells */
const GROUND_REPEAT = 48;
const GROUND_TILE = GROUND_PLANE / GROUND_REPEAT;

export interface GameScene {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.OrthographicCamera;
  ground: THREE.Mesh;
  parallax: THREE.Mesh;
  /** Mesh always under player; worldFixed scrolls the grid so it looks world-locked. */
  placeGround: (x: number, z: number, worldFixed: boolean) => void;
  setGrid: (on: boolean) => void;
  resize: () => void;
  followPlayer: (x: number, z: number, dt: number) => void;
  dispose: () => void;
}

function makeGridTexture(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("2d context unavailable");
  }
  ctx.fillStyle = "#0c121c";
  ctx.fillRect(0, 0, size, size);
  ctx.strokeStyle = "#1a3048";
  ctx.lineWidth = 1.5;
  const step = 16;
  for (let i = 0; i <= size; i += step) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, size);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(size, i);
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createGameScene(host: HTMLElement): GameScene {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(tuning.clearColor, 1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(tuning.clearColor, tuning.fogDensity);

  const aspect = window.innerWidth / Math.max(window.innerHeight, 1);
  const viewSize = tuning.cameraHeight;
  const camera = new THREE.OrthographicCamera(
    (-viewSize * aspect) / 2,
    (viewSize * aspect) / 2,
    viewSize / 2,
    -viewSize / 2,
    0.1,
    4000,
  );
  camera.position.set(0, tuning.cameraHeight, 0);
  camera.up.set(0, 0, -1);
  camera.lookAt(0, 0, 0);

  const ambient = new THREE.AmbientLight(0x6a8aaa, 0.55);
  const key = new THREE.DirectionalLight(0xb0d4ff, 1.1);
  key.position.set(8, 20, -6);
  scene.add(ambient, key);

  // Underlay only — animated warp mesh sits above (groundWarp.ts)
  const groundMap = makeGridTexture();
  groundMap.repeat.set(GROUND_REPEAT, GROUND_REPEAT);
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(GROUND_PLANE, GROUND_PLANE, 1, 1),
    new THREE.MeshStandardMaterial({
      map: groundMap,
      roughness: 0.95,
      metalness: 0.02,
      color: 0x445566,
      transparent: true,
      opacity: 0.35,
      depthTest: false,
      depthWrite: false,
    }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.02;
  ground.visible = false;
  scene.add(ground);

  const parallax = new THREE.Mesh(
    new THREE.PlaneGeometry(800, 800),
    new THREE.MeshBasicMaterial({
      color: 0x122033,
      transparent: true,
      opacity: 0.55,
      depthTest: false,
      depthWrite: false,
    }),
  );
  parallax.rotation.x = -Math.PI / 2;
  parallax.position.y = -0.4;
  scene.add(parallax);

  const placeGround = (x: number, z: number, worldFixed: boolean) => {
    ground.position.x = x;
    ground.position.z = z;
    parallax.position.x = x;
    parallax.position.z = z;
    if (worldFixed) {
      groundMap.offset.set(x / GROUND_TILE, -z / GROUND_TILE);
    } else {
      groundMap.offset.set(0, 0);
    }
  };

  let camX = 0;
  let camZ = 0;

  const resize = () => {
    const w = window.innerWidth;
    const h = Math.max(window.innerHeight, 1);
    const a = w / h;
    camera.left = (-viewSize * a) / 2;
    camera.right = (viewSize * a) / 2;
    camera.top = viewSize / 2;
    camera.bottom = -viewSize / 2;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
  };

  const followPlayer = (x: number, z: number, dt: number) => {
    const k = 1 - Math.exp(-tuning.cameraFollow * dt);
    camX += (x - camX) * k;
    camZ += (z - camZ) * k;
    camera.position.x = camX;
    camera.position.z = camZ;
    camera.lookAt(camX, 0, camZ);
  };

  resize();
  window.addEventListener("resize", resize);

  return {
    renderer,
    scene,
    camera,
    ground,
    parallax,
    placeGround,
    setGrid: (on) => {
      ground.visible = on;
    },
    resize,
    followPlayer,
    dispose: () => {
      window.removeEventListener("resize", resize);
      renderer.dispose();
      host.removeChild(renderer.domElement);
    },
  };
}
