import * as THREE from 'three';
import type { BuildingLayout } from './cityLayout';
import type { CityMaterials } from './cityMaterials';

export class CityRoutes {
  public group: THREE.Group;
  private materials: CityMaterials;
  private curves: THREE.QuadraticBezierCurve3[] = [];
  private signalPacketMesh: THREE.InstancedMesh | null = null;
  private packetPositions: { curveIdx: number; t: number; speed: number }[] = [];

  constructor(buildings: BuildingLayout[], materials: CityMaterials) {
    this.materials = materials;
    this.group = new THREE.Group();
    this.group.name = 'city-network-routes';

    if (buildings.length < 2) return;

    this.buildRoutes(buildings);
    this.buildSignalPackets();
  }

  private buildRoutes(buildings: BuildingLayout[]) {
    // Connect each building to the central core and to adjacent buildings
    const corePoint = new THREE.Vector3(0, 3, 0);

    for (let i = 0; i < buildings.length; i++) {
      const b1 = buildings[i];
      const start = new THREE.Vector3(b1.position[0], 1.5, b1.position[2]);

      // 1. Core connection curve
      const midCore = new THREE.Vector3(
        start.x * 0.5,
        Math.max(4, b1.height * 0.4),
        start.z * 0.5
      );
      const curveCore = new THREE.QuadraticBezierCurve3(start, midCore, corePoint);
      this.curves.push(curveCore);

      const pointsCore = curveCore.getPoints(24);
      const geoCore = new THREE.BufferGeometry().setFromPoints(pointsCore);
      const lineCore = new THREE.Line(geoCore, this.materials.roadMaterial);
      this.group.add(lineCore);

      // 2. Inter-building connection curve (ring road)
      const nextIdx = (i + 1) % buildings.length;
      const b2 = buildings[nextIdx];
      const end = new THREE.Vector3(b2.position[0], 1.5, b2.position[2]);
      const midInter = new THREE.Vector3(
        (start.x + end.x) * 0.5,
        Math.max(3, (b1.height + b2.height) * 0.35),
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

    const totalPackets = Math.min(48, this.curves.length * 3);
    const packetGeo = new THREE.SphereGeometry(0.18, 8, 8);
    const packetMat = new THREE.MeshBasicMaterial({
      color: 0x36D7E7,
      transparent: true,
      opacity: 0.95
    });

    this.signalPacketMesh = new THREE.InstancedMesh(packetGeo, packetMat, totalPackets);

    for (let i = 0; i < totalPackets; i++) {
      this.packetPositions.push({
        curveIdx: i % this.curves.length,
        t: Math.random(),
        speed: 0.003 + Math.random() * 0.006
      });
    }

    this.group.add(this.signalPacketMesh);
  }

  public update(_time: number) {
    if (!this.signalPacketMesh || this.curves.length === 0) return;

    const dummy = new THREE.Object3D();

    for (let i = 0; i < this.packetPositions.length; i++) {
      const p = this.packetPositions[i];
      p.t += p.speed;
      if (p.t > 1) p.t = 0;

      const curve = this.curves[p.curveIdx];
      if (curve) {
        const point = curve.getPoint(p.t);
        dummy.position.copy(point);
        dummy.updateMatrix();
        this.signalPacketMesh.setMatrixAt(i, dummy.matrix);
      }
    }

    this.signalPacketMesh.instanceMatrix.needsUpdate = true;
  }
}
