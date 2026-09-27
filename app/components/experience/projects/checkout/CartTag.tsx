import { Line, Text } from "@react-three/drei";
import { ThreeEvent, useFrame, useThree } from "@react-three/fiber";
import gsap from "gsap";
import { useEffect, useMemo, useRef } from "react";
import { isMobile } from "react-device-detect";
import * as THREE from "three";

import { cartCount, cartTotal, useCartStore, usePortalStore } from "@stores";
import { formatOrder, money } from "../../../../utils/checkout";
import { cameraInPortal } from "../portalSpace";

const PAPER = '#F3EDE3';
const INK = '#1A1210';
const GOLD = '#C6A36A';
const MAROON = '#6E2433';
const W = 0.3;
const H = 0.4;

const tagShape = () => {
  const c = 0.07;
  const shape = new THREE.Shape();
  shape.moveTo(-W / 2, -H / 2);
  shape.lineTo(W / 2, -H / 2);
  shape.lineTo(W / 2, H / 2 - c);
  shape.lineTo(W / 2 - c, H / 2);
  shape.lineTo(-W / 2 + c, H / 2);
  shape.lineTo(-W / 2, H / 2 - c);
  shape.closePath();
  return shape;
};

// The cart: a hang tag on a gold thread, dangling into the top corner of whatever the camera is
// looking at. It drops in and swings when something is added, and follows into the checkout room.
const CartTag = () => {
  const { camera } = useThree();
  const aspect = useThree((state) => state.size.width / state.size.height);
  const rigRef = useRef<THREE.Group>(null);
  const swingRef = useRef<THREE.Group>(null);
  const items = useCartStore((state) => state.items);
  const stage = useCartStore((state) => state.stage);
  const orderNumber = useCartStore((state) => state.orderNumber);
  const isActive = usePortalStore((state) => state.activePortalId === 'projects');
  const count = cartCount(items);
  const shown = isActive && count > 0 && stage !== 'shipping' && stage !== 'done';
  const swing = useMemo(() => ({ angle: 0, drop: 1 }), []);
  const geometry = useMemo(() => new THREE.ShapeGeometry(tagShape()), []);
  const position = useMemo(() => new THREE.Vector3(), []);
  const quaternion = useMemo(() => new THREE.Quaternion(), []);

  useEffect(() => {
    if (!shown) {
      gsap.to(swing, { drop: 1, duration: 0.5, ease: 'power2.in' });
      return;
    }
    gsap.fromTo(swing, { drop: 1 }, { drop: 0, duration: 0.9, ease: 'bounce.out' });
    gsap.fromTo(swing, { angle: 0.35 }, { angle: 0, duration: 2.2, ease: 'elastic.out(1, 0.25)' });
  }, [shown, count]);

  useFrame(({ clock }) => {
    const rig = rigRef.current;
    if (!rig?.parent) return;
    rig.visible = swing.drop < 0.99;
    if (!rig.visible) return;
    cameraInPortal(camera, rig.parent, position, quaternion);
    rig.position.copy(position);
    rig.quaternion.copy(quaternion);
    if (swingRef.current) {
      swingRef.current.rotation.z = swing.angle + Math.sin(clock.elapsedTime * 1.3) * 0.02;
      swingRef.current.position.y = swing.drop * 0.8;
    }
  });

  const checkout = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    const { stage: now, setStage } = useCartStore.getState();
    if (now === 'shop') setStage('desk');
  };

  // Hung a fixed distance in front of the camera, tucked into the top right corner.
  const distance = 1;
  const halfHeight = Math.tan(THREE.MathUtils.degToRad(75 / 2)) * distance;
  const halfWidth = halfHeight * aspect;
  const scale = isMobile ? 0.62 : 0.75;
  const anchor: [number, number, number] = [halfWidth - (W / 2 + 0.05) * scale, halfHeight - 0.02, -distance];

  return (
    <group ref={rigRef} visible={false}>
      <group position={anchor} scale={scale}>
        <group ref={swingRef}>
          <Line points={[[0, 0, 0], [0, -0.14, 0]]} color={GOLD} lineWidth={1.2} />
          <group position={[0, -0.14 - H / 2 + 0.02, 0]}>
            <mesh geometry={geometry} onClick={checkout}>
              <meshBasicMaterial color={PAPER} />
            </mesh>
            <mesh position={[0, H / 2 - 0.045, 0.001]}>
              <ringGeometry args={[0.012, 0.022, 20]} />
              <meshBasicMaterial color={GOLD} />
            </mesh>
            <Text position={[0, H / 2 - 0.095, 0.001]} font="./cormorant-sc.ttf" fontSize={0.03} color={INK} letterSpacing={0.06}>
              {formatOrder(orderNumber)}
            </Text>
            {items.slice(0, 3).map((item, i) => (
              <Text key={`${item.color}-${item.size}`}
                position={[0, H / 2 - 0.145 - i * 0.034, 0.001]}
                font="./Vercetti-Regular.woff"
                fontSize={0.02}
                color={INK}>
                {`${item.color} ${item.size}  ${item.qty} × ${money(item.price)}`}
              </Text>
            ))}
            <mesh position={[0, -H / 2 + 0.11, 0.001]}>
              <planeGeometry args={[W - 0.06, 0.0015]} />
              <meshBasicMaterial color={INK} />
            </mesh>
            <Text position={[0, -H / 2 + 0.085, 0.001]} font="./Vercetti-Regular.woff" fontSize={0.02} color={INK}>
              {`${count} ${count === 1 ? 'jacket' : 'jackets'} · ${money(cartTotal(items))}`}
            </Text>
            {stage === 'shop' && (
              <group position={[0, -H / 2 + 0.04, 0.001]} onClick={checkout}
                onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = 'pointer'; }}
                onPointerOut={() => { document.body.style.cursor = 'auto'; }}>
                <mesh>
                  <planeGeometry args={[W - 0.06, 0.05]} />
                  <meshBasicMaterial color={MAROON} />
                </mesh>
                <Text position={[0, 0, 0.001]} font="./cormorant-sc.ttf" fontSize={0.026} color={PAPER} letterSpacing={0.2}>
                  CHECKOUT ›
                </Text>
              </group>
            )}
          </group>
        </group>
      </group>
    </group>
  );
};

export default CartTag;
