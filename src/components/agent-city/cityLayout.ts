import type { RoomCluster } from '../../types/probe';

export interface BuildingLayout {
  room: RoomCluster;
  position: [number, number, number];
  width: number;
  depth: number;
  height: number;
  category: 'coordination' | 'settlement-prep' | 'compute-relay' | 'agent-social';
  color: string;
  beaconColor: string;
  windowDensity: number;
}

export interface CityDistrictLayout {
  category: 'coordination' | 'settlement-prep' | 'compute-relay' | 'agent-social';
  name: string;
  center: [number, number, number];
  buildings: BuildingLayout[];
}

/**
 * Calculates building height based on the prompt formula:
 * height = clamp(5 + log2(activeAgentsCount + 1) * 4, 6, 28)
 */
export function calculateBuildingHeight(activeAgentsCount: number): number {
  const calculated = 5 + Math.log2(Math.max(0, activeAgentsCount) + 1) * 4;
  return Math.min(28, Math.max(6, Math.round(calculated * 10) / 10));
}

/**
 * Get rooftop beacon color mapped from lastProbeArm:
 * question: amber/cyan
 * offer: violet
 * statement: cool blue
 */
export function getBeaconColor(lastProbeArm?: string): string {
  switch (lastProbeArm) {
    case 'question': return '#F0A824';
    case 'offer': return '#A855F7';
    case 'statement': return '#36D7E7';
    default: return '#4DA3FF';
  }
}

/**
 * Procedurally lays out rooms into stylized urban districts around the central core (0, 0, 0).
 */
export function generateCityLayout(rooms: RoomCluster[]): {
  buildings: BuildingLayout[];
  districts: CityDistrictLayout[];
} {
  const buildings: BuildingLayout[] = [];
  const districtsMap: Record<string, BuildingLayout[]> = {
    'coordination': [],
    'settlement-prep': [],
    'compute-relay': [],
    'agent-social': []
  };

  const angleStep = (Math.PI * 2) / Math.max(rooms.length, 1);
  const minRadius = 14;
  const maxRadius = 32;

  rooms.forEach((room, index) => {
    const angle = index * angleStep;
    // Stagger radius so city feels organic rather than a single rigid ring
    const radius = minRadius + ((index % 3) * (maxRadius - minRadius) / 2.5);
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;

    const height = calculateBuildingHeight(room.activeAgentsCount);
    
    // Footprint based on activity and category
    let width = 3.6;
    let depth = 3.6;
    if (room.category === 'coordination') {
      width = 4.2;
      depth = 4.2;
    } else if (room.category === 'compute-relay') {
      width = 5.0;
      depth = 3.2;
    } else if (room.category === 'settlement-prep') {
      width = 3.8;
      depth = 3.8;
    }

    const bLayout: BuildingLayout = {
      room,
      position: [x, 0, z],
      width,
      depth,
      height,
      category: room.category || 'coordination',
      color: room.color || '#36D7E7',
      beaconColor: getBeaconColor(room.lastProbeArm),
      windowDensity: Math.min(24, Math.max(6, Math.floor(room.activeAgentsCount / 2)))
    };

    buildings.push(bLayout);
    const cat = room.category || 'coordination';
    if (!districtsMap[cat]) districtsMap[cat] = [];
    districtsMap[cat].push(bLayout);
  });

  const districts: CityDistrictLayout[] = Object.entries(districtsMap)
    .filter(([_, bList]) => bList.length > 0)
    .map(([cat, bList]) => {
      const avgX = bList.reduce((sum, b) => sum + b.position[0], 0) / bList.length;
      const avgZ = bList.reduce((sum, b) => sum + b.position[2], 0) / bList.length;
      const displayNames: Record<string, string> = {
        'coordination': 'Core Coordination Sector',
        'settlement-prep': 'Settlement Preparation District',
        'compute-relay': 'Compute & Inference Matrix',
        'agent-social': 'Autonomous Social Clusters'
      };
      return {
        category: cat as any,
        name: displayNames[cat] || cat,
        center: [avgX, 0, avgZ],
        buildings: bList
      };
    });

  return { buildings, districts };
}
