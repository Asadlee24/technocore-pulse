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
  private kineticShuttle: THREE.Mesh | null = null;
  private dataChamberGlass: THREE.Mesh[] = [];

  /**
   * Builds the iconic central landmark: TECHNOCORE KINETIC CORE
   * A sophisticated architectural monument representing autonomous coordination.
   * Features:
   * - Segmented quad-pylon graphite tower with vertical light channels
   * - Transparent data chambers at base with glowing lattice
   * - Moving kinetic data elevator shuttle gliding up and down
   * - Counter-rotating holographic protocol gimbals
   * - Skyway access bridges radiating to the avenues
   * - Scientific honesty: Clearly designed as an architectural visual representation.
   */
  private buildTechnocoreCore() {
    const coreGroup = new THREE.Group();
    coreGroup.name = 'technocore-core';

    const coreHeight = 44;

    // 1. Stepped Multi-Tiered Hexagonal / Octagonal Base Plinth (Wider, Monumental Foundation)
    const baseMat = new THREE.MeshStandardMaterial({
      color: 0x142030, // Readable graphite navy
      roughness: 0.55,
      metalness: 0.65
    });
    const subBaseMat = new THREE.MeshStandardMaterial({
      color: 0x101925,
      roughness: 0.6,
      metalness: 0.7
    });

    // Tier 1: Wide Ground Foundation Plinth (Radius 11.5)
    const tier1 = new THREE.Mesh(new THREE.CylinderGeometry(10.5, 11.8, 1.2, 8), subBaseMat);
    tier1.position.y = 0.6;
    tier1.receiveShadow = true;
    coreGroup.add(tier1);

    // Tier 2: Stepped Podium Plaza (Radius 9.0)
    const tier2 = new THREE.Mesh(new THREE.CylinderGeometry(8.2, 9.4, 1.0, 8), baseMat);
    tier2.position.y = 1.7;
    tier2.receiveShadow = true;
    coreGroup.add(tier2);

    // Tier 3: Chamber Terrace (Radius 7.0)
    const tier3 = new THREE.Mesh(new THREE.CylinderGeometry(6.4, 7.2, 1.0, 8), baseMat);
    tier3.position.y = 2.7;
    tier3.receiveShadow = true;
    coreGroup.add(tier3);

    // 2. Four Transparent Glass Data Chambers around the terrace with interior cyan glow
    const chamberGeo = new THREE.BoxGeometry(2.4, 2.8, 2.2);
    const chamberMat = new THREE.MeshStandardMaterial({
      color: 0x12263F,
      roughness: 0.15,
      metalness: 0.85,
      transparent: true,
      opacity: 0.75
    });
    const chamberCoreMat = new THREE.MeshBasicMaterial({
      color: 0x36D7E7,
      wireframe: true,
      transparent: true,
      opacity: 0.75
    });

    [
      [4.8, 0],
      [-4.8, 0],
      [0, 4.8],
      [0, -4.8]
    ].forEach(([cx, cz]) => {
      const chamber = new THREE.Mesh(chamberGeo, chamberMat);
      chamber.position.set(cx, 4.4, cz);
      coreGroup.add(chamber);
      this.dataChamberGlass.push(chamber);

      const chamberInner = new THREE.Mesh(new THREE.BoxGeometry(1.6, 2.0, 1.4), chamberCoreMat);
      chamberInner.position.set(cx, 4.4, cz);
      coreGroup.add(chamberInner);

      // Radial access bridge connecting each chamber to the central core
      const bridgeGeo = new THREE.BoxGeometry(cx !== 0 ? 2.6 : 1.2, 0.4, cz !== 0 ? 2.6 : 1.2);
      const bridge = new THREE.Mesh(bridgeGeo, baseMat);
      bridge.position.set(cx / 2, 3.4, cz / 2);
      coreGroup.add(bridge);
    });

    // 3. Segmented Quad-Pylon Graphite Tower Body with Architectural Setbacks
    const pylonGeo = new THREE.BoxGeometry(1.2, coreHeight, 1.2);
    const pylonMat = new THREE.MeshStandardMaterial({
      color: 0x162436,
      roughness: 0.45,
      metalness: 0.75
    });

    const pylonOffsets = [
      [-1.4, -1.4],
      [1.4, -1.4],
      [-1.4, 1.4],
      [1.4, 1.4]
    ];

    pylonOffsets.forEach(([px, pz]) => {
      const pylon = new THREE.Mesh(pylonGeo, pylonMat);
      pylon.position.set(px, coreHeight / 2 + 3.2, pz);
      pylon.castShadow = true;
      pylon.receiveShadow = true;
      coreGroup.add(pylon);
    });

    // Horizontal architectural collar rings bracing the central pylons
    const collarMat = new THREE.MeshStandardMaterial({
      color: 0x1E334D,
      metalness: 0.85,
      roughness: 0.35
    });
    for (let y = 10; y < coreHeight; y += 8) {
      const collar = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.45, 4.2), collarMat);
      collar.position.y = y + 3.2;
      coreGroup.add(collar);
    }

    // 4. Central Vertical Light Channel Beam
    const beamGeo = new THREE.CylinderGeometry(0.35, 0.35, coreHeight + 8, 8);
    const beamMat = new THREE.MeshBasicMaterial({
      color: 0x36D7E7,
      transparent: true,
      opacity: 0.75
    });
    this.coreBeamMesh = new THREE.Mesh(beamGeo, beamMat);
    this.coreBeamMesh.position.y = (coreHeight + 8) / 2 + 1.8;
    coreGroup.add(this.coreBeamMesh);

    // 5. Kinetic Data Elevator Shuttle moving along the vertical channel
    const shuttleGeo = new THREE.CylinderGeometry(0.7, 0.7, 1.2, 8);
    const shuttleMat = new THREE.MeshStandardMaterial({
      color: 0x10233B,
      emissive: 0x36D7E7,
      emissiveIntensity: 0.6,
      roughness: 0.2,
      metalness: 0.9
    });
    this.kineticShuttle = new THREE.Mesh(shuttleGeo, shuttleMat);
    this.kineticShuttle.position.y = 8;
    coreGroup.add(this.kineticShuttle);

    // 6. Kinetic Protocol Gimbals & Rotating Datum Rings
    const ringSpecs = [
      { radius: 3.8, tube: 0.09, y: coreHeight - 3, rotX: Math.PI / 2.2, rotZ: 0 },
      { radius: 5.2, tube: 0.07, y: coreHeight - 6, rotX: -Math.PI / 2.5, rotZ: Math.PI / 4 },
      { radius: 6.8, tube: 0.05, y: coreHeight - 10, rotX: Math.PI / 2.1, rotZ: -Math.PI / 3 }
    ];

    ringSpecs.forEach((spec) => {
      const ringGeo = new THREE.TorusGeometry(spec.radius, spec.tube, 8, 48);
      const ringMesh = new THREE.Mesh(ringGeo, this.materials.coreRing);
      ringMesh.position.y = spec.y + 1.8;
      ringMesh.rotation.set(spec.rotX, 0, spec.rotZ);
      coreGroup.add(ringMesh);
      this.coreRings.push(ringMesh);
    });

    // 7. Celestial Gimbal Spire Halo atop the landmark
    const skyRingMat = new THREE.MeshBasicMaterial({
      color: 0x38BDF8,
      transparent: true,
      opacity: 0.45,
      wireframe: true
    });
    const skyRing1 = new THREE.Mesh(new THREE.TorusGeometry(8.5, 0.06, 6, 48), skyRingMat);
    skyRing1.position.y = coreHeight + 8;
    skyRing1.rotation.x = Math.PI / 2;
    coreGroup.add(skyRing1);
    this.coreRings.push(skyRing1);

    // Holographic Communication Sphere at summit
    const sphereGeo = new THREE.IcosahedronGeometry(1.3, 2);
    const sphereMat = new THREE.MeshBasicMaterial({
      color: 0x36D7E7,
      wireframe: true,
      transparent: true,
      opacity: 0.85
    });
    this.holoSphere = new THREE.Mesh(sphereGeo, sphereMat);
    this.holoSphere.position.y = coreHeight + 7.5;
    coreGroup.add(this.holoSphere);

    const innerSphereGeo = new THREE.SphereGeometry(0.65, 16, 16);
    const innerSphereMat = new THREE.MeshBasicMaterial({
      color: 0x4DA3FF,
      transparent: true,
      opacity: 0.9
    });
    const innerSphere = new THREE.Mesh(innerSphereGeo, innerSphereMat);
    this.holoSphere.add(innerSphere);

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

    // Kinetic data elevator shuttle moving along the central vertical channel
    if (this.kineticShuttle) {
      this.kineticShuttle.position.y = 23.5 + Math.sin(time * 0.75) * 18.0;
      this.kineticShuttle.rotation.y = time * 1.4;
    }

    // Subtle breathing in base data chambers
    this.dataChamberGlass.forEach((ch, idx) => {
      const mat = ch.material as THREE.MeshStandardMaterial;
      if (mat) {
        mat.opacity = 0.55 + Math.sin(time * 2 + idx) * 0.15;
      }
    });

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
