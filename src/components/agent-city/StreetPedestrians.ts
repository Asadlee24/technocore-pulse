import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { roundedBlockPose } from "./streetMotion.js";
import { QUAY_WALK } from "./cityLayout.js";

const COUNT = 112;
const sidewalkHeight = .13;

export class StreetPedestrians {
  readonly group = new THREE.Group();
  private torso: THREE.InstancedMesh;
  private head: THREE.InstancedMesh;
  private hair: THREE.InstancedMesh;
  private sleeve: THREE.InstancedMesh;
  private hand: THREE.InstancedMesh;
  private thigh: THREE.InstancedMesh;
  private shin: THREE.InstancedMesh;
  private shoe: THREE.InstancedMesh;
  private batches: THREE.InstancedMesh[];
  private root = new THREE.Object3D();
  private joint = new THREE.Object3D();
  private matrix = new THREE.Matrix4();
  private knee = new THREE.Matrix4();

  constructor() {
    this.group.name = "sidewalk-pedestrians";
    const batch = (name: string, geometry: THREE.BufferGeometry, count = COUNT) => {
      const mesh = new THREE.InstancedMesh(geometry, new THREE.MeshStandardMaterial({ roughness: .9 }), count);
      mesh.name = name;
      mesh.frustumCulled = false;
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      this.group.add(mesh);
      return mesh;
    };
    const head = new THREE.SphereGeometry(1, 12, 9).scale(.094, .12, .101).translate(0, 1.53, .01);
    const nose = new THREE.SphereGeometry(1, 8, 6).scale(.025, .033, .031).translate(0, 1.52, .104);
    const neck = new THREE.CylinderGeometry(.043, .048, .10, 9).translate(0, 1.40, .013);
    this.head = batch("pedestrian-heads", mergeGeometries([head, nose, neck])!);
    [head, nose, neck].forEach(geometry => geometry.dispose());
    this.hair = batch("pedestrian-hair", new THREE.SphereGeometry(1, 12, 8, 0, 2 * Math.PI, 0, Math.PI * .54)
      .scale(.098, .122, .106).translate(0, 1.55, -.007));
    this.torso = batch("pedestrian-jackets", new RoundedBoxGeometry(.329, .558, .195, 1, .075).translate(0, 1.078, 0));
    this.sleeve = batch("pedestrian-sleeves", new THREE.CapsuleGeometry(.05, .345, 3, 8).translate(0, -.196, 0), COUNT * 2);
    this.hand = batch("pedestrian-hands", new THREE.SphereGeometry(1, 8, 6).scale(.038, .061, .033).translate(0, -.419, .008), COUNT * 2);
    this.thigh = batch("pedestrian-thighs", new THREE.CylinderGeometry(.075, .054, .374, 9).translate(0, -.163, 0), COUNT * 2);
    this.shin = batch("pedestrian-shins", new THREE.CylinderGeometry(.057, .037, .354, 9).translate(0, -.162, 0), COUNT * 2);
    this.shoe = batch("pedestrian-shoes", new RoundedBoxGeometry(.097, .071, .197, 1, .019).translate(0, -.389, .053), COUNT * 2);
    this.batches = [this.torso, this.head, this.hair, this.sleeve, this.hand, this.thigh, this.shin, this.shoe];
    this.torso.castShadow = true;
    this.thigh.castShadow = true;
    this.shin.castShadow = true;

    const skin = [0xb07b58, 0xd6a782, 0x895c48, 0xb99277, 0xe1b89c, 0x674438];
    const hair = [0x292526, 0x372821, 0x5c4733, 0x987c58, 0x50453f];
    const coats = [0xa5a69b, 0x465c65, 0x8c5547, 0x334246, 0x5c6554, 0x807969, 0x3d5266];
    for (let i = 0; i < COUNT; i++) {
      const face = new THREE.Color(skin[i % skin.length]);
      const coat = new THREE.Color(coats[i % coats.length]);
      const trousers = new THREE.Color(i % 5 === 0 ? 0x766c5f : i % 4 === 0 ? 0x4d5966 : 0x333639);
      this.head.setColorAt(i, face);
      this.hair.setColorAt(i, new THREE.Color(hair[i % hair.length]));
      this.torso.setColorAt(i, coat);
      for (let side = 0; side < 2; side++) {
        const id = i * 2 + side;
        this.sleeve.setColorAt(id, coat);
        this.hand.setColorAt(id, face);
        this.thigh.setColorAt(id, trousers);
        this.shin.setColorAt(id, trousers);
        this.shoe.setColorAt(id, new THREE.Color(i % 3 === 0 ? 0xb9b2a6 : 0x302d29));
      }
    }
  }

  update(time: number, block: (index: number) => readonly [number, number]) {
    const { root, joint, matrix, knee } = this;
    for (let i = 0; i < COUNT; i++) {
      const stride = .85 + i % 5 * .105;
      const [x, z] = i < 96 ? block(i) : [0, QUAY_WALK.z];
      const angle = (i - 96) * Math.PI / 8 + time * stride / 75;
      const onBoardwalk = i >= 96;
      const pose = onBoardwalk
        ? { x: Math.sin(angle) * 75, z: Math.cos(angle) * .68, dx: Math.cos(angle) * 75, dz: -Math.sin(angle) * .68 }
        : roundedBlockPose(i * 4.735 + time * stride, 6.05 + i % 2 * .19, .66);
      const phase = time * stride * 6.6 + i * .83;
      const gait = Math.sin(phase) * .35 * (onBoardwalk ? Math.abs(Math.cos(angle)) : 1);
      root.position.set(x + pose.x, (onBoardwalk ? .21 : sidewalkHeight) + .023 * Math.abs(Math.cos(phase)), z + pose.z);
      root.rotation.set(0, Math.atan2(pose.dx, pose.dz), 0);
      root.scale.set(.87 + i % 4 * .081, .94 + i % 7 * .023, .91 + i % 3 * .054);
      root.updateMatrix();
      this.torso.setMatrixAt(i, root.matrix);
      this.head.setMatrixAt(i, root.matrix);
      this.hair.setMatrixAt(i, root.matrix);
      for (const side of [-1, 1]) {
        const id = i * 2 + (side + 1) / 2;
        joint.position.set(side * .185, 1.31, 0);
        joint.rotation.set(gait * side * -.86, 0, side * .065);
        joint.updateMatrix();
        matrix.multiplyMatrices(root.matrix, joint.matrix);
        this.sleeve.setMatrixAt(id, matrix);
        this.hand.setMatrixAt(id, matrix);

        joint.position.set(side * .083, .776, 0);
        joint.rotation.set(gait * side, 0, 0);
        joint.updateMatrix();
        matrix.multiplyMatrices(root.matrix, joint.matrix);
        this.thigh.setMatrixAt(id, matrix);
        joint.position.set(0, -.346, 0);
        joint.rotation.x = -Math.max(0, gait * side) * 1.14 + .045;
        joint.updateMatrix();
        knee.multiplyMatrices(matrix, joint.matrix);
        this.shin.setMatrixAt(id, knee);
        this.shoe.setMatrixAt(id, knee);
      }
    }
    for (const batch of this.batches) batch.instanceMatrix.needsUpdate = true;
  }
}
