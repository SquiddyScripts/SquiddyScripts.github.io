'use client';

import { Text, useTexture } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { isMobile } from "react-device-detect";
import * as THREE from "three";

import { PROGRESS } from "@constants";
import { ProgressShot } from "@types";

const GOLD = '#C6A36A';
const IVORY = '#F4EFE6';

// The camera falls straight down the y axis at x = 0, z = 5 between scroll 0.3 and 0.8.
// Each shot hangs just off that line so it grows, slides past the edge of the frame and is gone.
const TOP = -10.5;
const BOTTOM = -21.5;
const HEIGHT = 1.9;

const Shot = ({ shot, index, count }: { shot: ProgressShot, index: number, count: number }) => {
  const groupRef = useRef<THREE.Group>(null);
  const photoRef = useRef<THREE.MeshBasicMaterial>(null);
  const frameRef = useRef<THREE.MeshBasicMaterial>(null);
  const titleRef = useRef<THREE.Mesh>(null);
  const captionRef = useRef<THREE.Mesh>(null);
  const map = useTexture(shot.src);

  const layout = useMemo(() => {
    const side = index % 2 === 0 ? -1 : 1;
    const width = isMobile
      ? Math.min(1.15, 1.05 * shot.aspect)
      : Math.min(HEIGHT * shot.aspect, 3.2);
    const height = width / shot.aspect;
    return {
      y: TOP + (BOTTOM - TOP) * (index / Math.max(1, count - 1)),
      x: side * (isMobile ? 0.22 : 1.1 + width * 0.3),
      z: 5 + (index % 3 - 1) * 0.35,
      tilt: side * 0.05,
      lean: side * -0.18,
      width,
      height,
      side,
    };
  }, [index, count, shot.aspect]);

  useFrame(({ camera, clock }) => {
    if (!groupRef.current) return;
    const above = camera.position.y - layout.y;
    // Faint from far off, gaining slowly as the camera nears, full just before it's passed.
    // A phone's narrow view crops anything close, so there each shot peaks further away.
    const approach = isMobile
      ? 1 - THREE.MathUtils.smoothstep(above, 3.2, 5)
      : 1 - THREE.MathUtils.smoothstep(above, 1.8, 10);
    const reveal = (isMobile ? THREE.MathUtils.smoothstep(above, 1.9, 2.7) : THREE.MathUtils.smoothstep(above, 0.15, 0.9)) * approach * approach;
    const read = isMobile
      ? THREE.MathUtils.smoothstep(above, 2.2, 3) * (1 - THREE.MathUtils.smoothstep(above, 4.2, 5.6))
      : THREE.MathUtils.smoothstep(above, 0.8, 2.4) * (1 - THREE.MathUtils.smoothstep(above, 5.5, 8));

    groupRef.current.position.x = layout.x + Math.sin(clock.elapsedTime * 0.4 + index) * 0.05;
    groupRef.current.position.y = layout.y + Math.sin(clock.elapsedTime * 0.3 + index * 2) * 0.08;

    if (photoRef.current) photoRef.current.opacity = reveal;
    if (frameRef.current) frameRef.current.opacity = reveal * reveal * reveal;
    groupRef.current.visible = reveal > 0.001;
    /* eslint-disable  @typescript-eslint/no-explicit-any */
    if (titleRef.current) (titleRef.current as any).fillOpacity = read;
    if (captionRef.current) (captionRef.current as any).fillOpacity = read * 0.8;
  });

  // Captions hang from the edge nearest the middle of the screen so they never run off it.
  const textAnchor = isMobile ? 'center' : layout.side < 0 ? 'right' : 'left';
  const textX = isMobile ? 0 : layout.side < 0 ? layout.width / 2 : -layout.width / 2;

  return (
    <group ref={groupRef}
      position={[layout.x, layout.y, layout.z]}
      rotation={[-Math.PI / 2 + layout.lean, 0, layout.tilt]}>
      <mesh position={[0, 0, -0.01]}>
        <planeGeometry args={[layout.width + 0.06, layout.height + 0.06]} />
        <meshBasicMaterial ref={frameRef} color={GOLD} transparent opacity={0} depthWrite={false} />
      </mesh>
      <mesh>
        <planeGeometry args={[layout.width, layout.height]} />
        <meshBasicMaterial ref={photoRef} map={map} toneMapped={false} transparent opacity={0} />
      </mesh>
      <Text ref={titleRef}
        font="./soria-font.ttf"
        fontSize={isMobile ? 0.16 : 0.28}
        color={GOLD}
        letterSpacing={0.12}
        anchorX={textAnchor}
        anchorY="top"
        fillOpacity={0}
        position={[textX, -layout.height / 2 - (isMobile ? 0.08 : 0.12), 0.01]}>
        {shot.title.toUpperCase()}
      </Text>
      <Text ref={captionRef}
        font="./Vercetti-Regular.woff"
        fontSize={isMobile ? 0.075 : 0.11}
        color={IVORY}
        maxWidth={isMobile ? layout.width : Math.max(layout.width, 1.8)}
        textAlign={textAnchor}
        anchorX={textAnchor}
        anchorY="top"
        fillOpacity={0}
        position={[textX, -layout.height / 2 - (isMobile ? 0.3 : 0.48), 0.01]}>
        {shot.caption}
      </Text>
    </group>
  );
};

const ProgressGallery = () => (
  <group>
    {PROGRESS.map((shot, i) => (
      <Shot key={shot.src} shot={shot} index={i} count={PROGRESS.length} />
    ))}
  </group>
);

useTexture.preload(PROGRESS.map((shot) => shot.src));

export default ProgressGallery;
