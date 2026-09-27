import { Edges, Line, Text, TextProps, useTexture } from "@react-three/drei";
import { BUY_ENABLED, PAYMENT_LINK } from "@constants";
import { ThreeEvent, useFrame, useThree } from "@react-three/fiber";
import gsap from "gsap";
import { useEffect, useMemo, useRef, useState } from "react";
import { isMobile } from "react-device-detect";
import * as THREE from "three";

import { JacketColor, JacketSize, OrderField, useOrderStore, usePortalStore, useThemeStore } from "@stores";
import { Petals } from "../../embroidery/Petals";
import { finale, resetFinale } from "./finale";
import { checkoutUrl, isEmail, sendReservation } from "../../../utils/reserve";

const INK = '#140E0C';
const PAPER = '#EFE6DA';
const GOLD = '#B8904F';
const MAROON = '#6E2433';
const BLACK = '#161616';

// Set to false to hide pricing from the shop.
const SHOW_PRICE = true;
const PRICE_LINE = '$150 for the first 30 jackets, then $180';

// The room takes on the color being looked at.
const ROOM: Record<JacketColor, THREE.Color> = {
  Maroon: new THREE.Color('#3A0E18'),
  Black: new THREE.Color('#0F0D0C'),
};
const TILE_PREVIEW = new THREE.Color('#E7D5C4');

// Seconds from a reservation landing to the warp bursting into petals.
const BURST_AT = 2;
// Laptop: card and tag side by side. Phone: card stacked over the tag, the whole stack centered
// and scaled to the screen. warpY/restY are where the card sits during and after the finale.
const LAYOUT = isMobile ? {
  position: [0, 1.55, -1] as [number, number, number],
  card: [0, 3.66] as [number, number],
  controls: [0, -1.4] as [number, number],
  cardScale: 0.8,
  warpY: 0,
  restY: -0.7,
  reservedY: 2.15,
  reservedScale: 0.6,
} : {
  position: [1.4, 1.3, -1.6] as [number, number, number],
  card: [-1.6, 0] as [number, number],
  controls: [1.6, 0] as [number, number],
  cardScale: 1,
  warpY: 1.3,
  restY: -0.45,
  reservedY: 2.95,
  reservedScale: 1,
};
const CARD_CENTER = LAYOUT.card[0];

// What the phone camera sees at the shop's depth, in world units, and the stack it has to fit.
const PHONE_VIEW_HEIGHT = 5.3;
const PHONE_STACK: [number, number] = [3.4, 10.7];
const phoneScale = (aspect: number) => Math.min(
  (PHONE_VIEW_HEIGHT * 0.97) / PHONE_STACK[1],
  (PHONE_VIEW_HEIGHT * aspect) / PHONE_STACK[0],
);

// The panel is the jacket's hang tag: chamfered head, punched eyelet, stitched edge.
const TAG = { width: 3.1, bottom: -3.3, top: 3.5, chamfer: 0.55, eyelet: 3.14 };

const tagShape = (inset: number) => {
  const w = TAG.width / 2 - inset;
  const b = TAG.bottom + inset;
  const t = TAG.top - inset;
  const c = TAG.chamfer - inset * 0.4;
  const shape = new THREE.Shape();
  shape.moveTo(-w, b);
  shape.lineTo(w, b);
  shape.lineTo(w, t - c);
  shape.lineTo(w - c, t);
  shape.lineTo(-w + c, t);
  shape.lineTo(-w, t - c);
  shape.closePath();
  return shape;
};

const SIZES: { id: JacketSize, label: string, note: string }[] = [
  { id: 'Small', label: 'S', note: 'The smaller cut' },
  { id: 'Medium', label: 'M', note: 'Fits 5\'2" to 6\'2"' },
  { id: 'Large', label: 'L', note: 'The baggy fit' },
];

const label: Partial<TextProps> = {
  font: "./Vercetti-Regular.woff",
  color: INK,
  anchorX: 'left',
  anchorY: 'middle',
};

const pointer = {
  onPointerOver: (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    document.body.style.cursor = 'pointer';
  },
  onPointerOut: () => {
    document.body.style.cursor = 'auto';
  },
};

const isReady = () => {
  const { size, name, email } = useOrderStore.getState();
  return !!size && !!name.trim() && isEmail(email);
};

// Front shows maroon, back shows black. Picking a color turns the card over; reserving spins it.
const JacketCard = () => {
  const cardRef = useRef<THREE.Group>(null);
  const color = useOrderStore((state) => state.color);
  const status = useOrderStore((state) => state.status);
  const setColor = useOrderStore((state) => state.setColor);
  const maps = useTexture({ maroon: 'jacket/worn.jpg', black: 'jacket/black.jpg' });
  const base = color === 'Maroon' ? 0 : Math.PI;

  useEffect(() => {
    if (!cardRef.current) return;
    gsap.to(cardRef.current.rotation, { y: base, duration: 1.1, ease: 'power3.inOut' });
  }, [color]);

  // Spins up with the warp and lands face-on the instant it bursts.
  useEffect(() => {
    if (status !== 'sent' || !useOrderStore.getState().celebrate || !cardRef.current) return;
    gsap.fromTo(cardRef.current.rotation, { y: base }, { y: base + Math.PI * 6, duration: BURST_AT, ease: 'power3.in' });
    gsap.timeline({ delay: BURST_AT })
      .to(cardRef.current.scale, { x: 1.14, y: 1.14, duration: 0.08 })
      .to(cardRef.current.scale, { x: 1, y: 1, duration: 0.9, ease: 'elastic.out(1, 0.5)' });
  }, [status]);

  useFrame(({ clock }) => {
    if (cardRef.current) {
      cardRef.current.position.y = Math.sin(clock.elapsedTime * 0.6) * 0.06;
      cardRef.current.rotation.z = Math.sin(clock.elapsedTime * 0.4) * 0.015;
    }
  });

  const onClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (status === 'sent') return;
    setColor(color === 'Maroon' ? 'Black' : 'Maroon');
  };

  const height = 3.2;
  const maroonWidth = height * (771 / 1024);
  const blackWidth = height * (803 / 1024);

  return (
    <group ref={cardRef} onClick={onClick} {...pointer}>
      <mesh position={[0, 0, 0.011]}>
        <planeGeometry args={[maroonWidth, height]} />
        <meshBasicMaterial map={maps.maroon} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0, -0.011]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[blackWidth, height]} />
        <meshBasicMaterial map={maps.black} toneMapped={false} />
      </mesh>
      <mesh>
        <boxGeometry args={[blackWidth + 0.1, height + 0.1, 0.02]} />
        <meshBasicMaterial color={INK} />
        <Edges color={GOLD} lineWidth={1.5} />
      </mesh>
    </group>
  );
};

const Swatch = ({ value, fabric, position }: { value: JacketColor, fabric: string, position: [number, number, number] }) => {
  const ref = useRef<THREE.Group>(null);
  const selected = useOrderStore((state) => state.color === value);
  const setColor = useOrderStore((state) => state.setColor);

  useEffect(() => {
    if (ref.current) gsap.to(ref.current.position, { z: selected ? 0.2 : 0, duration: 0.3 });
  }, [selected]);

  return (
    <group position={position}>
      <group ref={ref} onClick={(e) => { e.stopPropagation(); setColor(value); }} {...pointer}>
        <mesh>
          <boxGeometry args={[0.5, 0.5, 0.12]} />
          <meshBasicMaterial color={fabric} />
          <Edges color={selected ? GOLD : INK} lineWidth={selected ? 2.5 : 1} />
        </mesh>
      </group>
      <Text {...label} fontSize={0.14} position={[0.42, 0, 0]}>{value.toUpperCase()}</Text>
    </group>
  );
};

const SizeBlock = ({ size, position }: { size: typeof SIZES[number], position: [number, number, number] }) => {
  const ref = useRef<THREE.Group>(null);
  const selected = useOrderStore((state) => state.size === size.id);
  const setSize = useOrderStore((state) => state.setSize);

  useEffect(() => {
    if (ref.current) {
      gsap.to(ref.current.position, { z: selected ? 0.25 : 0, duration: 0.3 });
      gsap.to(ref.current.scale, { x: selected ? 1.08 : 1, y: selected ? 1.08 : 1, duration: 0.3 });
    }
  }, [selected]);

  return (
    <group position={position}>
      <group ref={ref} onClick={(e) => { e.stopPropagation(); setSize(size.id); }} {...pointer}>
        <mesh>
          <boxGeometry args={[0.62, 0.62, 0.2]} />
          <meshBasicMaterial color={selected ? INK : '#FFF'} transparent opacity={selected ? 1 : 0.4} />
          <Edges color={INK} lineWidth={1.2} />
        </mesh>
        <Text font="./cormorant-sc.ttf" fontSize={0.4} color={selected ? PAPER : INK} position={[0, 0.03, 0.11]}>
          {size.label}
        </Text>
      </group>
    </group>
  );
};

const FIELDS: { id: OrderField, label: string, placeholder: string }[] = [
  { id: 'name', label: 'NAME', placeholder: 'Your name' },
  { id: 'email', label: 'EMAIL', placeholder: 'you@email.com' },
];

const Field = ({ field, position, onFocus }: { field: typeof FIELDS[number], position: [number, number, number], onFocus: (id: OrderField) => void }) => {
  const value = useOrderStore((state) => state[field.id]);
  const focused = useOrderStore((state) => state.focused === field.id);
  const caretRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (caretRef.current) caretRef.current.visible = focused && Math.floor(clock.elapsedTime * 2) % 2 === 0;
  });

  const shown = value.length > 26 ? `…${value.slice(-25)}` : value;

  return (
    <group position={position} onClick={(e) => { e.stopPropagation(); onFocus(field.id); }} {...pointer}>
      <Text {...label} fontSize={0.12} position={[-1.2, 0.3, 0]} letterSpacing={0.2}>{field.label}</Text>
      <mesh>
        <planeGeometry args={[2.5, 0.38]} />
        <meshBasicMaterial color="#FFF" transparent opacity={focused ? 0.8 : 0.4} />
        <Edges color={focused ? GOLD : INK} lineWidth={focused ? 2 : 1} />
      </mesh>
      <Text {...label}
        fontSize={0.15}
        color={value ? INK : '#7A6B60'}
        position={[-1.15, 0, 0.01]}>
        {shown || field.placeholder}
      </Text>
      <mesh ref={caretRef} position={[-1.13 + Math.min(shown.length, 26) * 0.085, 0, 0.01]}>
        <planeGeometry args={[0.012, 0.2]} />
        <meshBasicMaterial color={INK} />
      </mesh>
    </group>
  );
};

// A real input sits off screen so phones open their keyboard; the 3D fields mirror it.
const useHiddenInput = () => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const setField = useOrderStore((state) => state.setField);
  const setFocused = useOrderStore((state) => state.setFocused);

  const focus = (field: OrderField) => {
    const input = inputRef.current;
    if (!input) return;
    setFocused(field);
    input.type = field === 'email' ? 'email' : 'text';
    input.name = field;
    input.autocomplete = field === 'email' ? 'email' : 'name';
    input.value = useOrderStore.getState()[field];
    input.focus({ preventScroll: true });
  };

  useEffect(() => {
    const input = document.createElement('input');
    input.setAttribute('aria-label', 'Reservation field');
    Object.assign(input.style, {
      position: 'fixed',
      left: '0',
      bottom: '0',
      width: '1px',
      height: '1px',
      opacity: '0',
      fontSize: '16px',
      pointerEvents: 'none',
    });
    input.addEventListener('input', () => {
      const field = useOrderStore.getState().focused;
      if (field) setField(field, input.value);
    });
    input.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      if (useOrderStore.getState().focused === 'name') focus('email');
      else input.blur();
    });
    input.addEventListener('blur', () => setFocused(null));
    document.body.appendChild(input);
    inputRef.current = input;
    return () => input.remove();
  }, []);

  return focus;
};

const submit = async () => {
  const { name, email, color, size, status, setStatus } = useOrderStore.getState();
  if (status === 'sending' || status === 'sent') return;
  if (!size) return setStatus('error', 'Pick a size first.');
  if (!name.trim()) return setStatus('error', 'Add your name.');
  if (!isEmail(email)) return setStatus('error', 'Check the email address.');

  setStatus('sending');
  const order = { name: name.trim(), email: email.trim(), color, size };
  if (BUY_ENABLED) {
    // The heads-up email must not hold up the trip to checkout.
    sendReservation({ ...order, intent: 'checkout' }).catch(() => {});
    setStatus('sent', `${color} · ${size} · taking you to payment`, 'CHECKOUT');
    setTimeout(() => window.location.assign(checkoutUrl(PAYMENT_LINK, order)), (BURST_AT + 1.6) * 1000);
    return;
  }
  try {
    await sendReservation(order);
    setStatus('sent', `${color} · ${size} · held for ${name.trim().split(' ')[0]}`, 'RESERVED');
  } catch {
    setStatus('error', 'Didn\'t send. Email amaaninva@gmail.com instead.');
  }
};

const ReserveButton = ({ position }: { position: [number, number, number] }) => {
  const ref = useRef<THREE.Group>(null);
  const threadRef = useRef<THREE.Mesh>(null);
  const edgeRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const status = useOrderStore((state) => state.status);

  useEffect(() => {
    if (ref.current) gsap.to(ref.current.position, { z: hovered ? 0.34 : 0.2, duration: 0.3 });
  }, [hovered]);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    // Breathes once everything is filled in, so it's obvious what to press next.
    if (ref.current && status === 'idle') {
      const s = isReady() ? 1 + Math.sin(t * 3) * 0.025 : 1;
      ref.current.scale.set(s, s, 1);
    }
    if (threadRef.current) {
      threadRef.current.visible = status === 'sending';
      threadRef.current.scale.x = (t * 0.8) % 1;
      threadRef.current.position.x = -1.25 + threadRef.current.scale.x * 1.25;
    }
    if (edgeRef.current) {
      const material = edgeRef.current.material as THREE.MeshBasicMaterial;
      material.opacity = hovered || isReady() ? 0.55 + Math.sin(t * 3) * 0.25 : 0;
    }
  });

  const onClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (ref.current) {
      gsap.to(ref.current.position, { z: 0.05, duration: 0.08 })
        .then(() => ref.current && gsap.to(ref.current.position, { z: 0.2, duration: 0.35, ease: 'back.out(3)' }));
    }
    submit();
  };

  const text = status === 'sending' ? 'STITCHING' : BUY_ENABLED ? 'BUY' : 'RESERVE';

  return (
    <group position={position}>
      <group ref={ref} position={[0, 0, 0.2]}
        onClick={onClick}
        onPointerOver={(e) => { pointer.onPointerOver(e); setHovered(true); }}
        onPointerOut={() => { pointer.onPointerOut(); setHovered(false); }}>
        <mesh ref={edgeRef} position={[0, 0, -0.05]}>
          <planeGeometry args={[2.72, 0.72]} />
          <meshBasicMaterial color={GOLD} transparent opacity={0} depthWrite={false} />
        </mesh>
        <mesh>
          <boxGeometry args={[2.5, 0.52, 0.2]} />
          <meshBasicMaterial color={hovered ? MAROON : INK} />
          <Edges color={GOLD} lineWidth={1.5} />
        </mesh>
        <mesh ref={threadRef} position={[0, -0.18, 0.11]} visible={false}>
          <planeGeometry args={[2.5, 0.025]} />
          <meshBasicMaterial color={GOLD} />
        </mesh>
        <Text font="./cormorant-sc.ttf" fontSize={0.28} letterSpacing={0.3} color={PAPER} position={[0, 0.02, 0.11]}>
          {text}
        </Text>
      </group>
    </group>
  );
};

const Controls = () => {
  const size = useOrderStore((state) => state.size);
  const status = useOrderStore((state) => state.status);
  const message = useOrderStore((state) => state.message);
  const focus = useHiddenInput();
  const note = SIZES.find((s) => s.id === size)?.note ?? 'Medium is the sample size';
  const top = SHOW_PRICE ? 0.22 : 0;
  const tag = useMemo(() => ({
    body: new THREE.ShapeGeometry(tagShape(0)),
    stitch: tagShape(0.12).getPoints().map((p) => new THREE.Vector3(p.x, p.y, 0)),
  }), []);

  return (
    <group>
      <mesh geometry={tag.body} position={[0, 0, -0.08]}>
        <meshBasicMaterial color={PAPER} side={THREE.DoubleSide} />
      </mesh>
      <mesh geometry={tag.body} position={[0.06, -0.08, -0.12]}>
        <meshBasicMaterial color="#000" transparent opacity={0.28} depthWrite={false} />
      </mesh>
      <Line points={tag.stitch} color={GOLD} lineWidth={1.4} dashed dashSize={0.09} gapSize={0.06} position={[0, 0, -0.07]} />
      <mesh position={[0, TAG.eyelet, -0.06]}>
        <ringGeometry args={[0.085, 0.14, 28]} />
        <meshBasicMaterial color={GOLD} />
      </mesh>
      <mesh position={[0, TAG.eyelet, -0.065]}>
        <circleGeometry args={[0.085, 24]} />
        <meshBasicMaterial color={INK} />
      </mesh>
      <Text font="./cormorant-italic.ttf" fontSize={0.13} color={MAROON} anchorX="center" position={[0, TAG.eyelet - 0.46, 0]}>
        by Amaan S. Khan · one of 100
      </Text>
      <Text font="./cormorant-sc.ttf" fontSize={0.33} color={INK} anchorX="left" letterSpacing={0.1} position={[-1.25, 2.05 + top, 0]}>
        CONFESSIONS
      </Text>
      {SHOW_PRICE && (
        <Text {...label} fontSize={0.13} color={MAROON} position={[-1.25, 1.84, 0]}>{PRICE_LINE}</Text>
      )}
      <Text {...label} fontSize={0.12} position={[-1.25, 1.58, 0]} maxWidth={2.6} lineHeight={1.4}>
        Suede-hand polyester blend. Lined, inside pocket. Holds up to rain and the wash.
      </Text>

      <Swatch value="Maroon" fabric={MAROON} position={[-1.0, 1.0, 0]} />
      <Swatch value="Black" fabric={BLACK} position={[0.4, 1.0, 0]} />

      {SIZES.map((s, i) => (
        <SizeBlock key={s.id} size={s} position={[-0.9 + i * 0.8, 0.2, 0]} />
      ))}
      <Text {...label} fontSize={0.12} position={[-1.25, -0.28, 0]}>{note}</Text>

      {FIELDS.map((field, i) => (
        <Field key={field.id} field={field} onFocus={focus} position={[0, -0.95 - i * 0.78, 0]} />
      ))}

      <ReserveButton position={[0, -2.55, 0]} />
      <Text {...label}
        fontSize={0.11}
        maxWidth={2.6}
        lineHeight={1.4}
        anchorY="top"
        color={status === 'error' ? MAROON : INK}
        position={[-1.25, -2.95, 0]}>
        {status === 'error' ? message : BUY_ENABLED
          ? 'Secure checkout by Stripe. Ships once production wraps; I\'ll email you tracking.'
          : 'Nothing is charged now. I\'ll email you to confirm before your jacket is held.'}
      </Text>
    </group>
  );
};

// The finale once a reservation lands: the title stitches open above the jacket.
const Reserved = () => {
  const ref = useRef<THREE.Group>(null);
  const titleRef = useRef<THREE.Mesh>(null);
  const lineRef = useRef<THREE.Mesh>(null);
  const status = useOrderStore((state) => state.status);
  const message = useOrderStore((state) => state.message);
  const headline = useOrderStore((state) => state.headline);

  useEffect(() => {
    if (!ref.current) return;
    if (status !== 'sent') {
      ref.current.scale.setScalar(0.001);
      return;
    }
    const s = LAYOUT.reservedScale;
    // A reservation saved from an earlier visit is simply shown, without replaying the finale.
    if (!useOrderStore.getState().celebrate) {
      ref.current.scale.setScalar(s);
      if (titleRef.current) Object.assign(titleRef.current, { letterSpacing: 0.28, fillOpacity: 1 });
      lineRef.current?.scale.set(1, 1, 1);
      return;
    }
    const tl = gsap.timeline({ delay: BURST_AT + 0.15 });
    tl.fromTo(ref.current.scale, { x: 0.001, y: 0.001, z: 0.001 }, { x: s, y: s, z: s, duration: 0.01 })
      .fromTo(titleRef.current, { letterSpacing: 1.2, fillOpacity: 0 }, { letterSpacing: 0.28, fillOpacity: 1, duration: 1.8, ease: 'expo.out' })
      .fromTo(lineRef.current!.scale, { x: 0 }, { x: 1, duration: 1.2, ease: 'power3.inOut' }, '-=1.2');
    return () => { tl.kill(); };
  }, [status]);

  return (
    <group ref={ref} scale={0.001} position={[CARD_CENTER, LAYOUT.reservedY, 0.4]}>
      <Text ref={titleRef} font="./cormorant-sc.ttf" fontSize={0.62} color={PAPER} anchorX="center" letterSpacing={0.28}>
        {headline}
      </Text>
      <mesh ref={lineRef} position={[0, -0.45, 0]}>
        <planeGeometry args={[3.6, 0.02]} />
        <meshBasicMaterial color={GOLD} />
      </mesh>
      <Text font="./cormorant-italic.ttf" fontSize={0.26} color={PAPER} anchorX="center" position={[0, -0.75, 0]}>
        {message}
      </Text>
      <Text font="./Vercetti-Regular.woff" fontSize={0.12} color={PAPER} fillOpacity={0.7} anchorX="center" position={[0, -1.12, 0]} letterSpacing={0.3}>
        {headline === 'CHECKOUT' ? 'SECURE PAYMENT BY STRIPE' : 'CHECK YOUR EMAIL'}
      </Text>
      {headline === 'RESERVED' && (
        <Text font="./cormorant-sc.ttf"
          fontSize={0.17}
          color={GOLD}
          anchorX="center"
          letterSpacing={0.24}
          position={[0, -1.5, 0]}
          onClick={(e) => { e.stopPropagation(); useOrderStore.getState().setStatus('idle', '', 'RESERVED'); }}
          {...pointer}>
          RESERVE ANOTHER
        </Text>
      )}
    </group>
  );
};

if (process.env.NODE_ENV !== 'production' && typeof window !== 'undefined') {
  (window as unknown as { __order: typeof useOrderStore }).__order = useOrderStore;
  (window as unknown as { __portal: typeof usePortalStore }).__portal = usePortalStore;
}

const JacketBrowser = () => {
  const groupRef = useRef<THREE.Group>(null);
  const cardSlot = useRef<THREE.Group>(null);
  const controlsSlot = useRef<THREE.Group>(null);
  const swayRef = useRef<THREE.Group>(null);
  const isActive = usePortalStore((state) => state.activePortalId === 'projects');
  const color = useOrderStore((state) => state.color);
  const status = useOrderStore((state) => state.status);
  const setTheme = useThemeStore((state) => state.setTheme);
  const scene = useThree((state) => state.scene);
  const [fired, setFired] = useState(0);
  const [panelGone, setPanelGone] = useState(false);
  const celebrate = useOrderStore((state) => state.celebrate);
  // Gone once it has flown off in the finale, or straight away for a reservation already saved.
  const tagHidden = status === 'sent' && (panelGone || !celebrate);
  const aspect = useThree((state) => state.size.width / state.size.height);
  const scale = isMobile ? phoneScale(aspect) : 0.86;

  // Rises and grows in once the portal opens, the same way the story's timeline does.
  useEffect(() => {
    if (!groupRef.current) return;
    const s = isActive ? scale : 0;
    gsap.to(groupRef.current.scale, { x: s, y: s, z: s, duration: 1, delay: isActive ? 0.4 : 0, ease: 'power3.out' });
    gsap.to(groupRef.current.position, { y: LAYOUT.position[1] - (isActive ? 0 : 2), duration: 1, delay: isActive ? 0.4 : 0, ease: 'power3.out' });
  }, [isActive, scale]);

  useEffect(() => {
    if (isActive) setTheme(color === 'Maroon' ? 'maroon' : 'black');
  }, [color, isActive]);

  // The finale: the tag tears away, the jacket takes the center, the camera pushes in and shakes
  // through a light-speed warp, then everything bursts into petals. A reservation that was already
  // saved lands straight on the end of it; clearing one puts the tag back.
  useEffect(() => {
    const card = cardSlot.current;
    const slot = controlsSlot.current;
    if (status !== 'sent') {
      resetFinale();
      if (slot) {
        gsap.killTweensOf([slot.position, slot.rotation]);
        slot.position.set(LAYOUT.controls[0], LAYOUT.controls[1], 0);
        slot.rotation.set(0, 0, 0);
      }
      if (card) {
        gsap.killTweensOf([card.position, card.scale]);
        card.position.set(LAYOUT.card[0], LAYOUT.card[1], 0);
        card.scale.setScalar(LAYOUT.cardScale);
      }
      return;
    }
    if (!useOrderStore.getState().celebrate) {
      resetFinale();
      finale.zoom = 0.35;
      card?.position.set(CARD_CENTER, LAYOUT.restY, 0);
      card?.scale.setScalar(1);
      return;
    }
    resetFinale();
    if (controlsSlot.current) {
      const slot = controlsSlot.current;
      gsap.to(slot.position, { x: 12, y: 2, z: -4, duration: 0.7, ease: 'power3.in', onStart: () => setPanelGone(false), onComplete: () => setPanelGone(true) });
      gsap.to(slot.rotation, { y: -1.4, z: -0.5, duration: 0.7, ease: 'power3.in' });
    }
    if (cardSlot.current) {
      gsap.to(cardSlot.current.position, { x: CARD_CENTER, y: LAYOUT.warpY, duration: 0.9, ease: 'power3.inOut' });
      gsap.to(cardSlot.current.position, { y: LAYOUT.restY, duration: 1.4, delay: BURST_AT + 0.1, ease: 'power3.inOut' });
      gsap.to(cardSlot.current.scale, { x: 1, y: 1, z: 1, duration: 0.9, ease: 'power3.inOut' });
    }
    const tl = gsap.timeline();
    tl.to(finale, { warp: 1, shake: 0.7, zoom: 1, duration: BURST_AT - 0.3, ease: 'power2.in' }, 0.3)
      .call(() => setFired((n) => n + 1), [], BURST_AT)
      .to(finale, { flash: 0.9, duration: 0.05 }, BURST_AT)
      .to(finale, { flash: 0, duration: 0.8, ease: 'power2.out' }, BURST_AT + 0.05)
      .to(finale, { warp: 0, duration: 0.3, ease: 'power2.out' }, BURST_AT)
      .to(finale, { shake: 1.6, duration: 0.04 }, BURST_AT)
      .to(finale, { shake: 0, duration: 0.9, ease: 'power3.out' }, BURST_AT + 0.04)
      .to(finale, { zoom: 0.35, duration: 1.6, ease: 'power3.out' }, BURST_AT);
    return () => {
      tl.kill();
      resetFinale();
    };
  }, [status]);

  useFrame(({ clock }) => {
    if (swayRef.current) swayRef.current.rotation.z = Math.sin(clock.elapsedTime * 0.7) * 0.012;
  });

  // Eases the portal's backdrop to the chosen colorway, and back to the tile color on exit.
  useFrame((_, delta) => {
    if (scene.background instanceof THREE.Color) {
      const target = isActive ? ROOM[color] : TILE_PREVIEW;
      scene.background.lerp(target, 1 - Math.exp(-delta * 2.5));
    }
  });

  return (
    <group ref={groupRef}
      position={[LAYOUT.position[0], LAYOUT.position[1] - 2, LAYOUT.position[2]]}
      scale={0}>
      <group visible={isActive}>
        <Petals mode="drift" count={70} bounds={[16, 10, 8]} size={0.14} />
      </group>
      <group ref={cardSlot} position={[LAYOUT.card[0], LAYOUT.card[1], 0]} scale={LAYOUT.cardScale} visible={isActive}>
        <JacketCard />
      </group>
      <group ref={controlsSlot} position={[LAYOUT.controls[0], LAYOUT.controls[1], 0]} visible={isActive && !tagHidden}>
        {/* Hangs from its eyelet, turned slightly toward the jacket it belongs to. */}
        <group position={[0, TAG.eyelet, 0]} rotation={[0, isMobile ? 0 : -0.08, 0]}>
          <group ref={swayRef}>
            <group position={[0, -TAG.eyelet, 0]}>
              <Controls />
            </group>
          </group>
        </group>
      </group>
      <Reserved />
      <Petals mode="burst" count={140} origin={[CARD_CENTER, LAYOUT.warpY, 0.6]} fire={fired} size={0.18} />
    </group>
  );
};

export default JacketBrowser;
