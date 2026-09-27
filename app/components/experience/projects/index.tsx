import { useScroll } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import gsap from "gsap";
import { useEffect, useMemo, useRef } from "react";
import { isMobile } from "react-device-detect";
import * as THREE from "three";
import { BUY_ENABLED, checkoutEnabled } from "@constants";
import { useCartStore, useOrderStore, usePortalStore } from "@stores";
import TileMotif from "../../embroidery/TileMotif";
import CartTag from "./checkout/CartTag";
import CheckoutRoom from "./checkout/CheckoutRoom";
import { camera as shot, leaveRoom, moveTo, swingIntoRoom, swingOutOfRoom, WALL_X } from "./checkout/director";
import { finale } from "./finale";
import JacketBrowser from "./JacketBrowser";
import { placeCamera } from "./portalSpace";
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
  const stage = useCartStore((state) => state.stage);
  const checkout = useMemo(() => checkoutEnabled(), []);
  const inRoom = stage !== 'shop';
  const data = useScroll();
  const anchorRef = useRef<THREE.Group>(null);
  const wearersRef = useRef<THREE.Group>(null);
  const lastStage = useRef(stage);
  const hasCart = useCartStore((state) => state.items.length > 0);
  const eased = useRef({ position: new THREE.Vector3(), target: new THREE.Vector3(), live: false });

  // Back from Stripe with ?paid=1: land in the shop and play the finale for the purchase.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('paid') !== '1') return;
    window.history.replaceState(null, '', window.location.pathname);
    const timers = [
      setTimeout(() => { data.el.scrollTop = data.el.scrollHeight; }, 1500),
      setTimeout(() => usePortalStore.getState().requestPortal('projects'), 4000),
      setTimeout(() => {
        const { setStatus } = useOrderStore.getState();
        setStatus('sending');
        setStatus('sent', 'Paid · your receipt is in your email', 'YOURS');
      }, 6000),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  useEffect(() => {
    // Hide scrollbar when active.
    data.el.style.overflow = isActive ? 'hidden' : 'auto';
    if (isActive) {
      gsap.to(camera.position, { z: BASE_Z, y: BASE_Y, x: BASE_X, duration: 1 });
      return;
    }
    // Stepping out of the portal mid-checkout drops back to the shop; the cart is kept.
    const cart = useCartStore.getState();
    if (cart.stage !== 'shop') cart.setStage('shop');
    if (cart.orderNumber !== null) cart.clear();
    leaveRoom();
    gsap.to(camera.rotation, { z: 0, duration: 1 });
  }, [isActive]);

  // The checkout director: swing round the wall on the way in, one shot per step, and back out.
  useEffect(() => {
    const from = lastStage.current;
    lastStage.current = stage;
    if (!isActive || from === stage) return;
    if (from === 'shop') {
      swingIntoRoom();
      return;
    }
    if (stage === 'shop') {
      swingOutOfRoom(() => {
        camera.position.set(BASE_X, BASE_Y, BASE_Z);
        camera.rotation.set(-Math.PI / 2, 0, 0);
        const cart = useCartStore.getState();
        if (cart.orderNumber !== null) cart.clear();
      });
      return;
    }
    moveTo(stage);
  }, [stage, isActive]);

  // A small look-around keeps the shop framed; the wearers on either side reward it.
  // During the finale the camera squares up on the jacket, pushes in and shakes.
  useFrame((state, delta) => {
    // The wearers belong to the shop; once the camera is round the screen they'd only float in the dark.
    if (wearersRef.current) wearersRef.current.visible = !(shot.active && shot.position.x > WALL_X);
    if (!isActive) return;
    if (shot.active && anchorRef.current) {
      // Critically damped chase of the planned shot: any hitch in frame time is absorbed, never shown.
      if (!eased.current.live) {
        eased.current.position.copy(shot.position);
        eased.current.target.copy(shot.target);
        eased.current.live = true;
      }
      const k = 1 - Math.exp(-9 * Math.min(delta, 0.05));
      eased.current.position.lerp(shot.position, k);
      eased.current.target.lerp(shot.target, k);
      placeCamera(camera, anchorRef.current, eased.current.position, eased.current.target);
      return;
    }
    eased.current.live = false;
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
    <group ref={anchorRef}>
      <TileMotif id="projects" kind="blossom" label={BUY_ENABLED ? 'BUY' : 'RESERVE'} color="#140E0C" visible={!isActive} />
      <JacketBrowser />
      <group ref={wearersRef}>
        <Wearers />
      </group>
      <Warp />
      {checkout && (hasCart || inRoom) && <CheckoutRoom />}
      {checkout && <CartTag />}
      { isActive && isMobile && !reserved && !inRoom && <TouchPanControls /> }
    </group>
  );
};

export default Projects;
