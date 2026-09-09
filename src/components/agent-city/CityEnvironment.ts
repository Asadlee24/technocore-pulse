import * as THREE from 'three';

export class CityEnvironment {
  public group: THREE.Group;
  private streetLanterns: THREE.InstancedMesh | null = null;
  private digitalTrees: THREE.Group | null = null;

  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'city-environment';

    this.buildMetropolitanIslandPlatform();
    this.buildStreetLanterns();
    this.buildDigitalFlora();
  }

  /**
   * Builds the foundational digital island platform:
   * Multi-tiered hexagonal plinth with beveled edges and deep dark foundation
   */
  private buildMetropolitanIslandPlatform() {
    // 1. Primary ground base (dark reflective circular platform)
    const platformGeo = new THREE.CylinderGeometry(95, 100, 3.5, 64);
    const platformMat = new THREE.MeshStandardMaterial({
      color: 0x040810,
      roughness: 0.8,
      metalness: 0.3
    });
    const platformMesh = new THREE.Mesh(platformGeo, platformMat);
    platformMesh.position.y = -1.75;
    platformMesh.receiveShadow = true;
    this.group.add(platformMesh);

    // 2. Subterranean Glowing Energy Edge Ring
    const edgeRingGeo = new THREE.TorusGeometry(95.2, 0.3, 8, 96);
    const edgeRingMat = new THREE.MeshBasicMaterial({
      color: 0x36D7E7,
      transparent: true,
      opacity: 0.6
    });
    const edgeRing = new THREE.Mesh(edgeRingGeo, edgeRingMat);
    edgeRing.rotation.x = Math.PI / 2;
    edgeRing.position.y = -0.05;
    this.group.add(edgeRing);

    // 3. Subtle Concentric Foundation Grid
    const gridHelper = new THREE.GridHelper(180, 60, 0x1B2A3D, 0x08101A);
    gridHelper.position.y = 0.01;
    this.group.add(gridHelper);

    // 4. District Boundary Circular Glow Accents
    [12, 28, 44].forEach((radius) => {
      const ringGeo = new THREE.RingGeometry(radius - 0.08, radius + 0.08, 64);
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0x1B2A3D,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.5
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.02;
      this.group.add(ring);
    });
  }

  /**
   * Street lanterns along the inner and outer boulevards
   */
  private buildStreetLanterns() {
    const lanternCount = 32;
    const lampGeo = new THREE.CylinderGeometry(0.04, 0.04, 1.8, 6);
    const lampMat = new THREE.MeshStandardMaterial({ color: 0x1B2A3D });
    this.streetLanterns = new THREE.InstancedMesh(lampGeo, lampMat, lanternCount);

    const dummy = new THREE.Object3D();
    for (let i = 0; i < lanternCount; i++) {
      const angle = (i / lanternCount) * Math.PI * 2;
      const radius = i % 2 === 0 ? 12.8 : 28.6;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;

      dummy.position.set(x, 0.9, z);
      dummy.updateMatrix();
      this.streetLanterns.setMatrixAt(i, dummy.matrix);
    }
    this.streetLanterns.instanceMatrix.needsUpdate = true;
    this.group.add(this.streetLanterns);
  }

  /**
   * Digital crystalline trees/cyber-flora in plaza zones
   */
  private buildDigitalFlora() {
    this.digitalTrees = new THREE.Group();
    const treeTrunkMat = new THREE.MeshBasicMaterial({ color: 0x1B2A3D });
    const foliageMat = new THREE.MeshBasicMaterial({
      color: 0x2FD27F,
      transparent: true,
      opacity: 0.65,
      wireframe: true
    });

    const trunkGeo = new THREE.CylinderGeometry(0.06, 0.1, 1.2, 5);
    const canopyGeo = new THREE.ConeGeometry(0.7, 1.6, 5);

    // Place trees in coordination and social sectors
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
