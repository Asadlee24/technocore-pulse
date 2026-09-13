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

  public billboardCanvas: HTMLCanvasElement | null = null;
  public billboardCtx: CanvasRenderingContext2D | null = null;
  public billboardTexture: THREE.CanvasTexture | null = null;
  private lastBillboardUpdate: number = 0;

  private buildingMesh: THREE.Mesh;
  private setbackMesh: THREE.Mesh | null = null;
  private podiumMesh: THREE.Mesh | null = null;
  private baseFacadeMat: THREE.Material;
  private crownGroup: THREE.Group | null = null;

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

    // 3. Main Tower Shaft with Architectural Setback for High-Rises
    const hasSetback = layout.height >= 16;
    const towerBaseY = podiumH + 0.28;
    const totalTowerHeight = layout.height - towerBaseY;
    const lowerH = totalTowerHeight * 0.68;

    if (hasSetback) {
      const upperH = totalTowerHeight * 0.32;

      // Lower main body
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
      this.group.add(lowerLine);

      // Upper setback tower
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
      this.group.add(upperLine);
    } else {
      const singleGeo = new THREE.BoxGeometry(layout.width, totalTowerHeight, layout.depth);
      this.buildingMesh = new THREE.Mesh(singleGeo, this.baseFacadeMat);
      this.buildingMesh.position.y = towerBaseY + totalTowerHeight / 2;
      this.buildingMesh.castShadow = true;
      this.buildingMesh.receiveShadow = true;
      this.buildingMesh.userData = { room: layout.room };
      this.group.add(this.buildingMesh);

      const edges = new THREE.EdgesGeometry(singleGeo);
      const line = new THREE.LineSegments(edges, lineMat);
      line.position.y = towerBaseY + totalTowerHeight / 2;
      this.group.add(line);
    }

    // 4. Multi-Hue Illuminated Night Windows
    this.createWindows(layout);

    // 5. Archetype-Specific Architectural Roof Crown
    this.createArchitecturalCrown(layout);

    // 6. Rooftop Beacon & Antenna
    this.createRooftopBeacon(layout);

    // 7. Rooftop & Setback Observation Deck Agents
    this.createRooftopAgents(layout, hasSetback, towerBaseY, lowerH);

    // 8. NYC Rooftop Water Tower
    this.createRooftopWaterTower(layout);

    // 9. Times Square Style Animated Billboard
    this.createTimesSquareBillboard(layout);

    // 10. Living Agent Office Interior
    this.interior = new OfficeInterior(layout);
    this.group.add(this.interior.group);
  }

  /**
   * Procedural architectural crowns giving each archetype distinct silhouettes (NYC Empire State / Chrysler style)
   */
  private createArchitecturalCrown(layout: BuildingLayout) {
    this.crownGroup = new THREE.Group();
    const roofY = layout.height;
    const archMat = new THREE.MeshStandardMaterial({
      color: 0x0E1724,
      roughness: 0.25,
      metalness: 0.85
    });

    const chromeMat = new THREE.MeshStandardMaterial({
      color: 0xCBD5E1,
      roughness: 0.15,
      metalness: 0.95
    });

    const accentMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(layout.color),
      transparent: true,
      opacity: 0.85
    });

    switch (layout.archetype) {
      case 'skyscraper': {
        // Iconic NYC Empire State & Chrysler style Art Deco Stepped Spire:
        // Tier 1: First stepped setback with vertical fluted columns
        const t1H = 1.6;
        const t1W = layout.width * 0.76;
        const t1D = layout.depth * 0.76;
        const t1 = new THREE.Mesh(new THREE.BoxGeometry(t1W, t1H, t1D), archMat);
        t1.position.y = roofY + t1H / 2;
        this.crownGroup.add(t1);

        // Tier 2: Second stepped setback
        const t2H = 1.3;
        const t2W = t1W * 0.72;
        const t2D = t1D * 0.72;
        const t2 = new THREE.Mesh(new THREE.BoxGeometry(t2W, t2H, t2D), archMat);
        t2.position.y = roofY + t1H + t2H / 2;
        this.crownGroup.add(t2);

        // Tier 3: Third stepped metallic pediment
        const t3H = 1.1;
        const t3W = t2W * 0.7;
        const t3D = t2D * 0.7;
        const t3 = new THREE.Mesh(new THREE.BoxGeometry(t3W, t3H, t3D), chromeMat);
        t3.position.y = roofY + t1H + t2H + t3H / 2;
        this.crownGroup.add(t3);

        // Towering Stainless Steel Art Deco Needle Spire
        const spireH = 5.6;
        const spire = new THREE.Mesh(new THREE.ConeGeometry(0.28, spireH, 8), chromeMat);
        spire.position.y = roofY + t1H + t2H + t3H + spireH / 2;
        this.crownGroup.add(spire);

        // Concentric illuminated neon halo rings along the spire
        [0.35, 0.65].forEach((pct) => {
          const r = 0.45 * (1 - pct * 0.5);
          const ring = new THREE.Mesh(new THREE.TorusGeometry(r, 0.05, 6, 20), accentMat);
          ring.rotation.x = Math.PI / 2;
          ring.position.y = roofY + t1H + t2H + t3H + spireH * pct;
          this.crownGroup?.add(ring);
        });
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

  /**
   * Iconic NYC Cedar Wood Rooftop Water Tower on 4 steel legs
   */
  private createRooftopWaterTower(layout: BuildingLayout) {
    if (layout.height < 11) return;
    const towerGroup = new THREE.Group();
    const roofY = layout.height;
    const offX = layout.width * 0.24;
    const offZ = -layout.depth * 0.22;

    const legGeo = new THREE.CylinderGeometry(0.04, 0.04, 1.2, 5);
    const legMat = new THREE.MeshStandardMaterial({ color: 0x1E293B, metalness: 0.8, roughness: 0.4 });
    const sp = 0.58;
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([lx, lz]) => {
      const leg = new THREE.Mesh(legGeo, legMat);
      leg.position.set(lx * sp * 0.5, 0.6, lz * sp * 0.5);
      towerGroup.add(leg);
    });

    const tankGeo = new THREE.CylinderGeometry(0.48, 0.48, 0.88, 12);
    const tankMat = new THREE.MeshStandardMaterial({ color: 0x784928, roughness: 0.9, metalness: 0.1 });
    const tank = new THREE.Mesh(tankGeo, tankMat);
    tank.position.y = 1.2 + 0.44;
    towerGroup.add(tank);

    // Steel bands
    [1.35, 1.62, 1.90].forEach(by => {
      const band = new THREE.Mesh(new THREE.TorusGeometry(0.49, 0.018, 4, 16), legMat);
      band.rotation.x = Math.PI / 2;
      band.position.y = by;
      towerGroup.add(band);
    });

    // Conical roof cap
    const capGeo = new THREE.ConeGeometry(0.56, 0.46, 12);
    const capMat = new THREE.MeshStandardMaterial({ color: 0x4A2E16, roughness: 0.95, metalness: 0.1 });
    const cap = new THREE.Mesh(capGeo, capMat);
    cap.position.y = 1.2 + 0.88 + 0.23;
    towerGroup.add(cap);

    towerGroup.position.set(offX, roofY, offZ);
    this.group.add(towerGroup);
  }

  /**
   * Times Square style glowing electronic billboard with live scrolling text
   */
  private createTimesSquareBillboard(layout: BuildingLayout) {
    if (layout.height < 13) return;
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#060D1A';
    ctx.fillRect(0, 0, 256, 128);
    ctx.fillStyle = layout.color;
    ctx.font = 'bold 20px monospace';
    ctx.fillText('TECHNOCORE NYC', 12, 34);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 15px monospace';
    ctx.fillText(`ROOM: #${layout.room.name.toUpperCase()}`, 12, 64);
    ctx.fillStyle = '#38BDF8';
    ctx.font = '12px monospace';
    ctx.fillText('120s WINDOW AGENT LIFE', 12, 92);
    ctx.fillStyle = '#2FD27F';
    ctx.fillText('● LIVE SYNC NYC METROPOLIS', 12, 114);

    const texture = new THREE.CanvasTexture(canvas);
    this.billboardCanvas = canvas;
    this.billboardCtx = ctx;
    this.billboardTexture = texture;

    const bMat = new THREE.MeshBasicMaterial({ map: texture });
    const bGeo = new THREE.PlaneGeometry(layout.width * 0.88, 2.4);
    const bMesh = new THREE.Mesh(bGeo, bMat);
    const bY = 5.2;
    bMesh.position.set(0, bY, layout.depth * 0.5 + 0.05);
    this.group.add(bMesh);

    // Glowing Neon Border
    const borderMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(layout.color) });
    const border = new THREE.Mesh(new THREE.BoxGeometry(layout.width * 0.91, 2.5, 0.05), borderMat);
    border.position.set(0, bY, layout.depth * 0.5 + 0.02);
    this.group.add(border);
  }

  public setCutaway(cutaway: boolean) {
    this.isCutaway = cutaway;
    this.interior.setCutawayVisible(cutaway);

    if (cutaway) {
      this.buildingMesh.visible = false;
      if (this.setbackMesh) this.setbackMesh.visible = false;
      if (this.podiumMesh) this.podiumMesh.visible = false;
      if (this.windowMesh) this.windowMesh.visible = false;
      if (this.crownGroup) this.crownGroup.visible = false;
    } else {
      this.buildingMesh.visible = true;
      if (this.setbackMesh) this.setbackMesh.visible = true;
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

    // Times Square Billboard dynamic ticker animation
    if (this.billboardCanvas && this.billboardCtx && this.billboardTexture) {
      if (time - this.lastBillboardUpdate > 0.1) {
        this.lastBillboardUpdate = time;
        const ctx = this.billboardCtx;
        ctx.fillStyle = '#060D1A';
        ctx.fillRect(0, 0, 256, 128);

        // Moving marquee text
        const tickerX = 256 - ((time * 48) % 480);
        ctx.fillStyle = this.layout.color;
        ctx.font = 'bold 18px monospace';
        ctx.fillText('⚡ NYC TECHNOCORE AGENT PULSE', tickerX, 32);

        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 14px monospace';
        ctx.fillText(`DISTRICT: ${this.layout.district.toUpperCase()} #${this.layout.room.name}`, 14, 66);

        ctx.fillStyle = '#38BDF8';
        ctx.font = '11px monospace';
        ctx.fillText(`OBSERVED AGENTS: ${this.layout.room.activeAgentsCount || 14} | 120s WINDOW`, 14, 92);

        // Blinking live indicator
        const blink = Math.sin(time * 6) > 0;
        ctx.fillStyle = blink ? '#2FD27F' : '#10B981';
        ctx.fillText('● LIVE VERIFIED MANHATTAN AGENT GRID', 14, 114);

        this.billboardTexture.needsUpdate = true;
      }
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
    this.billboardTexture?.dispose();
    this.hitMesh?.geometry?.dispose();
    if (this.hitMesh && this.hitMesh.material instanceof THREE.Material) {
      this.hitMesh.material.dispose();
    }
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
