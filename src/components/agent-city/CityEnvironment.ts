import * as THREE from 'three';

export class CityEnvironment {
  public group: THREE.Group;
  private streetLanterns: THREE.InstancedMesh | null = null;
  private gridIntersectionDots: THREE.InstancedMesh | null = null;
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
   * and glowing dots at line intersections matching reference screenshot frame_12s.
   */
  private buildInfiniteDiamondGrid() {
    // 1. Dark navy/graphite ground plane (#0A1128 / #050814)
    const groundGeo = new THREE.PlaneGeometry(360, 360);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x050A14,
      roughness: 0.85,
      metalness: 0.25
    });
    this.groundPlane = new THREE.Mesh(groundGeo, groundMat);
    this.groundPlane.rotation.x = -Math.PI / 2;
    this.groundPlane.position.y = -0.05;
    this.groundPlane.receiveShadow = true;
    this.group.add(this.groundPlane);

    // 2. Diamond Grid Lines
    const gridExtent = 100;
    const gridStep = 5.0;
    const gridLinesCount = Math.round((gridExtent * 2) / gridStep) + 1;
    const vertices: number[] = [];
    const colors: number[] = [];

    const cyanColor = new THREE.Color(0x00B4D8);
    const darkLineColor = new THREE.Color(0x0D1D30);
    const magentaAccent = new THREE.Color(0xF72585);

    for (let i = 0; i < gridLinesCount; i++) {
      const coord = -gridExtent + i * gridStep;
      const isMajor = Math.abs(coord % 20) < 0.1;
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
      opacity: 0.85
    });

    this.gridMesh = new THREE.LineSegments(gridGeo, gridMat);
    this.group.add(this.gridMesh);

    // 3. Luminous Intersection Dots on Grid (from frame_12s)
    const dotCoords = [-40, -30, -20, -10, 0, 10, 20, 30, 40];
    const totalDots = dotCoords.length * dotCoords.length;
    const dotGeo = new THREE.BoxGeometry(0.25, 0.04, 0.25);
    const dotMat = new THREE.MeshBasicMaterial({ color: 0x38BDF8 });
    this.gridIntersectionDots = new THREE.InstancedMesh(dotGeo, dotMat, totalDots);

    const dummy = new THREE.Object3D();
    let dIdx = 0;
    dotCoords.forEach(x => {
      dotCoords.forEach(z => {
        dummy.position.set(x, 0.02, z);
        dummy.updateMatrix();
        this.gridIntersectionDots?.setMatrixAt(dIdx, dummy.matrix);
        dIdx++;
      });
    });
    this.gridIntersectionDots.instanceMatrix.needsUpdate = true;
    this.group.add(this.gridIntersectionDots);
  }

  /**
   * Street-level ground light studs along pedestrian crossings
   */
  private buildStreetLanterns() {
    const lanternCount = 48;
    const studGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.08, 8);
    const studMat = new THREE.MeshBasicMaterial({ color: 0x00B4D8 });
    this.streetLanterns = new THREE.InstancedMesh(studGeo, studMat, lanternCount);

    const dummy = new THREE.Object3D();
    let idx = 0;
    const coords = [-30, -20, -10, 10, 20, 30];
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
   * Glowing round lollipop trees on slender trunks (spherical luminous orbs in mint green, cyan, hot pink)
   */
  private buildDigitalFlora() {
    this.digitalTrees = new THREE.Group();

    const trunkGeo = new THREE.CylinderGeometry(0.04, 0.05, 0.85, 6);
    const trunkMat = new THREE.MeshStandardMaterial({
      color: 0x0F172A,
      roughness: 0.8
    });

    const sphereGeo = new THREE.SphereGeometry(0.48, 14, 12);

    const treeColors = [
      0x34D399, // Mint green (from frame_12s)
      0x38BDF8, // Cyan (from frame_12s)
      0xF43F5E, // Radiant hot pink (from frame_12s)
      0x818CF8  // Lavender
    ];

    // Tree locations along avenues, corners, and Terrace Park
    const treePositions: [number, number, number][] = [
      // Terrace Park cluster
      [-12, 16, 0], [-8, 16, 0], [-12, 20, 1], [-8, 20, 2],
      [-10, 15, 0], [-14, 18, 1], [-6, 18, 2],
      // Main Avenue corners around Main Tower
      [7, 6, 0], [-7, 6, 1], [7, -6, 2], [-7, -6, 0],
      [11, 2, 1], [-11, 2, 2], [2, 11, 0], [2, -11, 1],
      // Outer Avenues
      [22, 6, 0], [22, -6, 1], [-22, 6, 2], [-22, -6, 0],
      [6, 22, 1], [-6, 22, 0], [6, -22, 2], [-6, -22, 1],
      [28, 16, 0], [-28, 16, 1], [28, -16, 2], [-28, -16, 0],
      [16, 28, 1], [-16, 28, 0], [16, -28, 2], [-16, -28, 1]
    ];

    treePositions.forEach(([x, z, colIdx]) => {
      const tree = new THREE.Group();
      const trunk = new THREE.Mesh(trunkGeo, trunkMat);
      trunk.position.y = 0.42;
      tree.add(trunk);

      const orbMat = new THREE.MeshStandardMaterial({
        color: treeColors[colIdx],
        emissive: treeColors[colIdx],
        emissiveIntensity: 0.75,
        roughness: 0.25
      });
      const orb = new THREE.Mesh(sphereGeo, orbMat);
      orb.position.y = 1.15;
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
