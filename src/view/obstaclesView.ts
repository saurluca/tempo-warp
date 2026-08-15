import * as THREE from "three";
import type { Obstacle, ObstacleKind } from "../sim/types";
import { tuning } from "../tuning";
import { colorForRadius } from "./colors";

export interface ObstacleViews {
  sync: (obstacles: Obstacle[]) => void;
  dispose: () => void;
}

function disposeObject(obj: THREE.Object3D): void {
  obj.traverse((child) => {
    if (child instanceof THREE.Mesh || child instanceof THREE.Line) {
      child.geometry.dispose();
      const mat = child.material;
      if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
      else mat.dispose();
    }
  });
}

function diamondShape(s: number): THREE.Shape {
  const sh = new THREE.Shape();
  sh.moveTo(0, s);
  sh.lineTo(s * 0.72, 0);
  sh.lineTo(0, -s);
  sh.lineTo(-s * 0.72, 0);
  sh.closePath();
  return sh;
}

function rectShape(hx: number, hz: number): THREE.Shape {
  const sh = new THREE.Shape();
  sh.moveTo(-hx, -hz);
  sh.lineTo(hx, -hz);
  sh.lineTo(hx, hz);
  sh.lineTo(-hx, hz);
  sh.closePath();
  return sh;
}

function triangleShape(s: number): THREE.Shape {
  const sh = new THREE.Shape();
  sh.moveTo(0, s);
  sh.lineTo(s * 0.9, -s * 0.7);
  sh.lineTo(-s * 0.9, -s * 0.7);
  sh.closePath();
  return sh;
}

function outlineFromShape(shape: THREE.Shape, y: number): THREE.BufferGeometry {
  const pts = shape.getPoints(24);
  const pos = new Float32Array((pts.length + 1) * 3);
  for (let i = 0; i < pts.length; i++) {
    pos[i * 3] = pts[i]!.x;
    pos[i * 3 + 1] = y;
    pos[i * 3 + 2] = pts[i]!.y;
  }
  pos[pts.length * 3] = pts[0]!.x;
  pos[pts.length * 3 + 1] = y;
  pos[pts.length * 3 + 2] = pts[0]!.y;
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  return geo;
}

type Glyph = {
  root: THREE.Group;
  fillMat: THREE.MeshBasicMaterial;
  rimMat: THREE.LineBasicMaterial;
};

function makeGlyph(kind: ObstacleKind, size: number): Glyph {
  const root = new THREE.Group();
  const fillMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: tuning.hazardFillOpacity,
    depthTest: false,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const rimMat = new THREE.LineBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: tuning.hazardRimOpacity,
    depthTest: false,
    depthWrite: false,
  });

  let fill: THREE.BufferGeometry;
  let rim: THREE.BufferGeometry;

  if (kind === "ring") {
    const outer = size * 1.15;
    const inner = size * 0.55;
    fill = new THREE.RingGeometry(inner, outer, 36);
    fill.rotateX(-Math.PI / 2);
    const ringShape = new THREE.Shape();
    ringShape.absarc(0, 0, outer, 0, Math.PI * 2, false);
    rim = outlineFromShape(ringShape, 0.02);
  } else {
    const shape =
      kind === "spire"
        ? diamondShape(size * 1.05)
        : kind === "monolith"
          ? rectShape(size * 0.42, size * 0.95)
          : triangleShape(size * 1.05);
    fill = new THREE.ShapeGeometry(shape);
    fill.rotateX(-Math.PI / 2);
    rim = outlineFromShape(shape, 0.02);
  }

  const mesh = new THREE.Mesh(fill, fillMat);
  const line = new THREE.Line(rim, rimMat);
  mesh.renderOrder = 4;
  line.renderOrder = 5;
  root.add(mesh, line);
  return { root, fillMat, rimMat };
}

export function createObstacleViews(scene: THREE.Scene): ObstacleViews {
  const group = new THREE.Group();
  scene.add(group);
  const glyphs = new Map<number, Glyph>();
  const kinds = new Map<number, ObstacleKind>();
  const hot = new THREE.Color();

  const sync = (obstacles: Obstacle[]) => {
    const seen = new Set<number>();
    for (const o of obstacles) {
      seen.add(o.id);
      let glyph = glyphs.get(o.id);
      if (!glyph || kinds.get(o.id) !== o.kind) {
        if (glyph) {
          group.remove(glyph.root);
          disposeObject(glyph.root);
        }
        glyph = makeGlyph(o.kind, o.size);
        glyphs.set(o.id, glyph);
        kinds.set(o.id, o.kind);
        group.add(glyph.root);
      }

      glyph.root.position.set(o.x, 1.0, o.z);
      if (o.kind === "shard") glyph.root.rotation.y += 0.012;

      if (o.moving) {
        hot.setHex(o.telegraphT > 0.75 ? 0xffdd66 : 0xff6a3a);
        glyph.fillMat.color.copy(hot);
        glyph.rimMat.color.copy(hot);
        glyph.fillMat.opacity = tuning.hazardFillOpacity * (1 + o.telegraphT * 0.4);
        glyph.rimMat.opacity = tuning.hazardRimOpacity;
        glyph.root.scale.setScalar(1 + o.telegraphT * 0.05);
      } else {
        const col = colorForRadius(Math.hypot(o.x, o.z));
        glyph.fillMat.color.copy(col);
        glyph.rimMat.color.copy(col);
        glyph.fillMat.opacity = tuning.hazardFillOpacity;
        glyph.rimMat.opacity = tuning.hazardRimOpacity;
        glyph.root.scale.setScalar(1);
      }
    }

    for (const [id, glyph] of glyphs) {
      if (!seen.has(id)) {
        group.remove(glyph.root);
        disposeObject(glyph.root);
        glyphs.delete(id);
        kinds.delete(id);
      }
    }
  };

  return {
    sync,
    dispose: () => {
      for (const glyph of glyphs.values()) {
        group.remove(glyph.root);
        disposeObject(glyph.root);
      }
      glyphs.clear();
      kinds.clear();
      scene.remove(group);
    },
  };
}
