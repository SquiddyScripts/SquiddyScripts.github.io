import { useScroll } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import gsap from "gsap";
import { useEffect } from "react";
import { isMobile } from "react-device-detect";
import * as THREE from "three";
import { useOrderStore, usePortalStore } from "@stores";
import TileMotif from "../../embroidery/TileMotif";
import { finale } from "./finale";
import JacketBrowser from "./JacketBrowser";
import { TouchPanControls } from "./TouchPanControls";
import Warp from "./Warp";
import Wearers from "./Wearers";

const BASE_X = isMobile ? 1 : 2;
const BASE_Y = -39;
const BASE_Z = 11.5;

const Projects = () => {
  const { camera } = useThree();
  const isActive = usePortalStore((state) => state.activePortalId === "projects");
  const reserved = useOrderStore((state) => state.status === 'sent');
  const data = useScroll();

  useEffect(() => {
    // Hide scrollbar when active.
    data.el.style.overflow = isActive ? 'hidden' : 'auto';
    if (isActive) {
      gsap.to(camera.position, { z: BASE_Z, y: BASE_Y, x: BASE_X, duration: 1 });
    }
  }, [isActive]);

  // A small look-around keeps the shop framed; the wearers on either side reward it.
  // During the finale the camera squares up on the jacket, pushes in and shakes.
  useFrame((state, delta) => {
    if (!isActive) return;
    if (reserved) {
      camera.rotation.y = THREE.MathUtils.damp(camera.rotation.y, 0, 6, delta);
      const t = state.clock.elapsedTime * 60;
      const s = finale.shake * 0.12;
      camera.position.x = BASE_X + (Math.sin(t * 1.3) + Math.sin(t * 2.9) * 0.5) * s;
      camera.position.y = BASE_Y + (Math.cos(t * 1.7) + Math.sin(t * 3.7) * 0.5) * s;
      camera.rotation.z = Math.sin(t * 2.3) * s * 0.08;
      camera.position.z = BASE_Z - finale.zoom * 2.6;
      return;
    }
    if (!isMobile) {
      camera.rotation.y = THREE.MathUtils.lerp(camera.rotation.y, -(state.pointer.x * Math.PI) / 14, 0.04);
      camera.position.z = THREE.MathUtils.damp(camera.position.z, BASE_Z - state.pointer.y * 0.3, 5, delta);
    }
  });

  return (
    <group>
      <TileMotif id="projects" kind="blossom" label="RESERVE" color="#140E0C" visible={!isActive} />
      <JacketBrowser />
      <Wearers />
      <Warp />
      { isActive && isMobile && <TouchPanControls /> }
    </group>
  );
};

export default Projects;
