import * as THREE from "three";
import { WorkTimelinePoint } from "../types";

export const WORK_TIMELINE: WorkTimelinePoint[] = [
  {
    point: new THREE.Vector3(0, 0, 0),
    year: 'December',
    title: 'The one I couldn\'t buy',
    subtitle: 'Couldn\'t get the jacket I wanted, so I learned to make it.',
    position: 'right',
    image: 'jacket/techpack.jpg',
    aspect: 1024 / 389,
  },
  {
    point: new THREE.Vector3(-4, -4, -3),
    year: 'April',
    title: 'First jacket',
    subtitle: 'Made for myself. Suede hand, real embroidery.',
    position: 'left',
    image: 'jacket/worn.jpg',
    aspect: 771 / 1024,
  },
  {
    point: new THREE.Vector3(-3, -1, -6),
    year: 'ISEF · Nationals',
    title: 'Everyone asked',
    subtitle: 'Worn to competitions. Couldn\'t walk anywhere without questions.',
    position: 'left',
    image: 'jacket/event.jpg',
    aspect: 1024 / 682,
  },
  {
    point: new THREE.Vector3(0, -1, -10),
    year: 'Now',
    title: '100 in production',
    subtitle: 'Maroon and black. Small, medium, large.',
    position: 'right',
    image: 'jacket/both.jpg',
    aspect: 576 / 1024,
  }
]
