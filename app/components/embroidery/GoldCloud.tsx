'use client';

import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";

import { CLOUD_GOLD, Grow } from "./palette";

// Ribbon clouds like the ones in the tech pack artwork: long flowing strands stacked in layers,
// each one rolling up into a spiral curl at its end, stitched as a doubled gold line.
export interface Ribbon {
  x: number;
  y: number;
  length: number;
  curl: number;
  // Which end the strand curls at.
  dir: 1 | -1;
  wave?: number;
}

const DEFAULT_RIBBONS: Ribbon[] = [
  { x: 0.2, y: 1.25, length: 1.4, curl: 0.5, dir: 1, wave: 0.12 },
  { x: -0.8, y: 0.6, length: 2.8, curl: 0.62, dir: -1, wave: 0.16 },
  { x: 0.7, y: 0.05, length: 3.0, curl: 0.48, dir: 1, wave: 0.14 },
  { x: -0.3, y: -0.5, length: 4.0, curl: 0.36, dir: -1, wave: 0.1 },
];

const ribbonCurve = ({ x, y, length, curl, dir, wave = 0.12 }: Ribbon, inset: number) => {
  const points: THREE.Vector3[] = [];
  const along = 28;
  for (let i = 0; i <= along; i++) {
    const t = i / along;
    points.push(new THREE.Vector3(
      x - dir * length / 2 + dir * t * length,
      y + Math.sin(t * Math.PI * 1.5) * wave * (1 - t * 0.5) + inset,
      0,
    ));
  }
  // Roll into the curl: continue forward, lift, and spiral inward.
  const end = points[points.length - 1];
  const cx = end.x;
  const cy = end.y + curl - inset;
  const turns = 1.6;
  const steps = 44;
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const angle = -Math.PI / 2 + dir * t * turns * Math.PI * 2;
    const radius = (curl - inset) * (1 - t * 0.8);
    points.push(new THREE.Vector3(cx + Math.cos(angle) * radius * dir, cy + Math.sin(angle) * radius, t * 0.03));
  }
  return new THREE.CatmullRomCurve3(points);
};

interface GoldCloudProps {
  grow: Grow;
  ribbons?: Ribbon[];
  thread?: number;
  start?: number;
  end?: number;
}

const GoldCloud = ({ grow, ribbons = DEFAULT_RIBBONS, thread = 0.03, start = 0, end = 1 }: GoldCloudProps) => {
  const groupRef = useRef<THREE.Group>(null);
  const lastGrow = useRef(-1);

  const strands = useMemo(() => {
    const out: { geometry: THREE.TubeGeometry, color: string, delay: number }[] = [];
    ribbons.forEach((ribbon, i) => {
      [0, 0.12].forEach((inset, row) => {
        out.push({
          geometry: new THREE.TubeGeometry(ribbonCurve(ribbon, inset), 140, thread * (row ? 0.75 : 1), 5, false),
          color: CLOUD_GOLD[row === 0 ? (i % 2 ? 1 : 0) : 2],
          delay: (i / ribbons.length) * 0.45,
        });
      });
    });
    return out;
  }, [ribbons, thread]);

  useLayoutEffect(() => () => strands.forEach((s) => s.geometry.dispose()), [strands]);

  useFrame(({ clock }) => {
    if (groupRef.current) groupRef.current.position.x = Math.sin(clock.elapsedTime * 0.25 + ribbons.length) * 0.08;

    const g = THREE.MathUtils.clamp((grow.value - start) / (end - start), 0, 1);
    if (g === lastGrow.current) return;
    lastGrow.current = g;
    strands.forEach(({ geometry, delay }) => {
      const local = THREE.MathUtils.clamp((g - delay) / 0.55, 0, 1);
      const count = geometry.index?.count ?? 0;
      const segment = 5 * 6;
      geometry.setDrawRange(0, Math.floor((count * local) / segment) * segment);
    });
  });

  return (
    <group ref={groupRef}>
      {strands.map((s, i) => (
        <mesh key={i} geometry={s.geometry}>
          <meshBasicMaterial color={s.color} />
        </mesh>
      ))}
    </group>
  );
};

export default GoldCloud;
