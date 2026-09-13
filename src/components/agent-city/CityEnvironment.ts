import * as THREE from 'three';

export class CityEnvironment {
  public group: THREE.Group;
  private streetLanterns: THREE.InstancedMesh | null = null;
  private digitalTrees: THREE.Group | null = null;
  private groundPlane: THREE.Mesh | null = null;
  private gridMesh: THREE.LineSegments | null = null;

  constructor(_theme: 'dark' | 'light' = 'dark') {
    this.group = new THREE.Group();
    this.group.name = 'city-environment';

    this.buildInfiniteDiamondGrid();
    this.buildStreetLanterns();
    this.buildDigitalFlora();
  }

  /**
   * Continuous dark ground plane with glowing neon diamond grid lines
   * fading into the distance with subtle depth fog.
   */
  private buildInfiniteDiamondGrid() {
    // 1. Dark navy/graphite ground plane (#0A1128 / #050814)
    const groundGeo = new THREE.PlaneGeometry(300, 300);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x050814,
      roughness: 0.85,
      metalness: 0.2
    });
    this.groundPlane = new THREE.Mesh(groundGeo, groundMat);
    this.groundPlane.rotation.x = -Math.PI / 2;
    this.groundPlane.position.y = -0.05;
    this.groundPlane.receiveShadow = true;
    this.group.add(this.groundPlane);

    // 2. Primary Rectilinear Grid (diamond pattern when viewed at 45° azimuth)
    const gridExtent = 90;
    const gridStep = 4.5;
    const gridLinesCount = Math.round((gridExtent * 2) / gridStep) + 1;
    const vertices: number[] = [];
    const colors: number[] = [];

    const cyanColor = new THREE.Color(0x00B4D8);
    const darkLineColor = new THREE.Color(0x0E2138);
    const magentaAccent = new THREE.Color(0xF72585);

    for (let i = 0; i < gridLinesCount; i++) {
      const coord = -gridExtent + i * gridStep;
      // Is this a major street line?
      const isMajor = Math.abs(coord % 18) < 0.1;
      const isCenter = Math.abs(coord) < 0.1;
      const lineCol = isCenter ? magentaAccent : isMajor ? cyanColor : darkLineColor;

      // X-parallel line
      vertices.push(-gridExtent, 0.01, coord);
      vertices.push(gridExtent, 0.01, coord);
      colors.push(lineCol.r, lineCol.g, lineCol.b);
      colors.push(lineCol.r, lineCol.g, lineCol.b);

      // Z-parallel line
      vertices.push(coord, 0.01, -gridExtent);
      vertices.push(coord, 0.01, gridExtent);
      colors.push(lineCol.r, lineCol.g, lineCol.b);
      colors.push(lineCol.r, lineCol.g, lineCol.b);
    }

    const gridGeo = new THREE.BufferGeometry();
    gridGeo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    gridGeo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

    const gridMat = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.75
    });

    this.gridMesh = new THREE.LineSegments(gridGeo, gridMat);
    this.group.add(this.gridMesh);
  }

  /**
   * Street-level ground light studs along pedestrian crossings
   */
  private buildStreetLanterns() {
    const lanternCount = 36;
    const studGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.08, 8);
    const studMat = new THREE.MeshBasicMaterial({
      color: 0x00B4D8
    });
    this.streetLanterns = new THREE.InstancedMesh(studGeo, studMat, lanternCount);

    const dummy = new THREE.Object3D();
    let idx = 0;
    const coords = [-27, -9, 9, 27];
    for (const x of coords) {
      for (const z of coords) {
        if (idx < lanternCount) {
          dummy.position.set(x, 0.04, z);
          dummy.updateMatrix();
          this.streetLanterns.setMatrixAt(idx, dummy.matrix);
          idx++;
        }
      }
    }
    this.streetLanterns.instanceMatrix.needsUpdate = true;
    this.group.add(this.streetLanterns);
  }

  /**
   * Digital flora matching reference video:
   * Small round luminous trees on slender trunks (spherical glowing orbs in cyan, emerald, magenta)
   */
  private buildDigitalFlora() {
    this.digitalTrees = new THREE.Group();

    const trunkGeo = new THREE.CylinderGeometry(0.04, 0.05, 0.8, 6);
    const trunkMat = new THREE.MeshStandardMaterial({
      color: 0x1E293B,
      roughness: 0.8
    });

    const sphereGeo = new THREE.SphereGeometry(0.45, 12, 10);

    const treeColors = [
      0x00B4D8, // Cyan
      0x32D74B, // Emerald
      0xF72585, // Magenta
      0x4CC9F0  // Sky Blue
    ];

    // Tree locations along sidewalks and Terrace Park (around [-18, 0, 18])
    const treePositions: [number, number, number][] = [
      // Terrace Park cluster
      [-16, 16, 1], [-20, 16, 1], [-16, 20, 0], [-20, 20, 2],
      [-18, 14.5, 3], [-14.5, 18, 0],
      // Sidewalk corners
      [9, 9, 0], [-9, 9, 1], [9, -9, 2], [-9, -9, 0],
      [27, 9, 1], [27, -9, 3], [-27, 9, 2], [-27, -9, 0],
      [9, 27, 3], [-9, 27, 1], [9, -27, 0], [-9, -27, 2]
    ];

    treePositions.forEach(([x, z, colIdx]) => {
      const tree = new THREE.Group();
      const trunk = new THREE.Mesh(trunkGeo, trunkMat);
      trunk.position.y = 0.4;
      tree.add(trunk);

      const orbMat = new THREE.MeshStandardMaterial({
        color: treeColors[colIdx],
        emissive: treeColors[colIdx],
        emissiveIntensity: 0.65,
        roughness: 0.3
      });
      const orb = new THREE.Mesh(sphereGeo, orbMat);
      orb.position.y = 1.05;
      tree.add(orb);

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
