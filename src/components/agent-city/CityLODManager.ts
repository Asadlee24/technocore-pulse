export type CameraViewLevel = 'city' | 'building' | 'interior';

export interface CityLODConfig {
  isMobile: boolean;
  prefersReducedMotion: boolean;
  viewLevel: CameraViewLevel;
  focusedRoomId: string | null;
}

export class CityLODManager {
  public config: CityLODConfig;

  constructor() {
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    const prefersReducedMotion = typeof window !== 'undefined' 
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches 
      : false;

    this.config = {
      isMobile,
      prefersReducedMotion,
      viewLevel: 'city',
      focusedRoomId: null
    };
  }

  public setViewLevel(level: CameraViewLevel, roomId: string | null = null) {
    this.config.viewLevel = level;
    this.config.focusedRoomId = roomId;
  }

  public shouldRenderInterior(roomId: string): boolean {
    if (this.config.viewLevel === 'city') return false;
    return this.config.focusedRoomId === roomId;
  }

  public shouldAnimateWorkers(): boolean {
    if (this.config.prefersReducedMotion) return false;
    return this.config.viewLevel === 'building' || this.config.viewLevel === 'interior';
  }

  public getMaxWorkersPerFloor(): number {
    if (this.config.isMobile) return 3;
    if (this.config.viewLevel === 'interior') return 6;
    return 4;
  }
}
