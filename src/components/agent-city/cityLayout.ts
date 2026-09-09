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

  // Track rooms assigned to each district
  const districtRoomAssignments: Record<CityDistrictType, RoomCluster[]> = {
    'coordination': [],
    'work': [],
    'research': [],
    'compute': [],
    'settlement': [],
    'social': [],
    'broadcast': [],
    'infrastructure': []
  };

  rooms.forEach((room, idx) => {
    const dType = mapRoomToDistrict(room, idx);
    districtRoomAssignments[dType].push(room);
  });

  // Master Planned Lots for each of the 8 districts:
  // 6 perfectly spaced building parcels per district across 3 concentric rings:
  // Ring 1 (Downtown Hub): radius 21.5, angular offsets [-0.20, +0.20]
  // Ring 2 (Flagship Commercial Center): radius 35.0, angular offsets [-0.24, 0.0 (flagship), +0.24]
  // Ring 3 (Outer Metropolitan Boulevard): radius 50.0, angular offsets [-0.20, +0.20]
  // Between rings are 13-15 unit wide boulevards with zero building overlap!
  districtKeys.forEach((distType) => {
    const cfg = DISTRICT_CONFIGS[distType];
    const baseAngle = cfg.sectorIndex * sectorAngleStep;
    const assignedRooms = districtRoomAssignments[distType];

    // 6 discrete lot definitions per sector
    const sectorLots = [
      // Ring 1: Inner Downtown (medium-rise)
      { ring: 1, radius: 21.5, angleOffset: -0.21, width: 4.4, depth: 4.4, heightBase: 10, heightVar: 4 },
      { ring: 1, radius: 21.5, angleOffset: 0.21, width: 4.4, depth: 4.4, heightBase: 12, heightVar: 4 },
      // Ring 2: Flagship Center (the district centerpiece skyscraper)
      { ring: 2, radius: 35.0, angleOffset: 0.00, width: 5.2, depth: 5.2, heightBase: 24, heightVar: 8, isFlagship: true },
      // Ring 2: Commercial flanks
      { ring: 2, radius: 35.0, angleOffset: -0.25, width: 4.8, depth: 4.8, heightBase: 16, heightVar: 6 },
      { ring: 2, radius: 35.0, angleOffset: 0.25, width: 4.8, depth: 4.8, heightBase: 17, heightVar: 6 },
      // Ring 3: Outer High-Rise
      { ring: 3, radius: 50.0, angleOffset: -0.22, width: 5.4, depth: 5.4, heightBase: 20, heightVar: 9 },
      { ring: 3, radius: 50.0, angleOffset: 0.22, width: 5.4, depth: 5.4, heightBase: 22, heightVar: 9 }
    ];

    sectorLots.forEach((lot, lotIdx) => {
      const angle = baseAngle + lot.angleOffset;
      const x = Math.cos(angle) * lot.radius;
      const z = Math.sin(angle) * lot.radius;

      // Assign real room if available for this lot (flagship gets first assigned room)
      let roomForLot: RoomCluster;
      let isPrimary = false;
      const seed = Math.sin(cfg.sectorIndex * 19 + lotIdx * 7.7);
      let calculatedHeight = lot.heightBase + Math.abs(seed) * lot.heightVar;

      if (lot.isFlagship && assignedRooms.length > 0) {
        roomForLot = assignedRooms[0];
        isPrimary = true;
        calculatedHeight = calculateBuildingHeight(roomForLot.activeAgentsCount);
      } else if (lotIdx === 0 && assignedRooms.length > 1) {
        roomForLot = assignedRooms[1];
        isPrimary = true;
        calculatedHeight = calculateBuildingHeight(roomForLot.activeAgentsCount);
      } else if (lotIdx === 1 && assignedRooms.length > 2) {
        roomForLot = assignedRooms[2];
        isPrimary = true;
        calculatedHeight = calculateBuildingHeight(roomForLot.activeAgentsCount);
      } else {
        // Procedural infill building
        const infillAgents = Math.floor(12 + Math.abs(seed) * 20);

        roomForLot = {
          id: `${distType}-lot-${lotIdx + 1}`,
          name: `${cfg.name.split(' ')[0]} ${lot.isFlagship ? 'Tower' : 'Block ' + (lotIdx + 1)}`,
          activeAgentsCount: infillAgents,
          category: distType === 'compute' ? 'compute-relay' : distType === 'settlement' ? 'settlement-prep' : 'coordination',
          status: Math.abs(seed) > 0.65 ? 'surge' : 'active',
          color: cfg.color,
          lastProbeArm: Math.abs(seed) > 0.5 ? 'question' : 'offer'
        } as any;
      }

      const height = Math.round(calculatedHeight);

      const bLayout: BuildingLayout = {
        room: roomForLot,
        position: [x, 0, z],
        width: lot.width,
        depth: lot.depth,
        height: Math.max(8, height),
        district: distType,
        archetype: cfg.archetype,
        color: roomForLot.color || cfg.color,
        beaconColor: getBeaconColor(roomForLot.lastProbeArm),
        windowDensity: 16 + lot.ring * 4,
        rotationY: angle + Math.PI / 2,
        isPrimaryRoom: isPrimary
      };

      buildings.push(bLayout);
      districtsMap[distType].push(bLayout);
    });
  });

  // 3. Construct District Metadata
  const districts: CityDistrictLayout[] = districtKeys.map((distType) => {
    const cfg = DISTRICT_CONFIGS[distType];
    const bList = districtsMap[distType];
    const avgX = bList.length > 0 ? bList.reduce((sum, b) => sum + b.position[0], 0) / bList.length : Math.cos(cfg.sectorIndex * sectorAngleStep) * 35;
    const avgZ = bList.length > 0 ? bList.reduce((sum, b) => sum + b.position[2], 0) / bList.length : Math.sin(cfg.sectorIndex * sectorAngleStep) * 35;

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

  // 4. Road Waypoints: Concentric Boulevards and Inter-District Radial Avenues
  // Rings run between the building rings so roads never intersect buildings!
  // Inner ring: radius 14 (between central core and Ring 1)
  // Mid Boulevard: radius 28 (between Ring 1 at 21.5 and Ring 2 at 35)
  // Beltway Highway: radius 43 (between Ring 2 at 35 and Ring 3 at 50)
  // Outer Beltway: radius 60 (framing the outer perimeter)
  const roadWaypoints: RoadWaypoints = {
    innerRingRadius: 14,
    outerRingRadius: 28,
    beltwayRadius: 43,
    radialAvenues: districtKeys.map((_, i) => ({
      // Avenues are placed precisely halfway between districts (inter-district avenues)
      angle: (i + 0.5) * sectorAngleStep,
      startRadius: 8,
      endRadius: 65
    }))
  };

  return { buildings, districts, roadWaypoints };
}
