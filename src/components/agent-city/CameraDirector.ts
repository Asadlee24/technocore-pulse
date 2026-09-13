import * as THREE from 'three';
import type { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { BuildingLayout } from './cityLayout';

export type CameraMode = 'overview' | 'building' | 'interior' | 'follow' | 'tour';

export interface TourStep {
  startTime: number;
  endTime: number;
  shotName: string;
  caption: string;
  targetPos: (t: number) => THREE.Vector3;
  lookAtPos: (t: number) => THREE.Vector3;
  onEnter?: () => void;
}

export class CameraDirector {
  public camera: THREE.PerspectiveCamera;
  public controls: OrbitControls;
  public mode: CameraMode = 'overview';
  public currentCaption: string = '';
  public tourElapsedTime: number = 0;
  public isTourPlaying: boolean = false;
  public onTourStepChange?: (caption: string, shotName: string, progress: number) => void;
  public onTourEnd?: () => void;
  public onRequestCutaway?: (buildingId: string | null) => void;

  private targetCameraPos: THREE.Vector3;
  private targetLookAt: THREE.Vector3;
  private currentLookAt: THREE.Vector3;
  private smoothFactor: number = 4.5;
  private followTarget: THREE.Object3D | null = null;
  private buildingsMap: Map<string, BuildingLayout> = new Map();
  private tourSteps: TourStep[] = [];
  private activeStepIdx: number = -1;

  constructor(
    camera: THREE.PerspectiveCamera,
    controls: OrbitControls,
    buildings: BuildingLayout[]
  ) {
    this.camera = camera;
    this.controls = controls;

    buildings.forEach(b => this.buildingsMap.set(b.id, b));

    // Near-isometric default overview angle (~38° elevation, 45° azimuth)
    this.targetCameraPos = new THREE.Vector3(56, 44, 56);
    this.targetLookAt = new THREE.Vector3(0, 4, 0);
    this.currentLookAt = new THREE.Vector3(0, 4, 0);

    this.camera.position.copy(this.targetCameraPos);
    this.controls.target.copy(this.targetLookAt);

    this.setupTourSteps();
  }

  private setupTourSteps() {
    // 60-Second Directed Tour matching reference video aesthetic
    this.tourSteps = [
      // Shot 1 (0–10s): Distant diamond grid sweep into full 22-building metropolis
      {
        startTime: 0,
        endTime: 10,
        shotName: 'Metropolis Skyline Orbit',
        caption: 'Technocore Pulse: Visual observatory representing real observed public agent communications.',
        targetPos: (t: number) => {
          const p = THREE.MathUtils.smoothstep(t, 0, 10);
          const angle = Math.PI / 4 + p * 0.4;
          const radius = THREE.MathUtils.lerp(90, 60, p);
          const y = THREE.MathUtils.lerp(65, 42, p);
          return new THREE.Vector3(Math.cos(angle) * radius, y, Math.sin(angle) * radius);
        },
        lookAtPos: () => new THREE.Vector3(0, 4, 0),
        onEnter: () => {
          if (this.onRequestCutaway) this.onRequestCutaway(null);
        }
      },
      // Shot 2 (10–20s): Low-altitude avenue run between Cobalt Block and Main Tower
      {
        startTime: 10,
        endTime: 20,
        shotName: 'Neon Avenue Skim',
        caption: 'Live protocol messages flowing across public channels with zero synthetic seeding.',
        targetPos: (t: number) => {
          const p = THREE.MathUtils.smoothstep(t, 10, 20);
          return new THREE.Vector3(
            THREE.MathUtils.lerp(-28, -6, p),
            THREE.MathUtils.lerp(12, 6, p),
            THREE.MathUtils.lerp(22, -10, p)
          );
        },
        lookAtPos: (t: number) => {
          const p = THREE.MathUtils.smoothstep(t, 10, 20);
          return new THREE.Vector3(
            THREE.MathUtils.lerp(-10, 0, p),
            THREE.MathUtils.lerp(3, 8, p),
            THREE.MathUtils.lerp(6, 0, p)
          );
        }
      },
      // Shot 3 (20–32s): Technocore Tower Multi-Floor Cutaway & Interior Ascent
      {
        startTime: 20,
        endTime: 32,
        shotName: 'Multi-Floor Operations Cutaway',
        caption: 'Inside the tower: Multi-floor workstations bound to real observed identities.',
        targetPos: (t: number) => {
          const p = THREE.MathUtils.smoothstep(t, 20, 32);
          return new THREE.Vector3(
            THREE.MathUtils.lerp(12, 6.5, p),
            THREE.MathUtils.lerp(4.5, 9.5, p),
            THREE.MathUtils.lerp(14, 11.5, p)
          );
        },
        lookAtPos: (t: number) => {
          const p = THREE.MathUtils.smoothstep(t, 20, 32);
          return new THREE.Vector3(
            0,
            THREE.MathUtils.lerp(2.0, 7.5, p),
            0
          );
        },
        onEnter: () => {
          if (this.onRequestCutaway) this.onRequestCutaway('technocore-tower');
        }
      },
      // Shot 4 (32–42s): The Institute & Engineering Server Vault
      {
        startTime: 32,
        endTime: 42,
        shotName: 'Institute & Server Vault',
        caption: 'The Institute & Engineering Bay: Solvers indexing tasks and submitting attestations.',
        targetPos: (t: number) => {
          const p = THREE.MathUtils.smoothstep(t, 32, 42);
          return new THREE.Vector3(
            THREE.MathUtils.lerp(6.5, 26, p),
            THREE.MathUtils.lerp(9.5, 14, p),
            THREE.MathUtils.lerp(11.5, -4, p)
          );
        },
        lookAtPos: (t: number) => {
          const p = THREE.MathUtils.smoothstep(t, 32, 42);
          return new THREE.Vector3(
            THREE.MathUtils.lerp(0, 18, p),
            THREE.MathUtils.lerp(7.5, 6, p),
            THREE.MathUtils.lerp(0, -6, p)
          );
        },
        onEnter: () => {
          if (this.onRequestCutaway) this.onRequestCutaway('engineering-bay');
        }
      },
      // Shot 5 (42–52s): Terrace Park Garden & Signal Exchange
      {
        startTime: 42,
        endTime: 52,
        shotName: 'Terrace Park & Signal Exchange',
        caption: 'Terrace Park & Signal Exchange: Zero synthetic personas · 100% real observed telemetry.',
        targetPos: (t: number) => {
          const p = THREE.MathUtils.smoothstep(t, 42, 52);
          return new THREE.Vector3(
            THREE.MathUtils.lerp(26, -4, p),
            THREE.MathUtils.lerp(14, 18, p),
            THREE.MathUtils.lerp(-4, 32, p)
          );
        },
        lookAtPos: (t: number) => {
          const p = THREE.MathUtils.smoothstep(t, 42, 52);
          return new THREE.Vector3(
            THREE.MathUtils.lerp(18, 4, p),
            THREE.MathUtils.lerp(6, 8, p),
            THREE.MathUtils.lerp(-6, 20, p)
          );
        },
        onEnter: () => {
          if (this.onRequestCutaway) this.onRequestCutaway(null);
        }
      },
      // Shot 6 (52–60s): Ascending Horizon Orbit & Builder Attribution
      {
        startTime: 52,
        endTime: 60,
        shotName: 'City Overview & Attribution',
        caption: 'Built by Asad Lee · Community-built · Not an official FLOP Labs product.',
        targetPos: (t: number) => {
          const p = THREE.MathUtils.smoothstep(t, 52, 60);
          const angle = Math.PI / 4 + 0.4 + p * 0.5;
          const radius = THREE.MathUtils.lerp(50, 68, p);
          const y = THREE.MathUtils.lerp(35, 52, p);
          return new THREE.Vector3(Math.cos(angle) * radius, y, Math.sin(angle) * radius);
        },
        lookAtPos: (t: number) => {
          const p = THREE.MathUtils.smoothstep(t, 52, 60);
          return new THREE.Vector3(
            THREE.MathUtils.lerp(4, 0, p),
            THREE.MathUtils.lerp(8, 4, p),
            THREE.MathUtils.lerp(20, 0, p)
          );
        },
        onEnter: () => {
          if (this.onRequestCutaway) this.onRequestCutaway(null);
        }
      }
    ];
  }

  public setMode(mode: CameraMode) {
    this.mode = mode;
    if (mode === 'overview') {
      this.targetCameraPos.set(56, 44, 56);
      this.targetLookAt.set(0, 4, 0);
      this.smoothFactor = 3.8;
      this.controls.enabled = true;
      if (this.onRequestCutaway) this.onRequestCutaway(null);
    }
  }

  public focusBuilding(buildingId: string) {
    const layout = this.buildingsMap.get(buildingId);
    if (!layout) return;

    this.mode = 'building';
    this.controls.enabled = true;

    const [bx, , bz] = layout.position;
    const distance = Math.max(layout.width, layout.depth) * 2.8 + 10;

    this.targetCameraPos.set(bx + distance * 0.7, layout.height * 0.65 + 10, bz + distance * 0.7);
    this.targetLookAt.set(bx, layout.height * 0.45, bz);
    this.smoothFactor = 5.0;

    if (this.onRequestCutaway) this.onRequestCutaway(buildingId);
  }

  public enterBuildingInterior(buildingId: string, floor: 1 | 2 | 3 | 'all' = 'all') {
    const layout = this.buildingsMap.get(buildingId);
    if (!layout) return;

    this.mode = 'interior';
    this.controls.enabled = true;

    const [bx, , bz] = layout.position;

    if (floor === 1) {
      this.targetCameraPos.set(bx, 3.2, bz + 8.0);
      this.targetLookAt.set(bx, 1.8, bz);
    } else if (floor === 2) {
      this.targetCameraPos.set(bx, 7.8, bz + 8.0);
      this.targetLookAt.set(bx, 6.2, bz);
    } else if (floor === 3) {
      this.targetCameraPos.set(bx, 12.2, bz + 8.0);
      this.targetLookAt.set(bx, 10.6, bz);
    } else {
      // Stacked multi-floor cutaway framing
      this.targetCameraPos.set(bx, 9.5, bz + 18.0);
      this.targetLookAt.set(bx, 5.5, bz);
    }

    this.smoothFactor = 4.8;
    if (this.onRequestCutaway) this.onRequestCutaway(buildingId);
  }

  public followAgent(agentMesh: THREE.Object3D) {
    this.mode = 'follow';
    this.followTarget = agentMesh;
    this.smoothFactor = 6.0;
    this.controls.enabled = false;
  }

  public startTour() {
    this.mode = 'tour';
    this.tourElapsedTime = 0;
    this.isTourPlaying = true;
    this.activeStepIdx = -1;
    this.controls.enabled = false;
  }

  public pauseTour() {
    this.isTourPlaying = false;
  }

  public resumeTour() {
    this.isTourPlaying = true;
  }

  public exitTour() {
    this.isTourPlaying = false;
    this.setMode('overview');
    if (this.onRequestCutaway) this.onRequestCutaway(null);
  }

  public handleUserInteraction() {
    if (this.mode === 'tour') {
      this.exitTour();
    }
  }

  public update(delta: number) {
    if (this.mode === 'tour') {
      if (!this.isTourPlaying) return;

      this.tourElapsedTime += delta;
      const totalTourDuration = 60.0;
      const progress = Math.min(this.tourElapsedTime / totalTourDuration, 1.0);

      const stepIdx = this.tourSteps.findIndex(
        s => this.tourElapsedTime >= s.startTime && this.tourElapsedTime < s.endTime
      );

      if (stepIdx !== -1) {
        const step = this.tourSteps[stepIdx];

        if (stepIdx !== this.activeStepIdx) {
          this.activeStepIdx = stepIdx;
          if (step.onEnter) step.onEnter();
        }

        const newPos = step.targetPos(this.tourElapsedTime);
        const newLook = step.lookAtPos(this.tourElapsedTime);

        this.camera.position.lerp(newPos, delta * 4.5);
        this.currentLookAt.lerp(newLook, delta * 4.5);
        this.camera.lookAt(this.currentLookAt);
        this.controls.target.copy(this.currentLookAt);

        this.currentCaption = step.caption;
        if (this.onTourStepChange) {
          this.onTourStepChange(step.caption, step.shotName, progress);
        }
      } else if (this.tourElapsedTime >= totalTourDuration) {
        this.exitTour();
        if (this.onTourEnd) this.onTourEnd();
      }
      return;
    }

    if (this.mode === 'follow' && this.followTarget) {
      const targetPos = new THREE.Vector3();
      this.followTarget.getWorldPosition(targetPos);

      this.targetLookAt.copy(targetPos);
      this.targetCameraPos.set(targetPos.x + 8, targetPos.y + 7, targetPos.z + 8);
    }

    // Smooth lerp camera position and orbit target during user navigation
    const lerpRate = Math.min(delta * this.smoothFactor, 0.25);
    this.camera.position.lerp(this.targetCameraPos, lerpRate);
    this.controls.target.lerp(this.targetLookAt, lerpRate);
  }
}
