import * as THREE from "three";
import { tuning } from "../tuning";

/** One still glyph per band rim — world-fixed, no collision. */
export function createLandmarks(scene: THREE.Scene): { dispose: () => void } {
  const group = new THREE.Group();
  scene.add(group);
  const geos: THREE.BufferGeometry[] = [];
  const mats: THREE.Material[] = [];

  const specs = [
    { r: tuning.bandEdges[0], a: 0.35, inner: 16, outer: 20, arc: Math.PI * 1.15, color: tuning.bandColors[1] },
    { r: tuning.bandEdges[1], a: 2.05, inner: 22, outer: 28, arc: Math.PI * 1.45, color: tuning.bandColors[2] },
    { r: tuning.bandEdges[2], a: 4.1, inner: 28, outer: 36, arc: Math.PI * 0.85, color: tuning.bandColors[3] },
    { r: tuning.bandEdges[3], a: 1.15, inner: 40, outer: 50, arc: Math.PI * 2, color: tuning.bandColors[4] },
  ] as const;

  for (const s of specs) {
    const geo = new THREE.RingGeometry(s.inner, s.outer, 48, 1, 0, s.arc);
    geo.rotateX(-Math.PI / 2);
    geos.push(geo);
    const mat = new THREE.MeshBasicMaterial({
      color: s.color,
      transparent: true,
      opacity: 0.42,
      depthTest: false,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    mats.push(mat);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(Math.cos(s.a) * s.r, 0.9, Math.sin(s.a) * s.r);
    mesh.renderOrder = 3;
    group.add(mesh);
  }

  return {
    dispose() {
      scene.remove(group);
      for (const g of geos) g.dispose();
      for (const m of mats) m.dispose();
    },
  };
}
