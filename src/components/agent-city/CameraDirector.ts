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
    this.targetCameraPos = new THREE.Vector3(55, 42, 55);
    this.targetLookAt = new THREE.Vector3(0, 4, 0);
    this.currentLookAt = new THREE.Vector3(0, 4, 0);

    this.camera.position.copy(this.targetCameraPos);
    this.controls.target.copy(this.targetLookAt);

    this.setupTourSteps();
  }

  private setupTourSteps() {
    // 55–60 Second Directed Tour matching reference video script
    this.tourSteps = [
      // Shot 1 (0–8s): Distant diamond grid reveal into full city overview
      {
        startTime: 0,
        endTime: 8,
        shotName: 'Distant Grid Reveal',
        caption: 'Technocore Pulse: Visual observatory representing real observed public agent communications.',
        targetPos: (t: number) => {
          const p = THREE.MathUtils.smoothstep(t, 0, 8);
          return new THREE.Vector3(
            THREE.MathUtils.lerp(105, 55, p),
            THREE.MathUtils.lerp(75, 42, p),
            THREE.MathUtils.lerp(105, 55, p)
          );
        },
        lookAtPos: () => new THREE.Vector3(0, 4, 0),
        onEnter: () => {
          if (this.onRequestCutaway) this.onRequestCutaway(null);
        }
      },
      // Shot 2 (8–17s): Gentle low approach past Technocore Tower with illuminating windows
      {
        startTime: 8,
        endTime: 17,
        shotName: 'Technocore Tower Approach',
        caption: 'Technocore Tower: Flagship coordination hub. Inset windows pulse on actual observed message arrivals.',
        targetPos: (t: number) => {
          const p = THREE.MathUtils.smoothstep(t, 8, 17);
          return new THREE.Vector3(
            THREE.MathUtils.lerp(55, 24, p),
            THREE.MathUtils.lerp(42, 16, p),
            THREE.MathUtils.lerp(55, 24, p)
          );
        },
        lookAtPos: (t: number) => {
          const p = THREE.MathUtils.smoothstep(t, 8, 17);
          return new THREE.Vector3(0, THREE.MathUtils.lerp(4, 12, p), 0);
        }
      },
      // Shot 3 (17–27s): Enter Tower Control Room and observe workers
      {
        startTime: 17,
        endTime: 27,
        shotName: 'Control Room Interior',
        caption: 'Tower Control Room: Open stage interior with live telemetry monitors and real observed sender desks.',
        targetPos: (t: number) => {
          const p = THREE.MathUtils.smoothstep(t, 17, 27);
          return new THREE.Vector3(
            THREE.MathUtils.lerp(24, 7.5, p),
            THREE.MathUtils.lerp(16, 4.2, p),
            THREE.MathUtils.lerp(24, 7.5, p)
          );
        },
        lookAtPos: () => new THREE.Vector3(0, 1.8, 0),
        onEnter: () => {
          if (this.onRequestCutaway) this.onRequestCutaway('technocore-tower');
        }
      },
      // Shot 4 (27–38s): Return outside and approach The Institute
      {
        startTime: 27,
        endTime: 38,
        shotName: 'The Institute Exterior',
        caption: 'The Institute & Research Library: Architectural landmarks for public knowledge and observatory methodology.',
        targetPos: (t: number) => {
          const p = THREE.MathUtils.smoothstep(t, 27, 38);
          return new THREE.Vector3(
            THREE.MathUtils.lerp(7.5, 34, p),
            THREE.MathUtils.lerp(4.2, 16, p),
            THREE.MathUtils.lerp(7.5, 14, p)
          );
        },
        lookAtPos: (t: number) => {
          const p = THREE.MathUtils.smoothstep(t, 27, 38);
          return new THREE.Vector3(
            THREE.MathUtils.lerp(0, 18, p),
            THREE.MathUtils.lerp(1.8, 8, p),
            0
          );
        },
        onEnter: () => {
          if (this.onRequestCutaway) this.onRequestCutaway(null);
        }
      },
      // Shot 5 (38–48s): Engineering Bay & Verified Records sequence
      {
        startTime: 38,
        endTime: 48,
        shotName: 'Engineering Bay & Verified Records',
        caption: 'Engineering Bay: Distinctive interior for observed room telemetry with verifiable Ed25519 signatures.',
        targetPos: (t: number) => {
          const p = THREE.MathUtils.smoothstep(t, 38, 48);
          return new THREE.Vector3(
            THREE.MathUtils.lerp(34, 28, p),
            THREE.MathUtils.lerp(16, 12, p),
            THREE.MathUtils.lerp(14, -6, p)
          );
        },
        lookAtPos: (t: number) => {
          const p = THREE.MathUtils.smoothstep(t, 38, 48);
          return new THREE.Vector3(
            18,
            THREE.MathUtils.lerp(8, 4, p),
            THREE.MathUtils.lerp(0, -12, p)
          );
        },
        onEnter: () => {
          if (this.onRequestCutaway) this.onRequestCutaway('engineering-bay');
        }
      },
      // Shot 6 (48–58s): Pullback to the living city and builder credit
      {
        startTime: 48,
        endTime: 58,
        shotName: 'City Overview & Attribution',
        caption: 'Built by Asad Lee · Community-built · Not an official FLOP Labs product.',
        targetPos: (t: number) => {
          const p = THREE.MathUtils.smoothstep(t, 48, 58);
          return new THREE.Vector3(
            THREE.MathUtils.lerp(28, 55, p),
            THREE.MathUtils.lerp(12, 42, p),
            THREE.MathUtils.lerp(-6, 55, p)
          );
        },
        lookAtPos: (t: number) => {
          const p = THREE.MathUtils.smoothstep(t, 48, 58);
          return new THREE.Vector3(
            THREE.MathUtils.lerp(18, 0, p),
            THREE.MathUtils.lerp(4, 4, p),
            THREE.MathUtils.lerp(-12, 0, p)
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
      this.targetCameraPos.set(55, 42, 55);
      this.targetLookAt.set(0, 4, 0);
      this.controls.enabled = true;
      if (this.onRequestCutaway) this.onRequestCutaway(null);
    } else if (mode === 'tour') {
      this.startTour();
    }
  }

  public focusBuilding(buildingId: string) {
    const b = this.buildingsMap.get(buildingId);
    if (!b) return;

    this.mode = 'building';
    this.targetLookAt.set(b.position[0], b.height * 0.45, b.position[2]);
    this.targetCameraPos.set(
      b.position[0] + 16,
      b.height * 0.6 + 10,
      b.position[2] + 16
    );
    this.controls.enabled = true;
    if (this.onRequestCutaway) this.onRequestCutaway(null);
  }

  public enterBuildingInterior(buildingId: string) {
    const b = this.buildingsMap.get(buildingId);
    if (!b) return;

    this.mode = 'interior';
    this.targetLookAt.set(b.position[0], 1.8, b.position[2]);
    this.targetCameraPos.set(
      b.position[0] + 6.5,
      4.2,
      b.position[2] + 6.5
    );
    this.controls.enabled = true;
    if (this.onRequestCutaway) this.onRequestCutaway(buildingId);
  }

  public followAgent(agentMesh: THREE.Object3D) {
    this.mode = 'follow';
    this.followTarget = agentMesh;
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
    if (this.onTourEnd) this.onTourEnd();
  }

  public update(delta: number) {
    if (this.mode === 'tour' && this.isTourPlaying) {
      this.tourElapsedTime += delta;

      // Find current step
      const stepIdx = this.tourSteps.findIndex(
        s => this.tourElapsedTime >= s.startTime && this.tourElapsedTime < s.endTime
      );

      if (stepIdx !== -1) {
        const step = this.tourSteps[stepIdx];
        if (stepIdx !== this.activeStepIdx) {
          this.activeStepIdx = stepIdx;
          this.currentCaption = step.caption;
          if (step.onEnter) step.onEnter();
        }

        const progress = (this.tourElapsedTime - step.startTime) / (step.endTime - step.startTime);
        if (this.onTourStepChange) {
          this.onTourStepChange(step.caption, step.shotName, progress);
        }

        const newPos = step.targetPos(this.tourElapsedTime);
        const newLook = step.lookAtPos(this.tourElapsedTime);

        this.camera.position.lerp(newPos, delta * 3.5);
        this.currentLookAt.lerp(newLook, delta * 3.5);
        this.camera.lookAt(this.currentLookAt);
        this.controls.target.copy(this.currentLookAt);
      } else if (this.tourElapsedTime >= 58) {
        // Tour complete! Pullback to settled overview
        this.exitTour();
      }
      return;
    }

    if (this.mode === 'follow' && this.followTarget) {
      const targetP = this.followTarget.position;
      this.targetLookAt.set(targetP.x, targetP.y + 0.8, targetP.z);
      this.targetCameraPos.set(targetP.x + 8, targetP.y + 6, targetP.z + 8);

      this.camera.position.lerp(this.targetCameraPos, delta * 3.0);
      this.currentLookAt.lerp(this.targetLookAt, delta * 4.0);
      this.camera.lookAt(this.currentLookAt);
      this.controls.target.copy(this.currentLookAt);
      return;
    }

    // Smooth transition in overview, building, and interior modes
    if (this.controls.enabled) {
      const dPos = this.camera.position.distanceTo(this.targetCameraPos);
      const dLook = this.controls.target.distanceTo(this.targetLookAt);

      if (dPos > 0.1 || dLook > 0.1) {
        this.camera.position.lerp(this.targetCameraPos, delta * this.smoothFactor);
        this.currentLookAt.lerp(this.targetLookAt, delta * this.smoothFactor);
        this.controls.target.copy(this.currentLookAt);
      }
      this.controls.update();
    }
  }

  public handleUserInteraction() {
    // If user drags or interacts during tour, cleanly pause/exit tour
    if (this.mode === 'tour' && this.isTourPlaying) {
      this.pauseTour();
      this.controls.enabled = true;
    }
  }
}
