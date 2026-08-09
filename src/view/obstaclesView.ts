import * as THREE from "three";
import type { Obstacle } from "../sim/types";

export interface ObstacleViews {
  sync: (obstacles: Obstacle[]) => void;
  dispose: () => void;
}

export function createObstacleViews(scene: THREE.Scene): ObstacleViews {
  const group = new THREE.Group();
  scene.add(group);
  const meshes = new Map<number, THREE.Mesh>();

  const sync = (obstacles: Obstacle[]) => {
    const seen = new Set<number>();
    for (const o of obstacles) {
      seen.add(o.id);
      let mesh = meshes.get(o.id);
      if (!mesh) {
        const geo = new THREE.BoxGeometry(o.halfW * 2, 1.4, o.halfD * 2);
        const mat = new THREE.MeshStandardMaterial({
          color: 0x1a2838,
          emissive: 0x3a6cff,
          emissiveIntensity: 0.35,
          roughness: 0.4,
          metalness: 0.55,
          wireframe: false,
        });
        // Neon edge feel via slightly taller thin box outline — keep simple
        mesh = new THREE.Mesh(geo, mat);
        meshes.set(o.id, mesh);
        group.add(mesh);
      }
      mesh.position.set(o.x, 0.7, o.z);
      const mat = mesh.material as THREE.MeshStandardMaterial;
      if (o.moving) {
        mat.emissiveIntensity = 0.25 + o.telegraphT * 0.85;
        mat.emissive.setHex(0xff6a3a);
      } else {
        mat.emissiveIntensity = 0.4;
        mat.emissive.setHex(0x3a6cff);
      }
    }

    for (const [id, mesh] of meshes) {
      if (!seen.has(id)) {
        group.remove(mesh);
        mesh.geometry.dispose();
        (mesh.material as THREE.Material).dispose();
        meshes.delete(id);
      }
    }
  };

  return {
    sync,
    dispose: () => {
      for (const mesh of meshes.values()) {
        group.remove(mesh);
        mesh.geometry.dispose();
        (mesh.material as THREE.Material).dispose();
      }
      meshes.clear();
      scene.remove(group);
    },
  };
}
