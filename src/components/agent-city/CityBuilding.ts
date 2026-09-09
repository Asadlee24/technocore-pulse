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
  private crownGroup: THREE.Group | null = null;

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

    // 4. Archetype-Specific Architectural Roof Crown
    this.createArchitecturalCrown(layout);

    // 5. Rooftop Beacon & Antenna
    this.createRooftopBeacon(layout);

    // 6. Living Agent Office Interior
    this.interior = new OfficeInterior(layout);
    this.group.add(this.interior.group);
  }

  /**
   * Procedural architectural crowns giving each archetype distinct silhouettes
   */
  private createArchitecturalCrown(layout: BuildingLayout) {
    this.crownGroup = new THREE.Group();
    const roofY = layout.height;
    const archMat = new THREE.MeshStandardMaterial({
      color: 0x0E1724,
      roughness: 0.3,
      metalness: 0.8
    });

    const accentMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(layout.color),
      transparent: true,
      opacity: 0.75
    });

    switch (layout.archetype) {
      case 'skyscraper': {
        // Tapered pyramid spire
        const pyrGeo = new THREE.ConeGeometry(layout.width * 0.45, 3.5, 4);
        const pyr = new THREE.Mesh(pyrGeo, archMat);
        pyr.position.y = roofY + 1.75;
        pyr.rotation.y = Math.PI / 4;
        this.crownGroup.add(pyr);
        break;
      }
      case 'research-lab': {
        // Geodesic / hemispherical observation dome with glowing equator ring
        const domeGeo = new THREE.SphereGeometry(layout.width * 0.35, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2);
        const dome = new THREE.Mesh(domeGeo, archMat);
        dome.position.y = roofY;
        this.crownGroup.add(dome);

        const ringGeo = new THREE.TorusGeometry(layout.width * 0.38, 0.08, 6, 24);
        const ring = new THREE.Mesh(ringGeo, accentMat);
        ring.rotation.x = Math.PI / 2;
        ring.position.y = roofY + 0.2;
        this.crownGroup.add(ring);
        break;
      }
      case 'data-center': {
        // Dual cylindrical cooling vents / exhaust manifolds
        [-0.8, 0.8].forEach(xOff => {
          const ventGeo = new THREE.CylinderGeometry(0.5, 0.5, 1.2, 8);
          const vent = new THREE.Mesh(ventGeo, archMat);
          vent.position.set(xOff, roofY + 0.6, 0);
          this.crownGroup?.add(vent);

          const ventGlow = new THREE.Mesh(
            new THREE.RingGeometry(0.1, 0.45, 12),
            accentMat
          );
          ventGlow.rotation.x = -Math.PI / 2;
          ventGlow.position.set(xOff, roofY + 1.21, 0);
          this.crownGroup?.add(ventGlow);
        });
        break;
      }
      case 'settlement-vault': {
        // Heavy reinforced parapet wall
        const parapetGeo = new THREE.BoxGeometry(layout.width + 0.2, 0.6, layout.depth + 0.2);
        const parapet = new THREE.Mesh(parapetGeo, archMat);
        parapet.position.y = roofY + 0.3;
        this.crownGroup.add(parapet);
        break;
      }
      case 'social-block': {
        // Stepped rooftop terrace canopy with green accent
        const canopyGeo = new THREE.BoxGeometry(layout.width * 0.7, 0.15, layout.depth * 0.7);
        const canopy = new THREE.Mesh(canopyGeo, archMat);
        canopy.position.y = roofY + 1.2;
        this.crownGroup.add(canopy);

        // Terrace pillars
        [-0.8, 0.8].forEach(xP => {
          [-0.8, 0.8].forEach(zP => {
            const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.2, 6), archMat);
            pillar.position.set(xP, roofY + 0.6, zP);
            this.crownGroup?.add(pillar);
          });
        });
        break;
      }
      case 'broadcast-hall': {
        // High dual transmission masts
        [-1.0, 1.0].forEach(xOff => {
          const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.08, 3.2, 6), archMat);
          mast.position.set(xOff, roofY + 1.6, 0);
          this.crownGroup?.add(mast);
        });
        const crossbar = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.1, 0.1), archMat);
        crossbar.position.set(0, roofY + 2.4, 0);
        this.crownGroup.add(crossbar);
        break;
      }
      default: {
        // Compact penthouse box
        const phGeo = new THREE.BoxGeometry(layout.width * 0.5, 0.8, layout.depth * 0.5);
        const ph = new THREE.Mesh(phGeo, archMat);
        ph.position.y = roofY + 0.4;
        this.crownGroup.add(ph);
        break;
      }
    }

    this.group.add(this.crownGroup);
  }

  private createWindows(layout: BuildingLayout) {
    const rows = Math.min(14, Math.max(3, Math.floor(layout.height / 2.0)));
    const colsPerFace = 3;
    const totalWindows = rows * colsPerFace * 4;

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

      // Front & Back faces
      for (let c = 0; c < colsPerFace; c++) {
        const xOffset = ((c - 1) * layout.width) / 4;
        
        dummy.position.set(xOffset, y, halfD);
        dummy.rotation.set(0, 0, 0);
        dummy.updateMatrix();
        this.windowMesh.setMatrixAt(instanceIdx++, dummy.matrix);

        dummy.position.set(xOffset, y, -halfD);
        dummy.rotation.set(0, Math.PI, 0);
        dummy.updateMatrix();
        this.windowMesh.setMatrixAt(instanceIdx++, dummy.matrix);
      }

      // Left & Right faces
      for (let c = 0; c < colsPerFace; c++) {
        const zOffset = ((c - 1) * layout.depth) / 4;

        dummy.position.set(halfW, y, zOffset);
        dummy.rotation.set(0, Math.PI / 2, 0);
        dummy.updateMatrix();
        this.windowMesh.setMatrixAt(instanceIdx++, dummy.matrix);

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
    const roofY = layout.height + (layout.archetype === 'skyscraper' ? 3.5 : 0.8);

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
      if (this.crownGroup) this.crownGroup.visible = false;
    } else {
      this.buildingMesh.material = this.baseFacadeMat;
      if (this.windowMesh) this.windowMesh.visible = true;
      if (this.crownGroup) this.crownGroup.visible = true;
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
    if (this.crownGroup) {
      this.crownGroup.traverse(obj => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
          if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
          else obj.material.dispose();
        }
      });
    }
  }
}
