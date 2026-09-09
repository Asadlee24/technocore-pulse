import * as THREE from 'three';

interface ActiveShockwave {
  mesh: THREE.Mesh;
  center: [number, number, number];
  currentRadius: number;
  maxRadius: number;
  speed: number;
  opacity: number;
}

export class ProbePulseSystem {
  public group: THREE.Group;
  private shockwaves: ActiveShockwave[] = [];

  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'city-probe-pulses';
  }

  /**
   * Triggers an expanding cyan shockwave ring from a target building position
   */
  public triggerPulse(position: [number, number, number]) {
    const ringGeo = new THREE.RingGeometry(0.5, 1.2, 48);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x36D7E7,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide
    });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.rotation.x = Math.PI / 2;
    ringMesh.position.set(position[0], 0.1, position[2]);
    this.group.add(ringMesh);

    this.shockwaves.push({
      mesh: ringMesh,
      center: position,
      currentRadius: 1.0,
      maxRadius: 40.0,
      speed: 18.0, // expands across city in ~2.2s
      opacity: 0.85
    });
  }

  public update(delta: number) {
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const sw = this.shockwaves[i];
      sw.currentRadius += sw.speed * delta;
      
      const progress = sw.currentRadius / sw.maxRadius;
      sw.opacity = Math.max(0, (1 - progress) * 0.85);

      sw.mesh.scale.set(sw.currentRadius, sw.currentRadius, 1);
      (sw.mesh.material as THREE.MeshBasicMaterial).opacity = sw.opacity;

      if (sw.currentRadius >= sw.maxRadius || sw.opacity <= 0.01) {
        this.group.remove(sw.mesh);
        sw.mesh.geometry.dispose();
        (sw.mesh.material as THREE.Material).dispose();
        this.shockwaves.splice(i, 1);
      }
    }
  }

  public dispose() {
    this.shockwaves.forEach((sw) => {
      this.group.remove(sw.mesh);
      sw.mesh.geometry.dispose();
      (sw.mesh.material as THREE.Material).dispose();
    });
    this.shockwaves = [];
  }
}
