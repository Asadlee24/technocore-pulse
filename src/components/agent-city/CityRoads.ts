import * as THREE from "three";
import type { RoadWaypoints } from "./cityLayout";

/** Decorative street life, never a count of agents or protocol transactions. */
export class CityRoads {
  readonly group = new THREE.Group();
  private cars: THREE.InstancedMesh;
  private roofs: THREE.InstancedMesh;
  private lamps: THREE.InstancedMesh;
  private people: THREE.InstancedMesh;
  private heads: THREE.InstancedMesh;
  private legs: THREE.InstancedMesh;
  constructor(_waypoints: RoadWaypoints, theme: "dark" | "light" = "dark") {
    this.group.name = "walkable-city-blocks";
    this.group.userData.isScenery = true;
    const road = new THREE.MeshStandardMaterial({
      color: theme === "light" ? 0x56616d : 0x243343,
      roughness: 0.95,
    });
    const pavement = new THREE.MeshStandardMaterial({
      color: 0x778795,
      roughness: 0.88,
    });
    const paint = new THREE.MeshBasicMaterial({ color: 0xb3b9b8 });
    const add = (
      geo: THREE.BufferGeometry,
      mat: THREE.Material,
      x: number,
      y: number,
      z: number,
    ) => {
      const m = new THREE.Mesh(geo, mat);
      m.position.set(x, y, z);
      m.receiveShadow = true;
      this.group.add(m);
      return m;
    };
    const axes = [-49, -35, -21, -7, 7, 21, 35, 49];
    for (const axis of axes) {
      add(new THREE.BoxGeometry(3.2, 0.035, 102), road, axis, 0.015, 0);
      add(new THREE.BoxGeometry(102, 0.035, 3.2), road, 0, 0.016, axis);
      for (const side of [-1, 1]) {
        add(
          new THREE.BoxGeometry(0.65, 0.12, 102),
          pavement,
          axis + side * 2,
          0.06,
          0,
        );
        add(
          new THREE.BoxGeometry(102, 0.12, 0.65),
          pavement,
          0,
          0.061,
          axis + side * 2,
        );
      }
      for (let p = -48; p <= 48; p += 4) {
        add(new THREE.BoxGeometry(0.055, 0.018, 0.65), paint, axis, 0.05, p);
        add(new THREE.BoxGeometry(0.65, 0.018, 0.055), paint, p, 0.051, axis);
      }
    }
    // Crosswalks and traffic lights make intersections legible from street level.
    const poleMat = new THREE.MeshStandardMaterial({
      color: 0x263747,
      roughness: 0.6,
    });
    const poleGeo = new THREE.CylinderGeometry(0.035, 0.045, 1.9, 6);
    for (const x of axes)
      for (const z of axes) {
        for (let stripe = 0; stripe < 5; stripe++) {
          add(
            new THREE.BoxGeometry(0.2, 0.02, 2.8),
            paint,
            x + (stripe - 2) * 0.4,
            0.075,
            z + 2.5,
          );
          add(
            new THREE.BoxGeometry(2.8, 0.02, 0.2),
            paint,
            x + 2.5,
            0.076,
            z + (stripe - 2) * 0.4,
          );
        }
        if (Math.abs(x) < 45 && Math.abs(z) < 45) {
          add(poleGeo, poleMat, x + 2.2, 0.95, z + 2.2);
          add(
            new THREE.BoxGeometry(0.14, 0.38, 0.15),
            poleMat,
            x + 2.2,
            1.85,
            z + 2.2,
          );
        }
      }
    this.cars = new THREE.InstancedMesh(
      new THREE.BoxGeometry(1.2, 0.35, 0.55),
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.48,
        metalness: 0.22,
      }),
      64,
    );
    this.roofs = new THREE.InstancedMesh(
      new THREE.BoxGeometry(0.58, 0.18, 0.48),
      new THREE.MeshStandardMaterial({
        color: 0x2a495f,
        roughness: 0.3,
        metalness: 0.4,
      }),
      64,
    );
    this.lamps = new THREE.InstancedMesh(
      new THREE.BoxGeometry(0.035, 0.06, 0.44),
      new THREE.MeshBasicMaterial({ color: 0xf5edda }),
      64,
    );
    this.people = new THREE.InstancedMesh(
      new THREE.CylinderGeometry(0.11, 0.14, 0.38, 6),
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85 }),
      144,
    );
    this.heads = new THREE.InstancedMesh(
      new THREE.SphereGeometry(0.105, 6, 5),
      new THREE.MeshStandardMaterial({ color: 0xbba98f, roughness: 0.9 }),
      144,
    );
    this.legs = new THREE.InstancedMesh(
      new THREE.BoxGeometry(0.065, 0.26, 0.075),
      new THREE.MeshStandardMaterial({ color: 0x233444, roughness: 0.85 }),
      288,
    );
    const cars = [0xb9c6ce, 0x587b8e, 0xaaa389, 0x2a4f69, 0xc1b6a5, 0x78939a];
    const clothes = [
      0x87a5ad, 0x587786, 0xb2aca0, 0x284b64, 0x8b937d, 0xb48f6e,
    ];
    for (let i = 0; i < 64; i++)
      this.cars.setColorAt(i, new THREE.Color(cars[i % cars.length]));
    for (let i = 0; i < 144; i++)
      this.people.setColorAt(i, new THREE.Color(clothes[i % clothes.length]));
    this.cars.castShadow = true;
    this.people.castShadow = true;
    this.heads.castShadow = true;
    this.group.add(
      this.cars,
      this.roofs,
      this.lamps,
      this.people,
      this.heads,
      this.legs,
    );
    // Pavement cafe furniture is scenery and uses no invented network metrics.
    const tabletop = new THREE.CylinderGeometry(0.37, 0.37, 0.07, 12),
      tableleg = new THREE.CylinderGeometry(0.035, 0.045, 0.6, 6);
    const wood = new THREE.MeshStandardMaterial({
      color: 0x948b77,
      roughness: 0.85,
    });
    for (let i = 0; i < 20; i++) {
      const x = ((i % 5) - 2) * 14 + 4.7,
        z = (Math.floor(i / 5) - 1.5) * 14;
      add(tabletop, wood, x, 0.68, z);
      add(tableleg, poleMat, x, 0.35, z);
      for (const side of [-1, 1])
        add(
          new THREE.BoxGeometry(0.32, 0.08, 0.32),
          wood,
          x,
          0.4,
          z + side * 0.65,
        );
    }
    this.update(0);
  }
  private block(index: number) {
    let i = index % 48;
    for (let z = -3; z <= 3; z++)
      for (let x = -3; x <= 3; x++) {
        if (x === 0 && z === 0) continue;
        if (i-- === 0) return [x * 14, z * 14];
      }
    return [0, 0];
  }
  private route(t: number, half: number) {
    const side = ((t % 4) + 4) % 4;
    if (side < 1) return { x: -half + side * half * 2, z: -half, dx: 1, dz: 0 };
    if (side < 2)
      return { x: half, z: -half + (side - 1) * half * 2, dx: 0, dz: 1 };
    if (side < 3)
      return { x: half - (side - 2) * half * 2, z: half, dx: -1, dz: 0 };
    return { x: -half, z: half - (side - 3) * half * 2, dx: 0, dz: -1 };
  }
  update(time: number) {
    const obj = new THREE.Object3D();
    for (let i = 0; i < 64; i++) {
      const [bx, bz] = this.block(i * 7),
        p = this.route(i * 0.71 + time * (0.085 + (i % 3) * 0.012), 6.55);
      const yaw = Math.atan2(-p.dz, p.dx),
        bus = i % 11 === 0;
      obj.rotation.set(0, yaw, 0);
      obj.scale.set(bus ? 2 : 1, bus ? 1.5 : 1, 1);
      obj.position.set(bx + p.x, 0.25, bz + p.z);
      obj.updateMatrix();
      this.cars.setMatrixAt(i, obj.matrix);
      obj.scale.set(bus ? 2.3 : 1, 1, 1);
      obj.position.y = bus ? 0.57 : 0.5;
      obj.updateMatrix();
      this.roofs.setMatrixAt(i, obj.matrix);
      obj.scale.set(1, 1, 1);
      obj.position.set(
        bx + p.x + p.dx * (bus ? 1.22 : 0.61),
        0.3,
        bz + p.z + p.dz * (bus ? 1.22 : 0.61),
      );
      obj.updateMatrix();
      this.lamps.setMatrixAt(i, obj.matrix);
    }
    for (let i = 0; i < 144; i++) {
      const [bx, bz] = this.block(i),
        p = this.route(i * 0.137 + time * (0.025 + (i % 5) * 0.003), 5.05),
        x = bx + p.x,
        z = bz + p.z,
        yaw = Math.atan2(-p.dz, p.dx);
      obj.scale.set(1, 1, 1);
      obj.rotation.set(0, yaw, 0);
      obj.position.set(x, 0.52, z);
      obj.updateMatrix();
      this.people.setMatrixAt(i, obj.matrix);
      obj.position.y = 0.82;
      obj.updateMatrix();
      this.heads.setMatrixAt(i, obj.matrix);
      for (const side of [-1, 1]) {
        obj.position.set(
          x + p.dz * side * 0.065,
          0.22,
          z - p.dx * side * 0.065,
        );
        obj.rotation.set(0, yaw, Math.sin(time * 6 + i) * side * 0.28);
        obj.updateMatrix();
        this.legs.setMatrixAt(i * 2 + (side === 1 ? 1 : 0), obj.matrix);
      }
    }
    for (const mesh of [
      this.cars,
      this.roofs,
      this.lamps,
      this.people,
      this.heads,
      this.legs,
    ])
      mesh.instanceMatrix.needsUpdate = true;
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
