import * as THREE from 'three';
import type { RoomCluster } from '../../types/probe';
import type { BuildingLayout } from './cityLayout';
import type { CityMaterials } from './cityMaterials';
import { OfficeInterior } from './OfficeInterior';
import { AgentWorker } from './AgentWorker';

export class CityBuilding {
  public group: THREE.Group;
  public layout: BuildingLayout;
  public beaconMesh: THREE.Mesh | null = null;
  public beaconGlowMesh: THREE.Mesh | null = null;
  public windowMesh: THREE.InstancedMesh | null = null;
  public interior: OfficeInterior;
  public rooftopAgents: AgentWorker[] = [];
  public isCutaway: boolean = false;
  public hitMesh: THREE.Mesh;

  private buildingMesh: THREE.Mesh;
  private wireframeLines: THREE.LineSegments;
  private entranceMesh: THREE.Group;
  private roofSignGroup: THREE.Group | null = null;
  private baseFacadeMat: THREE.MeshStandardMaterial;

  constructor(layout: BuildingLayout, _materials: CityMaterials) {
    this.layout = layout;
    this.group = new THREE.Group();
    this.group.position.set(...layout.position);
    this.group.name = `building-${layout.id}`;

    // 1. Raycast Hit Mesh: Full volume bounding box for seamless selection
    const hitTotalH = layout.height + 2.0;
    const hitGeo = new THREE.BoxGeometry(layout.width * 1.15, hitTotalH, layout.depth * 1.15);
    const hitMat = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0,
      depthWrite: false
    });
    this.hitMesh = new THREE.Mesh(hitGeo, hitMat);
    this.hitMesh.position.y = hitTotalH / 2;
    this.hitMesh.userData = { room: layout.room, buildingId: layout.id, buildingLayout: layout };
    this.group.add(this.hitMesh);

    // 2. Facade Material: Refined graphite/navy (#0E1A2B) with subtle district tint
    const districtCol = new THREE.Color(layout.color);
    const edgeCol = new THREE.Color(layout.edgeColor || layout.color);
    const facadeBaseCol = new THREE.Color(0x0C1524).lerp(districtCol, 0.12);

    this.baseFacadeMat = new THREE.MeshStandardMaterial({
      color: facadeBaseCol,
      emissive: new THREE.Color(0x050C16),
      roughness: 0.65,
      metalness: 0.45
    });

    // 3. Primary Solid Low-Poly Cuboid Body
    const bodyGeo = new THREE.BoxGeometry(layout.width, layout.height, layout.depth);
    this.buildingMesh = new THREE.Mesh(bodyGeo, this.baseFacadeMat);
    this.buildingMesh.position.y = layout.height / 2;
    this.buildingMesh.castShadow = true;
    this.buildingMesh.receiveShadow = true;
    this.buildingMesh.userData = { room: layout.room, buildingId: layout.id };
    this.group.add(this.buildingMesh);

    // 4. Crisp Luminous Wireframe Corners & Outlines (Matching reference neon edges)
    const edges = new THREE.EdgesGeometry(bodyGeo);
    const lineMat = new THREE.LineBasicMaterial({
      color: edgeCol,
      transparent: true,
      opacity: 0.95
    });
    this.wireframeLines = new THREE.LineSegments(edges, lineMat);
    this.wireframeLines.position.y = layout.height / 2;
    this.group.add(this.wireframeLines);

    // 5. Ground-Level Entrance Doorway with Luminous Frame
    this.entranceMesh = this.createEntrance(layout, edgeCol);
    this.group.add(this.entranceMesh);

    // 6. Roof 3D Signboard (World-space building name)
    this.createRoofSignboard(layout, edgeCol);

    // 7. Multi-Hue Inset Night Windows
    this.createWindows(layout);

    // 8. Rooftop Antenna & Beacon
    this.createRooftopBeacon(layout);

    // 9. Living Office Interior Stage
    this.interior = new OfficeInterior(layout);
    this.group.add(this.interior.group);
  }

  /**
   * Ground entrance doorway with glowing neon frame and lit lobby glass
   */
  private createEntrance(layout: BuildingLayout, edgeCol: THREE.Color): THREE.Group {
    const entranceGroup = new THREE.Group();
    const doorW = Math.min(2.4, layout.width * 0.4);
    const doorH = 1.8;
    const doorZ = layout.depth / 2 + 0.04;

    // Lit warm doorway aperture
    const doorGeo = new THREE.PlaneGeometry(doorW, doorH);
    const doorMat = new THREE.MeshBasicMaterial({
      color: 0xFDE047, // Warm inviting interior glow
      transparent: true,
      opacity: 0.85
    });
    const door = new THREE.Mesh(doorGeo, doorMat);
    door.position.set(0, doorH / 2, doorZ);
    entranceGroup.add(door);

    // Neon Frame around door
    const frameGeo = new THREE.BoxGeometry(doorW + 0.16, doorH + 0.12, 0.1);
    const frameEdges = new THREE.EdgesGeometry(frameGeo);
    const frameLine = new THREE.LineSegments(
      frameEdges,
      new THREE.LineBasicMaterial({ color: edgeCol })
    );
    frameLine.position.set(0, (doorH + 0.12) / 2, doorZ);
    entranceGroup.add(frameLine);

    // Small entrance canopy
    const canopyGeo = new THREE.BoxGeometry(doorW + 0.5, 0.08, 0.7);
    const canopyMat = new THREE.MeshStandardMaterial({ color: 0x0E1724, metalness: 0.8 });
    const canopy = new THREE.Mesh(canopyGeo, canopyMat);
    canopy.position.set(0, doorH + 0.08, doorZ + 0.32);
    entranceGroup.add(canopy);

    return entranceGroup;
  }

  /**
   * World-space roof text sign showing building name (e.g. "The Institute", "Technocore Tower")
   */
  private createRoofSignboard(layout: BuildingLayout, edgeCol: THREE.Color) {
    this.roofSignGroup = new THREE.Group();

    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Dark semi-transparent background
    ctx.fillStyle = '#060E1A';
    ctx.fillRect(0, 0, 512, 128);

    // Bright border
    ctx.strokeStyle = layout.edgeColor || '#00B4D8';
    ctx.lineWidth = 6;
    ctx.strokeRect(6, 6, 500, 116);

    // Text
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 44px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(layout.name.toUpperCase(), 256, 64);

    const texture = new THREE.CanvasTexture(canvas);
    const signW = Math.min(layout.width * 0.9, 5.5);
    const signH = 1.2;
    const signGeo = new THREE.PlaneGeometry(signW, signH);
    const signMat = new THREE.MeshBasicMaterial({
      map: texture,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.95
    });

    const sign = new THREE.Mesh(signGeo, signMat);
    // Face towards isometric camera (+X and +Z)
    sign.rotation.y = Math.PI / 4;
    sign.position.set(0, layout.height + signH / 2 + 0.2, 0);
    this.roofSignGroup.add(sign);

    // Add glowing neon support posts
    [-signW * 0.35, signW * 0.35].forEach(xOff => {
      const postGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.5, 6);
      const postMat = new THREE.MeshBasicMaterial({ color: edgeCol });
      const post = new THREE.Mesh(postGeo, postMat);
      post.position.set(xOff, layout.height + 0.25, 0);
      this.roofSignGroup?.add(post);
    });

    this.group.add(this.roofSignGroup);
  }

  /**
   * Multi-Hue Inset Windows with restrained organic illumination
   */
  private createWindows(layout: BuildingLayout) {
    const startY = 2.4;
    const availableH = Math.max(3, layout.height - startY - 1.2);
    const rows = Math.min(14, Math.max(3, Math.floor(availableH / 1.8)));
    const colsPerFace = Math.min(4, Math.max(2, Math.floor(layout.width / 1.6)));
    const totalWindows = rows * colsPerFace * 4;

    const windowGeo = new THREE.PlaneGeometry(0.38, 0.48);
    const instancedMat = new THREE.MeshBasicMaterial({
      color: 0xFFFFFF,
      transparent: true,
      opacity: 0.92
    });

    this.windowMesh = new THREE.InstancedMesh(windowGeo, instancedMat, totalWindows);

    const dummy = new THREE.Object3D();
    let instanceIdx = 0;

    const halfW = layout.width / 2 + 0.02;
    const halfD = layout.depth / 2 + 0.02;

    const warmGold = new THREE.Color(0xFDE047);
    const brightCyan = new THREE.Color(0x00B4D8);
    const iceWhite = new THREE.Color(0xF5F7FA);
    const darkGlass = new THREE.Color(0x07111D);

    for (let r = 0; r < rows; r++) {
      const y = startY + (r * availableH) / rows;

      // Front & Back faces
      for (let c = 0; c < colsPerFace; c++) {
        const xOffset = ((c - (colsPerFace - 1) / 2) * layout.width) / (colsPerFace + 0.8);

        const hash = Math.sin(layout.position[0] * 7.1 + layout.position[2] * 4.3 + instanceIdx * 1.9);
        const norm = Math.abs(hash);
        let winCol = darkGlass;
        if (norm > 0.75) winCol = iceWhite;
        else if (norm > 0.45) winCol = warmGold;
        else if (norm > 0.25) winCol = brightCyan;

        // Front face (+Z)
        dummy.position.set(xOffset, y, halfD);
        dummy.rotation.set(0, 0, 0);
        dummy.updateMatrix();
        this.windowMesh.setMatrixAt(instanceIdx, dummy.matrix);
        this.windowMesh.setColorAt(instanceIdx, winCol);
        instanceIdx++;

        // Back face (-Z)
        dummy.position.set(xOffset, y, -halfD);
        dummy.rotation.set(0, Math.PI, 0);
        dummy.updateMatrix();
        this.windowMesh.setMatrixAt(instanceIdx, dummy.matrix);
        this.windowMesh.setColorAt(instanceIdx, winCol);
        instanceIdx++;
      }

      // Left & Right faces
      for (let c = 0; c < colsPerFace; c++) {
        const zOffset = ((c - (colsPerFace - 1) / 2) * layout.depth) / (colsPerFace + 0.8);

        const hash = Math.sin(layout.position[0] * 3.7 + layout.position[2] * 8.9 + instanceIdx * 2.1);
        const norm = Math.abs(hash);
        let winCol = darkGlass;
        if (norm > 0.78) winCol = iceWhite;
        else if (norm > 0.48) winCol = warmGold;
        else if (norm > 0.28) winCol = brightCyan;

        // Right face (+X)
        dummy.position.set(halfW, y, zOffset);
        dummy.rotation.set(0, Math.PI / 2, 0);
        dummy.updateMatrix();
        this.windowMesh.setMatrixAt(instanceIdx, dummy.matrix);
        this.windowMesh.setColorAt(instanceIdx, winCol);
        instanceIdx++;

        // Left face (-X)
        dummy.position.set(-halfW, y, zOffset);
        dummy.rotation.set(0, -Math.PI / 2, 0);
        dummy.updateMatrix();
        this.windowMesh.setMatrixAt(instanceIdx, dummy.matrix);
        this.windowMesh.setColorAt(instanceIdx, winCol);
        instanceIdx++;
      }
    }

    this.windowMesh.instanceMatrix.needsUpdate = true;
    if (this.windowMesh.instanceColor) {
      this.windowMesh.instanceColor.needsUpdate = true;
    }
    this.group.add(this.windowMesh);
  }

  private createRooftopBeacon(layout: BuildingLayout) {
    const roofY = layout.height;

    // Sleek antenna mast
    const mastGeo = new THREE.CylinderGeometry(0.04, 0.08, 2.2, 6);
    const mastMat = new THREE.MeshStandardMaterial({ color: 0x1E293B, metalness: 0.85 });
    const mast = new THREE.Mesh(mastGeo, mastMat);
    mast.position.set(layout.width * 0.3, roofY + 1.1, -layout.depth * 0.3);
    this.group.add(mast);

    // Rooftop beacon orb for primary landmarks
    if (layout.isPrimaryRoom) {
      const beaconGeo = new THREE.SphereGeometry(0.24, 12, 12);
      const beaconMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(layout.edgeColor || layout.color)
      });
      this.beaconMesh = new THREE.Mesh(beaconGeo, beaconMat);
      this.beaconMesh.position.set(layout.width * 0.3, roofY + 2.3, -layout.depth * 0.3);
      this.group.add(this.beaconMesh);
    }
  }

  /**
   * Smooth cutaway handling: hides exterior geometry so interior open stage is visible
   */
  public setCutaway(cutaway: boolean) {
    this.isCutaway = cutaway;
    this.interior.setCutawayVisible(cutaway);

    if (cutaway) {
      this.buildingMesh.visible = false;
      this.wireframeLines.visible = false;
      if (this.windowMesh) this.windowMesh.visible = false;
      if (this.roofSignGroup) this.roofSignGroup.visible = false;
      this.entranceMesh.visible = false;
      if (this.beaconMesh) this.beaconMesh.visible = false;
    } else {
      this.buildingMesh.visible = true;
      this.wireframeLines.visible = true;
      if (this.windowMesh) this.windowMesh.visible = true;
      if (this.roofSignGroup) this.roofSignGroup.visible = true;
      this.entranceMesh.visible = true;
      if (this.beaconMesh) this.beaconMesh.visible = true;
    }
  }

  public update(time: number) {
    // If cutaway open, update interior animations (seated workers, blinking LEDs)
    if (this.isCutaway) {
      this.interior.update(time);
    }

    // Subtle beacon breathing
    if (this.beaconMesh) {
      const scale = 1.0 + Math.sin(time * 3) * 0.15;
      this.beaconMesh.scale.set(scale, scale, scale);
    }
  }

  public updateRoomData(room: RoomCluster) {
    this.layout.room = room;
    this.interior.updateRoomData(room);
  }

  public dispose() {
    this.group.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        if (Array.isArray(obj.material)) {
          obj.material.forEach(m => m.dispose());
        } else {
          obj.material.dispose();
        }
      }
    });
    this.interior.dispose();
  }
}
