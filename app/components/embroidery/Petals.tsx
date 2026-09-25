'use client';

import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";

import { threadMatcap } from "./matcap";
import { PETALS, seeded } from "./palette";

const petal = (() => {
  let cached: THREE.BufferGeometry | null = null;
  return () => {
    if (cached) return cached;
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.bezierCurveTo(-0.36, 0.16, -0.4, 0.64, -0.11, 0.8);
    shape.quadraticCurveTo(0, 0.7, 0.11, 0.8);
    shape.bezierCurveTo(0.4, 0.64, 0.36, 0.16, 0, 0);
    const geometry = new THREE.ShapeGeometry(shape, 6);
    const pos = geometry.attributes.position;
    for (let i = 0; i < pos.count; i++) pos.setZ(i, pos.getY(i) ** 2 * 0.4);
    geometry.translate(0, -0.4, 0);
    geometry.computeVertexNormals();
    cached = geometry;
    return geometry;
  };
})();

interface Particle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  spin: THREE.Vector3;
  rotation: THREE.Euler;
  scale: number;
}

const dummy = new THREE.Object3D();

// Loose petals. `drift` falls slowly through a box forever; `burst` fires once from `origin`.
export const Petals = ({ count, mode, origin, bounds, fire = 0, size = 0.16 }: {
  count: number;
  mode: 'drift' | 'burst';
  origin?: [number, number, number];
  bounds?: [number, number, number];
  fire?: number;
  size?: number;
}) => {
  const ref = useRef<THREE.InstancedMesh>(null);
  const matcap = useMemo(() => threadMatcap(), []);
  const box = useMemo(() => new THREE.Vector3(...(bounds ?? [10, 8, 6])), [bounds]);
  const startedAt = useRef<number | null>(null);

  const particles = useMemo<Particle[]>(() => {
    const rand = seeded(mode === 'drift' ? 3 : 9);
    return Array.from({ length: count }, () => ({
      position: new THREE.Vector3((rand() - 0.5) * box.x, (rand() - 0.5) * box.y, (rand() - 0.5) * box.z),
      velocity: new THREE.Vector3((rand() - 0.5) * 0.3, -0.25 - rand() * 0.35, (rand() - 0.5) * 0.2),
      spin: new THREE.Vector3(rand() * 1.5, rand() * 1.5, rand() * 1.5),
      rotation: new THREE.Euler(rand() * 6, rand() * 6, rand() * 6),
      scale: size * (0.7 + rand() * 0.6),
    }));
  }, [count, mode, box, size]);

  useLayoutEffect(() => {
    const rand = seeded(17);
    particles.forEach((_, i) => ref.current?.setColorAt(i, new THREE.Color(PETALS[Math.floor(rand() * PETALS.length)])));
    if (ref.current?.instanceColor) ref.current.instanceColor.needsUpdate = true;
  }, [particles]);

  useLayoutEffect(() => {
    if (mode !== 'burst' || !fire) return;
    const rand = seeded(fire * 31);
    const o = new THREE.Vector3(...(origin ?? [0, 0, 0]));
    particles.forEach((p) => {
      p.position.copy(o);
      const angle = rand() * Math.PI * 2;
      const speed = 2.5 + rand() * 4.5;
      p.velocity.set(Math.cos(angle) * speed, 2 + rand() * 5, Math.sin(angle) * speed * 0.6 + 1.5);
    });
    startedAt.current = null;
  }, [fire]);

  useFrame(({ clock }, delta) => {
    const mesh = ref.current;
    if (!mesh) return;
    const dt = Math.min(delta, 0.05);

    if (mode === 'burst') {
      if (!fire) { mesh.visible = false; return; }
      if (startedAt.current === null) startedAt.current = clock.elapsedTime;
      const age = clock.elapsedTime - startedAt.current;
      mesh.visible = age < 6;
      if (!mesh.visible) return;
    }

    particles.forEach((p, i) => {
      if (mode === 'burst') {
        p.velocity.y -= 3.2 * dt;
        p.velocity.multiplyScalar(1 - 1.4 * dt);
        p.velocity.y = Math.max(p.velocity.y, -0.9);
      } else {
        p.velocity.x = Math.sin(clock.elapsedTime * 0.6 + i) * 0.25;
        if (p.position.y < -box.y / 2) p.position.y = box.y / 2;
      }
      p.position.addScaledVector(p.velocity, dt);
      p.rotation.x += p.spin.x * dt;
      p.rotation.y += p.spin.y * dt;
      p.rotation.z += p.spin.z * dt;
      dummy.position.copy(p.position);
      dummy.rotation.copy(p.rotation);
      dummy.scale.setScalar(p.scale);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={ref} args={[petal(), undefined, count]} frustumCulled={false}>
      <meshMatcapMaterial matcap={matcap} side={THREE.DoubleSide} />
    </instancedMesh>
  );
};
