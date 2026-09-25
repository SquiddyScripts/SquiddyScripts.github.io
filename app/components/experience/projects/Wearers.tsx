import { useTexture } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import gsap from "gsap";
import { useEffect, useMemo, useRef } from "react";
import { isMobile } from "react-device-detect";
import * as THREE from "three";

import { WEARERS } from "@constants";
import { useOrderStore, usePortalStore } from "@stores";

// People wearing it, rising slowly in two columns far out on either flank so the middle stays
// clear for the jacket and the reservation tag. Looking around brings them into view.
const MIDDLE = isMobile ? 0 : 1.6;
const SPREAD = isMobile ? 5.2 : 9.4;
// The tag hangs right of the jacket, so the right column stands off further to clear it.
const RIGHT_EXTRA = isMobile ? 0 : 2.4;
const DEPTH = -9;
const FRAME: [number, number] = [2.1, 2.8];
const SPACING = 3.4;
const RISE = 0.18;

const cover = (texture: THREE.Texture, aspect: number) => {
  const t = texture.clone();
  const frame = FRAME[0] / FRAME[1];
  if (aspect > frame) {
    t.repeat.set(frame / aspect, 1);
    t.offset.set((1 - frame / aspect) / 2, 0);
  } else {
    t.repeat.set(1, aspect / frame);
    t.offset.set(0, (1 - aspect / frame) / 2);
  }
  t.needsUpdate = true;
  return t;
};

interface WearerProps {
  src: string;
  aspect: number;
  side: number;
  slot: number;
  slots: number;
}

const Wearer = ({ src, aspect, side, slot, slots }: WearerProps) => {
  const ref = useRef<THREE.Group>(null);
  const photoRef = useRef<THREE.MeshBasicMaterial>(null);
  const frameRef = useRef<THREE.MeshBasicMaterial>(null);
  const source = useTexture(src);
  const map = useMemo(() => cover(source, aspect), [source, aspect]);
  const loop = slots * SPACING;

  useEffect(() => () => map.dispose(), [map]);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.elapsedTime;
    // Columns rise in opposite phase so the two sides never mirror each other.
    const travel = (slot * SPACING + t * RISE + (side > 0 ? SPACING / 2 : 0)) % loop;
    const y = travel - loop / 2 + 1.2;
    ref.current.position.set(
      MIDDLE + side * (SPREAD + Math.sin(t * 0.3 + slot) * 0.2) + (side > 0 ? RIGHT_EXTRA : 0),
      y,
      DEPTH + Math.cos(y * 0.35) * 0.8,
    );
    ref.current.rotation.set(0, -side * 0.38, Math.sin(t * 0.4 + slot * 2) * 0.03);
    // Fades at the top and bottom of the column so photos never pop in or out.
    const edge = 1 - THREE.MathUtils.smoothstep(Math.abs(y - 1.2), loop / 2 - 3, loop / 2 - 0.4);
    if (photoRef.current) photoRef.current.opacity = edge * 0.8;
    if (frameRef.current) frameRef.current.opacity = edge * 0.7;
  });

  return (
    <group ref={ref}>
      <mesh position={[0, 0, -0.01]}>
        <planeGeometry args={[FRAME[0] + 0.07, FRAME[1] + 0.07]} />
        <meshBasicMaterial ref={frameRef} color="#B8904F" transparent depthWrite={false} />
      </mesh>
      <mesh>
        <planeGeometry args={FRAME} />
        <meshBasicMaterial ref={photoRef} map={map} toneMapped={false} transparent depthWrite={false} color="#BDB4AC" />
      </mesh>
    </group>
  );
};

const Wearers = () => {
  const groupRef = useRef<THREE.Group>(null);
  const isActive = usePortalStore((state) => state.activePortalId === 'projects');
  const status = useOrderStore((state) => state.status);
  const shown = isActive && status !== 'sent';

  const columns = useMemo(() => {
    const left = WEARERS.filter((_, i) => i % 2 === 0);
    const right = WEARERS.filter((_, i) => i % 2 === 1);
    const slots = Math.max(left.length, right.length, 3) + 1;
    return { left, right, slots };
  }, []);

  useEffect(() => {
    if (!groupRef.current) return;
    const s = shown ? 1 : 0;
    gsap.to(groupRef.current.scale, {
      x: s,
      y: s,
      z: s,
      duration: shown ? 1.4 : 0.6,
      delay: shown ? 0.5 : 0,
      ease: shown ? 'power3.out' : 'power3.in',
    });
  }, [shown]);

  return (
    <group ref={groupRef} position={[MIDDLE, 1.2, DEPTH]} scale={0}>
      <group position={[-MIDDLE, -1.2, -DEPTH]}>
        {columns.left.map((w, i) => (
          <Wearer key={w.src} src={w.src} aspect={w.aspect} side={-1} slot={i} slots={columns.slots} />
        ))}
        {columns.right.map((w, i) => (
          <Wearer key={w.src} src={w.src} aspect={w.aspect} side={1} slot={i} slots={columns.slots} />
        ))}
      </group>
    </group>
  );
};

useTexture.preload(WEARERS.map((w) => w.src));

export default Wearers;
