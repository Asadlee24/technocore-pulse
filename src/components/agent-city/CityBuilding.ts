import * as THREE from 'three';
import type { RoomCluster } from '../../types/probe';
import type { BuildingLayout } from './cityLayout';
import type { CityMaterials } from './cityMaterials';
import { OfficeInterior } from './OfficeInterior';
import { AgentWorker } from './AgentWorker';

export class CityBuilding {
  public group: THREE.Group;
  public layout: BuildingLayout;
  public beaconMesh: THREE.Mesh | null = null;
  public beaconGlowMesh: THREE.Mesh | null = null;
  public windowMesh: THREE.InstancedMesh | null = null;
  public interior: OfficeInterior;
  public rooftopAgents: AgentWorker[] = [];
  public isCutaway: boolean = false;
  public hitMesh: THREE.Mesh;

  private buildingMesh!: THREE.Mesh;
  private setbackMesh: THREE.Mesh | null = null;
  private podiumMesh: THREE.Mesh | null = null;
  private baseFacadeMat: THREE.Material;
  private crownGroup: THREE.Group | null = null;
  public architecturalDetails: THREE.Group = new THREE.Group();

  constructor(layout: BuildingLayout, _materials: CityMaterials) {
    this.layout = layout;
    this.group = new THREE.Group();
    this.group.position.set(...layout.position);
    this.group.name = `building-${layout.room.id}`;

    // Full-Volume Raycast Collider: Envelopes entire building volume (podium to rooftop beacon)
    // Ensures raycast clicks NEVER pass through to buildings behind, even when cutaway is open!
    const hitTotalH = layout.height + 3.5;
    const hitGeo = new THREE.BoxGeometry(layout.width * 1.18, hitTotalH, layout.depth * 1.18);
    const hitMat = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0,
      depthWrite: false
    });
    this.hitMesh = new THREE.Mesh(hitGeo, hitMat);
    this.hitMesh.position.y = hitTotalH / 2;
    this.hitMesh.userData = { room: layout.room, buildingId: layout.room.id };
    this.group.add(this.hitMesh);

    // 0. Ground Plaza / Sidewalk Parcel Base (Grounds building realistically into the city)
    const plazaGeo = new THREE.BoxGeometry(layout.width * 1.35, 0.28, layout.depth * 1.35);
    const plazaMat = new THREE.MeshStandardMaterial({
      color: 0x09101C,
      roughness: 0.85,
      metalness: 0.15
    });
    const plaza = new THREE.Mesh(plazaGeo, plazaMat);
    plaza.position.y = 0.14;
    plaza.receiveShadow = true;
    this.group.add(plaza);

    const curbEdges = new THREE.EdgesGeometry(plazaGeo);
    const curbLine = new THREE.LineSegments(
      curbEdges,
      new THREE.LineBasicMaterial({ color: 0x1B2A3D, transparent: true, opacity: 0.4 })
    );
    curbLine.position.y = 0.14;
    this.group.add(curbLine);

    // 1. Street-Level Lobby Podium with Entrance Glass
    const podiumH = 2.2;
    const podiumGeo = new THREE.BoxGeometry(layout.width * 1.16, podiumH, layout.depth * 1.16);
    const districtCol = new THREE.Color(layout.color);
    const podiumMat = new THREE.MeshStandardMaterial({
      color: districtCol.clone().lerp(new THREE.Color(0x132238), 0.6),
      emissive: districtCol.clone().multiplyScalar(0.2),
      roughness: 0.3,
      metalness: 0.7
    });
    this.podiumMesh = new THREE.Mesh(podiumGeo, podiumMat);
    this.podiumMesh.position.y = podiumH / 2 + 0.28;
    this.podiumMesh.castShadow = true;
    this.podiumMesh.receiveShadow = true;
    this.podiumMesh.userData = { room: layout.room };
    this.group.add(this.podiumMesh);

    // Warm Illuminated Lobby Glass Front
    const lobbyGeo = new THREE.BoxGeometry(layout.width * 0.55, 1.4, 0.08);
    const lobbyMat = new THREE.MeshBasicMaterial({
      color: 0xFDE047,
      transparent: true,
      opacity: 0.95
    });
    const lobbyFront = new THREE.Mesh(lobbyGeo, lobbyMat);
    lobbyFront.position.set(0, 1.1 + 0.28, (layout.depth * 1.16) / 2 + 0.04);
    this.group.add(lobbyFront);

    // Lobby Entrance Canopy
    const canopyGeo = new THREE.BoxGeometry(layout.width * 0.65, 0.1, 1.1);
    const canopyMesh = new THREE.Mesh(canopyGeo, podiumMat);
    canopyMesh.position.set(0, 2.0 + 0.28, (layout.depth * 1.16) / 2 + 0.55);
    this.group.add(canopyMesh);

    // 2. Refined Architectural Readable Graphite & Deep Navy Facade (18-25% brightness target)
    const isSurge = layout.room.status === 'surge';
    const facadeBaseCol = new THREE.Color(0x152233).lerp(districtCol, 0.14);
    const emissiveCol = isSurge
      ? districtCol.clone().multiplyScalar(0.25)
      : new THREE.Color(0x0A1422);

    this.baseFacadeMat = new THREE.MeshStandardMaterial({
      color: facadeBaseCol,
      emissive: emissiveCol,
      roughness: 0.58,
      metalness: 0.5
    });

    const lineMat = new THREE.LineBasicMaterial({
      color: isSurge ? districtCol : new THREE.Color(0x324A6A),
      transparent: true,
      opacity: 0.6
    });

    // 3. Archetype-Specific Procedural Architecture
    const towerBaseY = podiumH + 0.28;
    const totalTowerHeight = layout.height - towerBaseY;
    this.createArchetypeArchitecture(layout, towerBaseY, totalTowerHeight, lineMat, districtCol);

    // 4. Multi-Hue Illuminated Night Windows
    this.createWindows(layout);

    // 5. Archetype-Specific Architectural Roof Crown
    this.createArchitecturalCrown(layout);

    // 6. Rooftop Beacon & Antenna
    this.createRooftopBeacon(layout);

    // 7. Rooftop & Setback Observation Deck Agents
    const hasSetback = layout.height >= 16 || layout.archetype === 'stepped-tower';
    const lowerH = totalTowerHeight * (layout.archetype === 'stepped-tower' ? 0.44 : 0.68);
    this.createRooftopAgents(layout, hasSetback, towerBaseY, lowerH);

    // 8. Living Agent Office Interior
    this.interior = new OfficeInterior(layout);
    this.group.add(this.interior.group);
  }

  /**
   * Procedural Archetype Architectural Pipeline
   * Generates distinct structural silhouettes, glass sections, cantilevered wings, and cooling fins.
   */
  private createArchetypeArchitecture(
    layout: BuildingLayout,
    towerBaseY: number,
    totalTowerHeight: number,
    lineMat: THREE.LineBasicMaterial,
    districtCol: THREE.Color
  ) {
    this.group.add(this.architecturalDetails);

    const accentMat = new THREE.MeshBasicMaterial({
      color: districtCol,
      transparent: true,
      opacity: 0.85
    });

    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x1A3554,
      emissive: districtCol.clone().multiplyScalar(0.2),
      roughness: 0.15,
      metalness: 0.9,
      transparent: true,
      opacity: 0.82
    });

    switch (layout.archetype) {
      case 'skyscraper': {
        // Coordination Flagships & Soaring Towers:
        // Slender tapered octagonal profile with vertical luminous cyan conduits
        const lowerH = totalTowerHeight * 0.65;
        const upperH = totalTowerHeight * 0.35;

        // Lower body
        const lowerGeo = new THREE.BoxGeometry(layout.width, lowerH, layout.depth);
        this.buildingMesh = new THREE.Mesh(lowerGeo, this.baseFacadeMat);
        this.buildingMesh.position.y = towerBaseY + lowerH / 2;
        this.buildingMesh.castShadow = true;
        this.buildingMesh.receiveShadow = true;
        this.buildingMesh.userData = { room: layout.room };
        this.group.add(this.buildingMesh);

        const lowerEdges = new THREE.EdgesGeometry(lowerGeo);
        const lowerLine = new THREE.LineSegments(lowerEdges, lineMat);
        lowerLine.position.y = towerBaseY + lowerH / 2;
        this.architecturalDetails.add(lowerLine);

        // Upper setback tower
        const upperGeo = new THREE.BoxGeometry(layout.width * 0.78, upperH, layout.depth * 0.78);
        this.setbackMesh = new THREE.Mesh(upperGeo, this.baseFacadeMat);
        this.setbackMesh.position.y = towerBaseY + lowerH + upperH / 2;
        this.setbackMesh.castShadow = true;
        this.setbackMesh.receiveShadow = true;
        this.setbackMesh.userData = { room: layout.room };
        this.group.add(this.setbackMesh);

        const upperEdges = new THREE.EdgesGeometry(upperGeo);
        const upperLine = new THREE.LineSegments(upperEdges, lineMat);
        upperLine.position.y = towerBaseY + lowerH + upperH / 2;
        this.architecturalDetails.add(upperLine);

        // Recessed vertical glowing cyan light channels running full height along 4 faces
        const channelW = 0.18;
        const channelH = totalTowerHeight;
        const halfW = layout.width / 2;
        const halfD = layout.depth / 2;

        [
          [0, halfD + 0.02, 0],
          [0, -halfD - 0.02, 0],
          [halfW + 0.02, 0, Math.PI / 2],
          [-halfW - 0.02, 0, Math.PI / 2]
        ].forEach(([cx, cz, rotY]) => {
          const channel = new THREE.Mesh(
            new THREE.BoxGeometry(channelW, channelH * 0.96, 0.06),
            accentMat
          );
          channel.position.set(cx, towerBaseY + channelH / 2, cz);
          channel.rotation.y = rotY;
          this.architecturalDetails.add(channel);
        });

        // Mid-level illuminated observation reveal band at setback level
        const revealGeo = new THREE.BoxGeometry(layout.width * 0.84, 0.45, layout.depth * 0.84);
        const revealMesh = new THREE.Mesh(revealGeo, glassMat);
        revealMesh.position.y = towerBaseY + lowerH;
        this.architecturalDetails.add(revealMesh);
        break;
      }

      case 'stepped-tower': {
        // Multi-tier Stepped Ziggurat Architecture:
        // 3 distinct stepped setback tiers with observation terrace balustrades
        const h1 = totalTowerHeight * 0.44;
        const h2 = totalTowerHeight * 0.32;
        const h3 = totalTowerHeight * 0.24;

        // Tier 1 (Base Body)
        const t1Geo = new THREE.BoxGeometry(layout.width, h1, layout.depth);
        this.buildingMesh = new THREE.Mesh(t1Geo, this.baseFacadeMat);
        this.buildingMesh.position.y = towerBaseY + h1 / 2;
        this.buildingMesh.castShadow = true;
        this.buildingMesh.receiveShadow = true;
        this.buildingMesh.userData = { room: layout.room };
        this.group.add(this.buildingMesh);

        const t1Edges = new THREE.EdgesGeometry(t1Geo);
        const t1Line = new THREE.LineSegments(t1Edges, lineMat);
        t1Line.position.y = towerBaseY + h1 / 2;
        this.architecturalDetails.add(t1Line);

        // Tier 2 (Mid Setback)
        const w2 = layout.width * 0.76;
        const d2 = layout.depth * 0.76;
        const t2Geo = new THREE.BoxGeometry(w2, h2, d2);
        this.setbackMesh = new THREE.Mesh(t2Geo, this.baseFacadeMat);
        this.setbackMesh.position.y = towerBaseY + h1 + h2 / 2;
        this.setbackMesh.castShadow = true;
        this.setbackMesh.receiveShadow = true;
        this.setbackMesh.userData = { room: layout.room };
        this.group.add(this.setbackMesh);

        const t2Edges = new THREE.EdgesGeometry(t2Geo);
        const t2Line = new THREE.LineSegments(t2Edges, lineMat);
        t2Line.position.y = towerBaseY + h1 + h2 / 2;
        this.architecturalDetails.add(t2Line);

        // Tier 3 (Upper Setback Pinnacle)
        const w3 = layout.width * 0.52;
        const d3 = layout.depth * 0.52;
        const t3Geo = new THREE.BoxGeometry(w3, h3, d3);
        const t3Mesh = new THREE.Mesh(t3Geo, this.baseFacadeMat);
        t3Mesh.position.y = towerBaseY + h1 + h2 + h3 / 2;
        t3Mesh.castShadow = true;
        t3Mesh.receiveShadow = true;
        this.architecturalDetails.add(t3Mesh);

        const t3Edges = new THREE.EdgesGeometry(t3Geo);
        const t3Line = new THREE.LineSegments(t3Edges, lineMat);
        t3Line.position.y = towerBaseY + h1 + h2 + h3 / 2;
        this.architecturalDetails.add(t3Line);

        // Illuminated step risers / balustrades along tier 1 and tier 2 edges
        const rail1Geo = new THREE.BoxGeometry(layout.width * 0.98, 0.35, layout.depth * 0.98);
        const rail1 = new THREE.Mesh(rail1Geo, glassMat);
        rail1.position.y = towerBaseY + h1 + 0.18;
        this.architecturalDetails.add(rail1);

        const rail2Geo = new THREE.BoxGeometry(w2 * 0.98, 0.35, d2 * 0.98);
        const rail2 = new THREE.Mesh(rail2Geo, glassMat);
        rail2.position.y = towerBaseY + h1 + h2 + 0.18;
        this.architecturalDetails.add(rail2);
        break;
      }

      case 'research-lab': {
        // Research Innovation Lab:
        // Asymmetric composition with cantilevered observation wing & cylindrical diagnostic silo
        const coreW = layout.width * 0.72;
        const coreD = layout.depth * 0.78;
        const coreGeo = new THREE.BoxGeometry(coreW, totalTowerHeight, coreD);
        this.buildingMesh = new THREE.Mesh(coreGeo, this.baseFacadeMat);
        this.buildingMesh.position.set(-layout.width * 0.1, towerBaseY + totalTowerHeight / 2, 0);
        this.buildingMesh.castShadow = true;
        this.buildingMesh.receiveShadow = true;
        this.buildingMesh.userData = { room: layout.room };
        this.group.add(this.buildingMesh);

        const coreEdges = new THREE.EdgesGeometry(coreGeo);
        const coreLine = new THREE.LineSegments(coreEdges, lineMat);
        coreLine.position.set(-layout.width * 0.1, towerBaseY + totalTowerHeight / 2, 0);
        this.architecturalDetails.add(coreLine);

        // Cantilevered horizontal observation wing projecting outward at mid-height
        const wingW = layout.width * 0.88;
        const wingH = Math.min(4.8, totalTowerHeight * 0.32);
        const wingD = layout.depth * 0.52;
        const wingY = towerBaseY + totalTowerHeight * 0.52;
        const wingGeo = new THREE.BoxGeometry(wingW, wingH, wingD);
        const wingMesh = new THREE.Mesh(wingGeo, this.baseFacadeMat);
        wingMesh.position.set(0, wingY, layout.depth * 0.18);
        this.architecturalDetails.add(wingMesh);

        // Panoramic ribbon glass facade wrapping the cantilever wing
        const ribbonGeo = new THREE.BoxGeometry(wingW + 0.08, wingH * 0.48, wingD + 0.08);
        const ribbon = new THREE.Mesh(ribbonGeo, glassMat);
        ribbon.position.set(0, wingY, layout.depth * 0.18);
        this.architecturalDetails.add(ribbon);

        // Flanking cylindrical diagnostic sensor silo
        const siloRadius = layout.width * 0.22;
        const siloH = totalTowerHeight * 0.85;
        const siloGeo = new THREE.CylinderGeometry(siloRadius, siloRadius, siloH, 16);
        const siloMat = new THREE.MeshStandardMaterial({
          color: 0x111E2E,
          metalness: 0.85,
          roughness: 0.3
        });
        const silo = new THREE.Mesh(siloGeo, siloMat);
        silo.position.set(layout.width * 0.36, towerBaseY + siloH / 2, -layout.depth * 0.2);
        this.architecturalDetails.add(silo);

        // Vertical cyan pulse conduit along the silo
        const conduitGeo = new THREE.CylinderGeometry(0.05, 0.05, siloH, 8);
        const conduit = new THREE.Mesh(conduitGeo, accentMat);
        conduit.position.set(layout.width * 0.36 + siloRadius + 0.04, towerBaseY + siloH / 2, -layout.depth * 0.2);
        this.architecturalDetails.add(conduit);
        break;
      }

      case 'data-center': {
        // Compute Monolith & Heatsink Slabs:
        // Wide horizontal monolith with vertical cooling heatsink fin louvers
        const mainGeo = new THREE.BoxGeometry(layout.width, totalTowerHeight, layout.depth);
        this.buildingMesh = new THREE.Mesh(mainGeo, this.baseFacadeMat);
        this.buildingMesh.position.y = towerBaseY + totalTowerHeight / 2;
        this.buildingMesh.castShadow = true;
        this.buildingMesh.receiveShadow = true;
        this.buildingMesh.userData = { room: layout.room };
        this.group.add(this.buildingMesh);

        const edges = new THREE.EdgesGeometry(mainGeo);
        const line = new THREE.LineSegments(edges, lineMat);
        line.position.y = towerBaseY + totalTowerHeight / 2;
        this.architecturalDetails.add(line);

        // Vertical cooling fin arrays extruded on front and rear facades
        const finCount = 6;
        const finMat = new THREE.MeshStandardMaterial({
          color: 0x0C1522,
          roughness: 0.4,
          metalness: 0.9
        });
        const finH = totalTowerHeight * 0.78;
        const finW = 0.09;
        const finD = 0.35;

        for (let i = 0; i < finCount; i++) {
          const xPos = -layout.width / 2 + (layout.width / (finCount + 1)) * (i + 1);

          // Front fin
          const fFin = new THREE.Mesh(new THREE.BoxGeometry(finW, finH, finD), finMat);
          fFin.position.set(xPos, towerBaseY + totalTowerHeight * 0.46, layout.depth / 2 + finD / 2);
          this.architecturalDetails.add(fFin);

          // Rear fin
          const rFin = new THREE.Mesh(new THREE.BoxGeometry(finW, finH, finD), finMat);
          rFin.position.set(xPos, towerBaseY + totalTowerHeight * 0.46, -layout.depth / 2 - finD / 2);
          this.architecturalDetails.add(rFin);
        }

        // Horizontal server rack ventilation slot bands with glowing recessed core
        [-layout.depth / 2 - 0.02, layout.depth / 2 + 0.02].forEach(zPos => {
          const ventGeo = new THREE.BoxGeometry(layout.width * 0.88, 0.42, 0.08);
          const vent = new THREE.Mesh(ventGeo, accentMat);
          vent.position.set(0, towerBaseY + totalTowerHeight * 0.3, zPos);
          this.architecturalDetails.add(vent);

          const vent2 = new THREE.Mesh(ventGeo, accentMat);
          vent2.position.set(0, towerBaseY + totalTowerHeight * 0.65, zPos);
          this.architecturalDetails.add(vent2);
        });
        break;
      }

      case 'settlement-vault': {
        // Settlement Fortress / Armored Bastion:
        // Heavy angular trapezoidal fortress with battered sloped corner buttresses
        const vaultGeo = new THREE.BoxGeometry(layout.width * 0.92, totalTowerHeight, layout.depth * 0.92);
        this.buildingMesh = new THREE.Mesh(vaultGeo, this.baseFacadeMat);
        this.buildingMesh.position.y = towerBaseY + totalTowerHeight / 2;
        this.buildingMesh.castShadow = true;
        this.buildingMesh.receiveShadow = true;
        this.buildingMesh.userData = { room: layout.room };
        this.group.add(this.buildingMesh);

        const edges = new THREE.EdgesGeometry(vaultGeo);
        const line = new THREE.LineSegments(edges, lineMat);
        line.position.y = towerBaseY + totalTowerHeight / 2;
        this.architecturalDetails.add(line);

        // 4 Battered corner armor buttresses (wider at ground, tapering upward for heavy fortress bunker silhouette)
        const buttressH = totalTowerHeight * 0.72;
        const buttressMat = new THREE.MeshStandardMaterial({
          color: 0x121D2C,
          roughness: 0.65,
          metalness: 0.6
        });

        [-1, 1].forEach(xSign => {
          [-1, 1].forEach(zSign => {
            const buttressGeo = new THREE.CylinderGeometry(0.35, 0.72, buttressH, 4);
            const buttress = new THREE.Mesh(buttressGeo, buttressMat);
            buttress.position.set(
              (layout.width * 0.44) * xSign,
              towerBaseY + buttressH / 2,
              (layout.depth * 0.44) * zSign
            );
            buttress.rotation.y = Math.PI / 4;
            this.architecturalDetails.add(buttress);
          });
        });

        // Cryptographic security shield band with subtle green accent
        const shieldGeo = new THREE.BoxGeometry(layout.width * 0.98, 0.4, layout.depth * 0.98);
        const shield = new THREE.Mesh(shieldGeo, accentMat);
        shield.position.y = towerBaseY + totalTowerHeight * 0.85;
        this.architecturalDetails.add(shield);
        break;
      }

      case 'social-block': {
        // Social Modular Pavilion & Sky Garden Terrace:
        // Open courtyard architecture with covered colonnade, stepped terrace gardens, and glowing pergola
        const pavilionH = totalTowerHeight * 0.86;
        const mainGeo = new THREE.BoxGeometry(layout.width, pavilionH, layout.depth);
        this.buildingMesh = new THREE.Mesh(mainGeo, this.baseFacadeMat);
        this.buildingMesh.position.y = towerBaseY + pavilionH / 2;
        this.buildingMesh.castShadow = true;
        this.buildingMesh.receiveShadow = true;
        this.buildingMesh.userData = { room: layout.room };
        this.group.add(this.buildingMesh);

        const edges = new THREE.EdgesGeometry(mainGeo);
        const line = new THREE.LineSegments(edges, lineMat);
        line.position.y = towerBaseY + pavilionH / 2;
        this.architecturalDetails.add(line);

        // Open lobby arcade colonnade: 4 slender pillars at ground entrance
        const pillarMat = new THREE.MeshStandardMaterial({ color: 0x19283B, metalness: 0.8 });
        [-0.7, -0.25, 0.25, 0.7].forEach(xP => {
          const colGeo = new THREE.CylinderGeometry(0.08, 0.08, 2.0, 8);
          const col = new THREE.Mesh(colGeo, pillarMat);
          col.position.set(xP * layout.width * 0.5, towerBaseY + 1.0, layout.depth * 0.52);
          this.architecturalDetails.add(col);
        });

        // Stepped sky garden terrace with illuminated glass pergola
        const terraceGeo = new THREE.BoxGeometry(layout.width * 0.75, 0.25, layout.depth * 0.75);
        const terrace = new THREE.Mesh(terraceGeo, glassMat);
        terrace.position.y = towerBaseY + pavilionH + 0.12;
        this.architecturalDetails.add(terrace);
        break;
      }

      case 'broadcast-hall': {
        // Public Communication Broadcast Center:
        // Hexagonal tower with external diagonal steel lattice framework and transmission masts
        const towerRadius = layout.width * 0.52;
        const hexGeo = new THREE.CylinderGeometry(towerRadius * 0.85, towerRadius, totalTowerHeight, 6);
        this.buildingMesh = new THREE.Mesh(hexGeo, this.baseFacadeMat);
        this.buildingMesh.position.y = towerBaseY + totalTowerHeight / 2;
        this.buildingMesh.castShadow = true;
        this.buildingMesh.receiveShadow = true;
        this.buildingMesh.userData = { room: layout.room };
        this.group.add(this.buildingMesh);

        // External diagonal steel lattice truss wireframe
        const latticeGeo = new THREE.WireframeGeometry(
          new THREE.BoxGeometry(layout.width * 1.05, totalTowerHeight, layout.depth * 1.05)
        );
        const latticeMesh = new THREE.LineSegments(latticeGeo, lineMat);
        latticeMesh.position.y = towerBaseY + totalTowerHeight / 2;
        this.architecturalDetails.add(latticeMesh);

        // Luminous signal broadcast ring at 3/4 height
        const ringGeo = new THREE.TorusGeometry(towerRadius * 0.95, 0.08, 6, 24);
        const ring = new THREE.Mesh(ringGeo, accentMat);
        ring.rotation.x = Math.PI / 2;
        ring.position.y = towerBaseY + totalTowerHeight * 0.75;
        this.architecturalDetails.add(ring);
        break;
      }

      case 'utility-structure': {
        // Infrastructure Substation & Industrial Gantry Hub:
        // Industrial utility block with exterior conduit runs and gantry framework
        const mainGeo = new THREE.BoxGeometry(layout.width, totalTowerHeight * 0.88, layout.depth);
        this.buildingMesh = new THREE.Mesh(mainGeo, this.baseFacadeMat);
        this.buildingMesh.position.y = towerBaseY + (totalTowerHeight * 0.88) / 2;
        this.buildingMesh.castShadow = true;
        this.buildingMesh.receiveShadow = true;
        this.buildingMesh.userData = { room: layout.room };
        this.group.add(this.buildingMesh);

        const edges = new THREE.EdgesGeometry(mainGeo);
        const line = new THREE.LineSegments(edges, lineMat);
        line.position.y = towerBaseY + (totalTowerHeight * 0.88) / 2;
        this.architecturalDetails.add(line);

        // External vertical and horizontal conduit pipe runs
        const pipeMat = new THREE.MeshStandardMaterial({
          color: 0x2A3E54,
          metalness: 0.9,
          roughness: 0.25
        });
        [-layout.width * 0.35, layout.width * 0.35].forEach(xP => {
          const pipeGeo = new THREE.CylinderGeometry(0.08, 0.08, totalTowerHeight * 0.85, 8);
          const pipe = new THREE.Mesh(pipeGeo, pipeMat);
          pipe.position.set(xP, towerBaseY + (totalTowerHeight * 0.85) / 2, layout.depth * 0.52);
          this.architecturalDetails.add(pipe);
        });

        // Twin high-voltage transformer cylinders with glowing insulation rings
        [-0.9, 0.9].forEach(xOff => {
          const transGeo = new THREE.CylinderGeometry(0.35, 0.35, 1.2, 12);
          const trans = new THREE.Mesh(transGeo, pipeMat);
          trans.position.set(xOff, towerBaseY + totalTowerHeight * 0.88 + 0.6, 0);
          this.architecturalDetails.add(trans);

          const ring = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.04, 6, 16), accentMat);
          ring.rotation.x = Math.PI / 2;
          ring.position.set(xOff, towerBaseY + totalTowerHeight * 0.88 + 0.9, 0);
          this.architecturalDetails.add(ring);
        });
        break;
      }

      default: {
        // Office Tower & Standard High-Rise:
        // Sleek modern corporate skyscraper with setback and living office cutaway
        const hasSetback = totalTowerHeight >= 12;
        const lowerH = hasSetback ? totalTowerHeight * 0.68 : totalTowerHeight;
        const upperH = hasSetback ? totalTowerHeight * 0.32 : 0;

        const lowerGeo = new THREE.BoxGeometry(layout.width, lowerH, layout.depth);
        this.buildingMesh = new THREE.Mesh(lowerGeo, this.baseFacadeMat);
        this.buildingMesh.position.y = towerBaseY + lowerH / 2;
        this.buildingMesh.castShadow = true;
        this.buildingMesh.receiveShadow = true;
        this.buildingMesh.userData = { room: layout.room };
        this.group.add(this.buildingMesh);

        const lowerEdges = new THREE.EdgesGeometry(lowerGeo);
        const lowerLine = new THREE.LineSegments(lowerEdges, lineMat);
        lowerLine.position.y = towerBaseY + lowerH / 2;
        this.architecturalDetails.add(lowerLine);

        if (hasSetback) {
          const upperGeo = new THREE.BoxGeometry(layout.width * 0.82, upperH, layout.depth * 0.82);
          this.setbackMesh = new THREE.Mesh(upperGeo, this.baseFacadeMat);
          this.setbackMesh.position.y = towerBaseY + lowerH + upperH / 2;
          this.setbackMesh.castShadow = true;
          this.setbackMesh.receiveShadow = true;
          this.setbackMesh.userData = { room: layout.room };
          this.group.add(this.setbackMesh);

          const upperEdges = new THREE.EdgesGeometry(upperGeo);
          const upperLine = new THREE.LineSegments(upperEdges, lineMat);
          upperLine.position.y = towerBaseY + lowerH + upperH / 2;
          this.architecturalDetails.add(upperLine);
        }
        break;
      }
    }
  }

  /**
   * Procedural architectural crowns giving each archetype distinct silhouettes
   */
  private createArchitecturalCrown(layout: BuildingLayout) {
    this.crownGroup = new THREE.Group();
    const roofY = layout.height;
    const archMat = new THREE.MeshStandardMaterial({
      color: 0x0E1724,
      roughness: 0.3,
      metalness: 0.8
    });

    const accentMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(layout.color),
      transparent: true,
      opacity: 0.75
    });

    switch (layout.archetype) {
      case 'skyscraper': {
        // Coordination District: Gracefully tapered spire with concentric illuminated rings
        const pyrGeo = new THREE.ConeGeometry(layout.width * 0.42, 4.2, 6);
        const pyr = new THREE.Mesh(pyrGeo, archMat);
        pyr.position.y = roofY + 2.1;
        this.crownGroup.add(pyr);

        const ringGeo = new THREE.TorusGeometry(layout.width * 0.35, 0.08, 6, 24);
        const ring = new THREE.Mesh(ringGeo, accentMat);
        ring.rotation.x = Math.PI / 2;
        ring.position.y = roofY + 1.2;
        this.crownGroup.add(ring);
        break;
      }
      case 'stepped-tower': {
        // Stepped Ziggurat: Rooftop observation pergola with glowing pillars and canopy
        const pergolaGeo = new THREE.BoxGeometry(layout.width * 0.48, 0.15, layout.depth * 0.48);
        const pergola = new THREE.Mesh(pergolaGeo, archMat);
        pergola.position.y = roofY + 1.3;
        this.crownGroup.add(pergola);

        [-0.6, 0.6].forEach(xP => {
          [-0.6, 0.6].forEach(zP => {
            const post = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.3, 6), archMat);
            post.position.set(xP * layout.width * 0.35, roofY + 0.65, zP * layout.depth * 0.35);
            this.crownGroup?.add(post);
          });
        });

        const mastGeo = new THREE.CylinderGeometry(0.04, 0.08, 2.6, 6);
        const mast = new THREE.Mesh(mastGeo, archMat);
        mast.position.y = roofY + 2.6;
        this.crownGroup.add(mast);
        break;
      }
      case 'office-tower': {
        // Agent Work District: Multi-tier mechanical crown with glass observation gallery
        const crownGeo = new THREE.BoxGeometry(layout.width * 0.88, 1.4, layout.depth * 0.88);
        const crownMesh = new THREE.Mesh(crownGeo, archMat);
        crownMesh.position.y = roofY + 0.7;
        this.crownGroup.add(crownMesh);

        const glassStrip = new THREE.Mesh(
          new THREE.BoxGeometry(layout.width * 0.9, 0.3, layout.depth * 0.9),
          accentMat
        );
        glassStrip.position.y = roofY + 0.7;
        this.crownGroup.add(glassStrip);
        break;
      }
      case 'research-lab': {
        // Research District: Distinct geodesic observation dome with orbital halo ring
        const domeGeo = new THREE.SphereGeometry(layout.width * 0.42, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2);
        const dome = new THREE.Mesh(domeGeo, archMat);
        dome.position.y = roofY;
        this.crownGroup.add(dome);

        const ringGeo = new THREE.TorusGeometry(layout.width * 0.48, 0.1, 8, 32);
        const ring = new THREE.Mesh(ringGeo, accentMat);
        ring.rotation.x = Math.PI / 2.3;
        ring.position.y = roofY + 0.6;
        this.crownGroup.add(ring);
        break;
      }
      case 'data-center': {
        // Compute District: Wide dense megastructure with quad exhaust cooling banks
        const coolingBank = new THREE.BoxGeometry(layout.width * 0.85, 0.6, layout.depth * 0.85);
        const bankMesh = new THREE.Mesh(coolingBank, archMat);
        bankMesh.position.y = roofY + 0.3;
        this.crownGroup.add(bankMesh);

        [-1.0, 1.0].forEach(xOff => {
          [-0.8, 0.8].forEach(zOff => {
            const ventGeo = new THREE.CylinderGeometry(0.35, 0.4, 0.9, 8);
            const vent = new THREE.Mesh(ventGeo, archMat);
            vent.position.set(xOff, roofY + 0.9, zOff);
            this.crownGroup?.add(vent);

            const ventGlow = new THREE.Mesh(
              new THREE.RingGeometry(0.08, 0.32, 12),
              accentMat
            );
            ventGlow.rotation.x = -Math.PI / 2;
            ventGlow.position.set(xOff, roofY + 1.36, zOff);
            this.crownGroup?.add(ventGlow);
          });
        });
        break;
      }
      case 'settlement-vault': {
        // Settlement District: Fortress/Vault heavy angled armor parapet
        const parapetGeo = new THREE.BoxGeometry(layout.width + 0.3, 0.9, layout.depth + 0.3);
        const parapet = new THREE.Mesh(parapetGeo, archMat);
        parapet.position.y = roofY + 0.45;
        this.crownGroup.add(parapet);

        const innerVault = new THREE.Mesh(
          new THREE.BoxGeometry(layout.width * 0.6, 1.2, layout.depth * 0.6),
          archMat
        );
        innerVault.position.y = roofY + 0.8;
        this.crownGroup.add(innerVault);
        break;
      }
      case 'social-block': {
        // Social District: Stepped rooftop gathering terrace with illuminated canopy
        const canopyGeo = new THREE.BoxGeometry(layout.width * 0.75, 0.18, layout.depth * 0.75);
        const canopy = new THREE.Mesh(canopyGeo, archMat);
        canopy.position.y = roofY + 1.4;
        this.crownGroup.add(canopy);

        [-1.0, 1.0].forEach(xP => {
          [-1.0, 1.0].forEach(zP => {
            const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.4, 6), archMat);
            pillar.position.set(xP, roofY + 0.7, zP);
            this.crownGroup?.add(pillar);
          });
        });
        break;
      }
      case 'broadcast-hall': {
        // Public Communication District: Iconic tall dual communications masts and transmission grid
        [-1.2, 1.2].forEach(xOff => {
          const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.1, 4.2, 6), archMat);
          mast.position.set(xOff, roofY + 2.1, 0);
          this.crownGroup?.add(mast);
        });
        const crossbar = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.12, 0.12), archMat);
        crossbar.position.set(0, roofY + 3.0, 0);
        this.crownGroup.add(crossbar);

        const dishGeo = new THREE.SphereGeometry(0.6, 8, 8, 0, Math.PI * 2, 0, Math.PI / 3);
        const dish = new THREE.Mesh(dishGeo, archMat);
        dish.position.set(0, roofY + 1.0, 0);
        dish.rotation.x = -Math.PI / 4;
        this.crownGroup.add(dish);
        break;
      }
      case 'utility-structure': {
        // Infrastructure District: Industrial crane gantry & power routing frame
        const gantryH = 2.4;
        const gantryFrame = new THREE.BoxGeometry(layout.width * 0.7, 0.2, layout.depth * 0.7);
        const gantry = new THREE.Mesh(gantryFrame, archMat);
        gantry.position.y = roofY + gantryH;
        this.crownGroup.add(gantry);

        [-0.8, 0.8].forEach(xP => {
          const leg = new THREE.Mesh(new THREE.BoxGeometry(0.12, gantryH, 0.12), archMat);
          leg.position.set(xP, roofY + gantryH / 2, 0);
          this.crownGroup?.add(leg);
        });
        break;
      }
      default: {
        const phGeo = new THREE.BoxGeometry(layout.width * 0.5, 0.8, layout.depth * 0.5);
        const ph = new THREE.Mesh(phGeo, archMat);
        ph.position.y = roofY + 0.4;
        this.crownGroup.add(ph);
        break;
      }
    }

    this.group.add(this.crownGroup);
  }

  /**
   * Spawns animated autonomous agent workers on rooftop observation decks & setbacks
   */
  private createRooftopAgents(
    layout: BuildingLayout,
    hasSetback: boolean,
    towerBaseY: number,
    lowerH: number
  ) {
    const roofY = layout.height;
    const districtCol = new THREE.Color(layout.color);

    // 1. Observation deck floor pad
    const deckGeo = new THREE.BoxGeometry(layout.width * 0.72, 0.16, layout.depth * 0.72);
    const deckMat = new THREE.MeshStandardMaterial({
      color: 0x111D2E,
      roughness: 0.4,
      metalness: 0.6
    });
    const deck = new THREE.Mesh(deckGeo, deckMat);
    deck.position.y = roofY + 0.08;
    deck.receiveShadow = true;
    this.group.add(deck);

    // Glass safety railing along deck edge
    const railGeo = new THREE.BoxGeometry(layout.width * 0.74, 0.5, layout.depth * 0.74);
    const railMat = new THREE.MeshStandardMaterial({
      color: 0x38BDF8,
      transparent: true,
      opacity: 0.35,
      roughness: 0.1,
      metalness: 0.9
    });
    const rail = new THREE.Mesh(railGeo, railMat);
    rail.position.y = roofY + 0.32;
    this.group.add(rail);

    // Glowing perimeter neon line on roof railing
    const railEdges = new THREE.EdgesGeometry(railGeo);
    const railLine = new THREE.LineSegments(
      railEdges,
      new THREE.LineBasicMaterial({ color: districtCol, transparent: true, opacity: 0.75 })
    );
    railLine.position.y = roofY + 0.32;
    this.group.add(railLine);

    // 2. Standing lookout agent gazing over the skyline
    const lookout = new AgentWorker({
      x: layout.width * 0.22,
      y: roofY + 0.16,
      z: layout.depth * 0.22,
      rotationY: Math.PI / 4,
      activityState: layout.room.status === 'surge' ? 'surge' : 'active'
    });
    this.rooftopAgents.push(lookout);
    this.group.add(lookout.group);

    // Small glowing holographic terminal next to the lookout
    const termGeo = new THREE.BoxGeometry(0.35, 0.6, 0.25);
    const termMat = new THREE.MeshStandardMaterial({ color: 0x0E1724, metalness: 0.8 });
    const term = new THREE.Mesh(termGeo, termMat);
    term.position.set(layout.width * 0.22 - 0.35, roofY + 0.46, layout.depth * 0.22);
    this.group.add(term);

    const screenGeo = new THREE.PlaneGeometry(0.28, 0.18);
    const screenMat = new THREE.MeshBasicMaterial({ color: districtCol });
    const screen = new THREE.Mesh(screenGeo, screenMat);
    screen.position.set(layout.width * 0.22 - 0.35, roofY + 0.66, layout.depth * 0.22 + 0.13);
    this.group.add(screen);

    // 3. Pacing / Patrolling agent walking across the roof deck
    const patroller = new AgentWorker({
      x: -layout.width * 0.2,
      y: roofY + 0.16,
      z: 0,
      isWalking: true,
      walkPath: {
        start: new THREE.Vector3(-layout.width * 0.2, roofY + 0.16, -layout.depth * 0.2),
        end: new THREE.Vector3(-layout.width * 0.2, roofY + 0.16, layout.depth * 0.2),
        speed: 0.5 + Math.random() * 0.2
      },
      activityState: 'active'
    });
    this.rooftopAgents.push(patroller);
    this.group.add(patroller.group);

    // 4. If skyscraper has a mid-tier setback, add an agent on the mid-level terrace balcony!
    if (hasSetback) {
      const terraceY = towerBaseY + lowerH;
      const terraceAgent = new AgentWorker({
        x: layout.width * 0.42,
        y: terraceY + 0.05,
        z: 0,
        rotationY: Math.PI / 2,
        activityState: 'active'
      });
      this.rooftopAgents.push(terraceAgent);
      this.group.add(terraceAgent.group);
    }
  }

  private createWindows(layout: BuildingLayout) {
    const startY = 2.8; // Above street-level podium
    const availableH = Math.max(4, layout.height - startY - 1.2);
    const rows = Math.min(16, Math.max(4, Math.floor(availableH / 1.8)));
    const colsPerFace = 3;
    const totalWindows = rows * colsPerFace * 4;

    const windowGeo = new THREE.PlaneGeometry(0.42, 0.52);
    // Basic material that accepts per-instance vertex coloring
    const instancedMat = new THREE.MeshBasicMaterial({
      color: 0xFFFFFF,
      transparent: true,
      opacity: 0.95
    });

    this.windowMesh = new THREE.InstancedMesh(windowGeo, instancedMat, totalWindows);

    const dummy = new THREE.Object3D();
    let instanceIdx = 0;

    const halfW = layout.width / 2 + 0.02;
    const halfD = layout.depth / 2 + 0.02;

    const warmGold = new THREE.Color(0xFDE047);
    const brightWhite = new THREE.Color(0xFFFFFF);
    const districtColor = new THREE.Color(layout.color);
    const warmOrange = new THREE.Color(0xFB923C);
    const darkGlass = new THREE.Color(0x07111D);

    for (let r = 0; r < rows; r++) {
      const y = startY + (r * availableH) / rows;
      // Inset windows if this floor is in the upper setback
      const isSetbackFloor = layout.height >= 16 && y > layout.height * 0.68;
      const curHalfW = isSetbackFloor ? halfW * 0.82 : halfW;
      const curHalfD = isSetbackFloor ? halfD * 0.82 : halfD;
      const curW = isSetbackFloor ? layout.width * 0.82 : layout.width;
      const curD = isSetbackFloor ? layout.depth * 0.82 : layout.depth;

      // Front & Back faces
      for (let c = 0; c < colsPerFace; c++) {
        const xOffset = ((c - 1) * curW) / 3.6;

        // Determine authentic night window light color
        const hash = Math.sin(layout.position[0] * 7.9 + layout.position[2] * 4.3 + instanceIdx * 1.7);
        const norm = Math.abs(hash);
        let winCol = darkGlass;
        if (norm > 0.80) winCol = brightWhite;
        else if (norm > 0.48) winCol = warmGold;
        else if (norm > 0.28) winCol = districtColor;
        else if (norm > 0.14) winCol = warmOrange;

        dummy.position.set(xOffset, y, curHalfD);
        dummy.rotation.set(0, 0, 0);
        dummy.updateMatrix();
        this.windowMesh.setMatrixAt(instanceIdx, dummy.matrix);
        this.windowMesh.setColorAt(instanceIdx, winCol);
        instanceIdx++;

        dummy.position.set(xOffset, y, -curHalfD);
        dummy.rotation.set(0, Math.PI, 0);
        dummy.updateMatrix();
        this.windowMesh.setMatrixAt(instanceIdx, dummy.matrix);
        this.windowMesh.setColorAt(instanceIdx, winCol);
        instanceIdx++;
      }

      // Left & Right faces
      for (let c = 0; c < colsPerFace; c++) {
        const zOffset = ((c - 1) * curD) / 3.6;

        const hash = Math.sin(layout.position[0] * 3.1 + layout.position[2] * 9.7 + instanceIdx * 2.3);
        const norm = Math.abs(hash);
        let winCol = darkGlass;
        if (norm > 0.82) winCol = brightWhite;
        else if (norm > 0.50) winCol = warmGold;
        else if (norm > 0.30) winCol = districtColor;
        else if (norm > 0.16) winCol = warmOrange;

        dummy.position.set(curHalfW, y, zOffset);
        dummy.rotation.set(0, Math.PI / 2, 0);
        dummy.updateMatrix();
        this.windowMesh.setMatrixAt(instanceIdx, dummy.matrix);
        this.windowMesh.setColorAt(instanceIdx, winCol);
        instanceIdx++;

        dummy.position.set(-curHalfW, y, zOffset);
        dummy.rotation.set(0, -Math.PI / 2, 0);
        dummy.updateMatrix();
        this.windowMesh.setMatrixAt(instanceIdx, dummy.matrix);
        this.windowMesh.setColorAt(instanceIdx, winCol);
        instanceIdx++;
      }
    }

    this.windowMesh.instanceMatrix.needsUpdate = true;
    if (this.windowMesh.instanceColor) {
      this.windowMesh.instanceColor.needsUpdate = true;
    }
    this.group.add(this.windowMesh);
  }

  private createRooftopBeacon(layout: BuildingLayout) {
    const roofY = layout.height + (layout.archetype === 'skyscraper' ? 3.5 : 0.8);

    // Antenna mast on all buildings for architectural realism
    const mastGeo = new THREE.CylinderGeometry(0.06, 0.1, 2.0, 6);
    const mastMat = new THREE.MeshStandardMaterial({ color: 0x1E2F42, metalness: 0.85, roughness: 0.35 });
    const mast = new THREE.Mesh(mastGeo, mastMat);
    mast.position.y = roofY + 1.0;
    this.group.add(mast);

    // Selective rooftop signal beacons: only render glowing beacon spheres on primary district flagships or surge towers!
    // This dramatically reduces visual clutter from identical blue rooftop spheres everywhere.
    const isSpecialTower = layout.isPrimaryRoom || layout.room.status === 'surge' || layout.archetype === 'broadcast-hall';
    if (!isSpecialTower) {
      return;
    }

    // Glowing beacon sphere for designated flagships
    const beaconGeo = new THREE.SphereGeometry(0.3, 12, 12);
    const beaconMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(layout.beaconColor),
      transparent: true,
      opacity: 0.95
    });
    this.beaconMesh = new THREE.Mesh(beaconGeo, beaconMat);
    this.beaconMesh.position.y = roofY + 2.1;
    this.group.add(this.beaconMesh);

    // Outer glow aura for surge/primary landmarks
    if (layout.room.status === 'surge' || layout.isPrimaryRoom) {
      const glowGeo = new THREE.SphereGeometry(0.65, 12, 12);
      const glowMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(layout.beaconColor),
        transparent: true,
        opacity: 0.3,
        wireframe: true
      });
      this.beaconGlowMesh = new THREE.Mesh(glowGeo, glowMat);
      this.beaconGlowMesh.position.y = roofY + 2.1;
      this.group.add(this.beaconGlowMesh);
    }
  }

  public setCutaway(cutaway: boolean) {
    this.isCutaway = cutaway;
    this.interior.setCutawayVisible(cutaway);

    if (cutaway) {
      this.buildingMesh.visible = false;
      if (this.setbackMesh) this.setbackMesh.visible = false;
      this.architecturalDetails.visible = false;
      if (this.podiumMesh) this.podiumMesh.visible = false;
      if (this.windowMesh) this.windowMesh.visible = false;
      if (this.crownGroup) this.crownGroup.visible = false;
    } else {
      this.buildingMesh.visible = true;
      if (this.setbackMesh) this.setbackMesh.visible = true;
      this.architecturalDetails.visible = true;
      if (this.podiumMesh) this.podiumMesh.visible = true;
      if (this.windowMesh) this.windowMesh.visible = true;
      if (this.crownGroup) this.crownGroup.visible = true;
    }
  }

  public update(time: number, isSelected: boolean) {
    if (this.beaconGlowMesh) {
      const scale = 1 + Math.sin(time * 3) * 0.18;
      this.beaconGlowMesh.scale.set(scale, scale, scale);
      this.beaconGlowMesh.rotation.y += 0.02;
    }

    if (isSelected) {
      this.buildingMesh.scale.set(1.03, 1.0, 1.03);
      if (this.setbackMesh) this.setbackMesh.scale.set(1.03, 1.0, 1.03);
    } else {
      this.buildingMesh.scale.set(1.0, 1.0, 1.0);
      if (this.setbackMesh) this.setbackMesh.scale.set(1.0, 1.0, 1.0);
    }

    // Animate rooftop and terrace agents
    this.rooftopAgents.forEach((agent) => {
      agent.update(time);
    });

    if (this.isCutaway) {
      this.interior.update(time);
    }
  }

  public updateRoomData(room: RoomCluster) {
    this.layout.room = room;
    this.interior.updateRoomData(room);
  }

  public triggerProbeEffect() {
    if (this.beaconGlowMesh) {
      this.beaconGlowMesh.scale.set(2.5, 2.5, 2.5);
    }
  }

  public dispose() {
    this.interior.dispose();
    this.hitMesh?.geometry?.dispose();
    if (this.hitMesh && this.hitMesh.material instanceof THREE.Material) {
      this.hitMesh.material.dispose();
    }
    this.architecturalDetails.traverse(obj => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
        else obj.material.dispose();
      }
    });
    if (this.crownGroup) {
      this.crownGroup.traverse(obj => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
          if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
          else obj.material.dispose();
        }
      });
    }
  }
}
