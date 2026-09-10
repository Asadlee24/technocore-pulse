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
  | 'stepped-tower'
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
 * Calculates building height based on observed metric:
 * height = clamp(6 + log2(activityMetric + 1) * 4.5, 7, 34)
 */
export function calculateBuildingHeight(activityMetric?: number | null, fallbackIndex: number = 0): number {
  const metric = (typeof activityMetric === 'number' && activityMetric > 0)
    ? activityMetric
    : 8 + (fallbackIndex % 5) * 4;
  const calculated = 6 + Math.log2(metric + 1) * 4.5;
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
 * Maps a RoomCluster to one of the 8 canonical visual districts
 */
export function mapRoomToDistrict(room: RoomCluster, index: number): CityDistrictType {
  if (room.visualDistrict) {
    if (room.visualDistrict === 'coordination') return index % 2 === 0 ? 'coordination' : 'work';
    if (room.visualDistrict === 'compute-relay') return 'compute';
    if (room.visualDistrict === 'settlement-prep') return 'settlement';
    if (room.visualDistrict === 'agent-social') return index % 2 === 0 ? 'social' : 'broadcast';
  }
  
  const allDistricts: CityDistrictType[] = [
    'coordination', 'work', 'research', 'compute',
    'settlement', 'social', 'broadcast', 'infrastructure'
  ];
  return allDistricts[index % allDistricts.length];
}

interface LotBlueprint {
  ring: number;
  radius: number;
  angleOffset: number;
  width: number;
  depth: number;
  heightBase: number;
  heightVar: number;
  archetype: BuildingArchetype;
  isFlagship?: boolean;
}

/**
 * District-specific lot designs providing rich architectural diversity.
 * Varies aspect ratios, low-rises vs soaring towers, and distinct structural archetypes.
 */
const DISTRICT_LOT_CONFIGS: Record<CityDistrictType, LotBlueprint[]> = {
  coordination: [
    { ring: 1, radius: 21.5, angleOffset: -0.21, width: 4.4, depth: 4.4, heightBase: 12, heightVar: 4, archetype: 'stepped-tower' },
    { ring: 1, radius: 21.5, angleOffset: 0.21, width: 4.2, depth: 4.2, heightBase: 9, heightVar: 3, archetype: 'social-block' },
    { ring: 2, radius: 35.0, angleOffset: 0.00, width: 5.2, depth: 5.2, heightBase: 28, heightVar: 6, archetype: 'skyscraper', isFlagship: true },
    { ring: 2, radius: 35.0, angleOffset: -0.25, width: 4.4, depth: 4.4, heightBase: 19, heightVar: 5, archetype: 'stepped-tower' },
    { ring: 2, radius: 35.0, angleOffset: 0.25, width: 4.2, depth: 4.2, heightBase: 18, heightVar: 5, archetype: 'skyscraper' },
    { ring: 3, radius: 50.0, angleOffset: -0.22, width: 5.4, depth: 5.4, heightBase: 26, heightVar: 8, archetype: 'skyscraper' },
    { ring: 3, radius: 50.0, angleOffset: 0.22, width: 4.6, depth: 4.6, heightBase: 22, heightVar: 6, archetype: 'stepped-tower' }
  ],
  work: [
    { ring: 1, radius: 21.5, angleOffset: -0.21, width: 4.4, depth: 4.4, heightBase: 11, heightVar: 3, archetype: 'office-tower' },
    { ring: 1, radius: 21.5, angleOffset: 0.21, width: 4.8, depth: 4.2, heightBase: 8, heightVar: 3, archetype: 'office-tower' },
    { ring: 2, radius: 35.0, angleOffset: 0.00, width: 5.6, depth: 5.2, heightBase: 28, heightVar: 6, archetype: 'office-tower', isFlagship: true },
    { ring: 2, radius: 35.0, angleOffset: -0.25, width: 4.8, depth: 4.8, heightBase: 19, heightVar: 5, archetype: 'stepped-tower' },
    { ring: 2, radius: 35.0, angleOffset: 0.25, width: 5.0, depth: 4.6, heightBase: 18, heightVar: 5, archetype: 'office-tower' },
    { ring: 3, radius: 50.0, angleOffset: -0.22, width: 5.4, depth: 5.4, heightBase: 24, heightVar: 8, archetype: 'office-tower' },
    { ring: 3, radius: 50.0, angleOffset: 0.22, width: 5.0, depth: 5.0, heightBase: 22, heightVar: 6, archetype: 'stepped-tower' }
  ],
  research: [
    { ring: 1, radius: 21.5, angleOffset: -0.21, width: 5.2, depth: 4.2, heightBase: 8, heightVar: 3, archetype: 'research-lab' },
    { ring: 1, radius: 21.5, angleOffset: 0.21, width: 4.4, depth: 4.4, heightBase: 12, heightVar: 3, archetype: 'stepped-tower' },
    { ring: 2, radius: 35.0, angleOffset: 0.00, width: 5.4, depth: 5.4, heightBase: 27, heightVar: 7, archetype: 'research-lab', isFlagship: true },
    { ring: 2, radius: 35.0, angleOffset: -0.25, width: 5.4, depth: 4.2, heightBase: 17, heightVar: 5, archetype: 'research-lab' },
    { ring: 2, radius: 35.0, angleOffset: 0.25, width: 4.4, depth: 4.4, heightBase: 15, heightVar: 4, archetype: 'research-lab' },
    { ring: 3, radius: 50.0, angleOffset: -0.22, width: 5.2, depth: 5.2, heightBase: 23, heightVar: 7, archetype: 'research-lab' },
    { ring: 3, radius: 50.0, angleOffset: 0.22, width: 5.2, depth: 4.8, heightBase: 20, heightVar: 6, archetype: 'stepped-tower' }
  ],
  compute: [
    // Wide horizontal data monoliths with heatsink cooling fins
    { ring: 1, radius: 21.5, angleOffset: -0.21, width: 6.2, depth: 3.8, heightBase: 8.5, heightVar: 3, archetype: 'data-center' },
    { ring: 1, radius: 21.5, angleOffset: 0.21, width: 5.2, depth: 4.2, heightBase: 9.5, heightVar: 3, archetype: 'data-center' },
    { ring: 2, radius: 35.0, angleOffset: 0.00, width: 6.6, depth: 5.4, heightBase: 25, heightVar: 6, archetype: 'data-center', isFlagship: true },
    { ring: 2, radius: 35.0, angleOffset: -0.25, width: 5.8, depth: 4.4, heightBase: 18, heightVar: 5, archetype: 'data-center' },
    { ring: 2, radius: 35.0, angleOffset: 0.25, width: 4.6, depth: 4.6, heightBase: 14, heightVar: 4, archetype: 'utility-structure' },
    { ring: 3, radius: 50.0, angleOffset: -0.22, width: 6.4, depth: 5.2, heightBase: 21, heightVar: 7, archetype: 'data-center' },
    { ring: 3, radius: 50.0, angleOffset: 0.22, width: 5.4, depth: 4.8, heightBase: 19, heightVar: 5, archetype: 'data-center' }
  ],
  settlement: [
    // Heavy angular fortress vaults with battered walls
    { ring: 1, radius: 21.5, angleOffset: -0.21, width: 5.2, depth: 5.0, heightBase: 8.5, heightVar: 3, archetype: 'settlement-vault' },
    { ring: 1, radius: 21.5, angleOffset: 0.21, width: 4.6, depth: 4.6, heightBase: 11, heightVar: 3, archetype: 'stepped-tower' },
    { ring: 2, radius: 35.0, angleOffset: 0.00, width: 5.8, depth: 5.8, heightBase: 25, heightVar: 6, archetype: 'settlement-vault', isFlagship: true },
    { ring: 2, radius: 35.0, angleOffset: -0.25, width: 5.2, depth: 5.2, heightBase: 16, heightVar: 5, archetype: 'settlement-vault' },
    { ring: 2, radius: 35.0, angleOffset: 0.25, width: 5.0, depth: 5.0, heightBase: 17, heightVar: 4, archetype: 'settlement-vault' },
    { ring: 3, radius: 50.0, angleOffset: -0.22, width: 5.6, depth: 5.6, heightBase: 23, heightVar: 7, archetype: 'stepped-tower' },
    { ring: 3, radius: 50.0, angleOffset: 0.22, width: 5.0, depth: 5.0, heightBase: 21, heightVar: 5, archetype: 'settlement-vault' }
  ],
  social: [
    // Low-rise open courtyards, hanging gardens, and stepped residential terraces
    { ring: 1, radius: 21.5, angleOffset: -0.21, width: 5.8, depth: 5.2, heightBase: 7.5, heightVar: 2.5, archetype: 'social-block' },
    { ring: 1, radius: 21.5, angleOffset: 0.21, width: 5.0, depth: 4.8, heightBase: 8.5, heightVar: 3, archetype: 'social-block' },
    { ring: 2, radius: 35.0, angleOffset: 0.00, width: 5.4, depth: 5.4, heightBase: 21, heightVar: 5, archetype: 'social-block', isFlagship: true },
    { ring: 2, radius: 35.0, angleOffset: -0.25, width: 5.0, depth: 5.0, heightBase: 15, heightVar: 4, archetype: 'stepped-tower' },
    { ring: 2, radius: 35.0, angleOffset: 0.25, width: 4.8, depth: 4.8, heightBase: 12, heightVar: 3, archetype: 'social-block' },
    { ring: 3, radius: 50.0, angleOffset: -0.22, width: 5.4, depth: 5.4, heightBase: 18, heightVar: 5, archetype: 'social-block' },
    { ring: 3, radius: 50.0, angleOffset: 0.22, width: 5.2, depth: 5.2, heightBase: 19, heightVar: 5, archetype: 'stepped-tower' }
  ],
  broadcast: [
    // Transmission lattice towers, antenna spires, media halls
    { ring: 1, radius: 21.5, angleOffset: -0.21, width: 5.2, depth: 4.6, heightBase: 8.5, heightVar: 3, archetype: 'social-block' },
    { ring: 1, radius: 21.5, angleOffset: 0.21, width: 4.2, depth: 4.2, heightBase: 12, heightVar: 4, archetype: 'broadcast-hall' },
    { ring: 2, radius: 35.0, angleOffset: 0.00, width: 5.2, depth: 5.2, heightBase: 29, heightVar: 6, archetype: 'broadcast-hall', isFlagship: true },
    { ring: 2, radius: 35.0, angleOffset: -0.25, width: 4.6, depth: 4.6, heightBase: 19, heightVar: 5, archetype: 'broadcast-hall' },
    { ring: 2, radius: 35.0, angleOffset: 0.25, width: 4.8, depth: 4.8, heightBase: 16, heightVar: 4, archetype: 'stepped-tower' },
    { ring: 3, radius: 50.0, angleOffset: -0.22, width: 5.0, depth: 5.0, heightBase: 25, heightVar: 7, archetype: 'broadcast-hall' },
    { ring: 3, radius: 50.0, angleOffset: 0.22, width: 5.2, depth: 5.0, heightBase: 20, heightVar: 5, archetype: 'stepped-tower' }
  ],
  infrastructure: [
    // Industrial gantry frames, power nodes, and substations
    { ring: 1, radius: 21.5, angleOffset: -0.21, width: 5.4, depth: 4.4, heightBase: 7.0, heightVar: 2.5, archetype: 'utility-structure' },
    { ring: 1, radius: 21.5, angleOffset: 0.21, width: 4.8, depth: 4.4, heightBase: 9.0, heightVar: 3, archetype: 'utility-structure' },
    { ring: 2, radius: 35.0, angleOffset: 0.00, width: 5.6, depth: 5.6, heightBase: 26, heightVar: 6, archetype: 'utility-structure', isFlagship: true },
    { ring: 2, radius: 35.0, angleOffset: -0.25, width: 5.0, depth: 5.0, heightBase: 17, heightVar: 4, archetype: 'utility-structure' },
    { ring: 2, radius: 35.0, angleOffset: 0.25, width: 4.8, depth: 4.8, heightBase: 15, heightVar: 4, archetype: 'stepped-tower' },
    { ring: 3, radius: 50.0, angleOffset: -0.22, width: 5.2, depth: 5.2, heightBase: 23, heightVar: 6, archetype: 'utility-structure' },
    { ring: 3, radius: 50.0, angleOffset: 0.22, width: 5.6, depth: 4.8, heightBase: 18, heightVar: 5, archetype: 'utility-structure' }
  ]
};

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
  districtKeys.forEach((distType) => {
    const cfg = DISTRICT_CONFIGS[distType];
    const baseAngle = cfg.sectorIndex * sectorAngleStep;
    const assignedRooms = districtRoomAssignments[distType];
    const sectorLots = DISTRICT_LOT_CONFIGS[distType] || DISTRICT_LOT_CONFIGS.coordination;

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
        calculatedHeight = calculateBuildingHeight(roomForLot.signedIdentitiesObserved, 0);
      } else if (lotIdx === 0 && assignedRooms.length > 1) {
        roomForLot = assignedRooms[1];
        isPrimary = true;
        calculatedHeight = calculateBuildingHeight(roomForLot.signedIdentitiesObserved, 1);
      } else if (lotIdx === 1 && assignedRooms.length > 2) {
        roomForLot = assignedRooms[2];
        isPrimary = true;
        calculatedHeight = calculateBuildingHeight(roomForLot.signedIdentitiesObserved, 2);
      } else {
        // Procedural infill building - clearly marked as visual backdrop without fabricated metrics
        roomForLot = {
          id: `${distType}-lot-${lotIdx + 1}`,
          name: `${cfg.name.split(' ')[0]} ${lot.isFlagship ? 'Tower' : 'Block ' + (lotIdx + 1)}`,
          displayName: `${cfg.name.split(' ')[0]} ${lot.isFlagship ? 'Tower' : 'Block ' + (lotIdx + 1)}`,
          signedIdentitiesObserved: null,
          activeAgentsCount: null,
          totalProbesReceived: 0,
          medianSubsequentLatencySeconds: null,
          averageResponseLatency: null,
          category: 'unclassified',
          visualDistrict: distType === 'compute' ? 'compute-relay' : distType === 'settlement' ? 'settlement-prep' : distType === 'social' ? 'agent-social' : 'coordination',
          status: 'nominal',
          color: cfg.color,
          coordinates: [x, 0, z],
          isDataUnavailable: true
        };
      }

      const height = Math.round(calculatedHeight);

      const bLayout: BuildingLayout = {
        room: roomForLot,
        position: [x, 0, z],
        width: lot.width,
        depth: lot.depth,
        height: Math.max(7, height),
        district: distType,
        archetype: lot.archetype,
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
