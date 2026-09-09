import * as THREE from 'three';
import type { BuildingLayout } from './cityLayout';
import type { CityMaterials } from './cityMaterials';

interface PacketTracker {
  curveIdx: number;
  t: number;
  speed: number;
  scale: number;
}

export class CityRoutes {
  public group: THREE.Group;
  private materials: CityMaterials;
  private curves: THREE.QuadraticBezierCurve3[] = [];
  private cyanPacketsMesh: THREE.InstancedMesh | null = null;
  private amberPacketsMesh: THREE.InstancedMesh | null = null;
  private cyanTrackers: PacketTracker[] = [];
  private amberTrackers: PacketTracker[] = [];

  constructor(buildings: BuildingLayout[], materials: CityMaterials) {
    this.materials = materials;
    this.group = new THREE.Group();
    this.group.name = 'city-network-routes';

    if (buildings.length < 2) return;

    this.buildRoutes(buildings);
    this.buildSignalPackets();
  }

  private buildRoutes(buildings: BuildingLayout[]) {
    const corePoint = new THREE.Vector3(0, 4, 0);

    for (let i = 0; i < buildings.length; i++) {
      const b1 = buildings[i];
      const start = new THREE.Vector3(b1.position[0], 1.8, b1.position[2]);

      // 1. Core connection curve (elevated arc into central core)
      const midCore = new THREE.Vector3(
        start.x * 0.5,
        Math.max(5, b1.height * 0.45),
        start.z * 0.5
      );
      const curveCore = new THREE.QuadraticBezierCurve3(start, midCore, corePoint);
      this.curves.push(curveCore);

      const pointsCore = curveCore.getPoints(24);
      const geoCore = new THREE.BufferGeometry().setFromPoints(pointsCore);
      const lineCore = new THREE.Line(geoCore, this.materials.roadMaterial);
      this.group.add(lineCore);

      // 2. Inter-building connection curve (ring communication route)
      const nextIdx = (i + 1) % buildings.length;
      const b2 = buildings[nextIdx];
      const end = new THREE.Vector3(b2.position[0], 1.8, b2.position[2]);
      const midInter = new THREE.Vector3(
        (start.x + end.x) * 0.5,
        Math.max(4, (b1.height + b2.height) * 0.35),
        (start.z + end.z) * 0.5
      );

      const curveInter = new THREE.QuadraticBezierCurve3(start, midInter, end);
      this.curves.push(curveInter);

      const pointsInter = curveInter.getPoints(24);
      const geoInter = new THREE.BufferGeometry().setFromPoints(pointsInter);
      const lineInter = new THREE.Line(geoInter, this.materials.roadMaterial);
      this.group.add(lineInter);
    }
  }

  private buildSignalPackets() {
    if (this.curves.length === 0) return;

    const countCyan = Math.min(64, this.curves.length * 3);
    const countAmber = Math.min(32, this.curves.length * 2);

    // Elongated photon capsule geometry
    const packetGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.45, 6);
    packetGeo.rotateX(Math.PI / 2);

    // Cyan high-speed packets
    const cyanMat = new THREE.MeshBasicMaterial({
      color: 0x36D7E7,
      transparent: true,
      opacity: 0.95
    });
    this.cyanPacketsMesh = new THREE.InstancedMesh(packetGeo, cyanMat, countCyan);

    for (let i = 0; i < countCyan; i++) {
      this.cyanTrackers.push({
        curveIdx: i % this.curves.length,
        t: Math.random(),
        speed: 0.005 + Math.random() * 0.008,
        scale: 0.8 + Math.random() * 0.5
      });
    }
    this.group.add(this.cyanPacketsMesh);

    // Amber probe/response packets
    const amberMat = new THREE.MeshBasicMaterial({
      color: 0xF0A824,
      transparent: true,
      opacity: 0.95
    });
    this.amberPacketsMesh = new THREE.InstancedMesh(packetGeo, amberMat, countAmber);

    for (let i = 0; i < countAmber; i++) {
      this.amberTrackers.push({
        curveIdx: (i * 2) % this.curves.length,
        t: Math.random(),
        speed: 0.004 + Math.random() * 0.006,
        scale: 0.9 + Math.random() * 0.6
      });
    }
    this.group.add(this.amberPacketsMesh);
  }

  public update(_time: number) {
    const dummy = new THREE.Object3D();

    // Update Cyan Packets
    if (this.cyanPacketsMesh && this.curves.length > 0) {
      for (let i = 0; i < this.cyanTrackers.length; i++) {
        const p = this.cyanTrackers[i];
        p.t += p.speed;
        if (p.t > 1) p.t = 0;

        const curve = this.curves[p.curveIdx];
        if (curve) {
          const point = curve.getPoint(p.t);
          const tangent = curve.getTangent(p.t);

          dummy.position.copy(point);
          dummy.lookAt(point.clone().add(tangent));
          dummy.scale.set(p.scale, p.scale, p.scale);
          dummy.updateMatrix();
          this.cyanPacketsMesh.setMatrixAt(i, dummy.matrix);
        }
      }
      this.cyanPacketsMesh.instanceMatrix.needsUpdate = true;
    }

    // Update Amber Packets
    if (this.amberPacketsMesh && this.curves.length > 0) {
      for (let i = 0; i < this.amberTrackers.length; i++) {
        const p = this.amberTrackers[i];
        p.t += p.speed;
        if (p.t > 1) p.t = 0;

        const curve = this.curves[p.curveIdx];
        if (curve) {
          const point = curve.getPoint(p.t);
          const tangent = curve.getTangent(p.t);

          dummy.position.copy(point);
          dummy.lookAt(point.clone().add(tangent));
          dummy.scale.set(p.scale, p.scale, p.scale);
          dummy.updateMatrix();
          this.amberPacketsMesh.setMatrixAt(i, dummy.matrix);
        }
      }
      this.amberPacketsMesh.instanceMatrix.needsUpdate = true;
    }
  }

  public dispose() {
    if (this.cyanPacketsMesh) {
      this.cyanPacketsMesh.geometry.dispose();
      (this.cyanPacketsMesh.material as THREE.Material).dispose();
    }
    if (this.amberPacketsMesh) {
      this.amberPacketsMesh.geometry.dispose();
      (this.amberPacketsMesh.material as THREE.Material).dispose();
    }
  }
}
