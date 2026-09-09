import * as THREE from 'three';
import type { BuildingLayout } from './cityLayout';

interface AgentEntity {
  buildingIndex: number;
  orbitRadius: number;
  orbitSpeed: number;
  angle: number;
  baseY: number;
  verticalBobSpeed: number;
}

export class AgentParticles {
  public group: THREE.Group;
  private instancedMesh: THREE.InstancedMesh;
  private agents: AgentEntity[] = [];
  private buildings: BuildingLayout[];

  constructor(buildings: BuildingLayout[]) {
    this.buildings = buildings;
    this.group = new THREE.Group();
    this.group.name = 'city-agent-particles';

    const count = Math.min(64, Math.max(24, buildings.length * 6));
    
    // Abstract luminous capsule drone
    const droneGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.35, 8);
    const droneMat = new THREE.MeshBasicMaterial({
      color: 0x2FD27F,
      transparent: true,
      opacity: 0.95
    });

    this.instancedMesh = new THREE.InstancedMesh(droneGeo, droneMat, count);

    for (let i = 0; i < count; i++) {
      const bIdx = i % Math.max(1, buildings.length);
      const b = buildings[bIdx] || { position: [0, 0, 0], height: 12 };
      this.agents.push({
        buildingIndex: bIdx,
        orbitRadius: Math.max(2.8, (b.width || 4) * 0.9 + Math.random() * 2),
        orbitSpeed: (Math.random() > 0.5 ? 1 : -1) * (0.8 + Math.random() * 1.2),
        angle: Math.random() * Math.PI * 2,
        baseY: 2 + Math.random() * ((b.height || 12) - 3),
        verticalBobSpeed: 1.5 + Math.random() * 2.0
      });
    }

    this.group.add(this.instancedMesh);
  }

  public update(time: number) {
    if (!this.instancedMesh || this.buildings.length === 0) return;

    const dummy = new THREE.Object3D();

    for (let i = 0; i < this.agents.length; i++) {
      const a = this.agents[i];
      const b = this.buildings[a.buildingIndex] || this.buildings[0];

      a.angle += a.orbitSpeed * 0.015;
      const x = b.position[0] + Math.cos(a.angle) * a.orbitRadius;
      const z = b.position[2] + Math.sin(a.angle) * a.orbitRadius;
      const y = a.baseY + Math.sin(time * a.verticalBobSpeed) * 0.4;

      dummy.position.set(x, y, z);
      dummy.rotation.set(0, a.angle + Math.PI / 2, 0);
      dummy.updateMatrix();
      this.instancedMesh.setMatrixAt(i, dummy.matrix);
    }

    this.instancedMesh.instanceMatrix.needsUpdate = true;
  }
}
