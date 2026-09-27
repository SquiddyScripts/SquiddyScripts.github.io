import * as THREE from "three";

// The portal writes its tile's transform straight into its scene's matrixWorld, so world matrices
// inside it go stale. These compose the chain by hand from the portal root instead.
export const portalMatrix = (object: THREE.Object3D, target = new THREE.Matrix4()) => {
  const chain: THREE.Object3D[] = [];
  let root: THREE.Object3D = object;
  while (root.parent) {
    chain.push(root);
    root = root.parent;
  }
  target.copy(root.matrixWorld);
  for (let i = chain.length - 1; i >= 0; i--) {
    chain[i].updateMatrix();
    target.multiply(chain[i].matrix);
  }
  return target;
};

const space = new THREE.Matrix4();
const local = new THREE.Matrix4();
const scale = new THREE.Vector3();
const up = new THREE.Vector3(0, 1, 0);

// Where the camera is, in the coordinates of `anchor` (a group inside the portal).
export const cameraInPortal = (camera: THREE.Camera, anchor: THREE.Object3D, position: THREE.Vector3, quaternion: THREE.Quaternion) => {
  camera.updateMatrixWorld();
  portalMatrix(anchor, space);
  local.copy(space).invert().multiply(camera.matrixWorld);
  local.decompose(position, quaternion, scale);
};

// Puts the camera at `position` looking at `target`, both in the coordinates of `anchor`.
export const placeCamera = (camera: THREE.Camera, anchor: THREE.Object3D, position: THREE.Vector3, target: THREE.Vector3) => {
  portalMatrix(anchor, space);
  local.lookAt(position, target, up).setPosition(position);
  local.premultiply(space);
  local.decompose(camera.position, camera.quaternion, scale);
};
