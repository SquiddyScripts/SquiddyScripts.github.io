import { Billboard, Line, RoundedBox, Text } from "@react-three/drei";
import { ThreeEvent, useFrame } from "@react-three/fiber";
import gsap from "gsap";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

import { SHIPPING_PRICE } from "@constants";
import { ADDRESS_FIELDS, AddressField, cartTotal, useCartStore } from "@stores";
import BlossomBranch, { Stem } from "../../../embroidery/BlossomBranch";
import { threadMatcap } from "../../../embroidery/matcap";
import { Grow, IVORY, TITLE_GOLD } from "../../../embroidery/palette";
import { Petals } from "../../../embroidery/Petals";
import { formatOrder, money, placeOrder } from "../../../../utils/checkout";
import { camera as shot, DESK, ROOM, WALL_END, WALL_X } from "./director";
import { useHiddenInput } from "./useHiddenInput";

const LACQUER = '#4A1624';
const LACQUER_DARK = '#2A0D14';
const WOOD = '#7A5238';
const KRAFT = '#C49A68';
const BRASS = '#B8904E';
const GOLD = '#C6A36A';
const SILK = '#EDE3D1';
const INK = '#1A1210';
const JACKET: Record<string, string> = { Maroon: '#7A2838', Black: '#262322' };

// Everything in the room is shaded like the thread work elsewhere: matcap form, no lights.
const Thread = ({ color, side }: { color: string, side?: THREE.Side }) => (
  <meshMatcapMaterial matcap={threadMatcap()} color={color} side={side} />
);

const pointer = {
  onPointerOver: (e: ThreeEvent<PointerEvent>) => { e.stopPropagation(); document.body.style.cursor = 'pointer'; },
  onPointerOut: () => { document.body.style.cursor = 'auto'; },
};

const stitchRect = (w: number, h: number) => [
  [-w / 2, -h / 2, 0], [w / 2, -h / 2, 0], [w / 2, h / 2, 0], [-w / 2, h / 2, 0], [-w / 2, -h / 2, 0],
] as [number, number, number][];

let glow: THREE.CanvasTexture | null = null;
const glowTexture = () => {
  if (glow) return glow;
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.35, 'rgba(255,255,255,0.45)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  glow = new THREE.CanvasTexture(canvas);
  return glow;
};

const BACKDROP_BRANCH: Stem[] = [
  { points: [[-3.4, -0.6, 0], [-2.2, 0.1, 0.05], [-0.8, 0.5, 0.1], [0.6, 0.9, 0.1], [2.0, 1.5, 0.05], [3.0, 1.7, 0]], radius: 0.07, start: 0, end: 1, blossoms: 11, leaves: 6 },
  { points: [[-0.8, 0.5, 0.1], [-0.5, 1.3, 0.1], [-0.1, 1.7, 0.05]], radius: 0.04, start: 0, end: 1, blossoms: 4, leaves: 2 },
  { points: [[0.6, 0.9, 0.1], [1.2, 0.5, 0.1], [1.9, 0.4, 0.05]], radius: 0.035, start: 0, end: 1, blossoms: 3, leaves: 2 },
];
const PARTITION_BRANCH: Stem[] = [
  { points: [[-3.2, 1.6, 0], [-1.8, 1.1, 0.05], [-0.4, 1.2, 0.1], [1.0, 0.7, 0.1], [2.6, 0.9, 0.05]], radius: 0.07, start: 0, end: 1, blossoms: 10, leaves: 5 },
  { points: [[-0.4, 1.2, 0.1], [0.0, 0.4, 0.1], [0.5, -0.1, 0.05]], radius: 0.04, start: 0, end: 1, blossoms: 4, leaves: 2 },
];

// A folding silk screen with a blossom branch stitched across its panels.
const FoldingScreen = ({ panels, stems, seed, position, rotationY = 0 }: {
  panels: number,
  stems: Stem[],
  seed: number,
  position: [number, number, number],
  rotationY?: number,
}) => {
  const width = 1.55;
  const height = 3.7;
  const fold = 0.32;
  const grow = useMemo<Grow>(() => ({ value: 1 }), []);
  const layout = useMemo(() => {
    const placed: { center: THREE.Vector3, angle: number }[] = [];
    const cursor = new THREE.Vector3();
    for (let i = 0; i < panels; i++) {
      const angle = i % 2 ? -fold : fold;
      const dir = new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle));
      placed.push({ center: cursor.clone().addScaledVector(dir, width / 2), angle });
      cursor.addScaledVector(dir, width);
    }
    const mid = cursor.clone().multiplyScalar(0.5);
    placed.forEach((p) => p.center.sub(mid));
    return placed;
  }, [panels]);

  return (
    <group position={position} rotation-y={rotationY}>
      {layout.map(({ center, angle }, i) => (
        <group key={i} position={[center.x, height / 2, center.z]} rotation-y={-angle}>
          <RoundedBox args={[width, height, 0.07]} radius={0.025}>
            <Thread color={LACQUER_DARK} />
          </RoundedBox>
          {[1, -1].map((side) => (
            <group key={side} position={[0, 0, side * 0.037]} rotation-y={side > 0 ? 0 : Math.PI}>
              <mesh>
                <planeGeometry args={[width - 0.14, height - 0.14]} />
                <meshBasicMaterial color={SILK} />
              </mesh>
              <Line points={stitchRect(width - 0.26, height - 0.26)} position={[0, 0, 0.002]} color={GOLD} lineWidth={1.2} dashed dashSize={0.06} gapSize={0.04} />
            </group>
          ))}
        </group>
      ))}
      <group position={[0, height * 0.45, 0.28]}>
        <BlossomBranch stems={stems} grow={grow} seed={seed} blossomSize={0.32} />
      </group>
    </group>
  );
};

// Round embroidered rug the whole set stands on, floating in the same dark as the shop.
const Stage = () => (
  <group position={[0, -1.2, 0.4]}>
    <mesh rotation-x={-Math.PI / 2}>
      <circleGeometry args={[5.2, 64]} />
      <meshBasicMaterial color={LACQUER_DARK} />
    </mesh>
    {[5.0, 4.6].map((r, i) => (
      <Line key={r}
        rotation-x={-Math.PI / 2}
        position={[0, 0.005, 0]}
        points={new THREE.EllipseCurve(0, 0, r, r).getPoints(96).map((p) => [p.x, p.y, 0] as [number, number, number])}
        color={GOLD}
        lineWidth={i ? 1 : 1.6}
        dashed={i === 1}
        dashSize={0.12}
        gapSize={0.08}
      />
    ))}
  </group>
);

const Counter = () => (
  <group>
    <RoundedBox args={[5.6, 1.86, 1.4]} radius={0.06} position={[0, -0.27, -1.3]}>
      <Thread color={LACQUER} />
    </RoundedBox>
    <RoundedBox args={[5.9, 0.1, 1.65]} radius={0.03} position={[0, DESK - 0.05, -1.3]}>
      <Thread color={WOOD} />
    </RoundedBox>
    <Line points={[[-2.9, DESK - 0.06, -0.47], [2.9, DESK - 0.06, -0.47]]} color={GOLD} lineWidth={1.4} dashed dashSize={0.08} gapSize={0.05} />
    <group position={[0, -0.25, -0.595]}>
      <Line points={stitchRect(5.2, 1.4)} color={GOLD} lineWidth={1.2} dashed dashSize={0.08} gapSize={0.05} />
      <Text font="./cormorant-sc.ttf" fontSize={0.26} letterSpacing={0.3} color={TITLE_GOLD} position={[0, 0.12, 0]}>CONFESSIONS</Text>
      <Text font="./cormorant-italic.ttf" fontSize={0.12} color={IVORY} fillOpacity={0.7} position={[0, -0.16, 0]}>
        packed by hand, one at a time
      </Text>
    </group>
  </group>
);

// A brass lamp with a silk shade. Clicks on with a flicker and warms the counter beneath it.
const Lamp = ({ on }: { on: boolean }) => {
  const haloRef = useRef<THREE.MeshBasicMaterial>(null);
  const poolRef = useRef<THREE.MeshBasicMaterial>(null);
  const shadeRef = useRef<THREE.MeshMatcapMaterial>(null);
  const level = useMemo(() => ({ value: 0 }), []);
  const texture = useMemo(() => glowTexture(), []);
  const dim = useMemo(() => new THREE.Color('#8A7A66'), []);
  const lit = useMemo(() => new THREE.Color('#FFF1D6'), []);

  useEffect(() => {
    gsap.killTweensOf(level);
    if (!on) {
      gsap.to(level, { value: 0, duration: 0.4 });
      return;
    }
    gsap.timeline({ delay: 0.6 })
      .to(level, { value: 0.7, duration: 0.05 })
      .to(level, { value: 0.15, duration: 0.09 })
      .to(level, { value: 1, duration: 0.4, ease: 'power2.out' });
  }, [on]);

  useFrame(() => {
    if (haloRef.current) haloRef.current.opacity = level.value * 0.55;
    if (poolRef.current) poolRef.current.opacity = level.value * 0.5;
    shadeRef.current?.color.lerpColors(dim, lit, level.value);
  });

  return (
    <group position={[-2.2, DESK, -1.65]}>
      <mesh position={[0, 0.03, 0]}>
        <cylinderGeometry args={[0.2, 0.24, 0.06, 32]} />
        <Thread color={BRASS} />
      </mesh>
      <mesh position={[0, 0.5, 0]}>
        <cylinderGeometry args={[0.022, 0.022, 0.95, 12]} />
        <Thread color={BRASS} />
      </mesh>
      <mesh position={[0, 1.05, 0]}>
        <cylinderGeometry args={[0.2, 0.34, 0.36, 32, 1, true]} />
        <meshMatcapMaterial ref={shadeRef} matcap={threadMatcap()} color="#8A7A66" side={THREE.DoubleSide} />
      </mesh>
      <Billboard position={[0, 0.98, 0]}>
        <mesh>
          <planeGeometry args={[1.6, 1.6]} />
          <meshBasicMaterial ref={haloRef} map={texture} color="#FFD49A" transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} />
        </mesh>
      </Billboard>
      <mesh rotation-x={-Math.PI / 2} position={[0.9, 0.006, 0.45]}>
        <planeGeometry args={[3.2, 2.2]} />
        <meshBasicMaterial ref={poolRef} map={texture} color="#FFC983" transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
    </group>
  );
};

// The jacket folded on a sheet of tissue, its hang tag on top. Slides onto the counter to begin.
const FoldedJacket = ({ refObject }: { refObject: React.RefObject<THREE.Group | null> }) => {
  const item = useCartStore((state) => state.items[0]);
  const color = JACKET[item?.color ?? 'Maroon'];

  return (
    <group ref={refObject} position={[-6, DESK, -1.2]}>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.004, 0]} rotation-z={0.06}>
        <planeGeometry args={[1.25, 0.95]} />
        <meshBasicMaterial color="#F2E4E0" />
      </mesh>
      <RoundedBox args={[1.0, 0.14, 0.72]} radius={0.05} position={[0, 0.075, 0]}>
        <Thread color={color} />
      </RoundedBox>
      <RoundedBox args={[0.48, 0.08, 0.15]} radius={0.035} position={[0, 0.16, -0.27]}>
        <Thread color={color} />
      </RoundedBox>
      {[-0.13, 0.01, 0.15].map((z) => (
        <mesh key={z} position={[0.02, 0.147, z]} rotation-z={Math.PI / 2}>
          <capsuleGeometry args={[0.014, 0.09, 4, 8]} />
          <Thread color={IVORY} />
        </mesh>
      ))}
      <group position={[-0.3, 0.147, 0.02]} rotation-x={-Math.PI / 2}>
        <Blossom position={[0, 0, 0]} size={0.07} petal="#E58B8A" />
        <Blossom position={[0.09, -0.1, 0]} size={0.05} petal="#D6734F" />
      </group>
      <group position={[0.34, 0.148, 0.2]} rotation={[-Math.PI / 2, 0, 0.3]}>
        <mesh>
          <planeGeometry args={[0.18, 0.26]} />
          <meshBasicMaterial color={IVORY} />
        </mesh>
        <Text position={[0, 0.06, 0.001]} font="./cormorant-sc.ttf" fontSize={0.026} color={INK}>CONFESSION</Text>
        <Text position={[0, 0.02, 0.001]} font="./Vercetti-Regular.woff" fontSize={0.018} color={INK}>
          {item ? `${item.color} · ${item.size}` : ''}
        </Text>
      </group>
    </group>
  );
};

// Five petals round a gold center, laid flat.
const Blossom = ({ position, size, petal = LACQUER }: { position: [number, number, number], size: number, petal?: string }) => (
  <group position={position}>
    {[0, 1, 2, 3, 4].map((i) => {
      const a = (i / 5) * Math.PI * 2 + Math.PI / 2;
      return (
        <mesh key={i} position={[Math.cos(a) * size * 0.55, Math.sin(a) * size * 0.55, 0]}>
          <circleGeometry args={[size * 0.42, 14]} />
          <meshBasicMaterial color={petal} />
        </mesh>
      );
    })}
    <mesh position={[0, 0, 0.0005]}>
      <circleGeometry args={[size * 0.22, 10]} />
      <meshBasicMaterial color={GOLD} />
    </mesh>
  </group>
);

const PARCEL = { x: 0.8, z: -1.35, w: 1.2, d: 0.85, h: 0.5 };

// An open box. The flaps fold shut and it's tied off with gold thread, like everything else here.
const Parcel = ({ refObject, flapsRef, tieRef }: {
  refObject: React.RefObject<THREE.Group | null>,
  flapsRef: React.RefObject<(THREE.Group | null)[]>,
  tieRef: React.RefObject<THREE.Group | null>,
}) => {
  const { w, d, h } = PARCEL;
  const t = 0.02;

  return (
    <group ref={refObject} position={[PARCEL.x, DESK + 3, PARCEL.z]}>
      <mesh position={[0, t / 2, 0]}><boxGeometry args={[w, t, d]} /><Thread color={KRAFT} /></mesh>
      <mesh position={[0, h / 2, d / 2]}><boxGeometry args={[w, h, t]} /><Thread color={KRAFT} /></mesh>
      <mesh position={[0, h / 2, -d / 2]}><boxGeometry args={[w, h, t]} /><Thread color={KRAFT} /></mesh>
      <mesh position={[w / 2, h / 2, 0]}><boxGeometry args={[t, h, d]} /><Thread color={KRAFT} /></mesh>
      <mesh position={[-w / 2, h / 2, 0]}><boxGeometry args={[t, h, d]} /><Thread color={KRAFT} /></mesh>
      <mesh position={[0, 0.03, 0]} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[w - 0.05, d - 0.05]} />
        <meshBasicMaterial color="#F2E4E0" />
      </mesh>
      {[1, -1].map((side, i) => (
        <group key={side} position={[0, h, side * d / 2]} ref={(g) => { flapsRef.current[i] = g; }} rotation-x={side * 1.9}>
          <mesh position={[0, 0, -side * d / 4]}>
            <boxGeometry args={[w, t, d / 2]} />
            <Thread color="#CFA673" />
          </mesh>
        </group>
      ))}
      <group ref={tieRef} scale={0.001}>
        <mesh position={[0, h / 2, 0]}>
          <boxGeometry args={[w + 0.012, h + 0.03, 0.025]} />
          <Thread color={GOLD} />
        </mesh>
        <mesh position={[0, h / 2, 0]}>
          <boxGeometry args={[0.025, h + 0.03, d + 0.012]} />
          <Thread color={GOLD} />
        </mesh>
        <mesh position={[0.18, h + 0.03, 0.12]} rotation={[-Math.PI / 2, 0, 0.5]}>
          <torusGeometry args={[0.06, 0.012, 8, 20]} />
          <Thread color={GOLD} />
        </mesh>
        <mesh position={[0.3, h + 0.03, 0.12]} rotation={[-Math.PI / 2, 0, -0.5]}>
          <torusGeometry args={[0.06, 0.012, 8, 20]} />
          <Thread color={GOLD} />
        </mesh>
      </group>
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

const LABEL = { w: 0.95, h: 0.7, chamfer: 0.07 };

const labelShape = (inset: number) => {
  const w = LABEL.w / 2 - inset;
  const h = LABEL.h / 2 - inset;
  const c = LABEL.chamfer;
  const shape = new THREE.Shape();
  shape.moveTo(-w, -h);
  shape.lineTo(w, -h);
  shape.lineTo(w, h - c);
  shape.lineTo(w - c, h);
  shape.lineTo(-w + c, h);
  shape.lineTo(-w, h - c);
  shape.closePath();
  return shape;
};

// One line of the address. Only this line re-lays out while it's typed; the caret blinks on its own.
const AddressLine = ({ index, y, size, active, onPick }: {
  index: number,
  y: number,
  size: number,
  active: boolean,
  onPick: (i: number) => void,
}) => {
  const field = ADDRESS_FIELDS[index];
  const value = useCartStore((state) => state.address[field.id]);
  const caretRef = useRef<THREE.Mesh>(null);
  const filled = useRef(!!value);
  useEffect(() => { filled.current = !!value; }, [value]);

  useFrame(({ clock }) => {
    if (caretRef.current) caretRef.current.visible = active && Math.sin(clock.elapsedTime * 7) > -0.2;
  });

  const onSync = (troika: THREE.Mesh & { textRenderInfo?: { blockBounds: number[] } }) => {
    const bounds = troika.textRenderInfo?.blockBounds;
    const text = (troika as unknown as { text?: string }).text;
    const typed = text !== undefined ? text !== field.placeholder : filled.current;
    if (caretRef.current) caretRef.current.position.x = -0.4 + (typed && bounds ? bounds[2] + 0.008 : 0);
  };

  return (
    <group position={[0, y, 0.001]}>
      <mesh position={[0, 0, -0.0005]} onClick={(e) => { e.stopPropagation(); onPick(index); }} {...pointer}>
        <planeGeometry args={[0.84, size * 1.25]} />
        <meshBasicMaterial color={active ? '#E9DCC4' : IVORY} />
      </mesh>
      <Text position={[-0.4, 0, 0]} font="./Vercetti-Regular.woff" fontSize={size} anchorX="left" color={value ? INK : '#A89A8C'} onSync={onSync}>
        {value || field.placeholder}
      </Text>
      <mesh ref={caretRef} position={[-0.4, 0, 0.001]} visible={false}>
        <planeGeometry args={[0.004, size * 1.05]} />
        <meshBasicMaterial color={INK} />
      </mesh>
    </group>
  );
};

// The mailing label: cut and stitched like the shop's hang tag. Typing prints straight onto it.
const AddressLabel = ({ refObject }: { refObject: React.RefObject<THREE.Group | null> }) => {
  const field = useCartStore((state) => state.field);
  const stage = useCartStore((state) => state.stage);
  const [typing, setTyping] = useState(false);
  const [error, setError] = useState('');
  const writable = stage === 'address';
  const geometry = useMemo(() => ({
    body: new THREE.ShapeGeometry(labelShape(0)),
    stitch: labelShape(0.035).getPoints().map((p) => [p.x, p.y, 0] as [number, number, number]),
  }), []);

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
    const { setField, address } = useCartStore.getState();
    const id = ADDRESS_FIELDS[i].id;
    setField(i);
    setTyping(true);
    focus(address[id], { type: id === 'email' ? 'email' : 'text', autocomplete: AUTOCOMPLETE[id] });
  };

  const finish = () => {
    const address = useCartStore.getState().address;
    const missing = ADDRESS_FIELDS.findIndex((f) => !f.optional && !address[f.id].trim());
    if (missing >= 0) {
      setError(`Still need: ${ADDRESS_FIELDS[missing].placeholder.toLowerCase()}`);
      focusField(missing);
      return;
    }
    if (!isEmail(address.email)) {
      setError('That email doesn\'t look right');
      focusField(ADDRESS_FIELDS.findIndex((f) => f.id === 'email'));
      return;
    }
    (document.activeElement as HTMLElement | null)?.blur();
    setTyping(false);
    useCartStore.getState().setStage('pay');
  };

  const next = () => {
    const i = useCartStore.getState().field;
    if (i < ADDRESS_FIELDS.length - 1) focusField(i + 1);
    else finish();
  };

  // On a keyboard, typing works straight away; phones need the tap to raise theirs.
  useEffect(() => {
    if (!writable || window.matchMedia('(pointer: coarse)').matches) return;
    const timer = setTimeout(() => focusField(useCartStore.getState().field), 900);
    return () => clearTimeout(timer);
  }, [writable]);

  const last = field === ADDRESS_FIELDS.length - 1;

  return (
    <group ref={refObject} position={[0.85, DESK + 0.004, -0.42]} rotation-x={-Math.PI / 2}>
      <mesh geometry={geometry.body} onClick={(e) => { e.stopPropagation(); if (writable && !typing) focusField(field); }}>
        <meshBasicMaterial color={IVORY} />
      </mesh>
      <Line points={geometry.stitch} color={GOLD} lineWidth={1.1} dashed dashSize={0.02} gapSize={0.014} position={[0, 0, 0.001]} />
      <mesh position={[0, LABEL.h / 2 - 0.06, 0.001]}>
        <ringGeometry args={[0.014, 0.024, 20]} />
        <meshBasicMaterial color={GOLD} />
      </mesh>
      <Text position={[-0.4, 0.235, 0.001]} font="./cormorant-sc.ttf" fontSize={0.05} anchorX="left" color={INK} letterSpacing={0.06}>
        Where is this going?
      </Text>
      <Text position={[0.4, 0.235, 0.001]} font="./Vercetti-Regular.woff" fontSize={0.016} anchorX="right" color={LACQUER} letterSpacing={0.2}>
        FROM CONFESSIONS
      </Text>
      <Blossom position={[0.33, 0.2, 0.001]} size={0.03} petal="#C24C4C" />
      {[0, 1, 2, 3, 4, 5, 6].map((i) => (
        <AddressLine key={i} index={i} y={0.17 - i * 0.05} size={0.034} active={writable && typing && field === i} onPick={(n) => writable && focusField(n)} />
      ))}
      <Line points={[[-0.4, -0.195, 0.001], [0.4, -0.195, 0.001]]} color={GOLD} lineWidth={1} dashed dashSize={0.02} gapSize={0.014} />
      <Text position={[-0.4, -0.215, 0.001]} font="./Vercetti-Regular.woff" fontSize={0.016} anchorX="left" color={LACQUER} letterSpacing={0.2}>
        RECEIPT TO
      </Text>
      <AddressLine index={7} y={-0.245} size={0.028} active={writable && typing && field === 7} onPick={(n) => writable && focusField(n)} />

      {writable && (
        <group position={[0, -0.3, 0.001]}>
          <Text position={[-0.4, 0, 0]} font="./cormorant-italic.ttf" fontSize={0.026} anchorX="left" color={error ? '#9E2A3A' : '#6B5A4E'}>
            {error || (typing ? ADDRESS_FIELDS[field].label : 'Tap a line to start writing')}
          </Text>
          <group position={[0.33, 0, 0]} onClick={(e) => { e.stopPropagation(); next(); }} {...pointer}>
            <mesh>
              <planeGeometry args={[0.2, 0.05]} />
              <meshBasicMaterial color={last ? LACQUER : INK} />
            </mesh>
            <Text position={[0, 0, 0.001]} font="./cormorant-sc.ttf" fontSize={0.024} color={IVORY} letterSpacing={0.2}>
              {last ? 'TO PAYMENT ›' : 'NEXT ›'}
            </Text>
          </group>
        </group>
      )}
    </group>
  );
};

// A brass card terminal. The card swipes, the screen approves, and the order is placed.
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
    <group position={[2.4, DESK, -1.55]}>
      <RoundedBox args={[0.42, 0.1, 0.32]} radius={0.03} position={[0, 0.05, 0]}>
        <Thread color={BRASS} />
      </RoundedBox>
      <mesh position={[0, 0.3, 0]}>
        <cylinderGeometry args={[0.03, 0.03, 0.45, 12]} />
        <Thread color={BRASS} />
      </mesh>
      <group position={[0, 0.72, 0.03]} rotation-x={-0.4}>
        <RoundedBox args={[0.62, 0.84, 0.07]} radius={0.035}>
          <Thread color={LACQUER_DARK} />
        </RoundedBox>
        <Line points={stitchRect(0.56, 0.78)} position={[0, 0, 0.037]} color={GOLD} lineWidth={1} dashed dashSize={0.03} gapSize={0.02} />
        <mesh position={[0, 0.1, 0.036]} onClick={pay} {...pointer}>
          <planeGeometry args={[0.5, 0.5]} />
          <meshBasicMaterial color="#160A0E" />
        </mesh>
        <Text position={[0, 0.3, 0.037]} font="./Vercetti-Regular.woff" fontSize={0.026} color={GOLD} letterSpacing={0.3}>TOTAL</Text>
        <Text position={[0, 0.22, 0.037]} font="./cormorant-sc.ttf" fontSize={0.085} color={IVORY}>{money(total)}</Text>
        <Text position={[0, 0.14, 0.037]} font="./Vercetti-Regular.woff" fontSize={0.02} color={IVORY} fillOpacity={0.6}>
          {`incl. ${money(SHIPPING_PRICE)} shipping`}
        </Text>
        <group position={[0, -0.02, 0.037]} onClick={pay} {...pointer}>
          <mesh>
            <planeGeometry args={[0.4, 0.1]} />
            <meshBasicMaterial color={stage === 'pay' ? GOLD : '#3A2A22'} />
          </mesh>
          <Text position={[0, 0, 0.001]} font="./cormorant-sc.ttf" fontSize={0.04} color={INK} letterSpacing={0.15}>{screen}</Text>
        </group>
        <mesh position={[0, -0.34, 0.045]}>
          <boxGeometry args={[0.5, 0.05, 0.04]} />
          <Thread color="#120709" />
        </mesh>
        <group ref={cardRef} position={[0.42, 0.05, 0.12]}>
          <RoundedBox args={[0.34, 0.215, 0.008]} radius={0.004}>
            <Thread color={LACQUER} />
          </RoundedBox>
          <mesh position={[-0.1, 0.03, 0.005]}>
            <planeGeometry args={[0.05, 0.04]} />
            <meshBasicMaterial color={GOLD} />
          </mesh>
        </group>
      </group>
    </group>
  );
};

// The receipt's printed side. Only mounted once there's something to print.
const Receipt = ({ H }: { H: number }) => {
  const items = useCartStore((state) => state.items);
  const address = useCartStore((state) => state.address);
  const orderNumber = useCartStore((state) => state.orderNumber);
  const subtotal = cartTotal(items);

  const row = (y: number, left: string, right = '', size = 0.026) => (
    <group position={[0, y, 0.001]}>
      <Text position={[-0.14, 0, 0]} font="./Vercetti-Regular.woff" fontSize={size} color={INK} anchorX="left">{left}</Text>
      {right && <Text position={[0.14, 0, 0]} font="./Vercetti-Regular.woff" fontSize={size} color={INK} anchorX="right">{right}</Text>}
    </group>
  );

  return (
    <group position={[0, H / 2, 0]}>
      <mesh>
        <planeGeometry args={[0.34, H]} />
        <meshBasicMaterial color="#FBF8F2" side={THREE.DoubleSide} />
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
      <Blossom position={[0, -0.32, 0.001]} size={0.05} petal="#C24C4C" />
      <Text position={[0, -0.41, 0.001]} font="./Vercetti-Regular.woff" fontSize={0.018} color={INK} letterSpacing={0.2}>
        {formatOrder(orderNumber)}
      </Text>
    </group>
  );
};

// A little printer. The receipt feeds up out of it, then is torn off and laid on the counter.
const Printer = () => {
  const stage = useCartStore((state) => state.stage);
  const printed = useCartStore((state) => state.orderNumber !== null);
  const paperRef = useRef<THREE.Group>(null);
  const H = 1.05;

  useEffect(() => {
    const paper = paperRef.current;
    if (!paper) return;
    if (stage === 'desk') {
      gsap.killTweensOf([paper.position, paper.rotation]);
      paper.position.set(0, 0.2 - H, 0);
      paper.rotation.set(0, 0, 0);
      return;
    }
    if (stage !== 'receipt') return;
    const tl = gsap.timeline({ delay: 0.4 })
      .to(paper.position, { y: 0.2, duration: 2, ease: 'steps(16)' })
      .to(paper.rotation, { x: -Math.PI / 2, z: 0.08, duration: 0.5, ease: 'power2.inOut' }, '+=0.2')
      .to(paper.position, { x: 0.1, y: 0.01, z: 0.75, duration: 0.6, ease: 'power3.out' }, '<')
      .call(() => useCartStore.getState().setStage('shipping'), [], '+=1.4');
    return () => { tl.kill(); };
  }, [stage]);

  return (
    <group position={[1.75, DESK, -0.72]}>
      <RoundedBox args={[0.46, 0.2, 0.36]} radius={0.04} position={[0, 0.1, 0]}>
        <Thread color={LACQUER} />
      </RoundedBox>
      <mesh position={[0, 0.202, 0]} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[0.4, 0.05]} />
        <Thread color={BRASS} />
      </mesh>
      <mesh position={[0, 0.203, 0]} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[0.36, 0.018]} />
        <meshBasicMaterial color="#050303" />
      </mesh>
      <Line points={stitchRect(0.4, 0.14)} position={[0, 0.1, 0.182]} color={GOLD} lineWidth={1} dashed dashSize={0.02} gapSize={0.014} />
      {/* Anchored at its bottom edge so it can rise out of the slot and fold down flat. */}
      <group ref={paperRef} position={[0, 0.2 - H, 0]}>
        {printed && <Receipt H={H} />}
      </group>
    </group>
  );
};

const STAMP: [number, number, number] = [PARCEL.x + PARCEL.w / 2 + 0.012, DESK + 0.28, PARCEL.z + 0.2];

const CheckoutRoom = () => {
  const stage = useCartStore((state) => state.stage);
  const orderNumber = useCartStore((state) => state.orderNumber);
  const rootRef = useRef<THREE.Group>(null);
  const jacketRef = useRef<THREE.Group>(null);
  const parcelRef = useRef<THREE.Group>(null);
  const flapsRef = useRef<(THREE.Group | null)[]>([]);
  const tieRef = useRef<THREE.Group>(null);
  const labelRef = useRef<THREE.Group>(null);
  const stampRef = useRef<THREE.Group>(null);
  const doneRef = useRef<THREE.Group>(null);
  const burst = stage === 'done' ? (orderNumber ?? 1) : 0;
  const lampOn = stage !== 'shop';

  // Nothing here is drawn unless the camera is actually in the room.
  useFrame(() => {
    if (rootRef.current) rootRef.current.visible = shot.active;
  });

  // Each step sets the props for it: jacket onto the counter, parcel down, then packing and away.
  useEffect(() => {
    const jacket = jacketRef.current;
    const parcel = parcelRef.current;
    const label = labelRef.current;
    const stamp = stampRef.current;
    const tie = tieRef.current;
    const done = doneRef.current;
    if (!jacket || !parcel || !label || !stamp || !tie || !done) return;

    // Everything is put back as the camera arrives, never while it's still watching the last order leave.
    if (stage === 'desk') {
      gsap.killTweensOf([jacket.position, parcel.position, parcel.rotation, label.position, label.rotation, stamp.position, stamp.scale, tie.scale, done.scale]);
      jacket.position.set(-6, DESK, -1.2);
      parcel.position.set(PARCEL.x, DESK + 3, PARCEL.z);
      parcel.rotation.set(0, 0, 0);
      label.position.set(0.85, DESK + 0.004, -0.42);
      label.rotation.set(-Math.PI / 2, 0, 0);
      flapsRef.current.forEach((f, i) => f?.rotation.set((i === 0 ? 1 : -1) * 1.9, 0, 0));
      tie.scale.setScalar(0.001);
      stamp.scale.setScalar(0.001);
      stamp.position.set(...STAMP);
      done.scale.setScalar(0.001);
      gsap.to(jacket.position, { x: -0.9, duration: 1.2, delay: 0.9, ease: 'power3.out' });
      gsap.to(parcel.position, { y: DESK, duration: 0.8, delay: 1.5, ease: 'bounce.out' });
      const timer = setTimeout(() => useCartStore.getState().setStage('address'), 2700);
      return () => clearTimeout(timer);
    }
    if (stage === 'shipping') {
      const flaps = flapsRef.current;
      const tl = gsap.timeline();
      tl.to(jacket.position, { x: PARCEL.x, y: DESK + 0.9, z: PARCEL.z, duration: 0.7, ease: 'power2.inOut' })
        .to(jacket.position, { y: DESK + 0.03, duration: 0.4, ease: 'power2.in' })
        .to(flaps[0]?.rotation ?? {}, { x: 0, duration: 0.35, ease: 'power2.in' })
        .to(flaps[1]?.rotation ?? {}, { x: 0, duration: 0.35, ease: 'power2.in' }, '-=0.15')
        .to(tie.scale, { x: 1, y: 1, z: 1, duration: 0.45, ease: 'back.out(2)' })
        .to(label.position, { x: PARCEL.x, y: DESK + PARCEL.h + 0.05, z: PARCEL.z, duration: 0.55, ease: 'power2.inOut' })
        .to(label.rotation, { z: -0.08, duration: 0.55 }, '<')
        .to(stamp.scale, { x: 1, y: 1, z: 1, duration: 0.25, ease: 'back.out(3)' })
        .call(() => useCartStore.getState().setStage('done'), [], '+=0.5');
      return () => { tl.kill(); };
    }
    if (stage === 'done') {
      // Lifted off the counter in a gust of petals and carried up out of sight.
      const lifted = [parcel.position, label.position, stamp.position, jacket.position];
      gsap.to(lifted, { y: '+=9', duration: 2.6, ease: 'power2.in', delay: 0.2 });
      gsap.to(parcel.rotation, { y: 0.9, duration: 2.6, ease: 'power1.in', delay: 0.2 });
      gsap.to(done.scale, { x: 1.35, y: 1.35, z: 1.35, duration: 0.9, delay: 1.4, ease: 'power3.out' });
    }
  }, [stage]);

  const reset = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    useCartStore.getState().reset();
  };

  return (
    <group ref={rootRef} position={ROOM.toArray()} visible={false}>
      <Stage />
      <FoldingScreen panels={4} stems={BACKDROP_BRANCH} seed={41} position={[0, -1.2, -2.9]} />
      {/* The screen the camera swings round on the way in from the shop. */}
      <FoldingScreen panels={4} stems={PARTITION_BRANCH} seed={57} position={[WALL_X - ROOM.x, -1.2, WALL_END - 3.2]} rotationY={-Math.PI / 2} />
      <Petals mode="drift" count={36} bounds={[10, 7, 6]} size={0.12} />
      <Counter />
      <Lamp on={lampOn} />
      <FoldedJacket refObject={jacketRef} />
      <Parcel refObject={parcelRef} flapsRef={flapsRef} tieRef={tieRef} />
      <AddressLabel refObject={labelRef} />
      <group ref={stampRef} position={STAMP} rotation-y={Math.PI / 2} scale={0.001}>
        <mesh>
          <planeGeometry args={[0.2, 0.24]} />
          <meshBasicMaterial color="#E6A0A6" />
        </mesh>
        <Line points={stitchRect(0.17, 0.21)} position={[0, 0, 0.001]} color={IVORY} lineWidth={1} dashed dashSize={0.012} gapSize={0.008} />
        <Blossom position={[0, 0.025, 0.002]} size={0.05} />
        <Text position={[0, -0.075, 0.002]} font="./Vercetti-Regular.woff" fontSize={0.02} color={LACQUER}>POSTAGE</Text>
      </group>
      <Kiosk />
      <Printer />
      <group position={[PARCEL.x, DESK + 0.5, PARCEL.z]}>
        <Petals mode="burst" count={90} origin={[0, 0, 0]} fire={burst} size={0.14} />
      </group>
      <group ref={doneRef} position={[0, 3.45, -1.4]} scale={0.001}>
        <Text font="./cormorant-sc.ttf" fontSize={0.36} letterSpacing={0.24} color={IVORY}>ON ITS WAY</Text>
        <Text position={[0, -0.34, 0]} font="./cormorant-italic.ttf" fontSize={0.15} color={GOLD}>{formatOrder(orderNumber)}</Text>
        <Text position={[0, -0.58, 0]} font="./Vercetti-Regular.woff" fontSize={0.07} color={IVORY} fillOpacity={0.7} letterSpacing={0.3}>
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
