import { Box, Edges, Line, Text, TextProps, useTexture } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { usePortalStore } from "@stores";
import gsap from "gsap";
import { useEffect, useMemo, useRef, useState } from "react";
import { isMobile } from "react-device-detect";
import * as THREE from "three";

import { WORK_TIMELINE } from "@constants";
import { WorkTimelinePoint } from "@types";

const reusableLeft = new THREE.Vector3(-0.3, 0, -0.1);
const reusableRight = new THREE.Vector3(0.3, 0, -0.1);
// A phone is too narrow for text beside the point, so it stacks: photo above, words below.
const reusableBelow = new THREE.Vector3(0, -0.35, -0.1);

const TimelinePoint = ({ point, diff }: { point: WorkTimelinePoint, diff: number }) => {
  const getPoint = useMemo(() => {
    if (isMobile) return reusableBelow;
    switch (point.position) {
      case 'left': return reusableLeft;
      case 'right': return reusableRight;
      default: return new THREE.Vector3();
    }
  }, [point.position]);

  const textAlign = isMobile ? 'center' : point.position === 'left' ? 'right' : 'left';

  const textProps: Partial<TextProps> = useMemo(() => ({
    font: "./Vercetti-Regular.woff",
    color: "white",
    anchorX: textAlign,
    textAlign: isMobile ? 'center' : undefined,
    fillOpacity: 2 - 2 * diff,
  }), [textAlign, diff]);

  const titleProps = useMemo(() => ({
    ...textProps,
    font: "./soria-font.ttf",
    fontSize: 0.6,
    maxWidth: 3,
  }), [textProps]);

  return (
    <group position={point.point} scale={isMobile ? 0.35 : 0.6}>
      <Box args={[0.2, 0.2, 0.2]} position={[0, 0, -0.1]} scale={[1 - diff, 1 - diff, 1 - diff]}>
        <meshBasicMaterial color="white" wireframe />
        <Edges color="white" lineWidth={1.5} />
      </Box>
      <group>
        <group position={getPoint}>
          <Text {...textProps} fontSize={0.3} position={[-diff / 2, 0, 0]}>
            {point.year}
          </Text>
          <group position={[0, -0.5, 0]}>
            <Text {...titleProps} fontSize={isMobile ? 0.34 : 0.6} maxWidth={isMobile ? 4.2 : 7} anchorY={isMobile ? 'top' : 'middle'} position={[0, isMobile ? 0.3 - diff / 2 : -diff / 2, 0]}>
              {point.title}
            </Text>
            <Text {...textProps} fontSize={isMobile ? 0.19 : 0.2} maxWidth={isMobile ? 3.6 : 3.4} anchorY="top" position={[0, (isMobile ? -0.2 : -0.4) - diff, 0]}>
              {point.subtitle}
            </Text>
          </group>
        </group>
        {point.image && <TimelinePhoto point={point} diff={diff} />}
      </group>
    </group>
  );
};

// Opens out from the point on the opposite side of its text once the line reaches it.
const TimelinePhoto = ({ point, diff }: { point: WorkTimelinePoint, diff: number }) => {
  const map = useTexture(point.image!);
  const aspect = point.aspect ?? 1;
  const height = isMobile ? Math.min(2.4, 3.6 / aspect) : aspect > 1.5 ? 1.6 : 2.6;
  const width = height * aspect;
  const side = point.position === 'left' ? 1 : -1;
  const open = 1 - diff;
  const position: [number, number, number] = isMobile
    ? [0, 0.35 + height / 2, -0.2]
    : [side * (0.5 + width / 2), 0.4 - height / 2, -0.2];

  return (
    <group position={position}
      scale={[open, open, 1]}
      rotation={[0, isMobile ? 0 : side * -0.15, 0]}>
      <mesh>
        <planeGeometry args={[width, height]} />
        <meshBasicMaterial map={map} toneMapped={false} transparent opacity={open} />
        <Edges color="#C6A36A" lineWidth={1} />
      </mesh>
    </group>
  );
};

const Timeline = ({ progress }: { progress: number }) => {
  const { camera } = useThree();
  const isActive = usePortalStore((state) => state.activePortalId === 'work');
  const timeline = useMemo(() => WORK_TIMELINE, []);

  const curve = useMemo(() => new THREE.CatmullRomCurve3(timeline.map(p => p.point), false), [timeline]);
  const curvePoints = useMemo(() => curve.getPoints(500), [curve]);
  const visibleCurvePoints = useMemo(() => curvePoints.slice(0, Math.max(1, Math.ceil(progress * curvePoints.length))), [curvePoints, progress]);
  const visibleTimelinePoints = useMemo(() => timeline.slice(0, Math.max(1, Math.round(progress * (timeline.length - 1) + 1))), [timeline, progress]);

  const [visibleDashedCurvePoints, setVisibleDashedCurvePoints] = useState<THREE.Vector3[]>([]);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useFrame((_, delta) => {
    if (isActive) {
      const position = curve.getPoint(progress);
      camera.position.x = THREE.MathUtils.damp(camera.position.x, (isMobile ? -1 : -2) + position.x, 4, delta);
      camera.position.y = THREE.MathUtils.damp(camera.position.y, -39 + position.z, 4, delta);
      camera.position.z = THREE.MathUtils.damp(camera.position.z, 13 - position.y, 4, delta);
    }
  });

  const groupRef = useRef<THREE.Group>(null);

  useEffect(() => {
    const tl = gsap.timeline();
    if (groupRef.current) {
      tl.to(groupRef.current.scale, {
        x: isActive ? 1 : 0,
        y: isActive ? 1 : 0,
        z: isActive ? 1 : 0,
        duration: 1,
        delay: isActive ? 0.4 : 0,
      });
      tl.to(groupRef.current.position, {
        y: isActive ? 0 : -2,
        duration: 1,
        delay: isActive ? 0.4 : 0,
      }, 0);
    }

    if (isActive) {
      let i = 0;
      clearInterval(intervalRef.current!);
      setTimeout(() => {
        intervalRef.current = setInterval(() => {
          const p = i++ / 100;
          setVisibleDashedCurvePoints(curvePoints.slice(0, Math.max(1, Math.ceil(p * curvePoints.length))));
          if (i > 100 && intervalRef.current) clearInterval(intervalRef.current);
        }, 10);
      }, 1000);
    } else {
      // Reset alongside interval cleanup; this state mirrors the timer.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setVisibleDashedCurvePoints([]);
      clearInterval(intervalRef.current!);
    }

    return () => clearInterval(intervalRef.current!);
  }, [isActive]);

  return (
    <group position={[0, -0.1, -0.1]}>
      <Line points={visibleCurvePoints} color="white" lineWidth={3} />
      {visibleDashedCurvePoints.length > 0 && (
        <Line
          points={visibleDashedCurvePoints}
          color="white"
          lineWidth={0.5}
          dashed
          dashSize={0.25}
          gapSize={0.25}
        />
      )}
      <group ref={groupRef}>
        {visibleTimelinePoints.map((point, i) => {
          const diff = Math.min(2 * Math.max(i - (progress * (timeline.length - 1)), 0), 1);
          return <TimelinePoint point={point} key={i} diff={diff} />;
        })}
      </group>
    </group>
  );
};

export default Timeline;
