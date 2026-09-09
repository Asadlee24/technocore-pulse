import * as THREE from 'three';
import { AgentWorker } from './AgentWorker';
import type { BuildingLayout, RoadWaypoints } from './cityLayout';

export class CityPedestrians {
  public group: THREE.Group;
  private pedestrians: AgentWorker[] = [];
  private crosswalkRings: THREE.Mesh[] = [];

  constructor(buildings: BuildingLayout[], roadWaypoints: RoadWaypoints) {
    this.group = new THREE.Group();
    this.group.name = 'city-ground-pedestrians';

    this.spawnAvenuePedestrians(roadWaypoints);
    this.spawnBoulevardPromenadePedestrians(roadWaypoints);
    this.spawnBuildingLobbyEntrants(buildings);
    this.spawnStreetCornerGatherings(roadWaypoints);
  }

  /**
   * 1. Pedestrians actively walking along the sidewalks of the 8 radial grand avenues
   */
  private spawnAvenuePedestrians(roadWaypoints: RoadWaypoints) {
    const avenueSidewalkOffsets = [-1.6, 1.6]; // Left and right sidewalks bordering the 2.4m road

    roadWaypoints.radialAvenues.forEach((ave, aveIdx) => {
      avenueSidewalkOffsets.forEach((offset, sideIdx) => {
        // Spawn 2 pedestrians per sidewalk side on each avenue (Total: 8 * 2 * 2 = 32 avenue walkers)
        for (let i = 0; i < 2; i++) {
          const normalAngle = ave.angle + Math.PI / 2;
          const startR = 10 + i * 16 + sideIdx * 4;
          const endR = startR + 14 + (aveIdx % 3) * 3;

          const startX = Math.cos(ave.angle) * startR + Math.cos(normalAngle) * offset;
          const startZ = Math.sin(ave.angle) * startR + Math.sin(normalAngle) * offset;

          const endX = Math.cos(ave.angle) * endR + Math.cos(normalAngle) * offset;
          const endZ = Math.sin(ave.angle) * endR + Math.sin(normalAngle) * offset;

          // Distinct neon visors based on avenue index
          const visorColors = ['#36D7E7', '#4DA3FF', '#38BDF8', '#A855F7', '#2FD27F', '#F472B6', '#F0A824', '#818CF8'];
          const vColor = visorColors[aveIdx % visorColors.length];

          const walker = new AgentWorker({
            x: startX,
            y: 0.04,
            z: startZ,
            isWalking: true,
            walkPath: {
              start: new THREE.Vector3(startX, 0.04, startZ),
              end: new THREE.Vector3(endX, 0.04, endZ),
              speed: 0.55 + Math.random() * 0.35
            },
            visorColor: vColor,
            activityState: (i + aveIdx) % 3 === 0 ? 'surge' : 'active'
          });

          this.pedestrians.push(walker);
          this.group.add(walker.group);
        }
      });
    });
  }

  /**
   * 2. Pedestrians strolling along the concentric circular boulevard sidewalks
   */
  private spawnBoulevardPromenadePedestrians(roadWaypoints: RoadWaypoints) {
    const sidewalkRadii = [
      roadWaypoints.innerRingRadius + 1.8, // Just outside inner ring road (r=15.8)
      roadWaypoints.outerRingRadius - 1.8, // Just inside mid boulevard (r=26.2)
      roadWaypoints.outerRingRadius + 1.8  // Just outside mid boulevard (r=29.8)
    ];

    sidewalkRadii.forEach((radius, ringIdx) => {
      const walkerCount = 6;
      for (let i = 0; i < walkerCount; i++) {
        const baseAngle = (i / walkerCount) * Math.PI * 2 + ringIdx * 0.4;
        const spanAngle = 0.5; // Walk along a ~30 degree arc on the circular sidewalk

        const startAngle = baseAngle;
        const endAngle = baseAngle + spanAngle;

        const startX = Math.cos(startAngle) * radius;
        const startZ = Math.sin(startAngle) * radius;

        const endX = Math.cos(endAngle) * radius;
        const endZ = Math.sin(endAngle) * radius;

        const walker = new AgentWorker({
          x: startX,
          y: 0.04,
          z: startZ,
          isWalking: true,
          walkPath: {
            start: new THREE.Vector3(startX, 0.04, startZ),
            end: new THREE.Vector3(endX, 0.04, endZ),
            speed: 0.45 + (i % 3) * 0.15
          },
          visorColor: i % 2 === 0 ? '#36D7E7' : '#FDE047',
          activityState: 'active'
        });

        this.pedestrians.push(walker);
        this.group.add(walker.group);
      }
    });
  }

  /**
   * 3. Pedestrians walking between street sidewalks and building entrance lobby doors
   */
  private spawnBuildingLobbyEntrants(buildings: BuildingLayout[]) {
    // Select a prominent subset of buildings to have active lobby pedestrian traffic
    const activeBuildings = buildings.filter((_, idx) => idx % 2 === 0);

    activeBuildings.forEach((b) => {
      const bX = b.position[0];
      const bZ = b.position[2];
      const angle = Math.atan2(bZ, bX);

      // Lobby front door is positioned in front of the building
      const lobbyX = bX - Math.cos(angle) * (b.depth * 0.55);
      const lobbyZ = bZ - Math.sin(angle) * (b.depth * 0.55);

      // Sidewalk point outside the entrance
      const sidewalkX = bX - Math.cos(angle) * (b.depth * 0.55 + 3.2);
      const sidewalkZ = bZ - Math.sin(angle) * (b.depth * 0.55 + 3.2);

      const entrant = new AgentWorker({
        x: sidewalkX,
        y: 0.16, // on the paved entrance plaza
        z: sidewalkZ,
        isWalking: true,
        walkPath: {
          start: new THREE.Vector3(sidewalkX, 0.16, sidewalkZ),
          end: new THREE.Vector3(lobbyX, 0.16, lobbyZ),
          speed: 0.4 + Math.random() * 0.2
        },
        visorColor: b.color,
        activityState: 'active'
      });

      this.pedestrians.push(entrant);
      this.group.add(entrant.group);
    });
  }

  /**
   * 4. Small conversation clusters (pairs of 2-3 robotic agents standing and conversing)
   */
  private spawnStreetCornerGatherings(roadWaypoints: RoadWaypoints) {
    roadWaypoints.radialAvenues.forEach((ave, idx) => {
      // Create a meeting spot at the intersection of radial avenue and mid boulevard
      const hubRadius = roadWaypoints.outerRingRadius;
      const normalAngle = ave.angle + Math.PI / 2;
      const hubX = Math.cos(ave.angle) * hubRadius + Math.cos(normalAngle) * 3.2;
      const hubZ = Math.sin(ave.angle) * hubRadius + Math.sin(normalAngle) * 3.2;

      // Small glowing holographic chat node on the pavement
      const ringGeo = new THREE.RingGeometry(0.7, 0.82, 16);
      const ringMat = new THREE.MeshBasicMaterial({
        color: idx % 2 === 0 ? 0x36D7E7 : 0xFDE047,
        transparent: true,
        opacity: 0.7,
        side: THREE.DoubleSide
      });
      const chatNode = new THREE.Mesh(ringGeo, ringMat);
      chatNode.rotation.x = -Math.PI / 2;
      chatNode.position.set(hubX, 0.045, hubZ);
      this.crosswalkRings.push(chatNode);
      this.group.add(chatNode);

      // 2 conversational agents facing each other
      const agentA = new AgentWorker({
        x: hubX - 0.4,
        y: 0.04,
        z: hubZ,
        rotationY: Math.PI / 2, // Facing right toward agentB
        isSeated: false,
        activityState: 'active',
        visorColor: '#36D7E7'
      });

      const agentB = new AgentWorker({
        x: hubX + 0.4,
        y: 0.04,
        z: hubZ,
        rotationY: -Math.PI / 2, // Facing left toward agentA
        isSeated: false,
        activityState: 'active',
        visorColor: '#FDE047'
      });

      this.pedestrians.push(agentA, agentB);
      this.group.add(agentA.group, agentB.group);
    });
  }

  public update(time: number) {
    // Animate all pedestrian walking, head turning, and arm swinging
    this.pedestrians.forEach((p) => {
      p.update(time);
    });

    // Subtle pulsing of ground conversation node rings
    this.crosswalkRings.forEach((ring, i) => {
      const s = 1 + Math.sin(time * 2.5 + i) * 0.08;
      ring.scale.set(s, s, s);
    });
  }

  public dispose() {
    this.pedestrians = [];
    this.crosswalkRings.forEach(r => {
      r.geometry.dispose();
      (r.material as THREE.Material).dispose();
    });
    this.crosswalkRings = [];
  }
}
