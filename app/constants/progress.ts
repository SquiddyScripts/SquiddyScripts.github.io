import { ProgressShot } from "../types";

// Photos the camera falls past between the title and the floor, in order.
// Aspect is width / height of the file in public/jacket.
export const PROGRESS: ProgressShot[] = [
  {
    src: 'jacket/worn.jpg',
    aspect: 771 / 1024,
    title: 'April',
    caption: 'The first one. Made for me, not for sale.',
  },
  {
    src: 'jacket/event.jpg',
    aspect: 1024 / 682,
    title: 'Nationals',
    caption: 'Maroon and black on the floor. Everyone asked.',
  },
  {
    src: 'jacket/black.jpg',
    aspect: 803 / 1024,
    title: 'Black',
    caption: 'The second color, picked from polls at school and competitions.',
  },
  {
    src: 'jacket/techpack.jpg',
    aspect: 1024 / 389,
    title: 'Tech pack',
    caption: 'Graded XS to XL, to the half centimeter.',
  },
  {
    src: 'jacket/mark.jpg',
    aspect: 1024 / 344,
    title: 'The mark',
    caption: 'Confessions, by Amaan S. Khan. The signature is the logo.',
  },
  {
    src: 'jacket/both.jpg',
    aspect: 576 / 1024,
    title: '100',
    caption: 'In production now.',
  },
];
