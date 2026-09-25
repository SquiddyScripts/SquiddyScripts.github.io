import * as THREE from "three";

// A soft studio sphere drawn once. Matcap shading gives petals and branches real form
// without adding lights that would also relight the rest of the scene.
let cached: THREE.CanvasTexture | null = null;

export const threadMatcap = () => {
  if (cached || typeof document === 'undefined') return cached;
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, size, size);

  const body = ctx.createRadialGradient(size * 0.38, size * 0.32, size * 0.04, size * 0.5, size * 0.5, size * 0.5);
  body.addColorStop(0, '#ffffff');
  body.addColorStop(0.45, '#f4f4f4');
  body.addColorStop(0.8, '#c9c9c9');
  body.addColorStop(1, '#8c8c8c');
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
  ctx.fill();

  const sheen = ctx.createRadialGradient(size * 0.34, size * 0.28, 0, size * 0.34, size * 0.28, size * 0.16);
  sheen.addColorStop(0, 'rgba(255,255,255,0.55)');
  sheen.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = sheen;
  ctx.fillRect(0, 0, size, size);

  cached = new THREE.CanvasTexture(canvas);
  cached.colorSpace = THREE.SRGBColorSpace;
  return cached;
};
