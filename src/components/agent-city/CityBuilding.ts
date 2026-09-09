import * as THREE from 'three';
import type { RoomCluster } from '../../types/probe';
import type { BuildingLayout } from './cityLayout';
import type { CityMaterials } from './cityMaterials';
import { OfficeInterior } from './OfficeInterior';

export class CityBuilding {
  public group: THREE.Group;
  public layout: BuildingLayout;
  public beaconMesh: THREE.Mesh | null = null;
  public beaconGlowMesh: THREE.Mesh | null = null;
  public windowMesh: THREE.InstancedMesh | null = null;
  public interior: OfficeInterior;
  public isCutaway: boolean = false;

  private materials: CityMaterials;
  private buildingMesh: THREE.Mesh;
  private baseFacadeMat: THREE.Material;

  constructor(layout: BuildingLayout, materials: CityMaterials) {
    this.layout = layout;
    this.materials = materials;
    this.group = new THREE.Group();
    this.group.position.set(...layout.position);
    this.group.name = `building-${layout.room.id}`;

    // 1. Facade Box
    const facadeGeo = new THREE.BoxGeometry(layout.width, layout.height, layout.depth);
    this.baseFacadeMat = layout.room.status === 'surge'
      ? this.materials.facadeSurge
      : layout.room.status === 'active'
        ? this.materials.facadeActive
        : this.materials.facadeBase;

    this.buildingMesh = new THREE.Mesh(facadeGeo, this.baseFacadeMat);
    this.buildingMesh.position.y = layout.height / 2;
    this.buildingMesh.castShadow = true;
    this.buildingMesh.receiveShadow = true;
    this.buildingMesh.userData = { room: layout.room };
    this.group.add(this.buildingMesh);

    // 2. Edge Wireframe lines
    const edges = new THREE.EdgesGeometry(facadeGeo);
    const line = new THREE.LineSegments(edges, this.materials.edgeLine);
    line.position.y = layout.height / 2;
    this.group.add(line);

    // 3. Emissive Windows via InstancedMesh
    this.createWindows(layout);

    // 4. Rooftop Beacon & Antenna
    this.createRooftopBeacon(layout);

    // 5. Living Agent Office Interior
    this.interior = new OfficeInterior(layout);
    this.group.add(this.interior.group);
  }

  private createWindows(layout: BuildingLayout) {
    const rows = Math.min(12, Math.max(3, Math.floor(layout.height / 2.2)));
    const colsPerFace = 3;
    const totalWindows = rows * colsPerFace * 4; // 4 sides

    const windowGeo = new THREE.PlaneGeometry(0.4, 0.5);
    const instancedMat = layout.room.status === 'active' 
      ? this.materials.windowSigned 
      : this.materials.windowEmissive;

    this.windowMesh = new THREE.InstancedMesh(windowGeo, instancedMat, totalWindows);
    
    const dummy = new THREE.Object3D();
    let instanceIdx = 0;

    const halfW = layout.width / 2 + 0.02;
    const halfD = layout.depth / 2 + 0.02;

    for (let r = 0; r < rows; r++) {
      const y = 1.5 + r * (layout.height - 2.5) / rows;

      // Front & Back faces (z = halfD, -halfD)
      for (let c = 0; c < colsPerFace; c++) {
        const xOffset = ((c - 1) * layout.width) / 4;
        
        // Front
        dummy.position.set(xOffset, y, halfD);
        dummy.rotation.set(0, 0, 0);
        dummy.updateMatrix();
        this.windowMesh.setMatrixAt(instanceIdx++, dummy.matrix);

        // Back
        dummy.position.set(xOffset, y, -halfD);
        dummy.rotation.set(0, Math.PI, 0);
        dummy.updateMatrix();
        this.windowMesh.setMatrixAt(instanceIdx++, dummy.matrix);
      }

      // Left & Right faces (x = halfW, -halfW)
      for (let c = 0; c < colsPerFace; c++) {
        const zOffset = ((c - 1) * layout.depth) / 4;

        // Right
        dummy.position.set(halfW, y, zOffset);
        dummy.rotation.set(0, Math.PI / 2, 0);
        dummy.updateMatrix();
        this.windowMesh.setMatrixAt(instanceIdx++, dummy.matrix);

        // Left
        dummy.position.set(-halfW, y, zOffset);
        dummy.rotation.set(0, -Math.PI / 2, 0);
        dummy.updateMatrix();
        this.windowMesh.setMatrixAt(instanceIdx++, dummy.matrix);
      }
    }

    this.windowMesh.instanceMatrix.needsUpdate = true;
    this.group.add(this.windowMesh);
  }

  private createRooftopBeacon(layout: BuildingLayout) {
    const roofY = layout.height;

    // Antenna mast
    const mastGeo = new THREE.CylinderGeometry(0.08, 0.12, 2.2, 6);
    const mastMat = new THREE.MeshStandardMaterial({ color: 0x1B2A3D, metalness: 0.8 });
    const mast = new THREE.Mesh(mastGeo, mastMat);
    mast.position.y = roofY + 1.1;
    this.group.add(mast);

    // Glowing beacon sphere
    const beaconGeo = new THREE.SphereGeometry(0.35, 12, 12);
    const beaconMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(layout.beaconColor),
      transparent: true,
      opacity: 0.95
    });
    this.beaconMesh = new THREE.Mesh(beaconGeo, beaconMat);
    this.beaconMesh.position.y = roofY + 2.2;
    this.group.add(this.beaconMesh);

    // Outer glow aura
    const glowGeo = new THREE.SphereGeometry(0.7, 12, 12);
    const glowMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(layout.beaconColor),
      transparent: true,
      opacity: 0.35,
      wireframe: true
    });
    this.beaconGlowMesh = new THREE.Mesh(glowGeo, glowMat);
    this.beaconGlowMesh.position.y = roofY + 2.2;
    this.group.add(this.beaconGlowMesh);
  }

  public setCutaway(cutaway: boolean) {
    this.isCutaway = cutaway;
    this.interior.setCutawayVisible(cutaway);

    if (cutaway) {
      this.buildingMesh.material = this.materials.facadeCutaway;
      if (this.windowMesh) this.windowMesh.visible = false;
    } else {
      this.buildingMesh.material = this.baseFacadeMat;
      if (this.windowMesh) this.windowMesh.visible = true;
    }
  }

  public update(time: number, isSelected: boolean) {
    if (this.beaconGlowMesh) {
      const scale = 1 + Math.sin(time * 3) * 0.18;
      this.beaconGlowMesh.scale.set(scale, scale, scale);
      this.beaconGlowMesh.rotation.y += 0.02;
    }

    if (isSelected) {
      this.buildingMesh.scale.set(1.03, 1.0, 1.03);
    } else {
      this.buildingMesh.scale.set(1.0, 1.0, 1.0);
    }

    // Update office interior if cutaway is active
    if (this.isCutaway) {
      this.interior.update(time);
    }
  }

  public updateRoomData(room: RoomCluster) {
    this.layout.room = room;
    this.interior.updateRoomData(room);
  }

  public triggerProbeEffect() {
    if (this.beaconGlowMesh) {
      this.beaconGlowMesh.scale.set(2.5, 2.5, 2.5);
    }
  }

  public dispose() {
    this.interior.dispose();
  }
}
