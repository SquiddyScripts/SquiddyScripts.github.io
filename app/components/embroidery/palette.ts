// Thread colors pulled from the tech pack artwork sheets.
export const PETALS = ['#E58B8A', '#C24C4C', '#D6734F', '#BE7B77', '#D9A08D', '#C66D76', '#D8A286', '#B96551'];
export const PETAL_CENTER = '#F3E2B8';
export const LEAVES = ['#577049', '#3F5436', '#4E7C54', '#6D8672', '#3B4F4C'];
export const BRANCH = '#6A4A3A';
export const CLOUD_GOLD = ['#D6C0A3', '#C1A37E', '#8E6F49'];

export const TITLE_GOLD = '#D2B27C';
export const IVORY = '#F4EFE6';

export interface Grow {
  value: number;
}

// Deterministic so the composition is the same on every load.
export const seeded = (seed: number) => {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
};
