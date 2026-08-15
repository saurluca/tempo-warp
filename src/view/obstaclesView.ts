import * as THREE from "three";
import type { Obstacle, ObstacleKind } from "../sim/types";
import { tuning } from "../tuning";

export interface StemHits {
  bass: number;
  lead: number;
  voice: number;
  hat: number;
}

export interface ObstacleViews {
  sync: (obstacles: Obstacle[], dt?: number, stems?: StemHits) => void;
  pulse: (x: number, z: number) => void;
  dispose: () => void;
}

/** Each glyph kind listens to a different stem (kick/snare stay on the floor). */
const STEM_OF: Record<ObstacleKind, keyof StemHits> = {
  spire: "bass",
  monolith: "voice",
  shard: "lead",
  ring: "hat",
};

const KIND_COLOR: Record<ObstacleKind, number> = {
  spire: 0x4da3ff,
  monolith: 0xc86bff,
  shard: 0xff9a3c,
  ring: 0x2ee6a6,
};

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

function makePulseRing(): { mesh: THREE.Line; geo: THREE.BufferGeometry; mat: THREE.LineBasicMaterial } {
  const n = 64;
  const pos = new Float32Array((n + 1) * 3);
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2;
    pos[i * 3] = Math.cos(a);
    pos[i * 3 + 1] = 0.04;
    pos[i * 3 + 2] = Math.sin(a);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.LineBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0,
    depthTest: false,
    depthWrite: false,
  });
  const mesh = new THREE.Line(geo, mat);
  mesh.visible = false;
  mesh.renderOrder = 6;
  mesh.frustumCulled = false;
  return { mesh, geo, mat };
}

export function createObstacleViews(scene: THREE.Scene): ObstacleViews {
  const group = new THREE.Group();
  scene.add(group);
  const glyphs = new Map<number, Glyph>();
  const kinds = new Map<number, ObstacleKind>();
  const hot = new THREE.Color();
  const flash = new THREE.Color(0xffffff);
  const ring = makePulseRing();
  group.add(ring.mesh);

  let pulseR = 0;
  let pulsing = false;

  const pulse = (x: number, z: number) => {
    pulseR = 0;
    pulsing = true;
    ring.mesh.position.set(x, 1.02, z);
    ring.mesh.visible = true;
    ring.mat.opacity = 0.85;
  };

  const sync = (obstacles: Obstacle[], dt = 0, stems: StemHits = { bass: 0, lead: 0, voice: 0, hat: 0 }) => {
    if (pulsing) {
      pulseR += dt * tuning.shatterPulseSpeed;
      if (pulseR >= tuning.shatterPulseMax) {
        pulsing = false;
        ring.mesh.visible = false;
      } else {
        ring.mesh.scale.setScalar(Math.max(0.01, pulseR));
        ring.mat.opacity = 0.85 * (1 - pulseR / tuning.shatterPulseMax);
      }
    }

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

      const hit = stems[STEM_OF[o.kind]] ?? 0;
      hot.setHex(KIND_COLOR[o.kind]);
      if (hit > 0.02) hot.lerp(flash, hit * 0.55);
      glyph.fillMat.color.copy(hot);
      glyph.rimMat.color.copy(hot);
      glyph.fillMat.opacity = tuning.hazardFillOpacity * (1 + o.telegraphT * 0.4 + hit * 0.4);
      glyph.rimMat.opacity = tuning.hazardRimOpacity;
      glyph.root.scale.setScalar(1 + o.telegraphT * 0.05 + hit * 0.14);
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
    pulse,
    dispose: () => {
      for (const glyph of glyphs.values()) {
        group.remove(glyph.root);
        disposeObject(glyph.root);
      }
      glyphs.clear();
      kinds.clear();
      group.remove(ring.mesh);
      ring.geo.dispose();
      ring.mat.dispose();
      scene.remove(group);
    },
  };
}
