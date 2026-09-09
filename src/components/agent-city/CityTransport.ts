import * as THREE from 'three';

interface TransportVehicle {
  mesh: THREE.Mesh;
  pathRadius: number;
  height: number;
  speed: number;
  angle: number;
  direction: number;
}

interface AerialDrone {
  group: THREE.Group;
  baseRadius: number;
  height: number;
  speed: number;
  angle: number;
  bobFreq: number;
}

export class CityTransportManager {
  public group: THREE.Group;
  private vehicles: TransportVehicle[] = [];
  private drones: AerialDrone[] = [];
  private skyRailsGroup: THREE.Group;

  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'city-autonomous-transport';

    this.skyRailsGroup = new THREE.Group();
    this.group.add(this.skyRailsGroup);

    this.buildElevatedRails();
    this.spawnAutonomousPods();
    this.spawnAerialDrones();
  }

  /**
   * Elevated circular/elliptical sky rails between districts
   */
  private buildElevatedRails() {
    const railRadii = [18, 28, 38];
    const railHeights = [4.5, 7.0, 9.5];

    railRadii.forEach((radius, i) => {
      const h = railHeights[i];
      const curve = new THREE.EllipseCurve(0, 0, radius, radius * 0.95, 0, 2 * Math.PI, false, 0);
      const points = curve.getPoints(64).map(p => new THREE.Vector3(p.x, h, p.y));
      const railGeo = new THREE.BufferGeometry().setFromPoints(points);
      const railMat = new THREE.LineBasicMaterial({
        color: 0x1B2A3D,
        transparent: true,
        opacity: 0.45
      });
      const railLine = new THREE.LineLoop(railGeo, railMat);
      this.skyRailsGroup.add(railLine);

      // Support pylons
      const pylonGeo = new THREE.CylinderGeometry(0.08, 0.08, h, 6);
      const pylonMat = new THREE.MeshBasicMaterial({ color: 0x101A2A });
      for (let j = 0; j < 6; j++) {
        const angle = (j / 6) * Math.PI * 2;
        const pylon = new THREE.Mesh(pylonGeo, pylonMat);
        pylon.position.set(Math.cos(angle) * radius, h / 2, Math.sin(angle) * (radius * 0.95));
        this.skyRailsGroup.add(pylon);
      }
    });
  }

  /**
   * Spawns futuristic sleek autonomous transit pods gliding on elevated rails
   */
  private spawnAutonomousPods() {
    const podGeo = new THREE.BoxGeometry(0.9, 0.28, 0.42);
    const podMat = new THREE.MeshStandardMaterial({
      color: 0x101A2A,
      roughness: 0.2,
      metalness: 0.8
    });

    const podGlowMat = new THREE.MeshBasicMaterial({
      color: 0x36D7E7 // Cyan headlights / trail
    });

    const railConfigs = [
      { radius: 18, height: 4.6, speed: 0.35, count: 3, dir: 1 },
      { radius: 28, height: 7.1, speed: 0.22, count: 4, dir: -1 },
      { radius: 38, height: 9.6, speed: 0.16, count: 3, dir: 1 }
    ];

    railConfigs.forEach((cfg) => {
      for (let i = 0; i < cfg.count; i++) {
        const podMesh = new THREE.Mesh(podGeo, podMat);
        
        // Headlight glow strip
        const glowGeo = new THREE.PlaneGeometry(0.12, 0.3);
        const glow = new THREE.Mesh(glowGeo, podGlowMat);
        glow.position.set(0.46, 0, 0);
        glow.rotation.y = Math.PI / 2;
        podMesh.add(glow);

        const startAngle = (i / cfg.count) * Math.PI * 2 + Math.random() * 0.5;
        this.group.add(podMesh);

        this.vehicles.push({
          mesh: podMesh,
          pathRadius: cfg.radius,
          height: cfg.height,
          speed: cfg.speed,
          angle: startAngle,
          direction: cfg.dir
        });
      }
    });
  }

  /**
   * Aerial Autonomous Drones cruising between upper towers
   */
  private spawnAerialDrones() {
    const droneBodyGeo = new THREE.BoxGeometry(0.5, 0.12, 0.5);
    const droneMat = new THREE.MeshStandardMaterial({
      color: 0x050A12,
      metalness: 0.9,
      roughness: 0.2
    });

    const navLightMat = new THREE.MeshBasicMaterial({ color: 0xF0A824 });

    const droneConfigs = [
      { radius: 22, height: 15, speed: 0.28, count: 3 },
      { radius: 34, height: 21, speed: 0.20, count: 4 }
    ];

    droneConfigs.forEach((cfg) => {
      for (let i = 0; i < cfg.count; i++) {
        const droneGroup = new THREE.Group();
        const body = new THREE.Mesh(droneBodyGeo, droneMat);
        droneGroup.add(body);

        // Blinking amber nav beacon
        const lightGeo = new THREE.SphereGeometry(0.08, 6, 6);
        const light = new THREE.Mesh(lightGeo, navLightMat);
        light.position.y = 0.1;
        droneGroup.add(light);

        this.group.add(droneGroup);
        this.drones.push({
          group: droneGroup,
          baseRadius: cfg.radius,
          height: cfg.height,
          speed: cfg.speed,
          angle: (i / cfg.count) * Math.PI * 2,
          bobFreq: 2.0 + Math.random() * 1.5
        });
      }
    });
  }

  public update(delta: number, time: number = 0) {
    // Update rail pods
    this.vehicles.forEach((v) => {
      v.angle += v.speed * v.direction * delta;
      const x = Math.cos(v.angle) * v.pathRadius;
      const z = Math.sin(v.angle) * (v.pathRadius * 0.95);
      v.mesh.position.set(x, v.height, z);

      const tangentX = -Math.sin(v.angle) * v.direction;
      const tangentZ = Math.cos(v.angle) * 0.95 * v.direction;
      v.mesh.rotation.y = Math.atan2(tangentX, tangentZ) + Math.PI / 2;
    });

    // Update aerial drones
    this.drones.forEach((d) => {
      d.angle += d.speed * delta;
      const x = Math.cos(d.angle) * d.baseRadius;
      const z = Math.sin(d.angle) * d.baseRadius;
      const y = d.height + Math.sin(time * d.bobFreq) * 0.6;
      d.group.position.set(x, y, z);
      d.group.rotation.y = -d.angle;
    });
  }

  public dispose() {
    this.vehicles.forEach(v => {
      v.mesh.geometry.dispose();
      (v.mesh.material as THREE.Material).dispose();
    });
    this.vehicles = [];

    this.drones.forEach(d => {
      d.group.traverse(obj => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
          if (Array.isArray(obj.material)) {
            obj.material.forEach(m => m.dispose());
          } else {
            obj.material.dispose();
          }
        }
      });
    });
    this.drones = [];
  }
}
