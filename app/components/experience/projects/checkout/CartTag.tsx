import { Line, Text } from "@react-three/drei";
import { ThreeEvent, useFrame, useThree } from "@react-three/fiber";
import gsap from "gsap";
import { useEffect, useMemo, useRef } from "react";
import { isMobile } from "react-device-detect";
import * as THREE from "three";

import { cartCount, cartTotal, useCartStore, usePortalStore } from "@stores";
import { formatOrder, money } from "../../../../utils/checkout";
import { cameraInPortal } from "../portalSpace";

const PAPER = '#F4EFE6';
const INK = '#1A1210';
const GOLD = '#C6A36A';
const MAROON = '#6E2433';
const FABRIC: Record<string, string> = { Maroon: '#6E2433', Black: '#1E1C1B' };
const W = 0.34;
const ROW = 0.062;
const CHAMFER = 0.07;
const THREAD = 0.2;

const tagShape = (h: number, inset: number) => {
  const w = W / 2 - inset;
  const top = -inset;
  const bottom = -h + inset;
  const c = CHAMFER - inset * 0.4;
  const shape = new THREE.Shape();
  shape.moveTo(-w, bottom);
  shape.lineTo(w, bottom);
  shape.lineTo(w, top - c);
  shape.lineTo(w - c, top);
  shape.lineTo(-w + c, top);
  shape.lineTo(-w, top - c);
  shape.closePath();
  return shape;
};

const hover = {
  onPointerOver: (e: ThreeEvent<PointerEvent>) => { e.stopPropagation(); document.body.style.cursor = 'pointer'; },
  onPointerOut: () => { document.body.style.cursor = 'auto'; },
};

// The cart: the jacket's hang tag, strung on a gold thread from above the top of the view. It
// drops and swings when something's added, and follows the camera into the checkout room.
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
  const rows = Math.min(items.length, 3);
  const height = 0.3 + rows * ROW + (stage === 'shop' ? 0.075 : 0);
  const swing = useMemo(() => ({ angle: 0, drop: 1 }), []);
  const geometry = useMemo(() => ({
    body: new THREE.ShapeGeometry(tagShape(height, 0)),
    stitch: tagShape(height, 0.018).getPoints().map((p) => new THREE.Vector3(p.x, p.y, 0)),
  }), [height]);
  const position = useMemo(() => new THREE.Vector3(), []);
  const quaternion = useMemo(() => new THREE.Quaternion(), []);

  useEffect(() => () => geometry.body.dispose(), [geometry]);

  useEffect(() => {
    if (!shown) {
      gsap.to(swing, { drop: 1, duration: 0.5, ease: 'power2.in' });
      return;
    }
    gsap.fromTo(swing, { drop: 1 }, { drop: 0, duration: 0.9, ease: 'bounce.out' });
    gsap.fromTo(swing, { angle: 0.3 }, { angle: 0, duration: 2.4, ease: 'elastic.out(1, 0.25)' });
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
      swingRef.current.rotation.z = swing.angle + Math.sin(clock.elapsedTime * 1.1) * 0.018;
      swingRef.current.position.y = swing.drop * (height + THREAD + 0.2);
    }
  });

  const checkout = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    const { stage: now, setStage } = useCartStore.getState();
    if (now === 'shop') setStage('desk');
  };

  // Hung a fixed distance in front of the camera, pinned just above the top edge of the view.
  const distance = 1;
  const halfHeight = Math.tan(THREE.MathUtils.degToRad(75 / 2)) * distance;
  const halfWidth = halfHeight * aspect;
  const scale = isMobile ? 0.6 : 0.72;
  const anchor: [number, number, number] = [halfWidth - (W / 2 + 0.04) * scale, halfHeight + 0.01, -distance];
  const top = -THREAD;

  return (
    <group ref={rigRef} visible={false}>
      <group position={anchor} scale={scale}>
        <group ref={swingRef}>
          <Line points={[[0, 0, 0], [0, top - 0.035, 0]]} color={GOLD} lineWidth={1.4} />
          <group position={[0, top, 0]}>
            <mesh geometry={geometry.body} onClick={checkout}>
              <meshBasicMaterial color={PAPER} />
            </mesh>
            <mesh geometry={geometry.body} position={[0.012, -0.014, -0.002]}>
              <meshBasicMaterial color="#000" transparent opacity={0.25} depthWrite={false} />
            </mesh>
            <Line points={geometry.stitch} color={GOLD} lineWidth={1.1} dashed dashSize={0.016} gapSize={0.011} position={[0, 0, 0.001]} />
            <mesh position={[0, -0.04, 0.001]}>
              <ringGeometry args={[0.011, 0.02, 24]} />
              <meshBasicMaterial color={GOLD} />
            </mesh>
            <mesh position={[0, -0.04, 0.0012]}>
              <circleGeometry args={[0.011, 16]} />
              <meshBasicMaterial color={INK} />
            </mesh>
            <Text position={[0, -0.09, 0.001]} font="./cormorant-italic.ttf" fontSize={0.017} color={MAROON}>your order</Text>
            <Text position={[0, -0.122, 0.001]} font="./cormorant-sc.ttf" fontSize={0.034} color={INK} letterSpacing={0.05}>
              {formatOrder(orderNumber)}
            </Text>
            <Line points={[[-W / 2 + 0.04, -0.152, 0.001], [W / 2 - 0.04, -0.152, 0.001]]} color={GOLD} lineWidth={1} />

            {items.slice(0, 3).map((item, i) => {
              const y = -0.19 - i * ROW;
              return (
                <group key={`${item.color}-${item.size}`} position={[0, y, 0.001]}>
                  <mesh position={[-W / 2 + 0.058, 0, 0]}>
                    <planeGeometry args={[0.042, 0.042]} />
                    <meshBasicMaterial color={FABRIC[item.color]} />
                  </mesh>
                  <group position={[-W / 2 + 0.108, 0, 0]}>
                    <mesh>
                      <planeGeometry args={[0.04, 0.042]} />
                      <meshBasicMaterial color={INK} />
                    </mesh>
                    <Text position={[0, 0.001, 0.001]} font="./cormorant-sc.ttf" fontSize={0.028} color={PAPER}>{item.size[0]}</Text>
                  </group>
                  <Text position={[-W / 2 + 0.142, 0.009, 0]} font="./Vercetti-Regular.woff" fontSize={0.017} color={INK} anchorX="left">
                    {`${item.color} · ${item.size}`}
                  </Text>
                  <Text position={[-W / 2 + 0.142, -0.013, 0]} font="./Vercetti-Regular.woff" fontSize={0.014} color="#6B5A4E" anchorX="left">
                    {`${item.qty} × ${money(item.price)}`}
                  </Text>
                </group>
              );
            })}

            <group position={[0, -0.19 - rows * ROW + 0.01, 0.001]}>
              <Line points={[[-W / 2 + 0.04, 0, 0], [W / 2 - 0.04, 0, 0]]} color={GOLD} lineWidth={1} dashed dashSize={0.012} gapSize={0.008} />
              <Text position={[-W / 2 + 0.04, -0.028, 0]} font="./Vercetti-Regular.woff" fontSize={0.017} color={INK} anchorX="left">
                {`${count} ${count === 1 ? 'jacket' : 'jackets'}`}
              </Text>
              <Text position={[W / 2 - 0.04, -0.028, 0]} font="./cormorant-sc.ttf" fontSize={0.026} color={INK} anchorX="right">
                {money(cartTotal(items))}
              </Text>
            </group>

            {stage === 'shop' && (
              <group position={[0, -height + 0.058, 0.001]} onClick={checkout} {...hover}>
                <mesh>
                  <planeGeometry args={[W - 0.07, 0.056]} />
                  <meshBasicMaterial color={MAROON} />
                </mesh>
                <Text position={[0, 0.001, 0.001]} font="./cormorant-sc.ttf" fontSize={0.026} color={PAPER} letterSpacing={0.2}>
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
