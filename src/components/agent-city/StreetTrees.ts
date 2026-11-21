import * as THREE from "three";

export interface TreeLocation {
  x: number;
  z: number;
  height: number;
  spread: number;
  ground?: number;
}

function leafTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 256;
  const context = canvas.getContext("2d")!;
  let state = 0x4cc7e2;
  const random = () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
  const palette = ["#33462a", "#465732", "#52643a", "#617441", "#758348", "#828c52"];
  for (let crown = 0; crown < 24; crown++) {
    const angle = random() * Math.PI * 2;
    const radial = Math.sqrt(random()) * 84;
    const x = 128 + Math.cos(angle) * radial;
    const y = 128 + Math.sin(angle) * radial;
    const shade = y < 117 ? 1 : 0;
    for (let leaf = 0; leaf < 135; leaf++) {
      const bearing = random() * Math.PI * 2;
      const distance = Math.sqrt(random()) * (crown % 4 * 3 + 22);
      const length = 2 + random() * 3.8;
      context.fillStyle = palette[Math.min(palette.length - 1, Math.floor(random() * 5) + shade)];
      context.beginPath();
      context.ellipse(x + Math.cos(bearing) * distance, y + Math.sin(bearing) * distance,
        length, length * .47, bearing, 0, Math.PI * 2);
      context.fill();
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

const clusterOffsets = [
  [0, .93, 0, .98], [-.41, .77, .12, .87], [.38, .79, -.23, .84],
  [.18, .69, .37, .95], [-.17, .71, -.38, .80], [-.31, .92, -.27, .71],
] as const;

/** Layered, irregular crowns with tapered limbs. Three batches cover the entire city. */
export function createStreetTrees(locations: TreeLocation[]) {
  const group = new THREE.Group();
  group.name = "street-tree-canopies";
  group.userData.isScenery = true;
  const bark = new THREE.MeshStandardMaterial({ color: 0xa2998b, roughness: 1 });
  const trunk = new THREE.InstancedMesh(new THREE.CylinderGeometry(.55, 1, 1, 9), bark, locations.length);
  const limbs = new THREE.InstancedMesh(new THREE.CylinderGeometry(.25, 1, 1, 6), bark, locations.length * 5);
  trunk.name = "tapered-tree-trunks";
  limbs.name = "tapered-tree-branches";
  const map = leafTexture();
  const foliage = new THREE.MeshStandardMaterial({
    map, alphaTest: .43, side: THREE.DoubleSide, roughness: .95,
    color: 0xffffff,
  });
  const cardsPerTree = clusterOffsets.length * 3;
  const crowns = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), foliage, locations.length * cardsPerTree);
  crowns.name = "layered-leaf-clusters";

  const transform = new THREE.Object3D();
  const start = new THREE.Vector3(), end = new THREE.Vector3(), direction = new THREE.Vector3(), axis = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0);
  const green = new THREE.Color(), barkColor = new THREE.Color();
  for (const [index, { x, z, ground = .045, height, spread }] of locations.entries()) {
    transform.rotation.set(0, .47 * index, .028 * Math.sin(index * 1.97));
    transform.position.set(x, ground + height * .365, z);
    transform.scale.set(height * .027, height * .76, height * .026);
    transform.updateMatrix();
    trunk.setMatrixAt(index, transform.matrix);
    trunk.setColorAt(index, barkColor.setHSL(.084 + index % 4 * .01, .13, .36 + index % 7 * .022));
    const spin = index * 2.399963;
    for (let branch = 0; branch < 5; branch++) {
      const angle = spin + branch * Math.PI * .4;
      start.set(x, ground + height * (.39 + branch * .032), z);
      end.set(x + Math.cos(angle) * spread * .37, ground + height * (.68 + branch % 3 * .057), z + Math.sin(angle) * spread * .38);
      direction.subVectors(end, start);
      transform.position.copy(start).addScaledVector(direction, .5);
      transform.quaternion.setFromUnitVectors(up, axis.copy(direction).normalize());
      transform.scale.set(height * .0115, direction.length(), height * .0115);
      transform.updateMatrix();
      limbs.setMatrixAt(index * 5 + branch, transform.matrix);
      limbs.setColorAt(index * 5 + branch, barkColor);
    }

    for (const [clump, [cx, cy, cz, size]] of clusterOffsets.entries()) {
      const ox = cx * Math.cos(spin) - cz * Math.sin(spin);
      const oz = cx * Math.sin(spin) + cz * Math.cos(spin);
      const patchSize = size * spread * (.89 + (index % 4) * .043);
      green.setHSL(.244 + index % 5 * .011, .22 + clump % 2 * .12, .53 + (clump % 4) * .047);
      for (let plane = 0; plane < 3; plane++) {
        const id = index * cardsPerTree + clump * 3 + plane;
        transform.position.set(x + ox * spread, ground + cy * height, z + oz * spread);
        transform.rotation.set(plane === 2 ? -1.13 : -.14 + clump % 3 * .13,
          spin + plane * Math.PI / 2 + clump * .4, clump * .92);
        transform.scale.set(patchSize, patchSize * (.78 + index % 3 * .08), 1);
        transform.updateMatrix();
        crowns.setMatrixAt(id, transform.matrix);
        crowns.setColorAt(id, green);
      }
    }
  }
  for (const mesh of [trunk, limbs, crowns]) {
    mesh.instanceMatrix.needsUpdate = true;
    mesh.castShadow = true;
    group.add(mesh);
  }
  return { group, map };
}
