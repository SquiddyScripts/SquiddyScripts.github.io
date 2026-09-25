// Photos of the jacket being worn, floated on either side of the shop. Only the colorway being
// looked at is shown. Add more to public/jacket and list them here; aspect is width / height,
// crop is an optional [left, top, right, bottom] window of the image, 0 to 1 from the top left.
export interface Wearer {
  src: string;
  aspect: number;
  color: 'Maroon' | 'Black';
  crop?: [number, number, number, number];
}

export const WEARERS: Wearer[] = [
  { src: 'jacket/people-maroon.jpg', aspect: 300 / 450, color: 'Maroon' },
  { src: 'jacket/worn.jpg', aspect: 771 / 1024, color: 'Maroon' },
  { src: 'jacket/both.jpg', aspect: 576 / 1024, color: 'Maroon', crop: [0.02, 0.3, 0.8, 0.74] },
  { src: 'jacket/people-black.jpg', aspect: 250 / 420, color: 'Black' },
  { src: 'jacket/black.jpg', aspect: 803 / 1024, color: 'Black' },
  { src: 'jacket/both.jpg', aspect: 576 / 1024, color: 'Black', crop: [0.44, 0.2, 0.98, 0.56] },
];
