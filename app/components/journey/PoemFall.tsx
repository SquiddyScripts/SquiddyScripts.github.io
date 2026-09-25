'use client';

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { isMobile } from "react-device-detect";
import * as THREE from "three";

// Half of the couplet embroidered down the sleeve, read top to bottom as the camera falls.
const LINE = '藏在了望向你的每一个眼神里';
const GOLD = '#C6A36A';
const FONT = '"Noto Serif SC", "Source Han Serif SC", "Songti SC", "STSong", "SimSun", serif';

// Starts just under the window (y = -25) and ends above the floor the camera settles over (y = -37).
const TOP = -26.2;
const BOTTOM = -36;

const glyphTexture = (char: string) => {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = GOLD;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `600 ${size * 0.78}px ${FONT}`;
    ctx.fillText(char, size / 2, size / 2 + size * 0.04);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
};

const PoemFall = () => {
  const materials = useRef<(THREE.MeshBasicMaterial | null)[]>([]);
  const chars = useMemo(() => Array.from(LINE), []);
  const textures = useMemo(() => chars.map(glyphTexture), [chars]);
  const size = isMobile ? 0.3 : 0.62;
  const radius = isMobile ? 0.36 : 0.95;

  // A slow spiral around the fall line gives each character its own spot on screen.
  // On a phone the turn is tighter and wider-stepped so neighbours don't overlap on screen.
  const step = isMobile ? 1.05 : 0.55;

  const placement = (i: number) => {
    const angle = Math.PI * 0.9 + i * step;
    return [
      Math.cos(angle) * radius,
      TOP + (BOTTOM - TOP) * (i / (chars.length - 1)),
      5 + Math.sin(angle) * radius * 0.8,
    ] as [number, number, number];
  };

  useEffect(() => () => textures.forEach((t) => t.dispose()), [textures]);

  useFrame(({ camera }) => {
    chars.forEach((_, i) => {
      const material = materials.current[i];
      if (!material) return;
      const y = TOP + (BOTTOM - TOP) * (i / (chars.length - 1));
      const above = camera.position.y - y;
      // On a phone each character peaks further off so its whole width stays on screen.
      material.opacity = isMobile
        ? THREE.MathUtils.smoothstep(above, 1.3, 1.9) * (1 - THREE.MathUtils.smoothstep(above, 3.4, 4.6))
        : THREE.MathUtils.smoothstep(above, 0.35, 1.1) * (1 - THREE.MathUtils.smoothstep(above, 2.6, 4));
    });
  });

  return (
    <group>
      {chars.map((char, i) => (
        <mesh key={i}
          position={placement(i)}
          rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[size, size]} />
          <meshBasicMaterial
            ref={(m) => { materials.current[i] = m; }}
            map={textures[i]}
            transparent
            opacity={0}
            depthWrite={false}
            toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
};

export default PoemFall;
