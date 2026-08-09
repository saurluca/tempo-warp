import * as THREE from "three";
import type { Obstacle, ObstacleKind } from "../sim/types";

export interface ObstacleViews {
  sync: (obstacles: Obstacle[]) => void;
  dispose: () => void;
}

function neonMat(emissive: number, intensity: number): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: 0x0a1520,
    emissive,
    emissiveIntensity: intensity,
    roughness: 0.25,
    metalness: 0.7,
    transparent: true,
    opacity: 0.92,
  });
}

function makeGeometry(kind: ObstacleKind, size: number): THREE.BufferGeometry {
  switch (kind) {
    case "spire":
      return new THREE.OctahedronGeometry(size * 1.1, 0);
    case "monolith":
      return new THREE.BoxGeometry(size * 0.7, size * 2.8, size * 0.7);
    case "ring":
      return new THREE.TorusGeometry(size * 1.05, size * 0.22, 10, 28);
    case "shard":
      return new THREE.TetrahedronGeometry(size * 1.15, 0);
    default: {
      const _exhaustive: never = kind;
      throw new Error(`unknown obstacle kind: ${String(_exhaustive)}`);
    }
  }
}

function restingEmissive(kind: ObstacleKind): number {
  switch (kind) {
    case "spire":
      return 0x4da3ff;
    case "monolith":
      return 0x7b5cff;
    case "ring":
      return 0x3dffc8;
    case "shard":
      return 0xff5ec8;
    default: {
      const _exhaustive: never = kind;
      throw new Error(`unknown obstacle kind: ${String(_exhaustive)}`);
    }
  }
}

function disposeMesh(mesh: THREE.Mesh): void {
  mesh.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.geometry.dispose();
      const mat = child.material;
      if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
      else mat.dispose();
    }
  });
}

export function createObstacleViews(scene: THREE.Scene): ObstacleViews {
  const group = new THREE.Group();
  scene.add(group);
  const meshes = new Map<number, THREE.Mesh>();
  const kinds = new Map<number, ObstacleKind>();

  const sync = (obstacles: Obstacle[]) => {
    const seen = new Set<number>();
    for (const o of obstacles) {
      seen.add(o.id);
      let mesh = meshes.get(o.id);
      if (!mesh || kinds.get(o.id) !== o.kind) {
        if (mesh) {
          group.remove(mesh);
          disposeMesh(mesh);
        }
        const geo = makeGeometry(o.kind, o.size);
        const mat = neonMat(restingEmissive(o.kind), 0.85);
        mesh = new THREE.Mesh(geo, mat);
        // Thin wire shell for silhouette read
        const wire = new THREE.Mesh(
          makeGeometry(o.kind, o.size * 1.04),
          new THREE.MeshBasicMaterial({
            color: restingEmissive(o.kind),
            wireframe: true,
            transparent: true,
            opacity: 0.35,
            depthWrite: false,
          }),
        );
        mesh.add(wire);
        meshes.set(o.id, mesh);
        kinds.set(o.id, o.kind);
        group.add(mesh);
      }

      const y =
        o.kind === "ring" ? o.size * 0.9 : o.kind === "monolith" ? o.size * 1.4 : o.size * 0.95;
      mesh.position.set(o.x, y, o.z);
      if (o.kind === "ring") {
        mesh.rotation.x = Math.PI / 2;
      } else if (o.kind === "shard") {
        mesh.rotation.y += 0.01;
        mesh.rotation.z = 0.35;
      } else if (o.kind === "spire") {
        mesh.rotation.y += 0.005;
      }

      const mat = mesh.material as THREE.MeshStandardMaterial;
      if (o.moving) {
        mat.emissiveIntensity = 0.7 + o.telegraphT * 1.5;
        mat.emissive.setHex(o.telegraphT > 0.75 ? 0xffdd66 : 0xff6a3a);
        mesh.scale.setScalar(1 + o.telegraphT * 0.06);
      } else {
        mat.emissiveIntensity = 0.9;
        mat.emissive.setHex(restingEmissive(o.kind));
        mesh.scale.setScalar(1);
      }
    }

    for (const [id, mesh] of meshes) {
      if (!seen.has(id)) {
        group.remove(mesh);
        disposeMesh(mesh);
        meshes.delete(id);
        kinds.delete(id);
      }
    }
  };

  return {
    sync,
    dispose: () => {
      for (const mesh of meshes.values()) {
        group.remove(mesh);
        disposeMesh(mesh);
      }
      meshes.clear();
      kinds.clear();
      scene.remove(group);
    },
  };
}
