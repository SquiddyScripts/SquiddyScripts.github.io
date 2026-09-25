'use client';

import { Text, useScroll } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import gsap from "gsap";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

import { usePortalStore } from "@stores";
import BlossomBranch, { Stem } from "./BlossomBranch";
import GoldCloud from "./GoldCloud";
import { Grow } from "./palette";

const SPRIG: Stem[] = [
  { points: [[-2.2, -1.6, -1.6], [-1.2, -0.9, -1.5], [-0.2, -0.1, -1.4], [0.9, 0.6, -1.3], [1.9, 1.1, -1.2]], radius: 0.05, start: 0, end: 0.7, blossoms: 7, leaves: 4 },
  { points: [[-0.2, -0.1, -1.4], [0.4, -0.9, -1.4], [1.3, -1.2, -1.3]], radius: 0.03, start: 0.35, end: 0.95, blossoms: 4, leaves: 2 },
];

interface TileMotifProps {
  id: string;
  kind: 'cloud' | 'blossom';
  label: string;
  color: string;
  visible: boolean;
}

// What a floor tile shows before you step into it. Stitches itself in as the camera lands,
// and the label opens up while the tile is hovered.
const TileMotif = ({ id, kind, label, color, visible }: TileMotifProps) => {
  const ref = useRef<THREE.Group>(null);
  const labelRef = useRef<THREE.Mesh>(null);
  const grow = useMemo<Grow>(() => ({ value: 0 }), []);
  const sprig = useMemo(() => SPRIG, []);
  const hovered = usePortalStore((state) => state.hoveredPortalId === id);
  const data = useScroll();

  useFrame(() => {
    grow.value = Math.max(grow.value, data.range(0.82, 0.16));
  });

  useEffect(() => {
    if (ref.current) gsap.to(ref.current.scale, { x: visible ? 1 : 0, y: visible ? 1 : 0, z: visible ? 1 : 0, duration: 0.6 });
  }, [visible]);

  useEffect(() => {
    if (labelRef.current) gsap.to(labelRef.current, { letterSpacing: hovered ? 0.3 : 0.14, duration: 0.5, ease: 'power2.out' });
  }, [hovered]);

  return (
    <group ref={ref}>
      {kind === 'cloud' ? (
        <group position={[0, 0.3, -1.4]} scale={0.62}>
          <GoldCloud grow={grow} thread={0.045} />
        </group>
      ) : (
        <group position={[0.5, 0.55, 0]}>
          <BlossomBranch stems={sprig} grow={grow} seed={5} blossomSize={0.34} />
        </group>
      )}
      <Text ref={labelRef}
        position={[0, -1.25, -1.2]}
        font="./cormorant-sc.ttf"
        fontSize={0.4}
        letterSpacing={0.14}
        color={color}
        anchorX="center"
        anchorY="middle">
        {label}
      </Text>
    </group>
  );
};

export default TileMotif;
