import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { streetVehiclePose } from "./streetMotion.js";
import type { RoadWaypoints } from "./cityLayout";

/** Decorative street life, never a count of agents or protocol transactions. */
export class CityRoads {
  readonly group = new THREE.Group();
  private cars: THREE.InstancedMesh;
  private roofs: THREE.InstancedMesh;
  private lamps: THREE.InstancedMesh;
  private tailLights: THREE.InstancedMesh;
  private transform = new THREE.Object3D();
  private wheels: THREE.InstancedMesh;
  private people: THREE.InstancedMesh;
  private heads: THREE.InstancedMesh;
  private legs: THREE.InstancedMesh;
  constructor(_waypoints: RoadWaypoints, theme: "dark" | "light" = "dark") {
    this.group.name = "walkable-city-blocks";
    this.group.userData.isScenery = true;
    const road = new THREE.MeshStandardMaterial({
      color: theme === "light" ? 0x3d454b : 0x1b2026,
      roughness: 0.98,
    });
    const pavement = new THREE.MeshStandardMaterial({
      color: 0x424952,
      roughness: 0.88,
    });
    const curb = new THREE.MeshStandardMaterial({ color: 0xa2a4a0, roughness: .95 });
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
    const axes = [-63, -45, -27, -9, 9, 27, 45, 63];
    for (const axis of axes) {
      add(new THREE.BoxGeometry(4.6, 0.035, 132), road, axis, 0.015, 0);
      add(new THREE.BoxGeometry(132, 0.035, 4.6), road, 0, 0.016, axis);
      for (const side of [-1, 1]) for (let block = -54; block <= 54; block += 18) {
        // Sidewalks stop at junctions instead of running through traffic lanes.
        add(new THREE.BoxGeometry(1.1,.12,13.2),pavement,axis+side*2.9,.06,block);
        add(new THREE.BoxGeometry(13.2,.12,1.1),pavement,block,.061,axis+side*2.9);
        add(new THREE.BoxGeometry(.14,.19,13.2),curb,axis+side*2.38,.095,block);
        add(new THREE.BoxGeometry(13.2,.19,.14),curb,block,.096,axis+side*2.38);
      }
      for (let p = -64; p <= 64; p += 4) {
        if (axes.some(cross => Math.abs(cross - p) < 3.3)) continue;
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
            z + 3.1,
          );
          add(
            new THREE.BoxGeometry(2.8, 0.02, 0.2),
            paint,
            x + 3.1,
            0.076,
            z + (stripe - 2) * 0.4,
          );
        }
        if (Math.abs(x) < 63 && Math.abs(z) < 63) {
          add(poleGeo, poleMat, x + 2.8, 0.95, z + 2.8);
          add(
            new THREE.BoxGeometry(0.14, 0.38, 0.15),
            poleMat,
            x + 2.8,
            1.85,
            z + 2.8,
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
    this.tailLights = new THREE.InstancedMesh(
      new THREE.BoxGeometry(.035, .065, .43),
      new THREE.MeshBasicMaterial({color: 0xdc5b44, toneMapped: false}), 64);
    this.tailLights.name = "vehicle-tail-lights";
    this.wheels = new THREE.InstancedMesh(
      new THREE.CylinderGeometry(.13, .13, .09, 10).rotateX(Math.PI / 2),
      new THREE.MeshStandardMaterial({color: 0x090b10, roughness: .9}),
      256,
    );
    this.wheels.name = "vehicle-wheels";
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
      this.wheels,
      this.tailLights,
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
      const x = ((i % 5) - 2) * 18 + 6.1,
        z = (Math.floor(i / 5) - 1.5) * 18;
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
    // Kerbside drains, bollards and modest bus shelters put detail at pedestrian scale.
    const metal = new THREE.MeshStandardMaterial({color: 0x303b40, roughness: .65, metalness: .45});
    const shelterGlass = new THREE.MeshStandardMaterial({color: 0x69878a, roughness: .2, metalness: .35});
    for (let i = 0; i < 48; i++) {
      const [bx, bz] = this.block(i);
      for (const side of [-1, 1]) {
        add(new THREE.CylinderGeometry(.055,.075,.58,6), metal, bx+side*5.7,.42,bz+5.6);
        const drain = add(new THREE.BoxGeometry(.5,.025,.24),metal,bx+side*6.5,.14,bz+6.65);
        drain.rotation.y = Math.PI / 2;
        for (let groove=0; groove<4; groove++) add(new THREE.BoxGeometry(.025,.03,.18),curb,bx+side*6.5+(groove-1.5)*.1,.16,bz+6.65);
      }
      if (i % 8 === 2) {
        add(new THREE.BoxGeometry(3,.14,1.2),metal,bx+1,.15,bz+5.9);
        add(new THREE.BoxGeometry(3.1,.12,1.3),metal,bx+1,2.2,bz+5.9);
        add(new THREE.BoxGeometry(2.9,1.8,.05),shelterGlass,bx+1,1.2,bz+5.35);
        for (const dx of [-1.4,1.4]) add(new THREE.BoxGeometry(.065,2,.065),metal,bx+1+dx,1.2,bz+6.4);
        add(new THREE.BoxGeometry(2.2,.14,.38),pavement,bx+1,.65,bz+5.7);
        add(new THREE.CylinderGeometry(.035,.035,2.6,6),metal,bx-1.1,1.4,bz+6.1);
        add(new THREE.BoxGeometry(.38,.48,.055),new THREE.MeshStandardMaterial({color:0x407c83,roughness:.7}),bx-1.1,2.4,bz+6.1);
      }
    }
    // One draw per static material instead of one per stripe, curb or street prop.
    const batches = new Map<THREE.Material, THREE.Mesh[]>();
    for (const child of this.group.children) {
      if (!(child instanceof THREE.Mesh) || child instanceof THREE.InstancedMesh || Array.isArray(child.material)) continue;
      const batch = batches.get(child.material) ?? []; batch.push(child); batches.set(child.material,batch);
    }
    for (const [material, meshes] of batches) {
      if (meshes.length < 2) continue;
      const parts = meshes.map(mesh => { mesh.updateMatrix(); const g=mesh.geometry.toNonIndexed(); return g.applyMatrix4(mesh.matrix); });
      const geometry = mergeGeometries(parts,false); parts.forEach(part=>part.dispose());
      if (!geometry) continue;
      const old = new Set(meshes.map(mesh=>mesh.geometry));
      meshes.forEach(mesh=>this.group.remove(mesh)); old.forEach(g=>g.dispose());
      const mesh = new THREE.Mesh(geometry,material); mesh.name="batched-streetscape"; mesh.receiveShadow=true; this.group.add(mesh);
    }
    this.update(0);
  }
  private block(index: number) {
    let i = index % 48;
    for (let z = -3; z <= 3; z++)
      for (let x = -3; x <= 3; x++) {
        if (x === 0 && z === 0) continue;
        if (i-- === 0) return [x * 18, z * 18];
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
    const obj = this.transform;
    for (let i = 0; i < 64; i++) {
      const [bx, bz] = this.block(i * 7),
        p = streetVehiclePose(time, i);
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
      obj.position.set(bx+p.x-p.dx*(bus?1.22:.61),.3,bz+p.z-p.dz*(bus?1.22:.61));
      obj.updateMatrix(); this.tailLights.setMatrixAt(i,obj.matrix);
      for (let axle = 0; axle < 2; axle++) for (let side = 0; side < 2; side++) {
        const along = (axle === 0 ? -1 : 1) * (bus ? .85 : .38);
        const across = (side === 0 ? -1 : 1) * .28;
        obj.position.set(bx + p.x + p.dx * along - p.dz * across, .14,
          bz + p.z + p.dz * along + p.dx * across);
        obj.rotation.set(0, yaw, 0);
        obj.updateMatrix();
        this.wheels.setMatrixAt(i * 4 + axle * 2 + side, obj.matrix);
      }
    }
    for (let i = 0; i < 144; i++) {
      const [bx, bz] = this.block(i),
        p = this.route(i * 0.137 + time * (0.025 + (i % 5) * 0.003), 6.1),
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
      this.wheels,
      this.tailLights,
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
