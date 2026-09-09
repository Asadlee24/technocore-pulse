import * as THREE from 'three';

export class CityEnvironment {
  public group: THREE.Group;
  private streetLanterns: THREE.InstancedMesh | null = null;
  private digitalTrees: THREE.Group | null = null;

  constructor(theme: 'dark' | 'light' = 'dark') {
    this.group = new THREE.Group();
    this.group.name = 'city-environment';

    this.buildMetropolitanIslandPlatform(theme);
    this.buildStreetLanterns(theme);
    this.buildDigitalFlora(theme);
  }

  /**
   * Builds the foundational digital island platform:
   */
  private buildMetropolitanIslandPlatform(theme: 'dark' | 'light') {
    const isLight = theme === 'light';

    // 1. Primary ground base
    const platformGeo = new THREE.CylinderGeometry(95, 100, 3.5, 64);
    const platformMat = new THREE.MeshStandardMaterial({
      color: isLight ? 0xE8EEF5 : 0x040810,
      roughness: isLight ? 0.5 : 0.8,
      metalness: isLight ? 0.2 : 0.3
    });
    const platformMesh = new THREE.Mesh(platformGeo, platformMat);
    platformMesh.position.y = -1.75;
    platformMesh.receiveShadow = true;
    this.group.add(platformMesh);

    // 2. Subterranean Glowing Energy Edge Ring
    const edgeRingGeo = new THREE.TorusGeometry(95.2, 0.3, 8, 96);
    const edgeRingMat = new THREE.MeshBasicMaterial({
      color: isLight ? 0x0284C7 : 0x36D7E7,
      transparent: true,
      opacity: 0.7
    });
    const edgeRing = new THREE.Mesh(edgeRingGeo, edgeRingMat);
    edgeRing.rotation.x = Math.PI / 2;
    edgeRing.position.y = -0.05;
    this.group.add(edgeRing);

    // 3. Subtle Concentric Foundation Grid
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
        color: isLight ? 0x94A3B8 : 0x1B2A3D,
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

  private buildStreetLanterns(theme: 'dark' | 'light') {
    const isLight = theme === 'light';
    const lanternCount = 48;
    const lampGeo = new THREE.CylinderGeometry(0.05, 0.05, 1.8, 6);
    const lampMat = new THREE.MeshStandardMaterial({
      color: isLight ? 0x64748B : 0x1B2A3D
    });
    this.streetLanterns = new THREE.InstancedMesh(lampGeo, lampMat, lanternCount);

    const dummy = new THREE.Object3D();
    for (let i = 0; i < lanternCount; i++) {
      const angle = (i / lanternCount) * Math.PI * 2;
      const ringChoice = i % 3;
      const radius = ringChoice === 0 ? 12.8 : ringChoice === 1 ? 26.8 : 41.6;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;

      dummy.position.set(x, 0.9, z);
      dummy.updateMatrix();
      this.streetLanterns.setMatrixAt(i, dummy.matrix);
    }
    this.streetLanterns.instanceMatrix.needsUpdate = true;
    this.group.add(this.streetLanterns);
  }

  private buildDigitalFlora(theme: 'dark' | 'light') {
    const isLight = theme === 'light';
    this.digitalTrees = new THREE.Group();
    const treeTrunkMat = new THREE.MeshBasicMaterial({
      color: isLight ? 0x64748B : 0x1B2A3D
    });
    const foliageMat = new THREE.MeshBasicMaterial({
      color: isLight ? 0x10B981 : 0x2FD27F,
      transparent: true,
      opacity: isLight ? 0.75 : 0.65,
      wireframe: true
    });

    const trunkGeo = new THREE.CylinderGeometry(0.06, 0.1, 1.2, 5);
    const canopyGeo = new THREE.ConeGeometry(0.7, 1.6, 5);

    const treePositions: [number, number][] = [
      [8, 7], [9, 5], [7, 9],
      [-8, -7], [-9, -5], [-7, -9],
      [14, 2], [15, -2],
      [-14, 2], [-15, -2]
    ];

    treePositions.forEach(([x, z]) => {
      const tree = new THREE.Group();
      const trunk = new THREE.Mesh(trunkGeo, treeTrunkMat);
      trunk.position.y = 0.6;
      tree.add(trunk);

      const canopy = new THREE.Mesh(canopyGeo, foliageMat);
      canopy.position.y = 1.8;
      tree.add(canopy);

      tree.position.set(x, 0, z);
      this.digitalTrees?.add(tree);
    });

    this.group.add(this.digitalTrees);
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
  }
}
