import * as THREE from 'three';

export class CitySkyline {
  public group: THREE.Group;
  private instancedBuildings: THREE.InstancedMesh | null = null;
  private instancedAntennae: THREE.InstancedMesh | null = null;
  private instancedSpireBeacons: THREE.InstancedMesh | null = null;

  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'city-skyline-background';

    this.buildMetropolitanSkyline();
  }

  /**
   * Generates 72 procedural background towers and spires in the perimeter zone (radius 44 - 88)
   */
  private buildMetropolitanSkyline() {
    const totalTowers = 64;
    const baseGeo = new THREE.BoxGeometry(1, 1, 1);
    
    // Deep obsidian metallic facade material
    const facadeMat = new THREE.MeshStandardMaterial({
      color: 0x070E18,
      roughness: 0.7,
      metalness: 0.5
    });

    this.instancedBuildings = new THREE.InstancedMesh(baseGeo, facadeMat, totalTowers);
    this.instancedBuildings.castShadow = false;
    this.instancedBuildings.receiveShadow = true;

    // Antenna spires
    const antennaGeo = new THREE.CylinderGeometry(0.04, 0.08, 1, 6);
    const antennaMat = new THREE.MeshBasicMaterial({ color: 0x1B2A3D });
    this.instancedAntennae = new THREE.InstancedMesh(antennaGeo, antennaMat, totalTowers);

    // Spire beacon tip lights
    const beaconGeo = new THREE.SphereGeometry(0.2, 8, 8);
    const beaconMat = new THREE.MeshBasicMaterial({
      color: 0x36D7E7,
      transparent: true,
      opacity: 0.75
    });
    this.instancedSpireBeacons = new THREE.InstancedMesh(beaconGeo, beaconMat, totalTowers);

    const dummy = new THREE.Object3D();
    const dummyAntenna = new THREE.Object3D();
    const dummyBeacon = new THREE.Object3D();

    for (let i = 0; i < totalTowers; i++) {
      const angle = (i / totalTowers) * Math.PI * 2 + (Math.sin(i * 3.7) * 0.05);
      // Ring layers between 44 and 82 radius
      const radiusLayer = 44 + ((i % 4) * 9.5) + (Math.cos(i * 5.1) * 3);
      const x = Math.cos(angle) * radiusLayer;
      const z = Math.sin(angle) * radiusLayer;

      // Varied skyscraper heights (20 to 58)
      const seed = Math.sin(i * 12.9898 + 78.233);
      const height = 18 + Math.abs(seed) * 38;
      const width = 3.5 + ((i % 3) * 1.5);
      const depth = 3.5 + (((i + 1) % 3) * 1.5);

      // Building Box Matrix
      dummy.position.set(x, height / 2, z);
      dummy.scale.set(width, height, depth);
      dummy.rotation.set(0, angle + Math.PI / 2, 0);
      dummy.updateMatrix();
      this.instancedBuildings.setMatrixAt(i, dummy.matrix);

      // Antenna Spires on taller towers
      const antennaHeight = 4 + (i % 3) * 3;
      dummyAntenna.position.set(x, height + antennaHeight / 2, z);
      dummyAntenna.scale.set(1, antennaHeight, 1);
      dummyAntenna.rotation.set(0, 0, 0);
      dummyAntenna.updateMatrix();
      this.instancedAntennae.setMatrixAt(i, dummyAntenna.matrix);

      // Beacon Tip
      dummyBeacon.position.set(x, height + antennaHeight, z);
      dummyBeacon.scale.set(1, 1, 1);
      dummyBeacon.updateMatrix();
      this.instancedSpireBeacons.setMatrixAt(i, dummyBeacon.matrix);
    }

    this.instancedBuildings.instanceMatrix.needsUpdate = true;
    this.instancedAntennae.instanceMatrix.needsUpdate = true;
    this.instancedSpireBeacons.instanceMatrix.needsUpdate = true;

    this.group.add(this.instancedBuildings);
    this.group.add(this.instancedAntennae);
    this.group.add(this.instancedSpireBeacons);
  }

  public dispose() {
    if (this.instancedBuildings) {
      this.instancedBuildings.geometry.dispose();
      (this.instancedBuildings.material as THREE.Material).dispose();
    }
    if (this.instancedAntennae) {
      this.instancedAntennae.geometry.dispose();
      (this.instancedAntennae.material as THREE.Material).dispose();
    }
    if (this.instancedSpireBeacons) {
      this.instancedSpireBeacons.geometry.dispose();
      (this.instancedSpireBeacons.material as THREE.Material).dispose();
    }
  }
}
