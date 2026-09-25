'use client';

import { useScroll } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { isMobile } from "react-device-detect";
import { useEffect } from "react";
import * as THREE from "three";

import { usePortalStore, useScrollStore } from "@stores";

// The two floor tiles span about 4.4 units at y = -41.5. On a narrow screen the camera settles
// high enough above them that both fit across.
const TILE_FLOOR = -41.5;
const TILE_SPAN = 4.6;
const tileLift = ({ width, height }: { width: number, height: number }) => {
  const halfWidth = Math.tan(THREE.MathUtils.degToRad(75 / 2)) * (width / height);
  const distance = TILE_SPAN / 2 / halfWidth;
  return Math.max(0, TILE_FLOOR + distance + 37);
};

const ScrollWrapper = (props: { children: React.ReactNode | React.ReactNode[]}) => {
  const { camera } = useThree();
  const data = useScroll();
  const isActive = usePortalStore((state) => !!state.activePortalId);
  const setScrollProgress = useScrollStore((state) => state.setScrollProgress);

  // Dev only: ?scroll=0.5 jumps to that point of the fall.
  useEffect(() => {
    if (process.env.NODE_ENV === 'production') return;
    const scroll = new URLSearchParams(window.location.search).get('scroll');
    if (!scroll) return;
    const timer = setTimeout(() => {
      data.el.scrollTop = Number(scroll) * (data.el.scrollHeight - data.el.clientHeight);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  useFrame((state, delta) => {
    if (data) {
      const a = data.range(0, 0.3);
      const b = data.range(0.3, 0.5);
      const d = data.range(0.85, 0.18);

      if (!isActive) {
        camera.rotation.x = THREE.MathUtils.damp(camera.rotation.x, -0.5 * Math.PI * a, 5, delta);
        camera.position.y = THREE.MathUtils.damp(camera.position.y, (-37 + (isMobile ? tileLift(state.size) : 0)) * b, 7, delta);
        camera.position.z = THREE.MathUtils.damp(camera.position.z, 5 + 10 * d, 7, delta);

        setScrollProgress(data.range(0, 1));
      }

      // Move camera slightly on mouse movement.
      if (!isMobile && !isActive) {
        camera.rotation.y = THREE.MathUtils.lerp(camera.rotation.y, -(state.pointer.x * Math.PI) / 90, 0.05);
      }
    }
  });

  const children = Array.isArray(props.children) ? props.children : [props.children];

  return <>
    {children.map((child, index) => {
      return <group key={index}>
        {child}
      </group>
    })}
  </>
}

export default ScrollWrapper;