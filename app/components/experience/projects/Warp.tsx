import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";

import { seeded } from "../../embroidery/palette";
import { finale } from "./finale";

const COUNT = 320;
const FAR = -70;
const COLORS = ['#F4EFE6', '#E8C98E', '#C6A36A', '#E7B3AE'];

// A tunnel of streaks that rides with the camera and rushes past it as the warp builds.
const Warp = () => {
  const rigRef = useRef<THREE.Group>(null);
  const linesRef = useRef<THREE.InstancedMesh>(null);
  const materialRef = useRef<THREE.MeshBasicMaterial>(null);
  const flashRef = useRef<THREE.MeshBasicMaterial>(null);
  const parentWorld = useMemo(() => new THREE.Matrix4(), []);
  const rigMatrix = useMemo(() => new THREE.Matrix4(), []);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const streaks = useMemo(() => {
    const rand = seeded(424242);
    return Array.from({ length: COUNT }, (_, i) => {
    const angle = rand() * Math.PI * 2;
    const radius = 1.4 + Math.pow(rand(), 0.7) * 9;
    return {
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius,
      z: FAR * rand(),
      speed: 0.6 + rand() * 0.8,
      color: new THREE.Color(COLORS[i % COLORS.length]),
    };
    });
  }, []);

  useLayoutEffect(() => {
    streaks.forEach((s, i) => linesRef.current?.setColorAt(i, s.color));
    if (linesRef.current?.instanceColor) linesRef.current.instanceColor.needsUpdate = true;
  }, [streaks]);

  useFrame(({ camera }, delta) => {
    const rig = rigRef.current;
    if (!rig) return;
    const w = finale.warp;
    rig.visible = w > 0.001 || finale.flash > 0.001;
    if (!rig.visible) return;

    // The portal writes the tile's transform straight into its scene's matrixWorld, so the
    // chain down to this rig is composed by hand rather than trusting stale world matrices.
    const chain: THREE.Object3D[] = [];
    let root: THREE.Object3D = rig.parent!;
    while (root.parent) {
      chain.push(root);
      root = root.parent;
    }
    parentWorld.copy(root.matrixWorld);
    for (let i = chain.length - 1; i >= 0; i--) {
      chain[i].updateMatrix();
      parentWorld.multiply(chain[i].matrix);
    }
    camera.updateMatrixWorld();
    rigMatrix.copy(parentWorld).invert().multiply(camera.matrixWorld);
    rigMatrix.decompose(rig.position, rig.quaternion, rig.scale);

    const step = Math.min(delta, 0.05) * (6 + w * w * 140);
    streaks.forEach((s, i) => {
      s.z += step * s.speed;
      if (s.z > 1) s.z += FAR;
      const length = 0.3 + w * w * 14 * s.speed;
      dummy.position.set(s.x, s.y, s.z - length / 2);
      dummy.scale.set(1, 1, length);
      dummy.updateMatrix();
      linesRef.current?.setMatrixAt(i, dummy.matrix);
    });
    if (linesRef.current) linesRef.current.instanceMatrix.needsUpdate = true;
    if (materialRef.current) materialRef.current.opacity = Math.min(1, w * 1.4);
    if (flashRef.current) flashRef.current.opacity = finale.flash;
  });

  return (
    <group ref={rigRef} visible={false}>
      <instancedMesh ref={linesRef} args={[undefined, undefined, COUNT]} frustumCulled={false} renderOrder={10}>
        <boxGeometry args={[0.025, 0.025, 1]} />
        <meshBasicMaterial ref={materialRef} transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
      </instancedMesh>
      <mesh position={[0, 0, -1]} renderOrder={11}>
        <planeGeometry args={[6, 6]} />
        <meshBasicMaterial ref={flashRef} color="#FFF3E0" transparent opacity={0} depthTest={false} depthWrite={false} toneMapped={false} />
      </mesh>
    </group>
  );
};

export default Warp;
