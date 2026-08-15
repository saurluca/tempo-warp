import * as THREE from "three";
import { tuning } from "../tuning";

export interface GameScene {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.OrthographicCamera;
  parallax: THREE.Mesh;
  placeGround: (x: number, z: number) => void;
  resize: () => void;
  followPlayer: (x: number, z: number, dt: number) => void;
  dispose: () => void;
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

  const parallax = new THREE.Mesh(
    new THREE.PlaneGeometry(800, 800),
    new THREE.MeshBasicMaterial({
      color: 0x122033,
      transparent: true,
      opacity: 0.32,
      depthTest: false,
      depthWrite: false,
    }),
  );
  parallax.rotation.x = -Math.PI / 2;
  parallax.position.y = -0.4;
  scene.add(parallax);

  const placeGround = (x: number, z: number) => {
    parallax.position.x = x;
    parallax.position.z = z;
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
    parallax,
    placeGround,
    resize,
    followPlayer,
    dispose: () => {
      window.removeEventListener("resize", resize);
      renderer.dispose();
      host.removeChild(renderer.domElement);
    },
  };
}
