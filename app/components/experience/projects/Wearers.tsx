import { useTexture } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import gsap from "gsap";
import { useEffect, useMemo, useRef } from "react";
import { isMobile } from "react-device-detect";
import * as THREE from "three";

import { Wearer as WearerPhoto, WEARERS } from "@constants";
import { JacketColor, useOrderStore, usePortalStore } from "@stores";

// People wearing it, rising slowly in two columns far out on either flank so the middle stays
// clear for the jacket and the reservation tag. Only the colorway being looked at is shown;
// switching color crossfades one set into the other in the same slots.
const MIDDLE = isMobile ? 0 : 1.6;
const SPREAD = isMobile ? 5.2 : 9.4;
// The tag hangs right of the jacket, so the right column stands off further to clear it.
const RIGHT_EXTRA = isMobile ? 0 : 2.4;
const DEPTH = -9;
const FRAME: [number, number] = [2.1, 2.8];
const SPACING = 3.4;
const RISE = 0.18;

// Fills the portrait frame from the photo (or its crop window) without stretching it.
const cover = (texture: THREE.Texture, photo: WearerPhoto) => {
  const t = texture.clone();
  const [l, top, r, b] = photo.crop ?? [0, 0, 1, 1];
  const width = r - l;
  const height = b - top;
  const aspect = photo.aspect * (width / height);
  const frame = FRAME[0] / FRAME[1];
  let repeatX = width;
  let repeatY = height;
  if (aspect > frame) repeatX = width * (frame / aspect);
  else repeatY = height * (aspect / frame);
  t.repeat.set(repeatX, repeatY);
  t.offset.set(l + (width - repeatX) / 2, 1 - b + (height - repeatY) / 2);
  t.needsUpdate = true;
  return t;
};

interface WearerProps {
  photo: WearerPhoto;
  side: number;
  slot: number;
  slots: number;
  color: { value: JacketColor };
}

const Wearer = ({ photo, side, slot, slots, color }: WearerProps) => {
  const ref = useRef<THREE.Group>(null);
  const photoRef = useRef<THREE.MeshBasicMaterial>(null);
  const frameRef = useRef<THREE.MeshBasicMaterial>(null);
  const shown = useRef(photo.color === color.value ? 1 : 0);
  const source = useTexture(photo.src);
  const map = useMemo(() => cover(source, photo), [source, photo]);
  const loop = slots * SPACING;

  useEffect(() => () => map.dispose(), [map]);

  useFrame(({ clock }, delta) => {
    if (!ref.current) return;
    const t = clock.elapsedTime;
    shown.current = THREE.MathUtils.damp(shown.current, photo.color === color.value ? 1 : 0, 3, delta);
    ref.current.visible = shown.current > 0.01;
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
    if (photoRef.current) photoRef.current.opacity = edge * 0.8 * shown.current;
    if (frameRef.current) frameRef.current.opacity = edge * 0.7 * shown.current;
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
  const selected = useOrderStore((state) => state.color);
  const color = useMemo(() => ({ value: selected }), []);
  const shown = isActive && status !== 'sent';

  useEffect(() => { color.value = selected; }, [selected]);

  const sets = useMemo(() => {
    const byColor = (c: JacketColor) => WEARERS.filter((w) => w.color === c);
    const maroon = byColor('Maroon');
    const black = byColor('Black');
    return { maroon, black, slots: Math.max(maroon.length, black.length) + 1 };
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
        {[sets.maroon, sets.black].flatMap((set) => [-1, 1].flatMap((side) => set.map((photo, i) => (
          <Wearer key={`${photo.color}-${photo.src}-${side}`}
            photo={photo}
            side={side}
            slot={side > 0 ? (i + 1) % set.length : i}
            slots={sets.slots}
            color={color} />
        ))))}
      </group>
    </group>
  );
};

useTexture.preload(Array.from(new Set(WEARERS.map((w) => w.src))));

export default Wearers;
