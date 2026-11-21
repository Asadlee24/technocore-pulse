import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { streetVehiclePose } from "./streetMotion.js";

type Section = [length: number, halfWidth: number, sill: number, shoulder: number, crown: number];

function shapedPanel(sections: Section[]) {
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  for (const [x, width, sill, shoulder, crown] of sections) {
    positions.push(
      x, sill, -width * .77, x, sill + .06, -width,
      x, shoulder, -width, x, crown, -width * .77,
      x, crown, width * .77, x, shoulder, width,
      x, sill + .06, width, x, sill, width * .77,
    );
    for (let corner = 0; corner < 8; corner++) uvs.push(x * .36 + .5, corner / 7);
  }
  for (let row = 0; row < sections.length - 1; row++) {
    for (let corner = 0; corner < 8; corner++) {
      const a = row * 8 + corner;
      const next = row * 8 + (corner + 1) % 8;
      indices.push(a, next, next + 8, a, next + 8, a + 8);
    }
  }
  const last = (sections.length - 1) * 8;
  for (let i = 1; i < 7; i++) indices.push(0, i + 1, i, last, last + i, last + i + 1);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function join(parts: THREE.BufferGeometry[]) {
  const geometry = mergeGeometries(parts)!;
  parts.forEach(part => part.dispose());
  return geometry;
}

function pairedBox(x: number, y: number, z: number, width: number, height: number, depth: number) {
  return join([-1, 1].map(side => new THREE.BoxGeometry(width, height, depth).translate(x, y, z * side)));
}

export class StreetTraffic {
  readonly group = new THREE.Group();
  private panels: THREE.InstancedMesh[];
  private transform = new THREE.Object3D();
  private readonly count = 64;

  constructor() {
    const standard = (color: number, roughness: number, metalness = 0) =>
      new THREE.MeshStandardMaterial({ color, roughness, metalness });
    const batch = (name: string, geometry: THREE.BufferGeometry, material: THREE.Material) => {
      const mesh = new THREE.InstancedMesh(geometry, material, this.count);
      mesh.name = name;
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      mesh.frustumCulled = false;
      this.group.add(mesh);
      return mesh;
    };

    const lowerBody = shapedPanel([
      [-1.34, .39, .26, .42, .49], [-1.23, .48, .18, .50, .57],
      [-1.02, .5, .23, .51, .60], [-.95, .5, .411, .51, .60],
      [-.64, .5, .411, .52, .61], [-.57, .5, .18, .52, .61],
      [.57, .5, .18, .51, .61], [.64, .5, .411, .51, .60],
      [.95, .5, .411, .48, .56], [1.02, .5, .23, .46, .54],
      [1.25, .46, .19, .39, .48], [1.34, .37, .24, .37, .43],
    ]);
    const roof = shapedPanel([
      [-.62, .41, .595, .64, .65], [-.43, .40, .61, .80, .85],
      [-.24, .40, .61, .86, .91], [.23, .40, .61, .85, .90],
      [.46, .43, .60, .70, .73], [.62, .45, .585, .60, .613],
    ]);
    const paintedRoof = new THREE.BoxGeometry(.48, .025, .63).translate(-.019, .913, 0);
    const paint = batch("vehicle-painted-body", join([lowerBody, paintedRoof]), new THREE.MeshPhysicalMaterial({
      color: 0xffffff, roughness: .34, metalness: .27, clearcoat: .66, clearcoatRoughness: .25,
    }));
    paint.castShadow = true;
    const windows = batch("vehicle-windshields", roof, standard(0x2c3a43, .21, .46));
    const smallTrim = join([
      new THREE.BoxGeometry(.08, .11, .45).translate(1.318, .321, 0),
      new THREE.BoxGeometry(.09, .078, .56).translate(-1.316, .308, 0),
      pairedBox(.34, .65, .473, .1, .055, .16),
      pairedBox(-.018, .735, .365, .055, .245, .025),
      pairedBox(-.3, .527, .493, .10, .019, .018),
      pairedBox(.24, .527, .493, .10, .019, .018),
    ]);
    const trim = batch("vehicle-trim", smallTrim, standard(0x202528, .62));
    const tires: THREE.BufferGeometry[] = [], hubs: THREE.BufferGeometry[] = [];
    for (const axle of [-.79, .80]) for (const side of [-1, 1]) {
      tires.push(new THREE.CylinderGeometry(.207, .207, .137, 14).rotateX(Math.PI / 2).translate(axle, .207, .465 * side));
      hubs.push(new THREE.CylinderGeometry(.118, .118, .026, 12).rotateX(Math.PI / 2).translate(axle, .207, .533 * side));
    }
    const wheels = batch("vehicle-tires", join(tires), standard(0x171819, .92));
    const rims = batch("vehicle-rims", join(hubs), standard(0x969a9e, .39, .71));
    const headlamps = batch("vehicle-headlights", pairedBox(1.296, .408, .321, .075, .058, .205),
      new THREE.MeshStandardMaterial({ color: 0xdfdfd4, emissive: 0xbec8d4, emissiveIntensity: .84, roughness: .27 }));
    const tailLights = batch("vehicle-tail-lights", pairedBox(-1.284, .488, .326, .089, .068, .253),
      new THREE.MeshStandardMaterial({ color: 0x932b23, emissive: 0x9d2019, emissiveIntensity: 1.35, roughness: .31 }));
    this.panels = [paint, windows, trim, wheels, rims, headlamps, tailLights];

    const colors = [0xbdc4c5, 0x4f6370, 0x9b783e, 0x343b45, 0x8b3e37, 0x667978, 0xe1e1d9];
    for (let i = 0; i < this.count; i++) paint.setColorAt(i, new THREE.Color(colors[i % colors.length]));
  }

  update(time: number, block: (index: number) => readonly [number, number]) {
    const car = this.transform;
    for (let i = 0; i < this.count; i++) {
      const [x, z] = block(i * 17);
      const pose = streetVehiclePose(time, i);
      car.position.set(x + pose.x, .035, z + pose.z);
      car.rotation.set(0, Math.atan2(-pose.dz, pose.dx), 0);
      // Keep the longer silhouette while fitting the two opposing lanes.
      car.scale.set(1.33 + i % 5 * .052, 1.17 + i % 4 * .087, 1.02 + i % 3 * .056);
      car.updateMatrix();
      for (const panel of this.panels) panel.setMatrixAt(i, car.matrix);
    }
    for (const panel of this.panels) panel.instanceMatrix.needsUpdate = true;
  }
}
