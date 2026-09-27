import gsap from "gsap";
import { isMobile } from "react-device-detect";
import * as THREE from "three";

import type { CheckoutStage } from "@stores";

// Portal coordinates: the shop camera rests at (0, 1.5, 2.5) looking down -z. The checkout room
// sits off to the right, behind a partition wall whose end is at WALL_END.
// Far enough out that none of it crosses the shop's sightlines, even with the look-around.
export const ROOM = new THREE.Vector3(24, 0, 0);
export const WALL_X = 16;
export const WALL_END = 6.2;
export const DESK = 0.74;

const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const inRoom = (x: number, y: number, z: number) => v(x, y, z).add(ROOM);

export const SHOP_SHOT = { position: v(0, 1.5, 2.5), target: v(0, 1.5, -1) };

// Phones are narrow, so each shot backs off a little and centers on the prop in play.
const back = isMobile ? 1.35 : 1;
const shot = (px: number, py: number, pz: number, tx: number, ty: number, tz: number) => {
  const target = inRoom(tx, ty, tz);
  const position = inRoom(px, py, pz).sub(target).multiplyScalar(back).add(target);
  return { position, target };
};

export const SHOTS: Partial<Record<CheckoutStage, { position: THREE.Vector3, target: THREE.Vector3 }>> = {
  desk: shot(0, 2.3, 4.2, 0, 0.7, -1.3),
  address: shot(0.85, 1.72, 0.3, 0.85, 0.74, -0.44),
  pay: shot(2.3, 1.55, -0.25, 2.55, 1.35, -1.55),
  paying: shot(2.3, 1.55, -0.25, 2.55, 1.35, -1.55),
  receipt: shot(1.75, 1.7, 1.15, 1.9, 0.8, -0.25),
  shipping: shot(0.3, 2.3, 3.6, 0.5, 0.9, -1.2),
  done: shot(0.3, 2.2, 4.4, 0.3, 1.75, 0.4),
};

// Out of the shop: pull back, swing round the end of the wall, and come in on the counter.
const SWING = new THREE.CatmullRomCurve3([
  v(0, 1.5, 2.5),
  v(5, 1.8, 7.6),
  v(WALL_X, 2, WALL_END + 2.4),
  v(ROOM.x - 3.4, 2.1, 5.6),
  SHOTS.desk!.position,
]);
const SWING_LOOK = [v(0, 1.5, -1), v(7, 1.4, 3.5), v(WALL_X, 1.4, WALL_END), v(ROOM.x - 1, 0.9, 0), SHOTS.desk!.target];

// The live camera shot, in portal coordinates. Projects applies it every frame while checking out.
export const camera = { position: SHOP_SHOT.position.clone(), target: SHOP_SHOT.target.clone(), active: false };

const lookAlong = (t: number, out: THREE.Vector3) => {
  const f = t * (SWING_LOOK.length - 1);
  const i = Math.min(Math.floor(f), SWING_LOOK.length - 2);
  return out.lerpVectors(SWING_LOOK[i], SWING_LOOK[i + 1], THREE.MathUtils.smootherstep(f - i, 0, 1));
};

export const swingIntoRoom = (onComplete?: () => void) => {
  camera.active = true;
  const progress = { t: 0 };
  return gsap.to(progress, {
    t: 1,
    duration: 2.8,
    ease: 'power2.inOut',
    onUpdate: () => {
      SWING.getPointAt(progress.t, camera.position);
      lookAlong(progress.t, camera.target);
    },
    onComplete,
  });
};

export const moveTo = (stage: CheckoutStage, duration = 1.1) => {
  const next = SHOTS[stage];
  if (!next) return;
  gsap.to(camera.position, { x: next.position.x, y: next.position.y, z: next.position.z, duration, ease: 'power3.inOut' });
  gsap.to(camera.target, { x: next.target.x, y: next.target.y, z: next.target.z, duration, ease: 'power3.inOut' });
};

// Back to the counter's opening shot, then the swing run in reverse to the shop.
export const swingOutOfRoom = (onComplete?: () => void) => {
  gsap.killTweensOf([camera.position, camera.target]);
  const start = { position: camera.position.clone(), target: camera.target.clone() };
  const progress = { t: 1, settle: 0 };
  return gsap.timeline({ onComplete: () => { leaveRoom(); onComplete?.(); } })
    .to(progress, {
      settle: 1,
      duration: 0.6,
      ease: 'power2.inOut',
      onUpdate: () => {
        camera.position.lerpVectors(start.position, SHOTS.desk!.position, progress.settle);
        camera.target.lerpVectors(start.target, SHOTS.desk!.target, progress.settle);
      },
    })
    .to(progress, {
      t: 0,
      duration: 2.2,
      ease: 'power2.inOut',
      onUpdate: () => {
        SWING.getPointAt(progress.t, camera.position);
        lookAlong(progress.t, camera.target);
      },
    });
};

export const leaveRoom = () => {
  gsap.killTweensOf([camera.position, camera.target]);
  camera.active = false;
  camera.position.copy(SHOP_SHOT.position);
  camera.target.copy(SHOP_SHOT.target);
};
