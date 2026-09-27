import { RoundedBox, Text } from "@react-three/drei";
import { ThreeEvent, useFrame } from "@react-three/fiber";
import gsap from "gsap";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

import { SHIPPING_PRICE } from "@constants";
import { ADDRESS_FIELDS, AddressField, cartTotal, useCartStore } from "@stores";
import BlossomBranch, { Stem } from "../../../embroidery/BlossomBranch";
import { Grow, TITLE_GOLD } from "../../../embroidery/palette";
import { formatOrder, money, placeOrder } from "../../../../utils/checkout";
import { DESK, ROOM, WALL_END, WALL_X } from "./director";
import { useHiddenInput } from "./useHiddenInput";

const WOOD = '#5E3B28';
const WOOD_DARK = '#2E1B13';
const LACQUER = '#4A1624';
const KRAFT = '#B98E5F';
const GOLD = '#C6A36A';
const PAPER = '#F3EDE3';
const INK = '#1A1210';
const JACKET: Record<string, string> = { Maroon: '#6E2433', Black: '#1E1C1B' };

const STAMP: [number, number, number] = [1.41, DESK + 0.3, -1.1];

// Five petals round a gold center, printed flat: the plum blossom off the sleeve.
const Blossom = ({ position, size }: { position: [number, number, number], size: number }) => (
  <group position={position}>
    {[0, 1, 2, 3, 4].map((i) => {
      const a = (i / 5) * Math.PI * 2 + Math.PI / 2;
      return (
        <mesh key={i} position={[Math.cos(a) * size * 0.55, Math.sin(a) * size * 0.55, 0]}>
          <circleGeometry args={[size * 0.42, 12]} />
          <meshBasicMaterial color={LACQUER} />
        </mesh>
      );
    })}
    <mesh position={[0, 0, 0.0005]}>
      <circleGeometry args={[size * 0.22, 10]} />
      <meshBasicMaterial color={GOLD} />
    </mesh>
  </group>
);

const pointer = {
  onPointerOver: (e: ThreeEvent<PointerEvent>) => { e.stopPropagation(); document.body.style.cursor = 'pointer'; },
  onPointerOut: () => { document.body.style.cursor = 'auto'; },
};

const MURAL: Stem[] = [
  { points: [[-3.2, -1.2, 0], [-2.2, -0.4, 0.05], [-1, 0.1, 0.1], [0.4, 0.3, 0.1], [1.6, 0.8, 0.05]], radius: 0.06, start: 0, end: 1, blossoms: 8, leaves: 5 },
  { points: [[-1, 0.1, 0.1], [-0.6, 0.9, 0.1], [-0.1, 1.3, 0.05]], radius: 0.035, start: 0, end: 1, blossoms: 4, leaves: 2 },
];

// Walls, floor and the counter. Lit by a dim warm fill until the desk lamp comes on.
const Shell = () => {
  const grow = useMemo<Grow>(() => ({ value: 1 }), []);
  const mural = useMemo(() => MURAL, []);
  const partitionLength = WALL_END + 4;

  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} position={[0, -1.2, 1.2]}>
        <planeGeometry args={[16.4, 10.4]} />
        <meshStandardMaterial color="#24160F" roughness={0.85} />
      </mesh>
      <mesh position={[0, 1.9, -4]}>
        <planeGeometry args={[16.4, 6.2]} />
        <meshStandardMaterial color={LACQUER} roughness={0.7} />
      </mesh>
      <mesh position={[0, -0.5, -3.94]}>
        <boxGeometry args={[16.4, 1.4, 0.1]} />
        <meshStandardMaterial color="#2A1512" roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.22, -3.88]}>
        <boxGeometry args={[16.4, 0.04, 0.06]} />
        <meshStandardMaterial color={GOLD} metalness={0.7} roughness={0.35} />
      </mesh>
      {/* The partition the camera swings round on the way in from the shop: a lacquered screen,
          unlit so it reads the same from the dark shop side as from inside. */}
      <mesh position={[WALL_X - ROOM.x, 1.9, -4 + partitionLength / 2]}>
        <boxGeometry args={[0.24, 6.2, partitionLength]} />
        <meshBasicMaterial color="#2C1117" />
      </mesh>
      {[WALL_END - 0.02, -3.9].map((z) => (
        <mesh key={z} position={[WALL_X - ROOM.x, 1.9, z]}>
          <boxGeometry args={[0.3, 6.2, 0.05]} />
          <meshBasicMaterial color={GOLD} />
        </mesh>
      ))}
      <group position={[WALL_X - ROOM.x - 0.13, 1.7, 3.6]} rotation-y={-Math.PI / 2}>
        <Text font="./cormorant-sc.ttf" fontSize={0.34} letterSpacing={0.24} color={TITLE_GOLD}>THE COUNTER</Text>
        <Text position={[0, -0.38, 0]} font="./cormorant-italic.ttf" fontSize={0.16} color={PAPER} fillOpacity={0.75}>
          this way, round the screen
        </Text>
      </group>
      {/* Right wall and ceiling close the room so nothing of the empty shop shows past the counter. */}
      <mesh position={[8.2, 1.9, 1.2]} rotation-y={-Math.PI / 2}>
        <planeGeometry args={[10.4, 6.2]} />
        <meshStandardMaterial color={LACQUER} roughness={0.7} />
      </mesh>
      <mesh position={[0, 5, 1.2]} rotation-x={Math.PI / 2}>
        <planeGeometry args={[16.4, 10.4]} />
        <meshStandardMaterial color="#1A0C0E" roughness={0.9} />
      </mesh>

      <Text position={[0, 3.35, -3.9]} font="./cormorant-sc.ttf" fontSize={0.5} letterSpacing={0.22} color={TITLE_GOLD}>
        CONFESSIONS
      </Text>
      <Text position={[0, 2.9, -3.9]} font="./cormorant-italic.ttf" fontSize={0.18} color={PAPER} fillOpacity={0.7}>
        packed by hand, one at a time
      </Text>
      <group position={[-4.2, 2.3, -3.95]}>
        <BlossomBranch stems={mural} grow={grow} seed={41} blossomSize={0.3} />
      </group>

      {/* Counter */}
      <mesh position={[0, -0.28, -1.3]}>
        <boxGeometry args={[6.2, 1.84, 1.5]} />
        <meshStandardMaterial color={WOOD_DARK} roughness={0.6} />
      </mesh>
      <mesh position={[0, DESK - 0.05, -1.3]}>
        <boxGeometry args={[6.5, 0.1, 1.8]} />
        <meshStandardMaterial color={WOOD} roughness={0.45} />
      </mesh>
      <mesh position={[0, 0.3, -0.54]}>
        <boxGeometry args={[6.2, 0.03, 0.02]} />
        <meshStandardMaterial color={GOLD} metalness={0.7} roughness={0.35} />
      </mesh>
    </group>
  );
};

// A brass desk lamp. Clicks on, flickers once, then throws a warm pool across the counter.
const Lamp = ({ on }: { on: boolean }) => {
  const lightRef = useRef<THREE.PointLight>(null);
  const bulbRef = useRef<THREE.MeshBasicMaterial>(null);
  const poolRef = useRef<THREE.MeshBasicMaterial>(null);
  const level = useMemo(() => ({ value: 0 }), []);

  useEffect(() => {
    gsap.killTweensOf(level);
    if (!on) {
      gsap.to(level, { value: 0, duration: 0.4 });
      return;
    }
    gsap.timeline({ delay: 0.5 })
      .to(level, { value: 0.8, duration: 0.05 })
      .to(level, { value: 0.1, duration: 0.08 })
      .to(level, { value: 1, duration: 0.3, ease: 'power2.out' });
  }, [on]);

  useFrame(() => {
    if (lightRef.current) lightRef.current.intensity = level.value * 20;
    if (bulbRef.current) bulbRef.current.color.setRGB(0.3 + level.value, 0.25 + level.value * 0.8, 0.2 + level.value * 0.5);
    if (poolRef.current) poolRef.current.opacity = level.value * 0.22;
  });

  return (
    <group position={[-2.3, DESK, -1.75]}>
      <mesh position={[0, 0.03, 0]}>
        <cylinderGeometry args={[0.2, 0.24, 0.06, 24]} />
        <meshStandardMaterial color="#8A6A3A" metalness={0.8} roughness={0.3} />
      </mesh>
      <mesh position={[0.08, 0.45, 0.05]} rotation={[0.25, 0, -0.35]}>
        <cylinderGeometry args={[0.02, 0.02, 0.9, 8]} />
        <meshStandardMaterial color="#8A6A3A" metalness={0.8} roughness={0.3} />
      </mesh>
      <mesh position={[0.42, 0.95, 0.3]} rotation={[0.9, 0, -1.1]}>
        <cylinderGeometry args={[0.018, 0.018, 0.75, 8]} />
        <meshStandardMaterial color="#8A6A3A" metalness={0.8} roughness={0.3} />
      </mesh>
      <group position={[0.7, 1.08, 0.5]} rotation={[0.5, 0, 0.45]}>
        <mesh>
          <coneGeometry args={[0.26, 0.34, 28, 1, true]} />
          <meshStandardMaterial color="#1D3A2B" metalness={0.4} roughness={0.4} side={THREE.DoubleSide} />
        </mesh>
        <mesh position={[0, -0.08, 0]}>
          <sphereGeometry args={[0.07, 16, 12]} />
          <meshBasicMaterial ref={bulbRef} color="#444" toneMapped={false} />
        </mesh>
      </group>
      <pointLight ref={lightRef} position={[0.8, 0.9, 0.6]} color="#FFD49A" distance={6} decay={1.6} intensity={0} />
      <mesh rotation-x={-Math.PI / 2} position={[1.1, 0.005, 0.55]}>
        <circleGeometry args={[1.1, 40]} />
        <meshBasicMaterial ref={poolRef} color="#FFD49A" transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
    </group>
  );
};

// The jacket, folded, with its hang tag on top. Slides onto the counter when checkout begins.
const FoldedJacket = ({ refObject }: { refObject: React.RefObject<THREE.Group | null> }) => {
  const items = useCartStore((state) => state.items);
  const color = JACKET[items[0]?.color ?? 'Maroon'];

  return (
    <group ref={refObject} position={[-6, DESK, -1.2]}>
      <RoundedBox args={[1.0, 0.13, 0.72]} radius={0.04} position={[0, 0.065, 0]}>
        <meshStandardMaterial color={color} roughness={0.95} />
      </RoundedBox>
      <RoundedBox args={[0.46, 0.08, 0.14]} radius={0.03} position={[0, 0.15, -0.28]}>
        <meshStandardMaterial color={color} roughness={0.95} />
      </RoundedBox>
      {[-0.12, 0.02, 0.16].map((z) => (
        <mesh key={z} position={[0.02, 0.136, z]} rotation-z={Math.PI / 2}>
          <capsuleGeometry args={[0.014, 0.08, 4, 8]} />
          <meshStandardMaterial color="#EFE3C8" roughness={0.6} />
        </mesh>
      ))}
      {[[-0.32, -0.1], [-0.26, 0.0], [-0.36, 0.06], [-0.22, -0.18]].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.132, z]} rotation-x={-Math.PI / 2}>
          <circleGeometry args={[0.035, 10]} />
          <meshBasicMaterial color={i % 2 ? '#E6A0A6' : '#D9616E'} />
        </mesh>
      ))}
      <group position={[0.33, 0.134, 0.2]} rotation={[-Math.PI / 2, 0, 0.3]}>
        <mesh>
          <planeGeometry args={[0.18, 0.26]} />
          <meshBasicMaterial color={PAPER} />
        </mesh>
        <Text position={[0, 0.06, 0.001]} font="./cormorant-sc.ttf" fontSize={0.026} color={INK}>CONFESSION</Text>
        <Text position={[0, 0.02, 0.001]} font="./Vercetti-Regular.woff" fontSize={0.018} color={INK}>
          {`${items[0]?.color ?? ''} · ${items[0]?.size?.[0] ?? ''}`}
        </Text>
      </group>
    </group>
  );
};

// An open shipping box. The flaps fold shut, tape runs across and the label is slapped on top.
const Parcel = ({ refObject, flapsRef, tapeRef }: {
  refObject: React.RefObject<THREE.Group | null>,
  flapsRef: React.RefObject<(THREE.Group | null)[]>,
  tapeRef: React.RefObject<THREE.Mesh | null>,
}) => {
  const W = 1.2;
  const D = 0.85;
  const H = 0.5;
  const t = 0.02;
  const kraft = <meshStandardMaterial color={KRAFT} roughness={0.9} />;

  return (
    <group ref={refObject} position={[0.8, DESK + 3, -1.35]}>
      <mesh position={[0, t / 2, 0]}><boxGeometry args={[W, t, D]} />{kraft}</mesh>
      <mesh position={[0, H / 2, D / 2]}><boxGeometry args={[W, H, t]} />{kraft}</mesh>
      <mesh position={[0, H / 2, -D / 2]}><boxGeometry args={[W, H, t]} />{kraft}</mesh>
      <mesh position={[W / 2, H / 2, 0]}><boxGeometry args={[t, H, D]} />{kraft}</mesh>
      <mesh position={[-W / 2, H / 2, 0]}><boxGeometry args={[t, H, D]} />{kraft}</mesh>
      {[1, -1].map((side, i) => (
        <group key={side} position={[0, H, side * D / 2]} ref={(g) => { flapsRef.current[i] = g; }} rotation-x={side * 1.9}>
          <mesh position={[0, 0, -side * D / 4]}>
            <boxGeometry args={[W, t, D / 2]} />
            <meshStandardMaterial color="#C79C6B" roughness={0.9} />
          </mesh>
        </group>
      ))}
      <mesh ref={tapeRef} position={[0, H + 0.015, 0]} scale={[0.001, 1, 1]}>
        <boxGeometry args={[W + 0.04, 0.004, 0.16]} />
        <meshStandardMaterial color="#D8C3A0" roughness={0.3} transparent opacity={0.85} />
      </mesh>
    </group>
  );
};

const AUTOCOMPLETE: Record<AddressField, string> = {
  name: 'shipping name',
  line1: 'shipping address-line1',
  line2: 'shipping address-line2',
  city: 'shipping address-level2',
  region: 'shipping address-level1',
  postal: 'shipping postal-code',
  country: 'shipping country-name',
  email: 'email',
};

const isEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

// The mailing label. Whatever is typed prints straight onto it, line by line.
const AddressLabel = ({ refObject }: { refObject: React.RefObject<THREE.Group | null> }) => {
  const address = useCartStore((state) => state.address);
  const field = useCartStore((state) => state.field);
  const stage = useCartStore((state) => state.stage);
  const [blink, setBlink] = useState(true);
  const [typing, setTyping] = useState(false);
  const [error, setError] = useState('');
  const writable = stage === 'address';

  const focus = useHiddenInput({
    onInput: (value) => {
      const { field: i, setAddress } = useCartStore.getState();
      setAddress(ADDRESS_FIELDS[i].id, value);
      setError('');
    },
    onEnter: () => next(),
    onBlur: () => setTyping(false),
  });

  const focusField = (i: number) => {
    const { setField, address: current } = useCartStore.getState();
    const id = ADDRESS_FIELDS[i].id;
    setField(i);
    setTyping(true);
    focus(current[id], { type: id === 'email' ? 'email' : 'text', autocomplete: AUTOCOMPLETE[id] });
  };

  const finish = () => {
    const current = useCartStore.getState().address;
    const missing = ADDRESS_FIELDS.findIndex((f) => !f.optional && !current[f.id].trim());
    if (missing >= 0) {
      setError(`Add the ${ADDRESS_FIELDS[missing].label.toLowerCase()}`);
      focusField(missing);
      return;
    }
    if (!isEmail(current.email)) {
      setError('Check the email');
      focusField(ADDRESS_FIELDS.findIndex((f) => f.id === 'email'));
      return;
    }
    (document.activeElement as HTMLElement | null)?.blur();
    useCartStore.getState().setStage('pay');
  };

  const next = () => {
    const i = useCartStore.getState().field;
    if (i < ADDRESS_FIELDS.length - 1) focusField(i + 1);
    else finish();
  };

  useEffect(() => {
    if (!writable) return;
    const timer = setInterval(() => setBlink((b) => !b), 500);
    return () => clearInterval(timer);
  }, [writable]);

  const line = (i: number, y: number, size = 0.036) => {
    const f = ADDRESS_FIELDS[i];
    const value = address[f.id];
    const active = writable && typing && field === i;
    return (
      <Text key={f.id}
        position={[-0.42, y, 0.001]}
        font="./Vercetti-Regular.woff"
        fontSize={size}
        anchorX="left"
        color={value ? INK : '#9A8C80'}
        onClick={(e) => { e.stopPropagation(); if (writable) focusField(i); }}
        {...(writable ? pointer : {})}>
        {`${value || (active ? '' : f.placeholder)}${active && blink ? '|' : ''}`}
      </Text>
    );
  };

  const current = ADDRESS_FIELDS[field];

  return (
    <group ref={refObject} position={[0.85, DESK + 0.004, -0.42]} rotation-x={-Math.PI / 2}>
      <mesh onClick={(e) => { e.stopPropagation(); if (writable && !typing) focusField(field); }}>
        <planeGeometry args={[0.95, 0.66]} />
        <meshStandardMaterial color={PAPER} roughness={0.95} />
      </mesh>
      <mesh position={[0, 0.268, 0.0005]}>
        <planeGeometry args={[0.95, 0.12]} />
        <meshBasicMaterial color={LACQUER} />
      </mesh>
      <Text position={[-0.42, 0.285, 0.001]} font="./Vercetti-Regular.woff" fontSize={0.02} anchorX="left" color={PAPER} letterSpacing={0.2}>
        FROM  CONFESSIONS · BY AMAAN S. KHAN
      </Text>
      <Text position={[-0.42, 0.245, 0.001]} font="./cormorant-sc.ttf" fontSize={0.044} anchorX="left" color={PAPER} letterSpacing={0.08}>
        Where is this going?
      </Text>
      <mesh position={[0.37, 0.268, 0.001]}>
        <planeGeometry args={[0.1, 0.1]} />
        <meshBasicMaterial color="#E6A0A6" />
      </mesh>
      <Blossom position={[0.37, 0.268, 0.002]} size={0.03} />

      <Text position={[-0.42, 0.18, 0.001]} font="./Vercetti-Regular.woff" fontSize={0.02} anchorX="left" color={INK} letterSpacing={0.25}>
        SHIP TO
      </Text>
      {[0, 1, 2, 3, 4, 5, 6].map((i) => line(i, 0.14 - i * 0.047))}
      <mesh position={[0, -0.2, 0.0005]}>
        <planeGeometry args={[0.86, 0.002]} />
        <meshBasicMaterial color={INK} />
      </mesh>
      <Text position={[-0.42, -0.225, 0.001]} font="./Vercetti-Regular.woff" fontSize={0.018} anchorX="left" color={INK} letterSpacing={0.2}>
        RECEIPT TO
      </Text>
      {line(7, -0.255, 0.03)}

      {writable && (
        <group position={[0, -0.3, 0.001]}>
          <Text position={[-0.42, 0, 0]} font="./cormorant-italic.ttf" fontSize={0.026} anchorX="left" color={error ? '#9E2A3A' : '#6B5A4E'}>
            {error || (typing ? current.label : 'Tap the label to start writing')}
          </Text>
          <group position={[0.36, 0, 0]} onClick={(e) => { e.stopPropagation(); if (typing) next(); else focusField(field); }} {...pointer}>
            <mesh>
              <planeGeometry args={[0.18, 0.045]} />
              <meshBasicMaterial color={INK} />
            </mesh>
            <Text position={[0, 0, 0.001]} font="./cormorant-sc.ttf" fontSize={0.024} color={PAPER} letterSpacing={0.2}>
              {field === ADDRESS_FIELDS.length - 1 ? 'PAY ›' : 'NEXT ›'}
            </Text>
          </group>
        </group>
      )}
    </group>
  );
};

// A card kiosk at the end of the counter. The card swipes, the screen approves, and the order is placed.
const Kiosk = () => {
  const stage = useCartStore((state) => state.stage);
  const items = useCartStore((state) => state.items);
  const cardRef = useRef<THREE.Group>(null);
  const total = cartTotal(items) + SHIPPING_PRICE;

  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;
    gsap.killTweensOf(card.position);
    if (stage !== 'paying') {
      card.position.set(0.42, 0.05, 0.12);
      return;
    }
    gsap.timeline()
      .to(card.position, { x: 0, y: 0.1, duration: 0.35, ease: 'power2.out' })
      .to(card.position, { y: -0.5, duration: 0.45, ease: 'power2.in' })
      .to(card.position, { x: 0.42, y: 0.05, duration: 0.5, ease: 'power2.out' });

    const { items: cart, address, complete } = useCartStore.getState();
    placeOrder(cart, address).then(complete);
  }, [stage]);

  const pay = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (useCartStore.getState().stage === 'pay') useCartStore.getState().setStage('paying');
  };

  const screen = stage === 'paying' ? 'Reading card…' : stage === 'receipt' || stage === 'shipping' || stage === 'done' ? 'Approved' : 'Tap to pay';

  return (
    <group position={[2.55, DESK, -1.6]}>
      <mesh position={[0, 0.05, 0]}>
        <boxGeometry args={[0.4, 0.1, 0.3]} />
        <meshStandardMaterial color="#141010" roughness={0.4} />
      </mesh>
      <mesh position={[0, 0.3, 0]}>
        <cylinderGeometry args={[0.035, 0.035, 0.45, 12]} />
        <meshStandardMaterial color="#2A2222" metalness={0.6} roughness={0.35} />
      </mesh>
      <group position={[0, 0.72, 0.03]} rotation-x={-0.45}>
        <RoundedBox args={[0.62, 0.84, 0.07]} radius={0.03}>
          <meshStandardMaterial color="#141010" roughness={0.35} />
        </RoundedBox>
        <mesh position={[0, 0.1, 0.036]} onClick={pay} {...pointer}>
          <planeGeometry args={[0.52, 0.52]} />
          <meshBasicMaterial color="#1A0E12" />
        </mesh>
        <Text position={[0, 0.3, 0.037]} font="./Vercetti-Regular.woff" fontSize={0.028} color={GOLD} letterSpacing={0.3}>TOTAL</Text>
        <Text position={[0, 0.22, 0.037]} font="./cormorant-sc.ttf" fontSize={0.085} color={PAPER}>{money(total)}</Text>
        <Text position={[0, 0.14, 0.037]} font="./Vercetti-Regular.woff" fontSize={0.022} color={PAPER} fillOpacity={0.6}>
          {`incl. ${money(SHIPPING_PRICE)} shipping`}
        </Text>
        <group position={[0, -0.02, 0.037]} onClick={pay} {...pointer}>
          <mesh>
            <planeGeometry args={[0.4, 0.1]} />
            <meshBasicMaterial color={stage === 'pay' ? GOLD : '#3A2A22'} />
          </mesh>
          <Text position={[0, 0, 0.001]} font="./cormorant-sc.ttf" fontSize={0.04} color={INK} letterSpacing={0.15}>{screen}</Text>
        </group>
        <mesh position={[0, -0.36, 0.045]}>
          <boxGeometry args={[0.5, 0.05, 0.04]} />
          <meshStandardMaterial color="#070505" roughness={0.3} />
        </mesh>
        <group ref={cardRef} position={[0.42, 0.05, 0.12]}>
          <RoundedBox args={[0.34, 0.215, 0.008]} radius={0.004}>
            <meshStandardMaterial color="#1A1414" metalness={0.5} roughness={0.3} />
          </RoundedBox>
          <mesh position={[-0.1, 0.03, 0.005]}>
            <planeGeometry args={[0.05, 0.04]} />
            <meshStandardMaterial color={GOLD} metalness={0.9} roughness={0.25} />
          </mesh>
        </group>
      </group>
    </group>
  );
};

// A thermal printer. The receipt feeds up out of it, then is torn off and slid across the counter.
const Printer = () => {
  const stage = useCartStore((state) => state.stage);
  const items = useCartStore((state) => state.items);
  const address = useCartStore((state) => state.address);
  const orderNumber = useCartStore((state) => state.orderNumber);
  const paperRef = useRef<THREE.Group>(null);
  const H = 1.05;
  const subtotal = cartTotal(items);

  useEffect(() => {
    const paper = paperRef.current;
    if (!paper) return;
    if (stage !== 'receipt') {
      if (stage === 'shop' || stage === 'desk' || stage === 'address' || stage === 'pay' || stage === 'paying') {
        gsap.killTweensOf([paper.position, paper.rotation]);
        paper.position.set(0, 0.2 - H, 0);
        paper.rotation.set(0, 0, 0);
      }
      return;
    }
    gsap.timeline({ delay: 0.5 })
      .to(paper.position, { y: 0.2, duration: 2.2, ease: 'steps(18)' })
      .to(paper.rotation, { x: -Math.PI / 2, z: 0.08, duration: 0.5, ease: 'power2.inOut' }, '+=0.25')
      .to(paper.position, { x: 0.1, y: 0.01, z: 0.75, duration: 0.6, ease: 'power3.out' }, '<')
      .call(() => useCartStore.getState().setStage('shipping'), [], '+=1.6');
  }, [stage]);

  const row = (y: number, left: string, right = '', size = 0.026) => (
    <group position={[0, y, 0.001]}>
      <Text position={[-0.14, 0, 0]} font="./Vercetti-Regular.woff" fontSize={size} color={INK} anchorX="left">{left}</Text>
      {right && <Text position={[0.14, 0, 0]} font="./Vercetti-Regular.woff" fontSize={size} color={INK} anchorX="right">{right}</Text>}
    </group>
  );

  return (
    <group position={[1.85, DESK, -0.72]}>
      <RoundedBox args={[0.46, 0.2, 0.36]} radius={0.03} position={[0, 0.1, 0]}>
        <meshStandardMaterial color="#1B1414" roughness={0.35} />
      </RoundedBox>
      <mesh position={[0, 0.201, 0]} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[0.38, 0.03]} />
        <meshBasicMaterial color="#050303" />
      </mesh>
      {/* Anchored at its bottom edge so it can rise out of the slot and fold down flat. */}
      <group ref={paperRef} position={[0, 0.2 - H, 0]}>
        <group position={[0, H / 2, 0]}>
          <mesh>
            <planeGeometry args={[0.34, H]} />
            <meshStandardMaterial color="#FBF8F2" roughness={1} side={THREE.DoubleSide} />
          </mesh>
          <Text position={[0, 0.46, 0.001]} font="./cormorant-sc.ttf" fontSize={0.05} color={INK} letterSpacing={0.1}>CONFESSIONS</Text>
          <Text position={[0, 0.415, 0.001]} font="./cormorant-italic.ttf" fontSize={0.022} color={INK}>by Amaan S. Khan</Text>
          {row(0.36, formatOrder(orderNumber), '', 0.028)}
          {items.map((item, i) => (
            <group key={`${item.color}-${item.size}`}>
              {row(0.3 - i * 0.04, `${item.color} ${item.size[0]} ×${item.qty}`, money(item.price * item.qty))}
            </group>
          ))}
          {row(0.2, 'Subtotal', money(subtotal))}
          {row(0.165, 'Shipping', money(SHIPPING_PRICE))}
          {row(0.115, 'TOTAL', money(subtotal + SHIPPING_PRICE), 0.034)}
          {row(0.04, 'SHIP TO', '', 0.02)}
          {row(0.005, address.name)}
          {row(-0.03, address.line1)}
          {row(-0.065, [address.city, address.region, address.postal].filter(Boolean).join(' '))}
          {row(-0.1, address.country)}
          <Text position={[0, -0.2, 0.001]} font="./cormorant-italic.ttf" fontSize={0.026} color={INK} maxWidth={0.28} textAlign="center">
            Made by hand. Thank you for wearing it.
          </Text>
          {Array.from({ length: 22 }, (_, i) => (
            <mesh key={i} position={[-0.12 + i * 0.0115, -0.33, 0.001]}>
              <planeGeometry args={[i % 3 === 0 ? 0.006 : 0.003, 0.07]} />
              <meshBasicMaterial color={INK} />
            </mesh>
          ))}
          <Text position={[0, -0.39, 0.001]} font="./Vercetti-Regular.woff" fontSize={0.018} color={INK} letterSpacing={0.2}>
            {formatOrder(orderNumber)}
          </Text>
        </group>
      </group>
    </group>
  );
};

const CheckoutRoom = () => {
  const stage = useCartStore((state) => state.stage);
  const orderNumber = useCartStore((state) => state.orderNumber);
  const jacketRef = useRef<THREE.Group>(null);
  const parcelRef = useRef<THREE.Group>(null);
  const flapsRef = useRef<(THREE.Group | null)[]>([]);
  const tapeRef = useRef<THREE.Mesh>(null);
  const labelRef = useRef<THREE.Group>(null);
  const stampRef = useRef<THREE.Group>(null);
  const doneRef = useRef<THREE.Group>(null);
  const lampOn = stage !== 'shop';

  // Each step sets the props for it: jacket onto the counter, parcel down, then packing and away.
  useEffect(() => {
    const jacket = jacketRef.current;
    const parcel = parcelRef.current;
    const label = labelRef.current;
    const stamp = stampRef.current;
    const done = doneRef.current;
    if (!jacket || !parcel || !label || !stamp || !done) return;

    if (stage === 'shop') {
      gsap.killTweensOf([jacket.position, parcel.position, parcel.rotation, label.position, label.rotation]);
      jacket.position.set(-6, DESK, -1.2);
      parcel.position.set(0.8, DESK + 3, -1.35);
      parcel.rotation.set(0, 0, 0);
      label.position.set(0.85, DESK + 0.004, -0.42);
      label.rotation.set(-Math.PI / 2, 0, 0);
      flapsRef.current.forEach((f, i) => f?.rotation.set((i === 0 ? 1 : -1) * 1.9, 0, 0));
      tapeRef.current?.scale.set(0.001, 1, 1);
      stamp.scale.setScalar(0.001);
      stamp.position.set(STAMP[0], STAMP[1], STAMP[2]);
      done.scale.setScalar(0.001);
      return;
    }
    if (stage === 'desk') {
      gsap.to(jacket.position, { x: -0.9, duration: 1.1, delay: 0.6, ease: 'back.out(1.4)' });
      gsap.to(parcel.position, { y: DESK, duration: 0.7, delay: 1.3, ease: 'bounce.out' });
      const timer = setTimeout(() => useCartStore.getState().setStage('address'), 2600);
      return () => clearTimeout(timer);
    }
    if (stage === 'shipping') {
      const flaps = flapsRef.current;
      const tl = gsap.timeline();
      tl.to(jacket.position, { x: 0.8, y: DESK + 0.9, z: -1.35, duration: 0.7, ease: 'power2.inOut' })
        .to(jacket.position, { y: DESK + 0.03, duration: 0.4, ease: 'power2.in' })
        .to(flaps[0]?.rotation ?? {}, { x: 0, duration: 0.35, ease: 'power2.in' })
        .to(flaps[1]?.rotation ?? {}, { x: 0, duration: 0.35, ease: 'power2.in' }, '-=0.15')
        .to(tapeRef.current?.scale ?? {}, { x: 1, duration: 0.45, ease: 'power1.inOut' })
        .to(label.position, { x: 0.8, y: DESK + 0.54, z: -1.35, duration: 0.5, ease: 'power2.inOut' })
        .to(label.rotation, { z: -0.06, duration: 0.5 }, '<')
        .to(stamp.scale, { x: 1, y: 1, z: 1, duration: 0.25, ease: 'back.out(3)' })
        .to([parcel.position, jacket.position], { y: '+=0.3', duration: 0.35, ease: 'power2.out' }, '+=0.3')
        .to([label.position, stamp.position], { y: '+=0.3', duration: 0.35, ease: 'power2.out' }, '<')
        .call(() => useCartStore.getState().setStage('done'));
      return () => { tl.kill(); };
    }
    if (stage === 'done') {
      // Up and out, the way the whole site came in: through the clouds.
      const group = [parcel.position, label.position, stamp.position, jacket.position];
      gsap.to(group, { y: '+=9', duration: 2.4, ease: 'power2.in' });
      gsap.to(parcel.rotation, { y: 1.4, duration: 2.4, ease: 'power1.in' });
      gsap.to(done.scale, { x: 1, y: 1, z: 1, duration: 0.8, delay: 1.2, ease: 'power3.out' });
    }
  }, [stage]);

  const reset = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    useCartStore.getState().reset();
  };

  return (
    <group position={ROOM.toArray()}>
      <hemisphereLight args={['#FFE2C6', '#3A2018', 2.2]} />
      <ambientLight intensity={0.3} color="#FFD9C0" />
      <Shell />
      <Lamp on={lampOn} />
      <FoldedJacket refObject={jacketRef} />
      <Parcel refObject={parcelRef} flapsRef={flapsRef} tapeRef={tapeRef} />
      <AddressLabel refObject={labelRef} />
      <group ref={stampRef} position={STAMP} rotation-y={Math.PI / 2} scale={0.001}>
        <mesh>
          <planeGeometry args={[0.2, 0.24]} />
          <meshBasicMaterial color="#E6A0A6" />
        </mesh>
        <Blossom position={[0, 0.025, 0.001]} size={0.05} />
        <Text position={[0, -0.08, 0.001]} font="./Vercetti-Regular.woff" fontSize={0.022} color={LACQUER}>POSTAGE</Text>
      </group>
      <Kiosk />
      <Printer />
      <group ref={doneRef} position={[0.3, 1.95, 0.4]} scale={0.001}>
        <Text font="./cormorant-sc.ttf" fontSize={0.36} letterSpacing={0.24} color={PAPER}>ON ITS WAY</Text>
        <Text position={[0, -0.34, 0]} font="./cormorant-italic.ttf" fontSize={0.15} color={GOLD}>{formatOrder(orderNumber)}</Text>
        <Text position={[0, -0.58, 0]} font="./Vercetti-Regular.woff" fontSize={0.07} color={PAPER} fillOpacity={0.7} letterSpacing={0.3}>
          THE RECEIPT IS IN YOUR EMAIL
        </Text>
        <Text position={[0, -0.86, 0]} font="./cormorant-sc.ttf" fontSize={0.1} color={GOLD} letterSpacing={0.2} onClick={reset} {...pointer}>
          BACK TO THE SHOP
        </Text>
      </group>
    </group>
  );
};

export default CheckoutRoom;
