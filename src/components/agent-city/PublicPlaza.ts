import * as THREE from 'three';
import { AgentWorker } from './AgentWorker';

export class PublicPlaza {
  public group: THREE.Group;
  private holoRingMesh: THREE.Mesh | null = null;
  private gatheredAgents: AgentWorker[] = [];

  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'technocore-public-plaza';

    this.buildPlazaArchitecture();
    this.buildGatheredAgents();
  }

  private buildPlazaArchitecture() {
    // 1. Tiered Circular Plaza Floor
    const plazaBaseGeo = new THREE.CylinderGeometry(14, 15, 0.4, 32);
    const plazaBaseMat = new THREE.MeshStandardMaterial({
      color: 0x0B1320,
      roughness: 0.6,
      metalness: 0.5
    });
    const plazaBase = new THREE.Mesh(plazaBaseGeo, plazaBaseMat);
    plazaBase.position.y = 0.2;
    plazaBase.receiveShadow = true;
    this.group.add(plazaBase);

    // Inner elevated coordination dais
    const daisGeo = new THREE.CylinderGeometry(8, 8.5, 0.3, 24);
    const daisMat = new THREE.MeshStandardMaterial({
      color: 0x101A2A,
      roughness: 0.4,
      metalness: 0.8
    });
    const dais = new THREE.Mesh(daisGeo, daisMat);
    dais.position.y = 0.5;
    this.group.add(dais);

    // 2. Concentric Neon Ring Lines
    const ringGeo = new THREE.RingGeometry(8.5, 8.8, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x36D7E7,
      side: THREE.DoubleSide
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.52;
    this.group.add(ring);

    // 3. Floating Holographic Protocol Ring
    const holoGeo = new THREE.TorusGeometry(6, 0.08, 12, 48);
    const holoMat = new THREE.MeshBasicMaterial({
      color: 0x36D7E7,
      transparent: true,
      opacity: 0.75
    });
    this.holoRingMesh = new THREE.Mesh(holoGeo, holoMat);
    this.holoRingMesh.rotation.x = Math.PI / 2;
    this.holoRingMesh.position.y = 2.4;
    this.group.add(this.holoRingMesh);

    // 4. Circular Terminal Monoliths
    const terminalCount = 4;
    for (let i = 0; i < terminalCount; i++) {
      const angle = (i / terminalCount) * Math.PI * 2;
      const tx = Math.cos(angle) * 5.2;
      const tz = Math.sin(angle) * 5.2;

      const monoGeo = new THREE.BoxGeometry(0.6, 1.2, 0.4);
      const monoMat = new THREE.MeshStandardMaterial({
        color: 0x1B2A3D,
        roughness: 0.3,
        metalness: 0.7
      });
      const mono = new THREE.Mesh(monoGeo, monoMat);
      mono.position.set(tx, 1.1, tz);
      mono.rotation.y = -angle + Math.PI / 2;
      this.group.add(mono);

      // Terminal screen
      const screenGeo = new THREE.PlaneGeometry(0.48, 0.35);
      const screenMat = new THREE.MeshBasicMaterial({
        color: i % 2 === 0 ? 0x36D7E7 : 0x2FD27F
      });
      const screen = new THREE.Mesh(screenGeo, screenMat);
      screen.position.set(0, 0.2, 0.21);
      mono.add(screen);
    }
  }

  private buildGatheredAgents() {
    // 6 stylized agent silhouettes standing in the plaza consulting terminals
    const agentConfigs = [
      { x: 4.4, z: 1.2, rotY: -Math.PI / 1.5 },
      { x: -4.4, z: 1.2, rotY: Math.PI / 1.5 },
      { x: 1.2, z: 4.4, rotY: Math.PI },
      { x: -1.2, z: -4.4, rotY: 0 },
      { x: 3.2, z: -3.2, rotY: -Math.PI / 4 },
      { x: -3.2, z: 3.2, rotY: (3 * Math.PI) / 4 }
    ];

    agentConfigs.forEach((cfg) => {
      const agent = new AgentWorker({
        x: cfg.x,
        y: 0.5,
        z: cfg.z,
        rotationY: cfg.rotY,
        isSeated: false,
        activityState: 'active'
      });
      this.gatheredAgents.push(agent);
      this.group.add(agent.group);
    });
  }

  public update(time: number) {
    if (this.holoRingMesh) {
      this.holoRingMesh.rotation.z = time * 0.4;
      this.holoRingMesh.position.y = 2.4 + Math.sin(time * 2) * 0.15;
    }
    this.gatheredAgents.forEach(a => a.update(time));
  }

  public dispose() {
    this.gatheredAgents = [];
  }
}
