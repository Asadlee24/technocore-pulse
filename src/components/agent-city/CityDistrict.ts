import * as THREE from 'three';
import type { CityMaterials } from './cityMaterials';
import { PublicPlaza } from './PublicPlaza';

export class CityDistrictManager {
  public group: THREE.Group;
  public plaza: PublicPlaza;

  private materials: CityMaterials;
  private coreRings: THREE.Mesh[] = [];
  private coreBeamMesh: THREE.Mesh | null = null;
  private holoSphere: THREE.Mesh | null = null;
  private dataParticles: THREE.Points | null = null;

  constructor(materials: CityMaterials) {
    this.materials = materials;
    this.group = new THREE.Group();
    this.group.name = 'city-districts-and-core';

    this.plaza = new PublicPlaza();
    this.group.add(this.plaza.group);

    this.buildTechnocoreCore();
    this.buildDistrictBridges();
    this.buildDistrictMarkers();
  }

  /**
   * Builds the iconic central landmark: TECHNOCORE CORE
   * Features:
   * - Monumental hexagonal pillar reaching height 44
   * - Vertical cyan energy plasma column
   * - Rotating protocol rings
   * - Holographic communication sphere atop the spire
   * - Ascending data particles
   * - Multi-tier base plinth with stepped plaza
   */
  private buildTechnocoreCore() {
    const coreGroup = new THREE.Group();
    coreGroup.name = 'technocore-core';

    const coreHeight = 44;

    // 1. Sleek dark hexagonal base tower
    const towerGeo = new THREE.CylinderGeometry(1.8, 3.4, coreHeight, 6);
    const towerMesh = new THREE.Mesh(towerGeo, this.materials.coreColumn);
    towerMesh.position.y = coreHeight / 2;
    coreGroup.add(towerMesh);

    // 2. Cyan vertical energy beam running through the tower center
    const beamGeo = new THREE.CylinderGeometry(0.4, 0.4, coreHeight + 12, 8);
    const beamMat = new THREE.MeshBasicMaterial({
      color: 0x36D7E7,
      transparent: true,
      opacity: 0.85
    });
    this.coreBeamMesh = new THREE.Mesh(beamGeo, beamMat);
    this.coreBeamMesh.position.y = (coreHeight + 12) / 2;
    coreGroup.add(this.coreBeamMesh);

    // 3. Holographic communication sphere atop the central spire
    const sphereGeo = new THREE.IcosahedronGeometry(1.4, 2);
    const sphereMat = new THREE.MeshBasicMaterial({
      color: 0x36D7E7,
      wireframe: true,
      transparent: true,
      opacity: 0.85
    });
    this.holoSphere = new THREE.Mesh(sphereGeo, sphereMat);
    this.holoSphere.position.y = coreHeight + 6.5;
    coreGroup.add(this.holoSphere);

    // Inner glow core for sphere
    const innerSphereGeo = new THREE.SphereGeometry(0.7, 16, 16);
    const innerSphereMat = new THREE.MeshBasicMaterial({
      color: 0x4DA3FF,
      transparent: true,
      opacity: 0.9
    });
    const innerSphere = new THREE.Mesh(innerSphereGeo, innerSphereMat);
    this.holoSphere.add(innerSphere);

    // 4. Three rotating protocol rings around the upper tower
    const ringSpecs = [
      { radius: 4.2, tube: 0.12, y: coreHeight - 4, rotX: Math.PI / 2.3, rotZ: 0 },
      { radius: 5.4, tube: 0.08, y: coreHeight - 7, rotX: -Math.PI / 2.6, rotZ: Math.PI / 4 },
      { radius: 6.8, tube: 0.06, y: coreHeight - 10, rotX: Math.PI / 2.1, rotZ: -Math.PI / 3 }
    ];

    ringSpecs.forEach((spec) => {
      const ringGeo = new THREE.TorusGeometry(spec.radius, spec.tube, 8, 48);
      const ringMesh = new THREE.Mesh(ringGeo, this.materials.coreRing);
      ringMesh.position.y = spec.y;
      ringMesh.rotation.set(spec.rotX, 0, spec.rotZ);
      coreGroup.add(ringMesh);
      this.coreRings.push(ringMesh);
    });

    // Monumental Celestial Sky Gimbal Rings floating above the spire
    const skyRingMat = new THREE.MeshBasicMaterial({
      color: 0x38BDF8,
      transparent: true,
      opacity: 0.5,
      wireframe: true
    });
    const skyRing1 = new THREE.Mesh(new THREE.TorusGeometry(11.5, 0.08, 6, 64), skyRingMat);
    skyRing1.position.y = coreHeight + 8;
    skyRing1.rotation.x = Math.PI / 2;
    coreGroup.add(skyRing1);
    this.coreRings.push(skyRing1);

    const skyRing2 = new THREE.Mesh(new THREE.TorusGeometry(15.5, 0.05, 6, 64), skyRingMat);
    skyRing2.position.y = coreHeight + 11;
    skyRing2.rotation.x = Math.PI / 2.2;
    coreGroup.add(skyRing2);
    this.coreRings.push(skyRing2);

    // 5. Internal data particles ascending the light column
    const particleCount = 50;
    const particleGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 1.0;
      positions[i * 3 + 1] = Math.random() * coreHeight;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 1.0;
    }
    particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const particleMat = new THREE.PointsMaterial({
      color: 0x36D7E7,
      size: 0.35,
      transparent: true,
      opacity: 0.95
    });
    this.dataParticles = new THREE.Points(particleGeo, particleMat);
    coreGroup.add(this.dataParticles);

    // 6. Base podium plinth with stepped tiers
    const plinth1Geo = new THREE.CylinderGeometry(5.6, 6.8, 1.2, 8);
    const plinth1Mesh = new THREE.Mesh(plinth1Geo, this.materials.facadeBase);
    plinth1Mesh.position.y = 0.6;
    coreGroup.add(plinth1Mesh);

    const plinth2Geo = new THREE.CylinderGeometry(7.2, 8.4, 0.6, 8);
    const plinth2Mesh = new THREE.Mesh(plinth2Geo, this.materials.facadeBase);
    plinth2Mesh.position.y = 0.3;
    coreGroup.add(plinth2Mesh);

    this.group.add(coreGroup);
  }

  /**
   * 8 Grand bridges radiating outward to all 8 districts
   */
  private buildDistrictBridges() {
    const totalDistricts = 8;
    const bridgeGeo = new THREE.BoxGeometry(1.8, 0.25, 8.5);
    const bridgeMat = new THREE.MeshStandardMaterial({
      color: 0x101A2A,
      roughness: 0.4,
      metalness: 0.8
    });

    const bridgeGlowMat = new THREE.MeshBasicMaterial({
      color: 0x36D7E7,
      transparent: true,
      opacity: 0.6
    });

    for (let i = 0; i < totalDistricts; i++) {
      const angle = (i / totalDistricts) * Math.PI * 2;
      const bridge = new THREE.Mesh(bridgeGeo, bridgeMat);
      bridge.rotation.y = angle;
      const dist = 9.8;
      bridge.position.set(Math.sin(angle) * dist, 0.45, Math.cos(angle) * dist);
      this.group.add(bridge);

      // Light center strip on bridge
      const stripGeo = new THREE.BoxGeometry(0.12, 0.05, 8.5);
      const strip = new THREE.Mesh(stripGeo, bridgeGlowMat);
      strip.rotation.y = angle;
      strip.position.set(Math.sin(angle) * dist, 0.6, Math.cos(angle) * dist);
      this.group.add(strip);
    }
  }

  /**
   * District Gateway Pylons marking the entrance of the 8 canonical sectors
   */
  private buildDistrictMarkers() {
    const totalDistricts = 8;
    const pylonGeo = new THREE.BoxGeometry(0.5, 3.8, 0.5);
    const pylonMat = new THREE.MeshStandardMaterial({
      color: 0x0E1724,
      metalness: 0.8
    });

    const markerColors = [
      0x36D7E7, // coordination
      0x4DA3FF, // work
      0x38BDF8, // research
      0xA855F7, // compute
      0x2FD27F, // settlement
      0xF472B6, // social
      0xF0A824, // broadcast
      0x94A3B8  // infrastructure
    ];

    for (let i = 0; i < totalDistricts; i++) {
      const angle = (i / totalDistricts) * Math.PI * 2;
      const radius = 13.5;
      
      [-0.9, 0.9].forEach(offset => {
        const marker = new THREE.Mesh(pylonGeo, pylonMat);
        const normAngle = angle + Math.PI / 2;
        marker.position.set(
          Math.cos(angle) * radius + Math.cos(normAngle) * offset,
          1.9,
          Math.sin(angle) * radius + Math.sin(normAngle) * offset
        );
        this.group.add(marker);

        // Top emitter beacon
        const beaconGeo = new THREE.SphereGeometry(0.18, 8, 8);
        const beaconMat = new THREE.MeshBasicMaterial({ color: markerColors[i] });
        const beacon = new THREE.Mesh(beaconGeo, beaconMat);
        beacon.position.set(
          marker.position.x,
          4.0,
          marker.position.z
        );
        this.group.add(beacon);
      });
    }
  }

  public update(time: number) {
    // Animate rotating protocol rings
    this.coreRings.forEach((ring, idx) => {
      const speed = (idx % 2 === 0 ? 0.35 : -0.28) * (1 + idx * 0.2);
      ring.rotation.z = time * speed;
    });

    // Holographic sphere rotation & float
    if (this.holoSphere) {
      this.holoSphere.rotation.y = time * 0.5;
      this.holoSphere.rotation.x = Math.sin(time * 0.8) * 0.2;
    }

    // Central beam pulse
    if (this.coreBeamMesh) {
      const pulse = 0.75 + Math.sin(time * 3.5) * 0.2;
      (this.coreBeamMesh.material as THREE.MeshBasicMaterial).opacity = pulse;
    }

    // Ascending data particles
    if (this.dataParticles) {
      const posAttr = this.dataParticles.geometry.attributes.position;
      const arr = posAttr.array as Float32Array;
      for (let i = 0; i < arr.length; i += 3) {
        arr[i + 1] += 0.14;
        if (arr[i + 1] > 44) arr[i + 1] = 0;
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
