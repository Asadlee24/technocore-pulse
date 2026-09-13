import * as THREE from 'three';

interface SteamParticle {
  mesh: THREE.Mesh;
  baseX: number;
  baseZ: number;
  speed: number;
  phase: number;
  maxH: number;
}

export class CityEnvironment {
  public group: THREE.Group;
  private streetLanterns: THREE.InstancedMesh | null = null;
  private digitalTrees: THREE.Group | null = null;
  private waterMesh: THREE.Mesh | null = null;
  private steamParticles: SteamParticle[] = [];

  constructor(theme: 'dark' | 'light' = 'dark') {
    this.group = new THREE.Group();
    this.group.name = 'city-environment';

    this.buildMetropolitanIslandPlatform(theme);
    this.buildManhattanWaterRiver(theme);
    this.buildStreetLanterns(theme);
    this.buildCentralParkFlora(theme);
    this.buildStreetSteamGrates();
  }

  /**
   * Builds the foundational Manhattan island platform:
   */
  private buildMetropolitanIslandPlatform(theme: 'dark' | 'light') {
    const isLight = theme === 'light';

    // 1. Primary ground base
    const platformGeo = new THREE.CylinderGeometry(95, 98, 3.5, 64);
    const platformMat = new THREE.MeshStandardMaterial({
      color: isLight ? 0xE8EEF5 : 0x050A14,
      roughness: isLight ? 0.5 : 0.85,
      metalness: isLight ? 0.2 : 0.25
    });
    const platformMesh = new THREE.Mesh(platformGeo, platformMat);
    platformMesh.position.y = -1.75;
    platformMesh.receiveShadow = true;
    this.group.add(platformMesh);

    // 2. Granite Shoreline Seawall Edge Ring
    const edgeRingGeo = new THREE.TorusGeometry(95.2, 0.45, 8, 96);
    const edgeRingMat = new THREE.MeshStandardMaterial({
      color: 0x1E293B,
      roughness: 0.7,
      metalness: 0.3
    });
    const edgeRing = new THREE.Mesh(edgeRingGeo, edgeRingMat);
    edgeRing.rotation.x = Math.PI / 2;
    edgeRing.position.y = -0.05;
    this.group.add(edgeRing);

    // 3. Subtle City Grid Lines
    const gridHelper = new THREE.GridHelper(
      180,
      60,
      isLight ? 0x94A3B8 : 0x1B2A3D,
      isLight ? 0xCBD5E1 : 0x08101A
    );
    gridHelper.position.y = 0.01;
    this.group.add(gridHelper);

    // 4. District Boundary Circular Glow Accents
    [14, 28, 43, 60].forEach((radius) => {
      const ringGeo = new THREE.RingGeometry(radius - 0.08, radius + 0.08, 64);
      const ringMat = new THREE.MeshBasicMaterial({
        color: isLight ? 0x94A3B8 : 0x1E293B,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: isLight ? 0.6 : 0.4
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.02;
      this.group.add(ring);
    });
  }

  /**
   * Hudson & East River Water surrounding Manhattan Island
   */
  private buildManhattanWaterRiver(theme: 'dark' | 'light') {
    const isLight = theme === 'light';
    const waterGeo = new THREE.RingGeometry(94, 150, 64);
    const waterMat = new THREE.MeshStandardMaterial({
      color: isLight ? 0x38BDF8 : 0x031226,
      roughness: 0.15,
      metalness: 0.85,
      transparent: true,
      opacity: 0.88
    });
    this.waterMesh = new THREE.Mesh(waterGeo, waterMat);
    this.waterMesh.rotation.x = -Math.PI / 2;
    this.waterMesh.position.y = -0.6;
    this.group.add(this.waterMesh);
  }

  /**
   * Classic NYC street lampposts with warm glowing lanterns
   */
  private buildStreetLanterns(theme: 'dark' | 'light') {
    const isLight = theme === 'light';
    const lanternCount = 56;
    const lampGeo = new THREE.CylinderGeometry(0.04, 0.05, 2.0, 6);
    const lampMat = new THREE.MeshStandardMaterial({
      color: isLight ? 0x475569 : 0x111C2A,
      metalness: 0.8,
      roughness: 0.3
    });
    this.streetLanterns = new THREE.InstancedMesh(lampGeo, lampMat, lanternCount);

    const bulbMat = new THREE.MeshBasicMaterial({ color: 0xFDE047 });
    const bulbGeo = new THREE.SphereGeometry(0.12, 8, 8);

    const dummy = new THREE.Object3D();
    for (let i = 0; i < lanternCount; i++) {
      const angle = (i / lanternCount) * Math.PI * 2;
      const ringChoice = i % 3;
      const radius = ringChoice === 0 ? 12.8 : ringChoice === 1 ? 26.8 : 41.6;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;

      dummy.position.set(x, 1.0, z);
      dummy.updateMatrix();
      this.streetLanterns.setMatrixAt(i, dummy.matrix);

      // Add warm lantern head
      const bulb = new THREE.Mesh(bulbGeo, bulbMat);
      bulb.position.set(x, 2.05, z);
      this.group.add(bulb);
    }
    this.streetLanterns.instanceMatrix.needsUpdate = true;
    this.group.add(this.streetLanterns);
  }

  /**
   * Central Park inspired organic trees, pathways, and wooden park benches
   */
  private buildCentralParkFlora(theme: 'dark' | 'light') {
    const isLight = theme === 'light';
    this.digitalTrees = new THREE.Group();

    const woodTrunkMat = new THREE.MeshStandardMaterial({
      color: 0x3E2723,
      roughness: 0.9,
      metalness: 0.1
    });

    const foliageMatA = new THREE.MeshStandardMaterial({
      color: isLight ? 0x16A34A : 0x15803D,
      roughness: 0.7,
      metalness: 0.1
    });

    const foliageMatB = new THREE.MeshStandardMaterial({
      color: isLight ? 0x22C55E : 0x166534,
      roughness: 0.7,
      metalness: 0.1
    });

    const benchWoodMat = new THREE.MeshStandardMaterial({ color: 0x854D0E, roughness: 0.8 });
    const benchMetalMat = new THREE.MeshStandardMaterial({ color: 0x1E293B, metalness: 0.9, roughness: 0.3 });

    // Central Park Clusters around sectors
    const parkZones: { cx: number; cz: number; count: number; radius: number }[] = [
      { cx: 8, cz: 8, count: 6, radius: 4 },
      { cx: -8, cz: -8, count: 6, radius: 4 },
      { cx: -8, cz: 8, count: 5, radius: 3.5 },
      { cx: 8, cz: -8, count: 5, radius: 3.5 },
      { cx: 16, cz: 0, count: 4, radius: 3 },
      { cx: -16, cz: 0, count: 4, radius: 3 },
      { cx: 0, cz: 16, count: 4, radius: 3 },
      { cx: 0, cz: -16, count: 4, radius: 3 }
    ];

    parkZones.forEach((zone) => {
      // Grass patch under park cluster
      const grassGeo = new THREE.CylinderGeometry(zone.radius * 1.1, zone.radius * 1.1, 0.08, 16);
      const grassMat = new THREE.MeshStandardMaterial({
        color: isLight ? 0x86EFAC : 0x064E3B,
        roughness: 0.95
      });
      const grass = new THREE.Mesh(grassGeo, grassMat);
      grass.position.set(zone.cx, 0.04, zone.cz);
      this.digitalTrees?.add(grass);

      // Trees in cluster
      for (let i = 0; i < zone.count; i++) {
        const ang = (i / zone.count) * Math.PI * 2 + Math.random() * 0.4;
        const dist = 0.8 + Math.random() * (zone.radius - 1.2);
        const tx = zone.cx + Math.cos(ang) * dist;
        const tz = zone.cz + Math.sin(ang) * dist;

        const tree = new THREE.Group();
        const trunkH = 1.4 + Math.random() * 0.5;
        const trunk = new THREE.Mesh(
          new THREE.CylinderGeometry(0.08, 0.12, trunkH, 6),
          woodTrunkMat
        );
        trunk.position.y = trunkH / 2;
        tree.add(trunk);

        // Multi-tier organic canopy spheres
        const fMat = i % 2 === 0 ? foliageMatA : foliageMatB;
        const canopyR = 0.75 + Math.random() * 0.35;
        const canopy1 = new THREE.Mesh(new THREE.SphereGeometry(canopyR, 8, 8), fMat);
        canopy1.position.y = trunkH + canopyR * 0.6;
        tree.add(canopy1);

        const canopy2 = new THREE.Mesh(new THREE.SphereGeometry(canopyR * 0.7, 7, 7), fMat);
        canopy2.position.set(canopyR * 0.35, trunkH + canopyR * 0.9, 0);
        tree.add(canopy2);

        tree.position.set(tx, 0.04, tz);
        this.digitalTrees?.add(tree);
      }

      // Wooden Park Bench next to path
      const bench = new THREE.Group();
      // Slats
      const seat = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.05, 0.3), benchWoodMat);
      seat.position.y = 0.25;
      bench.add(seat);
      const back = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.22, 0.04), benchWoodMat);
      back.position.set(0, 0.42, -0.13);
      bench.add(back);
      // Legs
      [-0.35, 0.35].forEach((bx) => {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.25, 0.28), benchMetalMat);
        leg.position.set(bx, 0.125, 0);
        bench.add(leg);
      });

      bench.position.set(zone.cx + 1.2, 0.04, zone.cz - 1.2);
      this.digitalTrees?.add(bench);
    });

    this.group.add(this.digitalTrees);
  }

  /**
   * Iconic NYC Rising Steam Grates (manhole steam billowing into the night)
   */
  private buildStreetSteamGrates() {
    const gratePositions: [number, number][] = [
      [11, 4], [-11, -4],
      [4, 11], [-4, -11],
      [22, 8], [-22, -8],
      [-14, 18], [14, -18]
    ];

    const grateGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.04, 16);
    const grateMat = new THREE.MeshStandardMaterial({ color: 0x1E293B, metalness: 0.9, roughness: 0.4 });

    const steamMat = new THREE.MeshBasicMaterial({
      color: 0xE2E8F0,
      transparent: true,
      opacity: 0.28
    });

    gratePositions.forEach(([gx, gz], idx) => {
      // Iron Grate Manhole
      const grate = new THREE.Mesh(grateGeo, grateMat);
      grate.position.set(gx, 0.035, gz);
      this.group.add(grate);

      // Steam Particle Cloud
      for (let p = 0; p < 4; p++) {
        const particleGeo = new THREE.SphereGeometry(0.18 + p * 0.06, 6, 6);
        const particle = new THREE.Mesh(particleGeo, steamMat.clone());
        particle.position.set(gx, 0.1 + p * 0.4, gz);
        this.group.add(particle);

        this.steamParticles.push({
          mesh: particle,
          baseX: gx,
          baseZ: gz,
          speed: 0.65 + p * 0.2,
          phase: (p / 4) * Math.PI * 2 + idx,
          maxH: 2.2 + p * 0.4
        });
      }
    });
  }

  public update(time: number) {
    // Animate rising steam particles
    this.steamParticles.forEach((sp) => {
      const cycle = ((time * sp.speed + sp.phase) % 3.0) / 3.0; // 0 to 1
      sp.mesh.position.y = 0.15 + cycle * sp.maxH;
      const sway = Math.sin(time * 2 + sp.phase) * 0.12;
      sp.mesh.position.x = sp.baseX + sway;
      sp.mesh.position.z = sp.baseZ + Math.cos(time * 2 + sp.phase) * 0.12;

      // Expand as it rises
      const scale = 0.8 + cycle * 1.6;
      sp.mesh.scale.set(scale, scale * 1.2, scale);

      // Fade out near top
      if (sp.mesh.material instanceof THREE.MeshBasicMaterial) {
        sp.mesh.material.opacity = Math.max(0, (1 - cycle) * 0.32);
      }
    });

    // Subtle water rippling
    if (this.waterMesh && this.waterMesh.material instanceof THREE.MeshStandardMaterial) {
      this.waterMesh.material.opacity = 0.82 + Math.sin(time * 1.5) * 0.06;
    }
  }

  public dispose() {
    this.steamParticles = [];
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
  }
}
