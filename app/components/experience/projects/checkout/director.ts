import gsap from "gsap";
import { isMobile } from "react-device-detect";
import * as THREE from "three";

import type { CheckoutStage } from "@stores";

// Portal coordinates: the shop camera rests at (0, 1.5, 2.5) looking down -z. The checkout set
// sits off to the right, behind a folding screen whose end is at WALL_END. Far enough out that
// none of it crosses the shop's sightlines, even with the look-around.
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
  desk: shot(0, 2.4, 5.4, 0, 0.8, -1.3),
  address: shot(0.85, 1.72, 0.3, 0.85, 0.74, -0.44),
  pay: shot(2.2, 1.55, -0.2, 2.4, 1.35, -1.5),
  paying: shot(2.2, 1.55, -0.2, 2.4, 1.35, -1.5),
  receipt: shot(1.65, 1.7, 1.15, 1.8, 0.8, -0.25),
  shipping: shot(0.5, 2.1, 2.8, 0.7, 0.85, -1.3),
  done: shot(0, 2.5, 5.6, 0, 2.1, -1.3),
};

// Out of the shop: drift back, arc round the end of the screen, and settle on the counter.
// Position and aim each follow their own smooth curve, so the move never stalls mid-way.
const SWING = new THREE.CatmullRomCurve3([
  v(0, 1.5, 2.5),
  v(4.5, 1.75, 7.2),
  v(WALL_X - 1, 2, WALL_END + 2.6),
  v(ROOM.x - 3.6, 2.1, 6.4),
  SHOTS.desk!.position,
], false, 'centripetal');
const SWING_LOOK = new THREE.CatmullRomCurve3([
  v(0, 1.5, -1),
  v(7, 1.4, 3),
  v(WALL_X, 1.3, WALL_END - 1),
  v(ROOM.x - 1.5, 0.9, -0.5),
  SHOTS.desk!.target,
], false, 'centripetal');

// Where the camera is headed, in portal coordinates. Projects eases the real camera toward it.
export const camera = { position: SHOP_SHOT.position.clone(), target: SHOP_SHOT.target.clone(), active: false };

const along = (t: number) => {
  SWING.getPointAt(t, camera.position);
  SWING_LOOK.getPointAt(t, camera.target);
};

export const swingIntoRoom = (onComplete?: () => void) => {
  gsap.killTweensOf([camera.position, camera.target]);
  camera.active = true;
  const progress = { t: 0 };
  return gsap.to(progress, { t: 1, duration: 3.2, ease: 'sine.inOut', onUpdate: () => along(progress.t), onComplete });
};

export const moveTo = (stage: CheckoutStage, duration = 1.5) => {
  const next = SHOTS[stage];
  if (!next) return;
  gsap.to(camera.position, { x: next.position.x, y: next.position.y, z: next.position.z, duration, ease: 'sine.inOut', overwrite: true });
  gsap.to(camera.target, { x: next.target.x, y: next.target.y, z: next.target.z, duration, ease: 'sine.inOut', overwrite: true });
};

// Back to the counter's opening shot, then the swing run in reverse to the shop.
export const swingOutOfRoom = (onComplete?: () => void) => {
  gsap.killTweensOf([camera.position, camera.target]);
  const start = { position: camera.position.clone(), target: camera.target.clone() };
  const progress = { t: 1, settle: 0 };
  return gsap.timeline({ onComplete: () => { leaveRoom(); onComplete?.(); } })
    .to(progress, {
      settle: 1,
      duration: 0.8,
      ease: 'sine.inOut',
      onUpdate: () => {
        camera.position.lerpVectors(start.position, SHOTS.desk!.position, progress.settle);
        camera.target.lerpVectors(start.target, SHOTS.desk!.target, progress.settle);
      },
    })
    .to(progress, { t: 0, duration: 2.8, ease: 'sine.inOut', onUpdate: () => along(progress.t) });
};

export const leaveRoom = () => {
  gsap.killTweensOf([camera.position, camera.target]);
  camera.active = false;
  camera.position.copy(SHOP_SHOT.position);
  camera.target.copy(SHOP_SHOT.target);
};
