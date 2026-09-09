import * as THREE from 'three';
import type { CityMaterials } from './cityMaterials';

export class CityDistrictManager {
  public group: THREE.Group;
  private materials: CityMaterials;
  private coreRingMesh: THREE.Mesh | null = null;
  private coreBeamMesh: THREE.Mesh | null = null;

  constructor(materials: CityMaterials) {
    this.materials = materials;
    this.group = new THREE.Group();
    this.group.name = 'city-districts-and-core';

    this.buildTechnocoreCore();
    this.buildGroundGrid();
  }

  /**
   * Builds the central landmark: TECHNOCORE CORE
   * Minimalist dark tower with cyan vertical energy core and floating orbital ring
   */
  private buildTechnocoreCore() {
    const coreGroup = new THREE.Group();
    coreGroup.name = 'technocore-core';

    const coreHeight = 34;

    // 1. Sleek dark hexagonal base tower
    const towerGeo = new THREE.CylinderGeometry(1.8, 2.6, coreHeight, 6);
    const towerMesh = new THREE.Mesh(towerGeo, this.materials.coreColumn);
    towerMesh.position.y = coreHeight / 2;
    coreGroup.add(towerMesh);

    // 2. Cyan vertical energy beam running up the center
    const beamGeo = new THREE.CylinderGeometry(0.3, 0.3, coreHeight + 6, 8);
    const beamMat = new THREE.MeshBasicMaterial({
      color: 0x36D7E7,
      transparent: true,
      opacity: 0.85
    });
    this.coreBeamMesh = new THREE.Mesh(beamGeo, beamMat);
    this.coreBeamMesh.position.y = (coreHeight + 6) / 2;
    coreGroup.add(this.coreBeamMesh);

    // 3. Floating orbital ring around upper section
    const ringGeo = new THREE.TorusGeometry(3.6, 0.12, 8, 32);
    this.coreRingMesh = new THREE.Mesh(ringGeo, this.materials.coreRing);
    this.coreRingMesh.position.y = coreHeight - 4;
    this.coreRingMesh.rotation.x = Math.PI / 2.3;
    coreGroup.add(this.coreRingMesh);

    // 4. Second outer accent ring
    const outerRingGeo = new THREE.TorusGeometry(4.8, 0.06, 6, 24);
    const outerRing = new THREE.Mesh(outerRingGeo, this.materials.coreRing);
    outerRing.position.y = coreHeight - 5;
    outerRing.rotation.x = Math.PI / 2.1;
    coreGroup.add(outerRing);

    // 5. Base podium plinth
    const plinthGeo = new THREE.CylinderGeometry(5.0, 5.8, 1.2, 8);
    const plinthMesh = new THREE.Mesh(plinthGeo, this.materials.facadeBase);
    plinthMesh.position.y = 0.6;
    coreGroup.add(plinthMesh);

    this.group.add(coreGroup);
  }

  /**
   * Ground grid with concentric circular district rings
   */
  private buildGroundGrid() {
    const gridHelper = new THREE.GridHelper(90, 45, 0x1B2A3D, 0x0E1724);
    gridHelper.position.y = 0.02;
    this.group.add(gridHelper);

    // Concentric zone boundary rings
    const radii = [14, 24, 34];
    radii.forEach((r) => {
      const circleGeo = new THREE.RingGeometry(r - 0.05, r + 0.05, 64);
      const circleMat = new THREE.MeshBasicMaterial({
        color: 0x1B2A3D,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.4
      });
      const ring = new THREE.Mesh(circleGeo, circleMat);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 0.03;
      this.group.add(ring);
    });
  }

  public update(time: number) {
    if (this.coreRingMesh) {
      this.coreRingMesh.rotation.z = time * 0.4;
    }
    if (this.coreBeamMesh) {
      const pulse = 0.75 + Math.sin(time * 4) * 0.2;
      (this.coreBeamMesh.material as THREE.MeshBasicMaterial).opacity = pulse;
    }
  }
}
