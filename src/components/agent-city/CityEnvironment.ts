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
      color: light ? 0xb8c6d3 : 0x1b222b,
      roughness: 0.88,
      metalness: 0.08,
    });
    const stone = new THREE.MeshStandardMaterial({
      color: light ? 0xe0e8ef : 0x505963,
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
    // A grounded waterfront neighbourhood rather than a circular display plinth.
    add(new THREE.BoxGeometry(182, 2, 182), ground, 0, -1, 0);
    add(new THREE.BoxGeometry(184, .3, 184), navy, 0, -1.9, 0);
    for (const side of [-1, 1]) {
      add(new THREE.BoxGeometry(180, .08, 3.5), stone, 0, .04, side * 89);
      add(new THREE.BoxGeometry(3.5, .08, 180), stone, side * 89, .04, 0);
      add(new THREE.BoxGeometry(182, .5, .15), navy, 0, .35, side * 91);
      add(new THREE.BoxGeometry(.15, .5, 182), navy, side * 91, .35, 0);
    }
    this.water = add(
      new THREE.PlaneGeometry(5000, 5000),
      new THREE.MeshStandardMaterial({
        color: light ? 0x5b90b3 : 0x07141e,
        roughness: 0.28,
        metalness: 0.55,
      }),
      0,
      -2.1,
      0,
    );
    this.water.rotation.x = -Math.PI / 2;
    // Four clean arrival piers create a recognizable waterfront silhouette.
    for (let i = 0; i < 4; i++) {
      const angle = (i * Math.PI) / 2;
      const pier = add(
        new THREE.BoxGeometry(4, 0.45, 14),
        stone,
        Math.cos(angle) * 99,
        -0.5,
        Math.sin(angle) * 99,
      );
      pier.rotation.y = Math.PI / 2 - angle;
      for (const offset of [-1.7, 1.7]) {
        const edge = add(
          new THREE.BoxGeometry(0.07, 0.7, 13),
          navy,
          Math.cos(angle) * 99 + Math.cos(angle + Math.PI / 2) * offset,
          0.05,
          Math.sin(angle) * 99 + Math.sin(angle + Math.PI / 2) * offset,
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
    const stems = new THREE.InstancedMesh(stemGeo, trunk, 160),
      canopies = new THREE.InstancedMesh(canopyGeo, foliage, 160);
    const dummy = new THREE.Object3D();
    for (let i = 0; i < 160; i++) {
      const angle = (i / 64) * Math.PI * 2,
        radius = 6.5;
      const streetIndex = i - 64;
      const edge = Math.floor(i / 12) % 4;
      const along = ((i % 12) / 11 * 2 - 1) * 84;
      const perimeterX = edge === 0 ? along : edge === 1 ? 87 : edge === 2 ? -along : -87;
      const perimeterZ = edge === 0 ? -87 : edge === 1 ? along : edge === 2 ? 87 : -along;
      const x = i < 48 ? perimeterX : i < 64 ? Math.cos(angle) * radius : ((streetIndex % 7) - 3) * 18 + (streetIndex % 2 ? 6.2 : -6.2),
        z = i < 48 ? perimeterZ : i < 64 ? Math.sin(angle) * radius : ((Math.floor(streetIndex / 7) % 7) - 3) * 18 + (streetIndex % 3 - 1) * 3;
      dummy.position.set(x, 0.65, z);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      stems.setMatrixAt(i, dummy.matrix);
      dummy.position.y = 1.75;
      dummy.scale.set(1.2, 1.6, 1.2);
      dummy.updateMatrix();
      canopies.setMatrixAt(i, dummy.matrix);
    }
    stems.castShadow = true;
    canopies.castShadow = true;
    stems.instanceMatrix.needsUpdate = true;
    canopies.instanceMatrix.needsUpdate = true;
    this.group.add(stems, canopies);
    const lawn = new THREE.MeshStandardMaterial({color: light ? 0x4e775a : 0x284b39, roughness: 1});
    const bench = new THREE.MeshStandardMaterial({color: 0x8a7561, roughness: .9});
    for (const side of [-1, 1]) for (const other of [-1, 1]) {
      add(new THREE.BoxGeometry(15, .1, 25), lawn, side * 76, .08, other * 40);
      add(new THREE.BoxGeometry(1.6, .13, 25), stone, side * 76, .13, other * 40);
      for (let i = 0; i < 4; i++) {
        const z = other * 40 + (i - 1.5) * 5;
        add(new THREE.BoxGeometry(1.5, .15, .5), bench, side * 78, .55, z);
        add(new THREE.BoxGeometry(1.5, .7, .1), bench, side * 78, .8, z + .25);
      }
    }
    const poleGeo = new THREE.CylinderGeometry(0.035, 0.05, 2.4, 6);
    const bulbGeo = new THREE.BoxGeometry(0.35, 0.045, 0.16);
    const glow = new THREE.MeshBasicMaterial({
      color: 0xe5f2fa,
      toneMapped: false,
    });
    for (let i = 0; i < 48; i++) {
      const x = ((i % 8) - 3.5) * 18 + 3;
      const z = (Math.floor(i / 8) - 2.5) * 18 + 3;
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
