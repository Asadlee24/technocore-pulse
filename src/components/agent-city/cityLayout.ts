import type { RoomCluster } from '../../types/probe';

export type CityDistrictType =
  | 'coordination'
  | 'work'
  | 'research'
  | 'compute'
  | 'settlement'
  | 'social'
  | 'broadcast'
  | 'infrastructure';

export type BuildingArchetype =
  | 'skyscraper'
  | 'office-tower'
  | 'research-lab'
  | 'data-center'
  | 'settlement-vault'
  | 'social-block'
  | 'broadcast-hall'
  | 'utility-structure';

export interface BuildingLayout {
  room: RoomCluster;
  position: [number, number, number];
  width: number;
  depth: number;
  height: number;
  district: CityDistrictType;
  archetype: BuildingArchetype;
  color: string;
  beaconColor: string;
  windowDensity: number;
  rotationY: number;
  isPrimaryRoom: boolean;
}

export interface CityDistrictLayout {
  type: CityDistrictType;
  name: string;
  sectorIndex: number;
  angle: number; // center angle in radians
  center: [number, number, number];
  color: string;
  buildings: BuildingLayout[];
}

export interface RoadWaypoints {
  innerRingRadius: number;
  outerRingRadius: number;
  beltwayRadius: number;
  radialAvenues: { angle: number; startRadius: number; endRadius: number }[];
}

export const DISTRICT_CONFIGS: Record<CityDistrictType, {
  name: string;
  sectorIndex: number;
  color: string;
  archetype: BuildingArchetype;
  description: string;
}> = {
  'coordination': {
    name: 'Coordination District',
    sectorIndex: 0,
    color: '#36D7E7',
    archetype: 'skyscraper',
    description: 'Autonomous protocol alignment and consensus towers'
  },
  'work': {
    name: 'Agent Work District',
    sectorIndex: 1,
    color: '#4DA3FF',
    archetype: 'office-tower',
    description: 'High-density autonomous agent office towers and desk complexes'
  },
  'research': {
    name: 'Research District',
    sectorIndex: 2,
    color: '#38BDF8',
    archetype: 'research-lab',
    description: 'Algorithmic innovation, probe analysis laboratories'
  },
  'compute': {
    name: 'Compute District',
    sectorIndex: 3,
    color: '#A855F7',
    archetype: 'data-center',
    description: 'High-density inference clusters and relay matrix'
  },
  'settlement': {
    name: 'Settlement District',
    sectorIndex: 4,
    color: '#2FD27F',
    archetype: 'settlement-vault',
    description: 'Atomic escrow and cryptographic settlement vaults'
  },
  'social': {
    name: 'Social District',
    sectorIndex: 5,
    color: '#F472B6',
    archetype: 'social-block',
    description: 'Public agent courtyards, modular residential clusters'
  },
  'broadcast': {
    name: 'Public Communication District',
    sectorIndex: 6,
    color: '#F0A824',
    archetype: 'broadcast-hall',
    description: 'Global signal transmission masts and open forums'
  },
  'infrastructure': {
    name: 'Infrastructure District',
    sectorIndex: 7,
    color: '#94A3B8',
    archetype: 'utility-structure',
    description: 'Network routing terminals, power nodes, transit hubs'
  }
};

/**
 * Calculates building height based on active agent density:
 * height = clamp(6 + log2(activeAgentsCount + 1) * 4.5, 7, 34)
 */
export function calculateBuildingHeight(activeAgentsCount: number): number {
  const calculated = 6 + Math.log2(Math.max(0, activeAgentsCount) + 1) * 4.5;
  return Math.min(34, Math.max(7, Math.round(calculated * 10) / 10));
}

/**
 * Get rooftop beacon color mapped from lastProbeArm:
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
 * Maps a RoomCluster category or id to one of the 8 canonical districts
 */
export function mapRoomToDistrict(room: RoomCluster, index: number): CityDistrictType {
  const cat = room.category;
  if (cat === 'coordination') return index % 2 === 0 ? 'coordination' : 'work';
  if (cat === 'compute-relay') return 'compute';
  if (cat === 'settlement-prep') return 'settlement';
  if (cat === 'agent-social') return index % 2 === 0 ? 'social' : 'broadcast';
  
  const allDistricts: CityDistrictType[] = [
    'coordination', 'work', 'research', 'compute',
    'settlement', 'social', 'broadcast', 'infrastructure'
  ];
  return allDistricts[index % allDistricts.length];
}

/**
 * Procedurally generates the complete 8-district metropolitan layout
 */
export function generateCityLayout(rooms: RoomCluster[]): {
  buildings: BuildingLayout[];
  districts: CityDistrictLayout[];
  roadWaypoints: RoadWaypoints;
} {
  const buildings: BuildingLayout[] = [];
  const districtsMap: Record<CityDistrictType, BuildingLayout[]> = {
    'coordination': [],
    'work': [],
    'research': [],
    'compute': [],
    'settlement': [],
    'social': [],
    'broadcast': [],
    'infrastructure': []
  };

  const districtKeys = Object.keys(DISTRICT_CONFIGS) as CityDistrictType[];
  const totalSectors = districtKeys.length; // 8
  const sectorAngleStep = (Math.PI * 2) / totalSectors;

  // 1. First assign incoming real rooms to appropriate districts
  rooms.forEach((room, idx) => {
    const districtType = mapRoomToDistrict(room, idx);
    const cfg = DISTRICT_CONFIGS[districtType];
    const baseAngle = cfg.sectorIndex * sectorAngleStep;
    
    // Position inside the primary ring (radius 16 to 26)
    const angleJitter = (Math.sin(idx * 7.1) * 0.18);
    const angle = baseAngle + angleJitter;
    const radius = 16 + ((idx % 3) * 4.5);
    
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    const height = calculateBuildingHeight(room.activeAgentsCount);

    let width = 4.2;
    let depth = 4.2;
    if (districtType === 'compute') {
      width = 5.2;
      depth = 3.6;
    } else if (districtType === 'work') {
      width = 4.6;
      depth = 4.6;
    } else if (districtType === 'settlement') {
      width = 4.8;
      depth = 4.8;
    }

    const bLayout: BuildingLayout = {
      room,
      position: [x, 0, z],
      width,
      depth,
      height,
      district: districtType,
      archetype: cfg.archetype,
      color: room.color || cfg.color,
      beaconColor: getBeaconColor(room.lastProbeArm),
      windowDensity: Math.min(28, Math.max(8, Math.floor(room.activeAgentsCount / 2))),
      rotationY: angle + Math.PI / 2,
      isPrimaryRoom: true
    };

    buildings.push(bLayout);
    districtsMap[districtType].push(bLayout);
  });

  // 2. Procedural Infill Buildings: Ensure all 8 districts have dense, vibrant urban blocks
  districtKeys.forEach((distType) => {
    const cfg = DISTRICT_CONFIGS[distType];
    const baseAngle = cfg.sectorIndex * sectorAngleStep;
    
    // Generate 6 buildings per district across 3 radial tiers (inner, mid, outer) and 2 angular columns
    // Total: 8 * 6 = 48 district buildings + incoming active rooms = ~56 buildings!
    const tiers = [
      { radius: 17, heightBase: 8, heightVar: 4, width: 3.2, depth: 3.2, count: 2 },
      { radius: 23, heightBase: 13, heightVar: 5, width: 3.6, depth: 3.6, count: 2 },
      { radius: 29.5, heightBase: 17, heightVar: 7, width: 3.8, depth: 3.8, count: 2 },
    ];

    let bIndex = 0;
    tiers.forEach((tier, tIdx) => {
      for (let col = 0; col < tier.count; col++) {
        bIndex++;
        // Spread evenly across sector angle (-0.18 to +0.18 radians)
        const angleOffset = (col === 0 ? -0.18 : 0.18) + (tIdx % 2 === 1 ? 0.05 : -0.05);
        const angle = baseAngle + angleOffset;
        const radius = tier.radius + (col * 1.5);

        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;

        const seed = Math.sin(cfg.sectorIndex * 17 + bIndex * 8.3);
        const infillHeight = tier.heightBase + Math.abs(seed) * tier.heightVar;
        const infillAgents = Math.floor(10 + Math.abs(seed) * 18);

        const fakeRoom: RoomCluster = {
          id: `${distType}-sector-${bIndex}`,
          name: `${cfg.name} Sector ${bIndex}`,
          displayName: `${cfg.name.split(' ')[0]} ${bIndex}`,
          category: (distType === 'compute' ? 'compute-relay' : distType === 'settlement' ? 'settlement-prep' : distType === 'social' ? 'agent-social' : 'coordination') as any,
          activeAgentsCount: infillAgents,
          totalProbesReceived: Math.floor(4 + Math.abs(seed) * 14),
          averageResponseLatency: 1.0 + Math.abs(seed) * 2.0,
          status: 'active',
          color: cfg.color,
          coordinates: [x, 0, z]
        };

        const infillBuilding: BuildingLayout = {
          room: fakeRoom,
          position: [x, 0, z],
          width: tier.width,
          depth: tier.depth,
          height: infillHeight,
          district: distType,
          archetype: cfg.archetype,
          color: cfg.color,
          beaconColor: getBeaconColor(bIndex % 3 === 0 ? 'question' : bIndex % 3 === 1 ? 'offer' : 'statement'),
          windowDensity: 14 + tIdx * 4,
          rotationY: angle + Math.PI / 2,
          isPrimaryRoom: false
        };

        buildings.push(infillBuilding);
        districtsMap[distType].push(infillBuilding);
      }
    });
  });

  // 3. Construct District Metadata
  const districts: CityDistrictLayout[] = districtKeys.map((distType) => {
    const cfg = DISTRICT_CONFIGS[distType];
    const bList = districtsMap[distType];
    const avgX = bList.length > 0 ? bList.reduce((sum, b) => sum + b.position[0], 0) / bList.length : Math.cos(cfg.sectorIndex * sectorAngleStep) * 22;
    const avgZ = bList.length > 0 ? bList.reduce((sum, b) => sum + b.position[2], 0) / bList.length : Math.sin(cfg.sectorIndex * sectorAngleStep) * 22;

    return {
      type: distType,
      name: cfg.name,
      sectorIndex: cfg.sectorIndex,
      angle: cfg.sectorIndex * sectorAngleStep,
      center: [avgX, 0, avgZ],
      color: cfg.color,
      buildings: bList
    };
  });

  // 4. Road Waypoints Data
  const roadWaypoints: RoadWaypoints = {
    innerRingRadius: 11,
    outerRingRadius: 27,
    beltwayRadius: 42,
    radialAvenues: districtKeys.map(d => ({
      angle: DISTRICT_CONFIGS[d].sectorIndex * sectorAngleStep,
      startRadius: 11,
      endRadius: 44
    }))
  };

  return { buildings, districts, roadWaypoints };
}
