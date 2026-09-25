import { Edges, Line, Text, TextProps, useTexture } from "@react-three/drei";
import { ThreeEvent, useFrame, useThree } from "@react-three/fiber";
import gsap from "gsap";
import { useEffect, useMemo, useRef, useState } from "react";
import { isMobile } from "react-device-detect";
import * as THREE from "three";

import { JacketColor, JacketSize, OrderField, useOrderStore, usePortalStore, useThemeStore } from "@stores";
import { Petals } from "../../embroidery/Petals";
import { finale, resetFinale } from "./finale";
import { isEmail, sendReservation } from "../../../utils/reserve";

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
// Where the card sits, in shop space, to land dead center of the camera during the finale.
const CARD_CENTER = isMobile ? 0 : -1.6;

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
    if (status !== 'sent' || !cardRef.current) return;
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
  try {
    await sendReservation({ name: name.trim(), email: email.trim(), color, size });
    setStatus('sent', `${color} · ${size} · held for ${name.trim().split(' ')[0]}`);
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

  const text = status === 'sending' ? 'STITCHING' : 'RESERVE';

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
        {status === 'error' ? message : 'Nothing is charged now. I\'ll email you to confirm before your jacket is held.'}
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

  useEffect(() => {
    if (status !== 'sent' || !ref.current) return;
    const tl = gsap.timeline({ delay: BURST_AT + 0.15 });
    tl.fromTo(ref.current.scale, { x: 0.001, y: 0.001, z: 0.001 }, { x: 1, y: 1, z: 1, duration: 0.01 })
      .fromTo(titleRef.current, { letterSpacing: 1.2, fillOpacity: 0 }, { letterSpacing: 0.28, fillOpacity: 1, duration: 1.8, ease: 'expo.out' })
      .fromTo(lineRef.current!.scale, { x: 0 }, { x: 1, duration: 1.2, ease: 'power3.inOut' }, '-=1.2');
  }, [status]);

  return (
    <group ref={ref} scale={0.001} position={[CARD_CENTER, 2.95, 0.4]}>
      <Text ref={titleRef} font="./cormorant-sc.ttf" fontSize={0.62} color={PAPER} anchorX="center" letterSpacing={0.28}>
        RESERVED
      </Text>
      <mesh ref={lineRef} position={[0, -0.45, 0]}>
        <planeGeometry args={[3.6, 0.02]} />
        <meshBasicMaterial color={GOLD} />
      </mesh>
      <Text font="./cormorant-italic.ttf" fontSize={0.26} color={PAPER} anchorX="center" position={[0, -0.75, 0]}>
        {message}
      </Text>
      <Text font="./Vercetti-Regular.woff" fontSize={0.12} color={PAPER} fillOpacity={0.7} anchorX="center" position={[0, -1.12, 0]} letterSpacing={0.3}>
        CHECK YOUR EMAIL
      </Text>
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
  const scale = isMobile ? 0.58 : 0.86;

  useEffect(() => {
    if (!groupRef.current) return;
    const s = scale * (isActive ? 1 : 0.9);
    gsap.to(groupRef.current.scale, { x: s, y: s, z: s, duration: 1 });
  }, [isActive]);

  useEffect(() => {
    if (isActive) setTheme(color === 'Maroon' ? 'maroon' : 'black');
  }, [color, isActive]);

  // The finale: the tag tears away, the jacket takes the center, the camera pushes in and shakes
  // through a light-speed warp, then everything bursts into petals.
  useEffect(() => {
    if (status !== 'sent') return;
    resetFinale();
    if (controlsSlot.current) {
      const slot = controlsSlot.current;
      gsap.to(slot.position, { x: 12, y: 2, z: -4, duration: 0.7, ease: 'power3.in', onComplete: () => setPanelGone(true) });
      gsap.to(slot.rotation, { y: -1.4, z: -0.5, duration: 0.7, ease: 'power3.in' });
    }
    if (cardSlot.current) {
      gsap.to(cardSlot.current.position, { x: CARD_CENTER, y: 1.3, duration: 0.9, ease: 'power3.inOut' });
      gsap.to(cardSlot.current.position, { y: -0.45, duration: 1.4, delay: BURST_AT + 0.1, ease: 'power3.inOut' });
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

  const thread = useMemo(() => {
    const from = new THREE.Vector3(1.6, TAG.eyelet, -0.07);
    const to = new THREE.Vector3(-1.6 + 1.28, 1.62, 0);
    const sag = from.clone().lerp(to, 0.5).add(new THREE.Vector3(0, -0.35, 0.05));
    return new THREE.QuadraticBezierCurve3(from, sag, to).getPoints(24);
  }, []);

  // Eases the portal's backdrop to the chosen colorway, and back to the tile color on exit.
  useFrame((_, delta) => {
    if (scene.background instanceof THREE.Color) {
      const target = isActive ? ROOM[color] : TILE_PREVIEW;
      scene.background.lerp(target, 1 - Math.exp(-delta * 2.5));
    }
  });

  return (
    <group ref={groupRef}
      position={isMobile ? [0.9, 1.4, -1] : [1.4, 1.3, -1.6]}
      scale={scale}>
      <group visible={isActive}>
        <Petals mode="drift" count={70} bounds={[16, 10, 8]} size={0.14} />
      </group>
      <group ref={cardSlot} position={[-1.6, 0, 0]} visible={isActive}>
        <JacketCard />
      </group>
      <Line points={thread} color={GOLD} lineWidth={1.2} visible={isActive && status !== 'sent'} />
      <group ref={controlsSlot} position={[1.6, 0, 0]} visible={isActive && !panelGone}>
        {/* Hangs from its eyelet, turned slightly toward the jacket it belongs to. */}
        <group position={[0, TAG.eyelet, 0]} rotation={[0, -0.08, 0]}>
          <group ref={swayRef}>
            <group position={[0, -TAG.eyelet, 0]}>
              <Controls />
            </group>
          </group>
        </group>
      </group>
      <Reserved />
      <Petals mode="burst" count={140} origin={[CARD_CENTER, 1.3, 0.6]} fire={fired} size={0.18} />
    </group>
  );
};

export default JacketBrowser;
