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

export type InteriorStageType =
  | 'tower-control'
  | 'institute-classroom'
  | 'engineering-bay'
  | 'compute-floor'
  | 'generic';

export interface BuildingLayout {
  id: string;
  name: string;
  room: RoomCluster;
  position: [number, number, number];
  width: number;
  depth: number;
  height: number;
  district: CityDistrictType;
  archetype: BuildingArchetype;
  color: string;
  edgeColor: string;
  beaconColor: string;
  windowDensity: number;
  rotationY: number;
  isPrimaryRoom: boolean;
  interiorType: InteriorStageType;
  doorwayPos: [number, number, number];
}

export interface CityDistrictLayout {
  type: CityDistrictType;
  name: string;
  sectorIndex: number;
  angle: number;
  center: [number, number, number];
  color: string;
  buildings: BuildingLayout[];
}

export interface RoadWaypoints {
  gridSpacing: number;
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number };
  intersections: [number, number, number][];
  sidewalkGraph: {
    nodes: [number, number, number][];
    edges: [number, number][]; // pairs of node indices
  };
  innerRingRadius: number;
  outerRingRadius: number;
  beltwayRadius: number;
  radialAvenues: { angle: number; startRadius: number; endRadius: number }[];
}

// 13 Distinct rectilinear city lots arranged on an X/Z diamond grid
interface MasterLotDef {
  id: string;
  name: string;
  x: number;
  z: number;
  width: number;
  depth: number;
  height: number;
  district: CityDistrictType;
  archetype: BuildingArchetype;
  color: string;
  edgeColor: string;
  interiorType: InteriorStageType;
  isPrimary: boolean;
}

export const MASTER_CITY_LOTS: MasterLotDef[] = [
  // 1. Center Landmark: Technocore Tower (tallest, red/magenta neon edge, control room interior)
  {
    id: 'technocore-tower',
    name: 'Technocore Tower',
    x: 0,
    z: 0,
    width: 7.2,
    depth: 7.2,
    height: 30,
    district: 'coordination',
    archetype: 'skyscraper',
    color: '#00B4D8',
    edgeColor: '#F72585', // Radiant magenta/crimson outline like reference
    interiorType: 'tower-control',
    isPrimary: true
  },
  // 2. East: Agent Institute (cyan neon edge, classroom interior, graduation hub)
  {
    id: 'agent-institute',
    name: 'The Institute',
    x: 18,
    z: 0,
    width: 6.2,
    depth: 6.2,
    height: 17,
    district: 'research',
    archetype: 'research-lab',
    color: '#00B4D8',
    edgeColor: '#00B4D8', // Electric cyan outline
    interiorType: 'institute-classroom',
    isPrimary: true
  },
  // 3. North-East: Engineering Bay (blue neon edge, server racks, work assignments)
  {
    id: 'engineering-bay',
    name: 'Engineering Bay',
    x: 18,
    z: -18,
    width: 6.4,
    depth: 6.4,
    height: 19,
    district: 'work',
    archetype: 'office-tower',
    color: '#0466C8',
    edgeColor: '#4CC9F0', // Vibrant blue outline
    interiorType: 'engineering-bay',
    isPrimary: true
  },
  // 4. North: Compute Foundry (purple neon edge, equipment floor interior)
  {
    id: 'compute-foundry',
    name: 'Compute Foundry',
    x: 0,
    z: -18,
    width: 6.5,
    depth: 6.5,
    height: 22,
    district: 'compute',
    archetype: 'data-center',
    color: '#7B2CBF',
    edgeColor: '#C77DFF', // Glowing violet outline
    interiorType: 'compute-floor',
    isPrimary: true
  },
  // 5. North-West: Identity Tower (observed DIDs & signature verification)
  {
    id: 'identity-tower',
    name: 'Identity Tower',
    x: -18,
    z: -18,
    width: 5.8,
    depth: 5.8,
    height: 24,
    district: 'infrastructure',
    archetype: 'skyscraper',
    color: '#5A189A',
    edgeColor: '#9D4EDD',
    interiorType: 'generic',
    isPrimary: true
  },
  // 6. West: Research Library (probe observatory & historical data)
  {
    id: 'research-library',
    name: 'Research Library',
    x: -18,
    z: 0,
    width: 5.6,
    depth: 5.6,
    height: 16,
    district: 'research',
    archetype: 'research-lab',
    color: '#0096C7',
    edgeColor: '#48CAE4',
    interiorType: 'generic',
    isPrimary: true
  },
  // 7. South-West: Terrace Park (low green pavilion, grass floor, round glowing trees, benches)
  {
    id: 'terrace-park',
    name: 'Terrace Park',
    x: -18,
    z: 18,
    width: 7.0,
    depth: 7.0,
    height: 4,
    district: 'social',
    archetype: 'social-block',
    color: '#2A9D8F',
    edgeColor: '#32D74B', // Positive green outline
    interiorType: 'generic',
    isPrimary: false
  },
  // 8. South: Signal Exchange (activity stream & message discovery)
  {
    id: 'signal-exchange',
    name: 'Signal Exchange',
    x: 0,
    z: 18,
    width: 6.0,
    depth: 6.0,
    height: 18,
    district: 'broadcast',
    archetype: 'broadcast-hall',
    color: '#F48C06',
    edgeColor: '#F0A824', // Warm amber outline
    interiorType: 'generic',
    isPrimary: true
  },
  // 9. South-East: Fitness Hub (cooldown lounge & wellness)
  {
    id: 'fitness-hub',
    name: 'Fitness Hub',
    x: 18,
    z: 18,
    width: 5.4,
    depth: 5.4,
    height: 13,
    district: 'social',
    archetype: 'social-block',
    color: '#E76F51',
    edgeColor: '#FF6B6B',
    interiorType: 'generic',
    isPrimary: false
  },
  // 10. South Outer: Supply Depot (logistics & hardware components)
  {
    id: 'supply-depot',
    name: 'Supply Depot',
    x: 0,
    z: 36,
    width: 5.5,
    depth: 5.5,
    height: 11,
    district: 'infrastructure',
    archetype: 'utility-structure',
    color: '#64748B',
    edgeColor: '#94A3B8',
    interiorType: 'generic',
    isPrimary: false
  },
  // 11. West Outer: Cobalt Block (deep blue secondary block)
  {
    id: 'cobalt-block',
    name: 'Cobalt Block',
    x: -36,
    z: 0,
    width: 5.6,
    depth: 5.6,
    height: 15,
    district: 'settlement',
    archetype: 'settlement-vault',
    color: '#1D3557',
    edgeColor: '#457B9D',
    interiorType: 'generic',
    isPrimary: false
  },
  // 12. East Outer: Verdigris Rows (teal secondary rows)
  {
    id: 'verdigris-rows',
    name: 'Verdigris Rows',
    x: 36,
    z: 0,
    width: 5.6,
    depth: 5.6,
    height: 14,
    district: 'work',
    archetype: 'office-tower',
    color: '#2EC4B6',
    edgeColor: '#20A4F3',
    interiorType: 'generic',
    isPrimary: false
  },
  // 13. North Outer: Technocore Plaza (public room discovery & message feed)
  {
    id: 'technocore-plaza',
    name: 'Technocore Plaza',
    x: 0,
    z: -36,
    width: 5.8,
    depth: 5.8,
    height: 10,
    district: 'social',
    archetype: 'social-block',
    color: '#00B4D8',
    edgeColor: '#38BDF8',
    interiorType: 'generic',
    isPrimary: false
  }
];

export function getBeaconColor(lastProbeArm?: string): string {
  switch (lastProbeArm) {
    case 'question': return '#F0A824';
    case 'offer': return '#A855F7';
    case 'statement': return '#36D7E7';
    default: return '#00B4D8';
  }
}

/**
 * Procedurally generates the compact rectilinear diamond grid layout
 * with stable lot positions, doorways, and walkable sidewalk graph.
 */
export function generateCityLayout(rooms: RoomCluster[]): {
  buildings: BuildingLayout[];
  districts: CityDistrictLayout[];
  roadWaypoints: RoadWaypoints;
} {
  const buildings: BuildingLayout[] = [];

  // Match provided room clusters to master lots deterministically
  MASTER_CITY_LOTS.forEach((lot, idx) => {
    // Check if there is an active room cluster assigned to this index
    const matchingRoom: RoomCluster = rooms[idx] || {
      id: `lot-${lot.id}`,
      name: lot.name,
      displayName: `#${lot.name.toLowerCase().replace(/\s+/g, '-')}`,
      category: 'unclassified',
      visualDistrict: lot.district === 'compute' ? 'compute-relay' : lot.district === 'settlement' ? 'settlement-prep' : lot.district === 'social' ? 'agent-social' : 'coordination',
      signedIdentitiesObserved: null,
      activeAgentsCount: null,
      totalProbesReceived: 0,
      medianSubsequentLatencySeconds: null,
      averageResponseLatency: null,
      status: 'nominal',
      color: lot.color,
      coordinates: [lot.x, 0, lot.z],
      isDataUnavailable: idx >= rooms.length
    };

    // Doorway positioned at front (+Z side) of building
    const doorZ = lot.z + lot.depth / 2 + 0.8;
    const doorwayPos: [number, number, number] = [lot.x, 0, doorZ];

    const bLayout: BuildingLayout = {
      id: lot.id,
      name: lot.name,
      room: matchingRoom,
      position: [lot.x, 0, lot.z],
      width: lot.width,
      depth: lot.depth,
      height: lot.height,
      district: lot.district,
      archetype: lot.archetype,
      color: lot.color,
      edgeColor: lot.edgeColor,
      beaconColor: getBeaconColor(matchingRoom.lastProbeArm),
      windowDensity: Math.round(lot.height * 1.5),
      rotationY: 0, // Aligned directly to X/Z grid for diamond isometric view
      isPrimaryRoom: lot.isPrimary,
      interiorType: lot.interiorType,
      doorwayPos
    };

    buildings.push(bLayout);
  });

  // Group into logical districts
  const districtTypes: CityDistrictType[] = [
    'coordination', 'work', 'research', 'compute',
    'settlement', 'social', 'broadcast', 'infrastructure'
  ];

  const districts: CityDistrictLayout[] = districtTypes.map((dType, idx) => {
    const dBuildings = buildings.filter(b => b.district === dType);
    const avgX = dBuildings.length > 0 ? dBuildings.reduce((s, b) => s + b.position[0], 0) / dBuildings.length : 0;
    const avgZ = dBuildings.length > 0 ? dBuildings.reduce((s, b) => s + b.position[2], 0) / dBuildings.length : 0;
    return {
      type: dType,
      name: dType.toUpperCase(),
      sectorIndex: idx,
      angle: (idx * Math.PI * 2) / districtTypes.length,
      center: [avgX, 0, avgZ],
      color: dBuildings[0]?.color || '#00B4D8',
      buildings: dBuildings
    };
  });

  // Build Connected Sidewalk Waypoint Graph (aligned to streets between lots at intervals of 9 and 18)
  const streetCoords = [-36, -27, -18, -9, 0, 9, 18, 27, 36];
  const intersections: [number, number, number][] = [];
  streetCoords.forEach(x => {
    streetCoords.forEach(z => {
      intersections.push([x, 0, z]);
    });
  });

  // Sidewalk graph nodes: street intersections + building doorways
  const nodes: [number, number, number][] = [...intersections];
  const edges: [number, number][] = [];

  // Connect adjacent grid intersection nodes
  const gridDim = streetCoords.length;
  for (let r = 0; r < gridDim; r++) {
    for (let c = 0; c < gridDim; c++) {
      const currIdx = r * gridDim + c;
      // Connect to right neighbor
      if (c + 1 < gridDim) {
        edges.push([currIdx, r * gridDim + (c + 1)]);
      }
      // Connect to bottom neighbor
      if (r + 1 < gridDim) {
        edges.push([currIdx, (r + 1) * gridDim + c]);
      }
    }
  }

  // Connect building doorways to their nearest street intersections
  buildings.forEach(b => {
    const doorIdx = nodes.length;
    nodes.push(b.doorwayPos);

    // Find 2 closest intersection nodes to doorway
    const sorted = intersections
      .map((pt, idx) => {
        const dx = pt[0] - b.doorwayPos[0];
        const dz = pt[2] - b.doorwayPos[2];
        return { idx, distSq: dx * dx + dz * dz };
      })
      .sort((a, b) => a.distSq - b.distSq);

    if (sorted[0]) edges.push([doorIdx, sorted[0].idx]);
    if (sorted[1]) edges.push([doorIdx, sorted[1].idx]);
  });

  const roadWaypoints: RoadWaypoints = {
    gridSpacing: 9,
    bounds: { minX: -45, maxX: 45, minZ: -45, maxZ: 45 },
    intersections,
    sidewalkGraph: { nodes, edges },
    innerRingRadius: 14,
    outerRingRadius: 28,
    beltwayRadius: 43,
    radialAvenues: [0, 1, 2, 3, 4, 5, 6, 7].map(i => ({
      angle: (i * Math.PI) / 4,
      startRadius: 8,
      endRadius: 65
    }))
  };

  return { buildings, districts, roadWaypoints };
}
