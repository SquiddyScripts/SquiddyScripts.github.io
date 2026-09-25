// Shared, frame-read values for the reservation finale. Tweened by the shop, read by the camera and the warp.
export const finale = {
  warp: 0,
  shake: 0,
  zoom: 0,
  flash: 0,
};

export const resetFinale = () => {
  finale.warp = 0;
  finale.shake = 0;
  finale.zoom = 0;
  finale.flash = 0;
};
