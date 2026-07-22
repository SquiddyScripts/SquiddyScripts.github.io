import * as THREE from "three";
import { WorkTimelinePoint } from "../types";

export const WORK_TIMELINE: WorkTimelinePoint[] = [
  {
    point: new THREE.Vector3(0, 0, 0),
    year: '2023',
    title: 'Chantilly High School',
    subtitle: 'Class of 2027',
    position: 'right',
  },
  {
    point: new THREE.Vector3(-4, -4, -3),
    year: '2025',
    title: 'Virginia Tech',
    subtitle: 'Research Intern',
    position: 'left',
  },
  {
    point: new THREE.Vector3(-3, -1, -6),
    year: '2026',
    title: 'Virginia Tech',
    subtitle: 'Research Intern',
    position: 'left',
  },
  {
    point: new THREE.Vector3(0, -1, -10),
    year: new Date().toLocaleDateString('default', { year: 'numeric' }),
    title: 'Living...',
    subtitle: 'Building things',
    position: 'right',
  }
]
