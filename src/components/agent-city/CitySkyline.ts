import * as THREE from 'three';

export class CitySkyline {
  public group: THREE.Group;
  private instancedBuildings: THREE.InstancedMesh | null = null;
  private instancedAntennae: THREE.InstancedMesh | null = null;
  private instancedSpireBeacons: THREE.InstancedMesh | null = null;
  private instancedWindowStrips: THREE.InstancedMesh | null = null;

  constructor(theme: 'dark' | 'light' = 'dark') {
    this.group = new THREE.Group();
    this.group.name = 'city-skyline-background';

    this.buildMetropolitanSkyline(theme);
  }

  /**
   * Generates 48 luminous background towers and spires in the perimeter horizon (radius 68 - 105)
   * Positioned far outside the camera orbit zone so they never occlude foreground activity.
   */
  private buildMetropolitanSkyline(theme: 'dark' | 'light') {
    const isLight = theme === 'light';
    const totalTowers = 48;
    const baseGeo = new THREE.BoxGeometry(1, 1, 1);

    const facadeMat = new THREE.MeshStandardMaterial({
      color: isLight ? 0xDCE5EE : 0x142338,
      roughness: 0.35,
      metalness: 0.65,
      emissive: isLight ? 0x0284C7 : 0x0D1B2D,
      emissiveIntensity: 0.4
    });

    this.instancedBuildings = new THREE.InstancedMesh(baseGeo, facadeMat, totalTowers);
    this.instancedBuildings.castShadow = false;
    this.instancedBuildings.receiveShadow = true;

    // Antenna spires
    const antennaGeo = new THREE.CylinderGeometry(0.04, 0.08, 1, 6);
    const antennaMat = new THREE.MeshBasicMaterial({
      color: isLight ? 0x94A3B8 : 0x38BDF8
    });
    this.instancedAntennae = new THREE.InstancedMesh(antennaGeo, antennaMat, totalTowers);

    // Spire beacon tip lights (glowing cyan / violet)
    const beaconGeo = new THREE.SphereGeometry(0.3, 8, 8);
    const beaconMat = new THREE.MeshBasicMaterial({
      color: isLight ? 0x0284C7 : 0x36D7E7,
      transparent: true,
      opacity: 0.9
    });
    this.instancedSpireBeacons = new THREE.InstancedMesh(beaconGeo, beaconMat, totalTowers);

    // Vertical neon light strips on facades
    const stripGeo = new THREE.BoxGeometry(0.18, 1, 0.18);
    const stripMat = new THREE.MeshBasicMaterial({
      color: isLight ? 0x38BDF8 : 0x36D7E7,
      transparent: true,
      opacity: 0.85
    });
    this.instancedWindowStrips = new THREE.InstancedMesh(stripGeo, stripMat, totalTowers);

    const dummy = new THREE.Object3D();
    const dummyAntenna = new THREE.Object3D();
    const dummyBeacon = new THREE.Object3D();
    const dummyStrip = new THREE.Object3D();

    for (let i = 0; i < totalTowers; i++) {
      const angle = (i / totalTowers) * Math.PI * 2 + (Math.sin(i * 3.7) * 0.05);
      // Horizon radius: 68 to 105 (completely clear of camera orbit)
      const radiusLayer = 68 + ((i % 5) * 7.5) + (Math.cos(i * 4.1) * 3);
      const x = Math.cos(angle) * radiusLayer;
      const z = Math.sin(angle) * radiusLayer;

      const seed = Math.sin(i * 12.9898 + 78.233);
      const height = 14 + Math.abs(seed) * 22;
      const width = 2.8 + ((i % 3) * 1.0);
      const depth = 2.8 + (((i + 1) % 3) * 1.0);

      dummy.position.set(x, height / 2, z);
      dummy.scale.set(width, height, depth);
      dummy.rotation.set(0, angle + Math.PI / 2, 0);
      dummy.updateMatrix();
      this.instancedBuildings.setMatrixAt(i, dummy.matrix);

      // Antenna
      const antennaHeight = 3 + (i % 3) * 2.5;
      dummyAntenna.position.set(x, height + antennaHeight / 2, z);
      dummyAntenna.scale.set(1, antennaHeight, 1);
      dummyAntenna.rotation.set(0, 0, 0);
      dummyAntenna.updateMatrix();
      this.instancedAntennae.setMatrixAt(i, dummyAntenna.matrix);

      // Beacon
      dummyBeacon.position.set(x, height + antennaHeight, z);
      dummyBeacon.scale.set(1, 1, 1);
      dummyBeacon.updateMatrix();
      this.instancedSpireBeacons.setMatrixAt(i, dummyBeacon.matrix);

      // Vertical neon accent strip
      dummyStrip.position.set(x + (Math.cos(angle + Math.PI/2) * (width/2 + 0.06)), height / 2, z + (Math.sin(angle + Math.PI/2) * (width/2 + 0.06)));
      dummyStrip.scale.set(1, height * 0.75, 1);
      dummyStrip.rotation.set(0, angle + Math.PI / 2, 0);
      dummyStrip.updateMatrix();
      this.instancedWindowStrips.setMatrixAt(i, dummyStrip.matrix);
    }

    this.instancedBuildings.instanceMatrix.needsUpdate = true;
    this.instancedAntennae.instanceMatrix.needsUpdate = true;
    this.instancedSpireBeacons.instanceMatrix.needsUpdate = true;
    this.instancedWindowStrips.instanceMatrix.needsUpdate = true;

    this.group.add(this.instancedBuildings);
    this.group.add(this.instancedAntennae);
    this.group.add(this.instancedSpireBeacons);
    this.group.add(this.instancedWindowStrips);
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
    if (this.instancedWindowStrips) {
      this.instancedWindowStrips.geometry.dispose();
      (this.instancedWindowStrips.material as THREE.Material).dispose();
    }
  }
}
