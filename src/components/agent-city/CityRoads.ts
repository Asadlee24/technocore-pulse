import * as THREE from 'three';
import type { RoadWaypoints } from './cityLayout';

export class CityRoads {
  public group: THREE.Group;

  constructor(waypoints: RoadWaypoints, theme: 'dark' | 'light' = 'dark') {
    this.group = new THREE.Group();
    this.group.name = 'city-road-network';

    this.buildRoadSurfaces(waypoints, theme);
    this.buildGlowingLaneMarkings(waypoints, theme);
    this.buildElevatedDataFlyovers(theme);
  }

  /**
   * Builds asphalt or clean concrete road surfaces
   */
  private buildRoadSurfaces(waypoints: RoadWaypoints, theme: 'dark' | 'light') {
    const isLight = theme === 'light';
    const roadMat = new THREE.MeshStandardMaterial({
      color: isLight ? 0xCBD5E1 : 0x08101A,
      roughness: isLight ? 0.6 : 0.85,
      metalness: isLight ? 0.1 : 0.15
    });

    // 1. Inner Ring Boulevard (around Core)
    const innerRoadGeo = new THREE.RingGeometry(
      waypoints.innerRingRadius - 1.2,
      waypoints.innerRingRadius + 1.2,
      64
    );
    const innerRoad = new THREE.Mesh(innerRoadGeo, roadMat);
    innerRoad.rotation.x = -Math.PI / 2;
    innerRoad.position.y = 0.03;
    innerRoad.receiveShadow = true;
    this.group.add(innerRoad);

    // 2. Mid Boulevard (Ring 2)
    const outerRoadGeo = new THREE.RingGeometry(
      waypoints.outerRingRadius - 1.4,
      waypoints.outerRingRadius + 1.4,
      64
    );
    const outerRoad = new THREE.Mesh(outerRoadGeo, roadMat);
    outerRoad.rotation.x = -Math.PI / 2;
    outerRoad.position.y = 0.03;
    outerRoad.receiveShadow = true;
    this.group.add(outerRoad);

    // 3. Beltway Highway (Ring 3)
    const beltwayRoadGeo = new THREE.RingGeometry(
      waypoints.beltwayRadius - 1.5,
      waypoints.beltwayRadius + 1.5,
      64
    );
    const beltwayRoad = new THREE.Mesh(beltwayRoadGeo, roadMat);
    beltwayRoad.rotation.x = -Math.PI / 2;
    beltwayRoad.position.y = 0.03;
    beltwayRoad.receiveShadow = true;
    this.group.add(beltwayRoad);

    // 4. Perimeter Ring Road (Radius 60)
    const perimeterRoadGeo = new THREE.RingGeometry(59, 61.6, 64);
    const perimeterRoad = new THREE.Mesh(perimeterRoadGeo, roadMat);
    perimeterRoad.rotation.x = -Math.PI / 2;
    perimeterRoad.position.y = 0.03;
    perimeterRoad.receiveShadow = true;
    this.group.add(perimeterRoad);

    // 5. 8 Radial Grand Avenues
    const avenueWidth = 2.4;
    waypoints.radialAvenues.forEach((ave) => {
      const length = ave.endRadius - ave.startRadius;
      const aveGeo = new THREE.PlaneGeometry(avenueWidth, length);
      const aveMesh = new THREE.Mesh(aveGeo, roadMat);
      aveMesh.rotation.x = -Math.PI / 2;
      aveMesh.rotation.z = -ave.angle - Math.PI / 2;

      const midRadius = (ave.startRadius + ave.endRadius) / 2;
      aveMesh.position.set(
        Math.cos(ave.angle) * midRadius,
        0.035,
        Math.sin(ave.angle) * midRadius
      );
      aveMesh.receiveShadow = true;
      this.group.add(aveMesh);
    });
  }

  /**
   * Builds glowing lane markings
   */
  private buildGlowingLaneMarkings(waypoints: RoadWaypoints, theme: 'dark' | 'light') {
    const isLight = theme === 'light';
    const laneMat = new THREE.MeshBasicMaterial({
      color: isLight ? 0x0284C7 : 0x36D7E7,
      transparent: true,
      opacity: isLight ? 0.85 : 0.65
    });

    const edgeMat = new THREE.MeshBasicMaterial({
      color: isLight ? 0x94A3B8 : 0x1B2A3D,
      transparent: true,
      opacity: 0.8
    });

    // Inner ring glowing divider
    const innerDividerGeo = new THREE.RingGeometry(
      waypoints.innerRingRadius - 0.04,
      waypoints.innerRingRadius + 0.04,
      64
    );
    const innerDivider = new THREE.Mesh(innerDividerGeo, laneMat);
    innerDivider.rotation.x = -Math.PI / 2;
    innerDivider.position.y = 0.045;
    this.group.add(innerDivider);

    // Mid ring glowing divider
    const outerDividerGeo = new THREE.RingGeometry(
      waypoints.outerRingRadius - 0.05,
      waypoints.outerRingRadius + 0.05,
      64
    );
    const outerDivider = new THREE.Mesh(outerDividerGeo, laneMat);
    outerDivider.rotation.x = -Math.PI / 2;
    outerDivider.position.y = 0.045;
    this.group.add(outerDivider);

    // Beltway glowing divider
    const beltwayDividerGeo = new THREE.RingGeometry(
      waypoints.beltwayRadius - 0.05,
      waypoints.beltwayRadius + 0.05,
      64
    );
    const beltwayDivider = new THREE.Mesh(beltwayDividerGeo, laneMat);
    beltwayDivider.rotation.x = -Math.PI / 2;
    beltwayDivider.position.y = 0.045;
    this.group.add(beltwayDivider);

    // Radial avenue centerlines
    waypoints.radialAvenues.forEach((ave) => {
      const length = ave.endRadius - ave.startRadius;
      const lineGeo = new THREE.PlaneGeometry(0.14, length);
      const lineMesh = new THREE.Mesh(lineGeo, laneMat);
      lineMesh.rotation.x = -Math.PI / 2;
      lineMesh.rotation.z = -ave.angle - Math.PI / 2;

      const midRadius = (ave.startRadius + ave.endRadius) / 2;
      lineMesh.position.set(
        Math.cos(ave.angle) * midRadius,
        0.05,
        Math.sin(ave.angle) * midRadius
      );
      this.group.add(lineMesh);

      // Outer curbs
      [-1.2, 1.2].forEach((offset) => {
        const curbGeo = new THREE.PlaneGeometry(0.08, length);
        const curbMesh = new THREE.Mesh(curbGeo, edgeMat);
        curbMesh.rotation.x = -Math.PI / 2;
        curbMesh.rotation.z = -ave.angle - Math.PI / 2;

        const normalAngle = ave.angle + Math.PI / 2;
        curbMesh.position.set(
          Math.cos(ave.angle) * midRadius + Math.cos(normalAngle) * offset,
          0.048,
          Math.sin(ave.angle) * midRadius + Math.sin(normalAngle) * offset
        );
        this.group.add(curbMesh);
      });
    });
  }

  private buildElevatedDataFlyovers(theme: 'dark' | 'light') {
    const isLight = theme === 'light';
    const flyoverMat = new THREE.MeshStandardMaterial({
      color: isLight ? 0xE2E8F0 : 0x0E1724,
      metalness: isLight ? 0.3 : 0.8,
      roughness: 0.3
    });

    const flyoverGlow = new THREE.MeshBasicMaterial({
      color: isLight ? 0x0284C7 : 0x4DA3FF,
      transparent: true,
      opacity: 0.8
    });

    const flyoverPaths = [
      { start: [20, 2, 8], end: [-18, 2, 22] },
      { start: [10, 2.5, -24], end: [-22, 2.5, -12] }
    ];

    flyoverPaths.forEach((path) => {
      const p1 = new THREE.Vector3(path.start[0], path.start[1], path.start[2]);
      const p2 = new THREE.Vector3(path.end[0], path.end[1], path.end[2]);
      const dist = p1.distanceTo(p2);
      const mid = p1.clone().add(p2).multiplyScalar(0.5);

      const bridgeGeo = new THREE.BoxGeometry(1.6, 0.25, dist);
      const bridgeMesh = new THREE.Mesh(bridgeGeo, flyoverMat);
      bridgeMesh.position.copy(mid);
      bridgeMesh.lookAt(p2);
      this.group.add(bridgeMesh);

      const trailGeo = new THREE.BoxGeometry(0.15, 0.05, dist);
      const trailMesh = new THREE.Mesh(trailGeo, flyoverGlow);
      trailMesh.position.set(mid.x, mid.y + 0.16, mid.z);
      trailMesh.lookAt(p2);
      this.group.add(trailMesh);

      const pylonGeo = new THREE.CylinderGeometry(0.18, 0.25, mid.y, 8);
      const pylon = new THREE.Mesh(pylonGeo, flyoverMat);
      pylon.position.set(mid.x, mid.y / 2, mid.z);
      this.group.add(pylon);
    });
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
