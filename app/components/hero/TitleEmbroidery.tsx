'use client';

import { Text } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { useProgress } from "@react-three/drei";
import gsap from "gsap";
import { useEffect, useMemo, useRef } from "react";
import { isMobile } from "react-device-detect";
import * as THREE from "three";

import BlossomBranch, { Stem } from "../embroidery/BlossomBranch";
import GoldCloud from "../embroidery/GoldCloud";
import { Grow, IVORY, TITLE_GOLD } from "../embroidery/palette";

// Laid out on the z = -10 plane the camera faces at the top of the page. The title spans about
// x = ±9.5, so the branches stay outside it: one climbs from the lower left and curls over the
// first letters, the other drops from the upper right like the shoulder floral.
const LEFT_BRANCH: Stem[] = [
  { points: [[-18, -10, -11], [-14.6, -6.2, -10.6], [-12.6, -2.6, -10.3], [-11.6, 1.2, -10], [-10.2, 4.2, -9.8], [-7.8, 5.6, -9.6]], radius: 0.16, start: 0, end: 0.55, blossoms: 9, leaves: 7 },
  { points: [[-12.6, -2.6, -10.3], [-10.4, -3.8, -10], [-8, -3.9, -9.8], [-6.4, -3.3, -9.6]], radius: 0.07, start: 0.3, end: 0.75, blossoms: 6, leaves: 3 },
  { points: [[-11.6, 1.2, -10], [-13.6, 3, -10.2], [-14.6, 5.4, -10.4]], radius: 0.06, start: 0.4, end: 0.8, blossoms: 5, leaves: 2 },
  { points: [[-10.2, 4.2, -9.8], [-11.2, 6.4, -9.9], [-10.6, 8, -10]], radius: 0.05, start: 0.5, end: 0.9, blossoms: 4, leaves: 2 },
  // The trunk carries on past the corner of the screen so the branch never visibly starts.
  { points: [[-24.5, -17.3, -11.6], [-21.2, -13.6, -11.3], [-18, -10, -11]], radius: 0.16, start: 0, end: 0.08, taper: false },
];

const RIGHT_BRANCH: Stem[] = [
  { points: [[18, 11, -11], [14.6, 8.4, -10.6], [12.2, 6.4, -10.2], [10.6, 4.6, -10], [10, 2.8, -9.8]], radius: 0.15, start: 0.1, end: 0.6, blossoms: 8, leaves: 6 },
  { points: [[12.2, 6.4, -10.2], [10, 7.6, -10], [7.4, 7.4, -9.8], [5.8, 6.6, -9.7]], radius: 0.06, start: 0.4, end: 0.8, blossoms: 6, leaves: 3 },
  { points: [[10.6, 4.6, -10], [12.6, 3.2, -10.1], [13.6, 1, -10.2]], radius: 0.06, start: 0.5, end: 0.9, blossoms: 5, leaves: 2 },
  { points: [[29, 19.4, -11.8], [23.4, 15.1, -11.4], [18, 11, -11]], radius: 0.15, start: 0, end: 0.1, taper: false },
];

// The phone layout is drawn for a 9:19.5 screen; narrower or wider ones scale it about the
// title plane so the branches always frame the title without leaving the screen.
const PHONE_ASPECT = 0.46;
const SHOW_CLOUDS = false;

const Title = ({ grow }: { grow: Grow }) => {
  const leftBranch = useMemo(() => LEFT_BRANCH, []);
  const rightBranch = useMemo(() => RIGHT_BRANCH, []);
  const aspect = useThree((state) => state.size.width / state.size.height);
  const fit = isMobile ? Math.min(1.15, aspect / PHONE_ASPECT) : 1;

  return (
    <group position={[0, 0, -10]} scale={fit}>
    <group position={[0, 0, 10]}>
      <Text position={[0, 0.8, -10]}
        font="./cormorant-sc.ttf"
        fontSize={isMobile ? 1.05 : 2.5}
        letterSpacing={0.16}
        color={TITLE_GOLD}
        anchorX="center"
        anchorY="middle">
        CONFESSIONS
      </Text>
      <Text position={[0, isMobile ? -0.3 : -1, -10]}
        font="./cormorant-italic.ttf"
        fontSize={isMobile ? 0.42 : 0.85}
        color={IVORY}
        anchorX="center"
        anchorY="middle">
        by Amaan S. Khan
      </Text>

      {/* On a portrait phone the branches come up from below the title and down from above it. */}
      <group scale={isMobile ? 0.5 : 1}>
        {/* The left branch hangs closer to the camera and the right one sits further back, for depth. */}
        <group position={isMobile ? [8.6, -10, 2] : [-0.6, -0.4, 2.6]}>
          <BlossomBranch stems={leftBranch} grow={grow} seed={11} blossomSize={isMobile ? 0.85 : 0.78} />
        </group>
        <group position={isMobile ? [-9, 6.8, -2] : [2.6, 1.4, -3.5]}>
          <BlossomBranch stems={rightBranch} grow={grow} seed={23} blossomSize={isMobile ? 0.85 : 0.82} />
        </group>
        {/* Gold clouds are hidden until they're redesigned; flip SHOW_CLOUDS to bring them back. */}
        <group visible={SHOW_CLOUDS} position={isMobile ? [3.4, -4.2, -9.4] : [5.4, -4.4, -9.4]} scale={1.25}>
          <GoldCloud grow={grow} start={0.15} end={0.85} />
        </group>
        <group visible={SHOW_CLOUDS} position={isMobile ? [-1.6, 5.6, -10.6] : [-4.2, 5.6, -10.6]} scale={[-1, 1, 1]}>
          <GoldCloud grow={grow} start={0.3} end={1} />
        </group>
      </group>
    </group>
    </group>
  );
};

const TitleEmbroidery = () => {
  const groupRef = useRef<THREE.Group>(null);
  const grow = useMemo<Grow>(() => ({ value: 0 }), []);
  const { progress } = useProgress();

  useEffect(() => {
    if (progress !== 100) return;
    if (groupRef.current) {
      gsap.fromTo(groupRef.current.position, { y: -10 }, { y: 0, duration: 3 });
    }
    gsap.to(grow, { value: 1, duration: 4, delay: 1.6, ease: 'power1.inOut' });
  }, [progress]);

  return (
    <group ref={groupRef}>
      <Title grow={grow} />
    </group>
  );
};

export default TitleEmbroidery;
