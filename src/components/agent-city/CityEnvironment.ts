import * as THREE from "three";

/** Waterfront, gardens and light poles are architectural scenery, not telemetry. */
export class CityEnvironment {
  readonly group = new THREE.Group();
  private water: THREE.Mesh;
  constructor(theme: "dark" | "light" = "dark") {
    const light = theme === "light";
    this.group.name = "waterfront-city-landscape";
    this.group.userData.isScenery = true;
    const ground = new THREE.MeshStandardMaterial({
      color: light ? 0xb8c6d3 : 0x34465e,
      roughness: 0.88,
      metalness: 0.08,
    });
    const stone = new THREE.MeshStandardMaterial({
      color: light ? 0xe0e8ef : 0x8399ad,
      roughness: 0.8,
    });
    const navy = new THREE.MeshStandardMaterial({
      color: 0x0a1128,
      roughness: 0.7,
      metalness: 0.3,
    });
    const add = (
      geo: THREE.BufferGeometry,
      mat: THREE.Material,
      x: number,
      y: number,
      z: number,
    ) => {
      const obj = new THREE.Mesh(geo, mat);
      obj.position.set(x, y, z);
      obj.receiveShadow = true;
      this.group.add(obj);
      return obj;
    };
    add(new THREE.CylinderGeometry(67, 68, 2, 96), ground, 0, -1, 0);
    add(new THREE.CylinderGeometry(68.2, 68.2, 0.3, 96), navy, 0, -1.9, 0);
    for (const radius of [64.6, 66.6]) {
      const rail = add(
        new THREE.TorusGeometry(radius, 0.085, 6, 128),
        stone,
        0,
        0.1,
        0,
      );
      rail.rotation.x = Math.PI / 2;
    }
    this.water = add(
      new THREE.RingGeometry(68.3, 220, 128),
      new THREE.MeshStandardMaterial({
        color: light ? 0x5b90b3 : 0x102a49,
        roughness: 0.28,
        metalness: 0.55,
      }),
      0,
      -2.1,
      0,
    );
    this.water.rotation.x = -Math.PI / 2;
    const promenade = add(
      new THREE.RingGeometry(62.7, 66.5, 96),
      stone,
      0,
      0.015,
      0,
    );
    promenade.rotation.x = -Math.PI / 2;
    // Four clean arrival piers create a recognizable waterfront silhouette.
    for (let i = 0; i < 4; i++) {
      const angle = Math.PI / 4 + (i * Math.PI) / 2;
      const pier = add(
        new THREE.BoxGeometry(4, 0.45, 14),
        stone,
        Math.cos(angle) * 71,
        -0.5,
        Math.sin(angle) * 71,
      );
      pier.rotation.y = Math.PI / 2 - angle;
      for (const offset of [-1.7, 1.7]) {
        const edge = add(
          new THREE.BoxGeometry(0.07, 0.7, 13),
          navy,
          Math.cos(angle) * 71 + Math.cos(angle + Math.PI / 2) * offset,
          0.05,
          Math.sin(angle) * 71 + Math.sin(angle + Math.PI / 2) * offset,
        );
        edge.rotation.y = Math.PI / 2 - angle;
      }
    }
    const trunk = new THREE.MeshStandardMaterial({
      color: 0x52616d,
      roughness: 0.9,
    });
    const foliage = new THREE.MeshStandardMaterial({
      color: light ? 0x5f7b6d : 0x456858,
      roughness: 0.95,
    });
    const stemGeo = new THREE.CylinderGeometry(0.08, 0.1, 1.25, 6),
      canopyGeo = new THREE.IcosahedronGeometry(0.7, 1);
    const stems = new THREE.InstancedMesh(stemGeo, trunk, 64),
      canopies = new THREE.InstancedMesh(canopyGeo, foliage, 64);
    const dummy = new THREE.Object3D();
    for (let i = 0; i < 64; i++) {
      const angle = (i / 64) * Math.PI * 2,
        radius = i < 48 ? 63.5 : 11.5;
      const x = Math.cos(angle) * radius,
        z = Math.sin(angle) * radius;
      dummy.position.set(x, 0.65, z);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      stems.setMatrixAt(i, dummy.matrix);
      dummy.position.y = 1.75;
      dummy.scale.set(0.8, 1.25, 0.8);
      dummy.updateMatrix();
      canopies.setMatrixAt(i, dummy.matrix);
    }
    stems.castShadow = true;
    canopies.castShadow = true;
    stems.instanceMatrix.needsUpdate = true;
    canopies.instanceMatrix.needsUpdate = true;
    this.group.add(stems, canopies);
    const poleGeo = new THREE.CylinderGeometry(0.035, 0.05, 2.4, 6);
    const bulbGeo = new THREE.BoxGeometry(0.35, 0.045, 0.16);
    const glow = new THREE.MeshBasicMaterial({
      color: 0xe5f2fa,
      toneMapped: false,
    });
    for (let i = 0; i < 48; i++) {
      const angle = (i / 48) * Math.PI * 2,
        r = i % 2 ? 27 : 42;
      const x = Math.cos(angle) * r,
        z = Math.sin(angle) * r;
      add(poleGeo, navy, x, 1.2, z);
      add(bulbGeo, glow, x, 2.4, z);
    }
  }
  update(time: number) {
    this.water.position.y = -2.1 + Math.sin(time * 0.3) * 0.025;
  }
  dispose() {
    const geometries = new Set<THREE.BufferGeometry>(),
      materials = new Set<THREE.Material>();
    this.group.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        geometries.add(o.geometry);
        (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) =>
          materials.add(m),
        );
      }
    });
    geometries.forEach((g) => g.dispose());
    materials.forEach((m) => m.dispose());
  }
}
