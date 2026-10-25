import * as THREE from "three";
import type { RoadWaypoints } from "./cityLayout";

/** Transport is decorative street life; it does not imply agent transactions. */
export class CityRoads {
  readonly group = new THREE.Group();
  private cars: THREE.InstancedMesh;
  private roofs: THREE.InstancedMesh;
  private lamps: THREE.InstancedMesh;
  private rings: number[];
  constructor(waypoints: RoadWaypoints, theme: "dark" | "light" = "dark") {
    this.group.name = "boulevards-and-street-life";
    this.group.userData.isScenery = true;
    this.rings = [
      waypoints.innerRingRadius,
      waypoints.outerRingRadius,
      waypoints.beltwayRadius,
      60,
    ];
    const asphalt = new THREE.MeshStandardMaterial({
      color: theme === "light" ? 0x5c6670 : 0x151d32,
      roughness: 0.95,
    });
    const marking = new THREE.MeshBasicMaterial({ color: 0x98a9ba });
    const curb = new THREE.MeshStandardMaterial({
      color: 0x8093a7,
      roughness: 0.8,
    });
    const add = (geometry: THREE.BufferGeometry, material: THREE.Material) => {
      const m = new THREE.Mesh(geometry, material);
      m.rotation.x = -Math.PI / 2;
      m.receiveShadow = true;
      this.group.add(m);
      return m;
    };
    for (const radius of this.rings) {
      add(
        new THREE.RingGeometry(radius - 1.3, radius + 1.3, 128),
        asphalt,
      ).position.y = 0.025;
      for (const edge of [-1.35, 1.35])
        add(
          new THREE.RingGeometry(
            radius + edge - 0.05,
            radius + edge + 0.05,
            128,
          ),
          curb,
        ).position.y = 0.05;
      for (let i = 0; i < 80; i++) {
        const angle = (i / 80) * Math.PI * 2;
        const stripe = add(new THREE.PlaneGeometry(0.035, 0.5), marking);
        stripe.rotation.z = -angle;
        stripe.position.set(
          Math.cos(angle) * radius,
          0.045,
          Math.sin(angle) * radius,
        );
      }
    }
    for (const avenue of waypoints.radialAvenues) {
      const length = avenue.endRadius - avenue.startRadius,
        mid = (avenue.endRadius + avenue.startRadius) / 2;
      const road = add(new THREE.PlaneGeometry(2.4, length), asphalt);
      road.rotation.z = -avenue.angle - Math.PI / 2;
      road.position.set(
        Math.cos(avenue.angle) * mid,
        0.03,
        Math.sin(avenue.angle) * mid,
      );
      // Pedestrian crossings sit at ring intersections, rather than decorative data flyovers.
      for (const radius of this.rings.slice(0, 3))
        for (let i = 0; i < 6; i++) {
          const offset = (i - 2.5) * 0.3;
          const stripe = add(new THREE.PlaneGeometry(0.16, 2.2), marking);
          stripe.rotation.z = -avenue.angle - Math.PI / 2;
          stripe.position.set(
            Math.cos(avenue.angle) * radius +
              Math.cos(avenue.angle + Math.PI / 2) * offset,
            0.06,
            Math.sin(avenue.angle) * radius +
              Math.sin(avenue.angle + Math.PI / 2) * offset,
          );
        }
    }
    this.cars = new THREE.InstancedMesh(
      new THREE.BoxGeometry(0.9, 0.27, 0.42),
      new THREE.MeshStandardMaterial({
        color: 0xe1e9f0,
        roughness: 0.4,
        metalness: 0.3,
      }),
      32,
    );
    this.roofs = new THREE.InstancedMesh(
      new THREE.BoxGeometry(0.45, 0.16, 0.35),
      new THREE.MeshStandardMaterial({
        color: 0x253e59,
        roughness: 0.2,
        metalness: 0.65,
      }),
      32,
    );
    this.lamps = new THREE.InstancedMesh(
      new THREE.BoxGeometry(0.025, 0.045, 0.3),
      new THREE.MeshBasicMaterial({ color: 0xf5f7fa, toneMapped: false }),
      32,
    );
    this.cars.castShadow = true;
    this.group.add(this.cars, this.roofs, this.lamps);
    this.update(0);
  }
  update(time: number) {
    const obj = new THREE.Object3D();
    for (let i = 0; i < 32; i++) {
      const direction = i % 2 ? 1 : -1,
        radius = this.rings[i % 4] + direction * 0.55,
        angle = i * 2.39996 + time * (0.038 + (i % 3) * 0.008) * direction;
      const x = Math.cos(angle) * radius,
        z = Math.sin(angle) * radius,
        yaw = -angle + Math.PI / 2;
      obj.rotation.set(0, yaw, 0);
      obj.position.set(x, 0.24, z);
      obj.updateMatrix();
      this.cars.setMatrixAt(i, obj.matrix);
      obj.position.y = 0.44;
      obj.updateMatrix();
      this.roofs.setMatrixAt(i, obj.matrix);
      obj.position.set(
        x + Math.cos(angle + Math.PI / 2) * 0.45,
        0.27,
        z + Math.sin(angle + Math.PI / 2) * 0.45,
      );
      obj.updateMatrix();
      this.lamps.setMatrixAt(i, obj.matrix);
    }
    this.cars.instanceMatrix.needsUpdate = true;
    this.roofs.instanceMatrix.needsUpdate = true;
    this.lamps.instanceMatrix.needsUpdate = true;
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
