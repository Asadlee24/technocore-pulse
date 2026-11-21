import * as THREE from "three";
import type { CitySurfaces } from "./CitySurfaces";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { StreetTraffic } from "./StreetTraffic.js";
import { StreetPedestrians } from "./StreetPedestrians.js";
import { CITY_GRID, type RoadWaypoints } from "./cityLayout.js";

const BLOCK_CENTERS = CITY_GRID.streetZs.slice(0, -1).flatMap(z =>
  CITY_GRID.streetXs.slice(0, -1).map(x => [x + 9, z + 9] as const),
);

function findBlock(index: number) {
  return BLOCK_CENTERS[index % BLOCK_CENTERS.length];
}

/** Decorative street life, never a count of agents or protocol transactions. */
export class CityRoads {
  readonly group = new THREE.Group();
  private asphalt: THREE.MeshStandardMaterial;
  private traffic: StreetTraffic;
  private pedestrians: StreetPedestrians;
  constructor(_waypoints: RoadWaypoints, theme: "dark" | "light" = "dark", surfaces?: CitySurfaces) {
    this.group.name = "walkable-city-blocks";
    this.group.userData.isScenery = true;
    const road = new THREE.MeshStandardMaterial({
      color: theme === "light" ? 0x3d454b : 0x1b2026,
      roughness: 0.98,
    });
    this.asphalt = road;
    const pavement = new THREE.MeshStandardMaterial({
      color: 0x424952,
      roughness: 0.88,
    });
    const curb = new THREE.MeshStandardMaterial({ color: 0xa2a4a0, roughness: .95 });
    surfaces?.apply(road, "asphalt");
    surfaces?.apply(pavement, "pavers");
    surfaces?.apply(curb, "concrete");
    const paint = new THREE.MeshBasicMaterial({ color: 0xb3b9b8 });
    const add = (
      geo: THREE.BufferGeometry,
      mat: THREE.Material,
      x: number,
      y: number,
      z: number,
    ) => {
      surfaces?.tile(geo, mat, x, y, z);
      const m = new THREE.Mesh(geo, mat);
      m.position.set(x, y, z);
      m.receiveShadow = true;
      this.group.add(m);
      return m;
    };
    const { streetXs, streetZs } = CITY_GRID;
    const street = (axis: number, crosses: number[], northSouth: boolean) => {
      const extent = axis === 9 || axis === -9 ? 92 : crosses[crosses.length - 1] + 2.3;
      const start = axis === 9 || axis === -9 ? -92 : crosses[0] - 2.3;
      const place = (across: number, y: number, along: number, wide: number, height: number, long: number, material: THREE.Material) => {
        const geometry = northSouth ? new THREE.BoxGeometry(wide, height, long) : new THREE.BoxGeometry(long, height, wide);
        add(geometry, material, northSouth ? across : along, y, northSouth ? along : across);
      };
      place(axis, northSouth ? .015 : .016, (start + extent) / 2, 4.6, .035, extent - start, road);
      const junctions = [start, ...crosses, extent];
      for (let i = 0; i < junctions.length - 1; i++) {
        const length = junctions[i + 1] - junctions[i] - 4.6;
        if (length < 1) continue;
        const center = (junctions[i + 1] + junctions[i]) / 2;
        for (const side of [-1, 1]) {
          place(axis + side * 2.96, .06, center, 1.2, .12, length, pavement);
          place(axis + side * 2.38, .095, center, .14, .19, length, curb);
        }
      }
      for (let p = start + 2; p < extent - 1; p += 4) {
        if (crosses.some(cross => Math.abs(cross - p) < 3.8)) continue;
        place(axis, .049, p, .055, .014, .68, paint);
      }
    };
    for (const x of streetXs) street(x, streetZs, true);
    for (const z of streetZs) street(z, streetXs, false);

    // The quay's sidewalks meet the two routes through the city centre.
    for (const side of [-1, 1]) {
      add(new THREE.BoxGeometry(180, .105, 2.25), pavement, 0, .063, side * 90.5);
      add(new THREE.BoxGeometry(2.25, .105, 180), pavement, side * 90.5, .064, 0);
    }
    // Crosswalks and traffic lights make intersections legible from street level.
    const poleMat = new THREE.MeshStandardMaterial({
      color: 0x263747,
      roughness: 0.6,
    });
    const poleGeo = new THREE.CylinderGeometry(0.035, 0.045, 1.9, 6);
    const signalGreen = new THREE.MeshBasicMaterial({ color: 0x81caa0 });
    const signalRed = new THREE.MeshBasicMaterial({ color: 0xe57558 });
    for (const x of streetXs)
      for (const z of streetZs) {
        for (let stripe = -3; stripe <= 3; stripe++) {
          if (z < 63 || Math.abs(x) === 9)
            add(new THREE.BoxGeometry(.28, .014, .95), paint, x + stripe * .58, .04, z + 3.1);
          if (x < 63 || Math.abs(z) === 9)
            add(new THREE.BoxGeometry(.95, .014, .28), paint, x + 3.1, .041, z + stripe * .58);
        }
        if (Math.abs(x) < 63 && z > -81 && z < 63) {
          add(poleGeo, poleMat, x + 2.8, 0.95, z + 2.8);
          add(
            new THREE.BoxGeometry(0.14, 0.38, 0.15),
            poleMat,
            x + 2.8,
            1.85,
            z + 2.8,
          );
          add(new THREE.BoxGeometry(.095, .085, .025), signalRed, x + 2.8, 1.96, z + 2.88);
          add(new THREE.BoxGeometry(.025, .085, .095), signalGreen, x + 2.88, 1.75, z + 2.8);
        }
      }
    this.traffic = new StreetTraffic();
    this.pedestrians = new StreetPedestrians();
    this.group.add(this.traffic.group, this.pedestrians.group);
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
    const stopSign = new THREE.MeshStandardMaterial({ color: 0x407c83, roughness: .7 });
    for (let i = 0; i < BLOCK_CENTERS.length; i++) {
      const [bx, bz] = findBlock(i);
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
        add(new THREE.BoxGeometry(.38,.48,.055),stopSign,bx-1.1,2.4,bz+6.1);
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
  update(time: number, wetness = 0) {
    this.asphalt.roughness = THREE.MathUtils.lerp(.98, .38, wetness);
    this.asphalt.metalness = wetness * .12;
    this.traffic.update(time, findBlock);
    this.pedestrians.update(time, findBlock);
  }
  dispose() {
    const geometries = new Set<THREE.BufferGeometry>(),
      materials = new Set<THREE.Material>();
    this.group.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        if (o instanceof THREE.InstancedMesh) o.dispose();
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
