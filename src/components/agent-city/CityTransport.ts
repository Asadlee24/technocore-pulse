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

interface HighwayCourier {
  group: THREE.Group;
  type: 'radial' | 'ring';
  avenueAngle?: number;
  ringRadius?: number;
  speed: number;
  offset: number;
}

export class CityTransportManager {
  public group: THREE.Group;
  private vehicles: TransportVehicle[] = [];
  private drones: AerialDrone[] = [];
  private highwayCouriers: HighwayCourier[] = [];
  private skyRailsGroup: THREE.Group;

  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'city-autonomous-transport';

    this.skyRailsGroup = new THREE.Group();
    this.group.add(this.skyRailsGroup);

    this.buildElevatedRails();
    this.spawnAutonomousPods();
    this.spawnAerialDrones();
    this.spawnHighwayCouriers();
  }

  /**
   * Elevated circular/elliptical sky rails between districts
   */
  private buildElevatedRails() {
    const railRadii = [21.5, 35.0, 50.0];
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
      for (let j = 0; j < 8; j++) {
        const angle = (j / 8) * Math.PI * 2;
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
      color: 0x36D7E7 // Cyan headlights
    });

    const railConfigs = [
      { radius: 21.5, height: 4.6, speed: 0.35, count: 4, dir: 1 },
      { radius: 35.0, height: 7.1, speed: 0.22, count: 5, dir: -1 },
      { radius: 50.0, height: 9.6, speed: 0.16, count: 4, dir: 1 }
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

        this.group.add(podMesh);
        this.vehicles.push({
          mesh: podMesh,
          pathRadius: cfg.radius,
          height: cfg.height,
          speed: cfg.speed,
          angle: (i / cfg.count) * Math.PI * 2,
          direction: cfg.dir
        });
      }
    });
  }

  /**
   * Spawns 8 autonomous survey drones hovering and orbiting overhead
   */
  private spawnAerialDrones() {
    const droneGeo = new THREE.OctahedronGeometry(0.3, 0);
    const droneMat = new THREE.MeshStandardMaterial({
      color: 0x1E293B,
      roughness: 0.1,
      metalness: 0.9,
      emissive: 0x36D7E7,
      emissiveIntensity: 0.6
    });

    const haloGeo = new THREE.RingGeometry(0.4, 0.52, 16);
    const haloMat = new THREE.MeshBasicMaterial({
      color: 0x36D7E7,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.75
    });

    for (let i = 0; i < 8; i++) {
      const droneGroup = new THREE.Group();
      const body = new THREE.Mesh(droneGeo, droneMat);
      droneGroup.add(body);

      const halo = new THREE.Mesh(haloGeo, haloMat);
      halo.rotation.x = Math.PI / 2;
      halo.position.y = -0.15;
      droneGroup.add(halo);

      this.group.add(droneGroup);
      this.drones.push({
        group: droneGroup,
        baseRadius: 18 + (i % 4) * 11,
        height: 18 + (i % 3) * 5,
        speed: 0.15 + (i % 2) * 0.08,
        angle: (i / 8) * Math.PI * 2,
        bobFreq: 1.2 + i * 0.2
      });
    }
  }

  /**
   * Builds an authentic NYC Yellow Taxi Cab mesh (yellow chassis, cabin, TAXI roof sign, wheels, lights)
   */
  private createNYCTaxiMesh(): THREE.Group {
    const taxi = new THREE.Group();

    // 1. Authentic NYC Yellow Body Material
    const yellowMat = new THREE.MeshStandardMaterial({
      color: 0xF59E0B, // Vibrant NYC Yellow Cab
      metalness: 0.5,
      roughness: 0.3
    });

    const blackMat = new THREE.MeshStandardMaterial({
      color: 0x0F172A,
      roughness: 0.8
    });

    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x1E293B,
      metalness: 0.85,
      roughness: 0.15
    });

    const taxiSignMat = new THREE.MeshBasicMaterial({
      color: 0xFEF08A // Illuminated taxi roof sign
    });

    const headlightMat = new THREE.MeshBasicMaterial({ color: 0xFEF9C3 });
    const taillightMat = new THREE.MeshBasicMaterial({ color: 0xEF4444 });

    // Lower Chassis
    const bodyGeo = new THREE.BoxGeometry(0.88, 0.16, 0.42);
    const body = new THREE.Mesh(bodyGeo, yellowMat);
    body.position.y = 0.11;
    taxi.add(body);

    // Upper Cabin Glass
    const cabinGeo = new THREE.BoxGeometry(0.48, 0.15, 0.36);
    const cabin = new THREE.Mesh(cabinGeo, glassMat);
    cabin.position.set(-0.04, 0.24, 0);
    taxi.add(cabin);

    // Yellow Roof Cap
    const roofGeo = new THREE.BoxGeometry(0.5, 0.03, 0.38);
    const roof = new THREE.Mesh(roofGeo, yellowMat);
    roof.position.set(-0.04, 0.32, 0);
    taxi.add(roof);

    // NYC TAXI Roof Light
    const signGeo = new THREE.BoxGeometry(0.14, 0.06, 0.16);
    const sign = new THREE.Mesh(signGeo, taxiSignMat);
    sign.position.set(-0.04, 0.36, 0);
    taxi.add(sign);

    // Black Checkered Side Stripe
    const stripeGeo = new THREE.BoxGeometry(0.86, 0.025, 0.43);
    const stripe = new THREE.Mesh(stripeGeo, blackMat);
    stripe.position.y = 0.13;
    taxi.add(stripe);

    // 4 Wheels
    const wheelGeo = new THREE.CylinderGeometry(0.075, 0.075, 0.05, 8);
    wheelGeo.rotateX(Math.PI / 2);
    [[-0.26, 0.2], [0.26, 0.2], [-0.26, -0.2], [0.26, -0.2]].forEach(([wx, wz]) => {
      const wheel = new THREE.Mesh(wheelGeo, blackMat);
      wheel.position.set(wx, 0.075, wz);
      taxi.add(wheel);
    });

    // Headlights
    [-0.14, 0.14].forEach((hz) => {
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.05, 0.07), headlightMat);
      head.position.set(0.44, 0.12, hz);
      taxi.add(head);
    });

    // Taillights
    [-0.14, 0.14].forEach((tz) => {
      const tail = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.05, 0.07), taillightMat);
      tail.position.set(-0.44, 0.12, tz);
      taxi.add(tail);
    });

    return taxi;
  }

  /**
   * Spawns iconic NYC Yellow Taxis cruising along radial grand avenues and concentric circular boulevards
   */
  private spawnHighwayCouriers() {
    // 1. 16 NYC Yellow Cabs traversing radial avenues (2 per avenue)
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;

      // Taxi 1 (Outbound lane)
      const taxi1 = this.createNYCTaxiMesh();
      this.group.add(taxi1);
      this.highwayCouriers.push({
        group: taxi1,
        type: 'radial',
        avenueAngle: angle,
        speed: 0.38 + (i % 3) * 0.08,
        offset: i * 1.1
      });

      // Taxi 2 (Inbound lane)
      const taxi2 = this.createNYCTaxiMesh();
      this.group.add(taxi2);
      this.highwayCouriers.push({
        group: taxi2,
        type: 'radial',
        avenueAngle: angle,
        speed: 0.34 + ((i + 1) % 3) * 0.08,
        offset: i * 1.1 + Math.PI
      });
    }

    // 2. 18 NYC Yellow Cabs circling concentric boulevard rings (inner r=14, mid r=28, beltway r=43)
    const ringConfigs = [
      { radius: 14.0, speed: 0.35, count: 5 },
      { radius: 28.0, speed: -0.28, count: 7 },
      { radius: 43.0, speed: 0.22, count: 6 }
    ];

    ringConfigs.forEach((cfg) => {
      for (let j = 0; j < cfg.count; j++) {
        const ringTaxi = this.createNYCTaxiMesh();
        this.group.add(ringTaxi);
        this.highwayCouriers.push({
          group: ringTaxi,
          type: 'ring',
          ringRadius: cfg.radius,
          speed: cfg.speed,
          offset: (j / cfg.count) * Math.PI * 2
        });
      }
    });
  }

  public update(delta: number, time: number = 0) {
    // Update elevated rail pods
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

    // Update ground highway couriers
    this.highwayCouriers.forEach((c) => {
      if (c.type === 'radial' && c.avenueAngle !== undefined) {
        // Ping-pong along avenue between radius 8 and 60
        const progress = Math.sin(time * c.speed + c.offset) * 0.5 + 0.5;
        const r = 8.0 + progress * 52.0;
        const x = Math.cos(c.avenueAngle) * r;
        const z = Math.sin(c.avenueAngle) * r;
        c.group.position.set(x, 0.16, z);

        // Face traveling direction
        const dir = Math.cos(time * c.speed + c.offset) >= 0 ? 1 : -1;
        c.group.rotation.y = dir === 1 ? -c.avenueAngle : -c.avenueAngle + Math.PI;
      } else if (c.type === 'ring' && c.ringRadius !== undefined) {
        const curAngle = time * c.speed + c.offset;
        const x = Math.cos(curAngle) * c.ringRadius;
        const z = Math.sin(curAngle) * c.ringRadius;
        c.group.position.set(x, 0.16, z);

        // Face tangent of the ring
        const forwardAngle = curAngle + (c.speed >= 0 ? Math.PI / 2 : -Math.PI / 2);
        c.group.rotation.y = -forwardAngle;
      }
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

    this.highwayCouriers.forEach(c => {
      c.group.traverse(obj => {
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
    this.highwayCouriers = [];
  }
}
