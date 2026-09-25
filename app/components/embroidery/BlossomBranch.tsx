'use client';

import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";

import { BRANCH, Grow, LEAVES, PETAL_CENTER, PETALS, seeded } from "./palette";

export interface Stem {
  points: [number, number, number][];
  radius: number;
  // Window of the overall growth (0 to 1) in which this stem draws itself.
  start: number;
  end: number;
  blossoms?: number;
  leaves?: number;
  // Off for a length of trunk that carries on off screen: full width to the end, no bud.
  taper?: boolean;
}

interface BlossomBranchProps {
  stems: Stem[];
  grow: Grow;
  seed?: number;
  blossomSize?: number;
}

const TUBULAR = 80;
const RADIAL = 6;

// Thins a tube toward its tip so a stem finishes in a point instead of a flat cut.
const taperedTube = (curve: THREE.Curve<THREE.Vector3>, radius: number, taper = true) => {
  const geometry = new THREE.TubeGeometry(curve, TUBULAR, radius, RADIAL, false);
  if (!taper) return geometry;
  const pos = geometry.attributes.position;
  const center = new THREE.Vector3();
  const v = new THREE.Vector3();
  for (let i = 0; i <= TUBULAR; i++) {
    const t = i / TUBULAR;
    curve.getPointAt(t, center);
    const taper = 1 - 0.8 * Math.pow(t, 1.5);
    for (let j = 0; j <= RADIAL; j++) {
      const k = i * (RADIAL + 1) + j;
      v.fromBufferAttribute(pos, k).sub(center).multiplyScalar(taper).add(center);
      pos.setXYZ(k, v.x, v.y, v.z);
    }
  }
  return geometry;
};

const petalGeometry = (() => {
  let cached: THREE.BufferGeometry | null = null;
  return () => {
    if (cached) return cached;
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.bezierCurveTo(-0.34, 0.18, -0.36, 0.66, -0.1, 0.8);
    shape.quadraticCurveTo(0, 0.72, 0.1, 0.8);
    shape.bezierCurveTo(0.36, 0.66, 0.34, 0.18, 0, 0);
    const geometry = new THREE.ShapeGeometry(shape, 10);
    const pos = geometry.attributes.position;
    const colors = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i);
      // Cup the petal toward the viewer and shade it like satin stitch, dark at the base.
      pos.setZ(i, y * y * 0.35 - Math.abs(pos.getX(i)) * 0.12);
      const shade = 0.62 + y * 0.55;
      colors.set([shade, shade, shade], i * 3);
    }
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    cached = geometry;
    return geometry;
  };
})();

const leafGeometry = (() => {
  let cached: THREE.BufferGeometry | null = null;
  return () => {
    if (cached) return cached;
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.quadraticCurveTo(0.26, 0.45, 0, 1);
    shape.quadraticCurveTo(-0.26, 0.45, 0, 0);
    const geometry = new THREE.ShapeGeometry(shape, 8);
    const pos = geometry.attributes.position;
    const colors = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      pos.setZ(i, -Math.abs(x) * 0.5);
      const shade = x > 0 ? 1.05 : 0.72;
      colors.set([shade, shade, shade], i * 3);
    }
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    cached = geometry;
    return geometry;
  };
})();

interface Placed {
  stem: number;
  at: number;
  position: THREE.Vector3;
  quaternion: THREE.Quaternion;
  scale: number;
  color: THREE.Color;
  bud: boolean;
}

const dummy = new THREE.Object3D();
const spin = new THREE.Matrix4();
const openTilt = new THREE.Matrix4().makeRotationX(-0.55);
const budTilt = new THREE.Matrix4().makeRotationX(-1.3);

const BlossomBranch = ({ stems, grow, seed = 7, blossomSize = 0.55 }: BlossomBranchProps) => {
  const groupRef = useRef<THREE.Group>(null);
  const petalsRef = useRef<THREE.InstancedMesh>(null);
  const centersRef = useRef<THREE.InstancedMesh>(null);
  const leavesRef = useRef<THREE.InstancedMesh>(null);
  const tubes = useRef<(THREE.Mesh | null)[]>([]);
  const lastGrow = useRef(-1);

  const built = useMemo(() => {
    const rand = seeded(seed);
    const curves = stems.map((s) => new THREE.CatmullRomCurve3(s.points.map((p) => new THREE.Vector3(...p))));
    const geometries = curves.map((curve, i) => taperedTube(curve, stems[i].radius, stems[i].taper));

    // Rests a flower against the stem and a little toward the viewer so it never sinks into the wood.
    const onSurface = (curve: THREE.CatmullRomCurve3, t: number, radius: number, lift: number) => {
      const point = curve.getPointAt(t);
      const tangent = curve.getTangentAt(t);
      const side = new THREE.Vector3(-tangent.y, tangent.x, 0).normalize().multiplyScalar(rand() > 0.5 ? 1 : -1);
      const r = radius * (1 - 0.8 * Math.pow(t, 1.5));
      return point.add(side.multiplyScalar(r + lift * (0.4 + rand() * 0.6))).add(new THREE.Vector3(0, 0, r + lift * 0.5));
    };

    const blossoms: Placed[] = [];
    const leaves: Placed[] = [];
    stems.forEach((s, i) => {
      const curve = curves[i];
      const n = s.blossoms ?? 0;
      for (let b = 0; b < n; b++) {
        const at = Math.min(0.94, 0.22 + 0.72 * ((b + rand() * 0.6) / Math.max(1, n)));
        const scale = blossomSize * (0.65 + rand() * 0.5);
        blossoms.push({
          stem: i,
          at,
          position: onSurface(curve, at, s.radius, scale * 0.3),
          quaternion: new THREE.Quaternion().setFromEuler(new THREE.Euler((rand() - 0.5) * 0.9, (rand() - 0.5) * 0.9, rand() * Math.PI * 2)),
          scale,
          color: new THREE.Color(PETALS[Math.floor(rand() * PETALS.length)]),
          bud: false,
        });
      }
      // Each stem finishes in a closed bud, pointing the way it was growing.
      const tangent = curve.getTangentAt(1);
      if (s.taper !== false) blossoms.push({
        stem: i,
        at: 0.97,
        position: curve.getPointAt(1).add(tangent.clone().multiplyScalar(blossomSize * 0.1)),
        quaternion: new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), tangent),
        scale: blossomSize * 0.45,
        color: new THREE.Color(PETALS[Math.floor(rand() * PETALS.length)]),
        bud: true,
      });

      for (let l = 0; l < (s.leaves ?? 0); l++) {
        const at = Math.min(0.94, 0.12 + 0.8 * ((l + rand() * 0.8) / Math.max(1, s.leaves ?? 1)));
        const tangentAt = curve.getTangentAt(at);
        const angle = Math.atan2(tangentAt.y, tangentAt.x) - Math.PI / 2 + (rand() > 0.5 ? 0.9 : -0.9) + (rand() - 0.5) * 0.4;
        leaves.push({
          stem: i,
          at,
          position: onSurface(curve, at, s.radius, 0),
          quaternion: new THREE.Quaternion().setFromEuler(new THREE.Euler((rand() - 0.5) * 0.8, (rand() - 0.5) * 0.6, angle)),
          scale: blossomSize * (0.7 + rand() * 0.5),
          color: new THREE.Color(LEAVES[Math.floor(rand() * LEAVES.length)]),
          bud: false,
        });
      }
    });

    return { geometries, blossoms, leaves };
  }, [stems, seed, blossomSize]);

  useLayoutEffect(() => () => built.geometries.forEach((g) => g.dispose()), [built]);

  useLayoutEffect(() => {
    built.blossoms.forEach((b, i) => {
      for (let p = 0; p < 5; p++) petalsRef.current?.setColorAt(i * 5 + p, b.color);
    });
    built.leaves.forEach((l, i) => leavesRef.current?.setColorAt(i, l.color));
    if (petalsRef.current?.instanceColor) petalsRef.current.instanceColor.needsUpdate = true;
    if (leavesRef.current?.instanceColor) leavesRef.current.instanceColor.needsUpdate = true;
  }, [built]);

  const stemProgress = (i: number, g: number) => {
    const s = stems[i];
    return THREE.MathUtils.clamp((g - s.start) / (s.end - s.start), 0, 1);
  };

  useFrame(({ clock }) => {
    if (groupRef.current) {
      groupRef.current.rotation.z = Math.sin(clock.elapsedTime * 0.35 + seed) * 0.01;
    }

    const g = grow.value;
    if (g === lastGrow.current) return;
    lastGrow.current = g;

    built.geometries.forEach((geometry, i) => {
      const count = geometry.index?.count ?? 0;
      const ring = RADIAL * 6;
      geometry.setDrawRange(0, Math.floor((count * stemProgress(i, g)) / ring) * ring);
      const tube = tubes.current[i];
      if (tube) tube.visible = stemProgress(i, g) > 0;
    });

    // Flowers open together in one wave once the wood is mostly in, so the moment is hard to miss.
    built.blossoms.forEach((b, i) => {
      const open = THREE.MathUtils.smoothstep(g, 0.45 + b.at * 0.25, 0.75 + b.at * 0.25);
      for (let p = 0; p < 5; p++) {
        dummy.position.copy(b.position);
        dummy.quaternion.copy(b.quaternion);
        dummy.scale.setScalar(b.scale * open);
        dummy.updateMatrix();
        spin.makeRotationZ((p / 5) * Math.PI * 2);
        dummy.matrix.multiply(spin).multiply(b.bud ? budTilt : openTilt);
        petalsRef.current?.setMatrixAt(i * 5 + p, dummy.matrix);
      }
      dummy.position.copy(b.position);
      dummy.quaternion.copy(b.quaternion);
      dummy.scale.setScalar(b.bud ? 0 : b.scale * open * 0.16);
      dummy.updateMatrix();
      centersRef.current?.setMatrixAt(i, dummy.matrix);
    });

    built.leaves.forEach((l, i) => {
      const open = THREE.MathUtils.smoothstep(stemProgress(l.stem, g), l.at - 0.02, l.at + 0.15);
      dummy.position.copy(l.position);
      dummy.quaternion.copy(l.quaternion);
      dummy.scale.setScalar(l.scale * open);
      dummy.updateMatrix();
      leavesRef.current?.setMatrixAt(i, dummy.matrix);
    });

    if (petalsRef.current) petalsRef.current.instanceMatrix.needsUpdate = true;
    if (centersRef.current) centersRef.current.instanceMatrix.needsUpdate = true;
    if (leavesRef.current) leavesRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <group ref={groupRef}>
      {built.geometries.map((geometry, i) => (
        <mesh key={i} geometry={geometry} ref={(m) => { tubes.current[i] = m; }} visible={false}>
          <meshBasicMaterial color={BRANCH} />
        </mesh>
      ))}
      <instancedMesh ref={leavesRef} args={[leafGeometry(), undefined, Math.max(1, built.leaves.length)]} frustumCulled={false}>
        <meshBasicMaterial vertexColors side={THREE.DoubleSide} />
      </instancedMesh>
      <instancedMesh ref={petalsRef} args={[petalGeometry(), undefined, Math.max(1, built.blossoms.length * 5)]} frustumCulled={false}>
        <meshBasicMaterial vertexColors side={THREE.DoubleSide} />
      </instancedMesh>
      <instancedMesh ref={centersRef} args={[undefined, undefined, Math.max(1, built.blossoms.length)]} frustumCulled={false}>
        <sphereGeometry args={[1, 10, 8]} />
        <meshBasicMaterial color={PETAL_CENTER} />
      </instancedMesh>
    </group>
  );
};

export default BlossomBranch;
