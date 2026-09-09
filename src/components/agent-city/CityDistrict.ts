import * as THREE from 'three';
import type { CityMaterials } from './cityMaterials';
import { PublicPlaza } from './PublicPlaza';

export class CityDistrictManager {
  public group: THREE.Group;
  public plaza: PublicPlaza;

  private materials: CityMaterials;
  private coreRings: THREE.Mesh[] = [];
  private coreBeamMesh: THREE.Mesh | null = null;
  private dataParticles: THREE.Points | null = null;

  constructor(materials: CityMaterials) {
    this.materials = materials;
    this.group = new THREE.Group();
    this.group.name = 'city-districts-and-core';

    this.plaza = new PublicPlaza();
    this.group.add(this.plaza.group);

    this.buildTechnocoreCore();
    this.buildGroundGrid();
    this.buildDistrictBridges();
  }

  /**
   * Builds the iconic central landmark: TECHNOCORE CORE
   * Central light column, three rotating protocol rings, internal data particles
   */
  private buildTechnocoreCore() {
    const coreGroup = new THREE.Group();
    coreGroup.name = 'technocore-core';

    const coreHeight = 36;

    // 1. Sleek dark hexagonal base tower
    const towerGeo = new THREE.CylinderGeometry(1.6, 2.8, coreHeight, 6);
    const towerMesh = new THREE.Mesh(towerGeo, this.materials.coreColumn);
    towerMesh.position.y = coreHeight / 2;
    coreGroup.add(towerMesh);

    // 2. Cyan vertical energy beam running through the tower center
    const beamGeo = new THREE.CylinderGeometry(0.35, 0.35, coreHeight + 10, 8);
    const beamMat = new THREE.MeshBasicMaterial({
      color: 0x36D7E7,
      transparent: true,
      opacity: 0.85
    });
    this.coreBeamMesh = new THREE.Mesh(beamGeo, beamMat);
    this.coreBeamMesh.position.y = (coreHeight + 10) / 2;
    coreGroup.add(this.coreBeamMesh);

    // 3. Three rotating protocol rings around the upper tower
    const ringSpecs = [
      { radius: 3.8, tube: 0.12, y: coreHeight - 4, rotX: Math.PI / 2.3, rotZ: 0 },
      { radius: 4.8, tube: 0.08, y: coreHeight - 6, rotX: -Math.PI / 2.6, rotZ: Math.PI / 4 },
      { radius: 6.0, tube: 0.06, y: coreHeight - 8, rotX: Math.PI / 2.1, rotZ: -Math.PI / 3 }
    ];

    ringSpecs.forEach((spec) => {
      const ringGeo = new THREE.TorusGeometry(spec.radius, spec.tube, 8, 36);
      const ringMesh = new THREE.Mesh(ringGeo, this.materials.coreRing);
      ringMesh.position.y = spec.y;
      ringMesh.rotation.set(spec.rotX, 0, spec.rotZ);
      coreGroup.add(ringMesh);
      this.coreRings.push(ringMesh);
    });

    // 4. Internal data particles ascending the light column
    const particleCount = 40;
    const particleGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 0.8;
      positions[i * 3 + 1] = Math.random() * coreHeight;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 0.8;
    }
    particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const particleMat = new THREE.PointsMaterial({
      color: 0x36D7E7,
      size: 0.35,
      transparent: true,
      opacity: 0.9
    });
    this.dataParticles = new THREE.Points(particleGeo, particleMat);
    coreGroup.add(this.dataParticles);

    // 5. Base podium plinth
    const plinthGeo = new THREE.CylinderGeometry(5.2, 6.2, 1.4, 8);
    const plinthMesh = new THREE.Mesh(plinthGeo, this.materials.facadeBase);
    plinthMesh.position.y = 0.7;
    coreGroup.add(plinthMesh);

    this.group.add(coreGroup);
  }

  /**
   * Elevated bridges connecting the central plaza to surrounding districts
   */
  private buildDistrictBridges() {
    const bridgeDirections = [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2];
    const bridgeGeo = new THREE.BoxGeometry(1.6, 0.2, 12);
    const bridgeMat = new THREE.MeshStandardMaterial({
      color: 0x101A2A,
      roughness: 0.5,
      metalness: 0.7
    });

    bridgeDirections.forEach((angle) => {
      const bridge = new THREE.Mesh(bridgeGeo, bridgeMat);
      bridge.rotation.y = angle;
      const dist = 14;
      bridge.position.set(Math.sin(angle) * dist, 0.4, Math.cos(angle) * dist);
      this.group.add(bridge);
    });
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
    // Animate rotating protocol rings
    this.coreRings.forEach((ring, idx) => {
      const speed = (idx % 2 === 0 ? 0.35 : -0.28) * (1 + idx * 0.2);
      ring.rotation.z = time * speed;
    });

    // Beam pulse
    if (this.coreBeamMesh) {
      const pulse = 0.75 + Math.sin(time * 4) * 0.2;
      (this.coreBeamMesh.material as THREE.MeshBasicMaterial).opacity = pulse;
    }

    // Ascending data particles
    if (this.dataParticles) {
      const posAttr = this.dataParticles.geometry.attributes.position;
      const arr = posAttr.array as Float32Array;
      for (let i = 0; i < arr.length; i += 3) {
        arr[i + 1] += 0.12;
        if (arr[i + 1] > 36) arr[i + 1] = 0;
      }
      posAttr.needsUpdate = true;
    }

    // Update public plaza agents
    this.plaza.update(time);
  }

  public dispose() {
    this.plaza.dispose();
  }
}
