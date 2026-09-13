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
    edges: [number, number][];
  };
  innerRingRadius: number;
  outerRingRadius: number;
  beltwayRadius: number;
  radialAvenues: { angle: number; startRadius: number; endRadius: number }[];
}

// 22 Dense rectilinear city lots arranged on the X/Z diamond grid
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
  // 1. Center Landmark: Main Tower / Technocore Tower (tallest crimson skyscraper with magenta neon edge)
  {
    id: 'technocore-tower',
    name: 'Main Tower',
    x: 0,
    z: 0,
    width: 7.6,
    depth: 7.6,
    height: 32,
    district: 'coordination',
    archetype: 'skyscraper',
    color: '#E11D48',
    edgeColor: '#F72585', // Radiant hot pink/magenta outline
    interiorType: 'tower-control',
    isPrimary: true
  },
  // 2. West Inner: Cobalt Block (deep cobalt blue, cyan outline)
  {
    id: 'cobalt-block',
    name: 'Cobalt Block',
    x: -18,
    z: -6,
    width: 6.2,
    depth: 6.2,
    height: 19,
    district: 'settlement',
    archetype: 'settlement-vault',
    color: '#0F172A',
    edgeColor: '#00B4D8', // Electric Cyan
    interiorType: 'generic',
    isPrimary: false
  },
  // 3. North-West Inner: Amethyst Terrace (royal purple, violet outline)
  {
    id: 'amethyst-terrace',
    name: 'Amethyst Terrace',
    x: -8,
    z: -20,
    width: 6.0,
    depth: 6.0,
    height: 21,
    district: 'research',
    archetype: 'research-lab',
    color: '#3B0764',
    edgeColor: '#C084FC', // Bright violet outline
    interiorType: 'generic',
    isPrimary: false
  },
  // 4. North-East Inner: Verdigris Rows (deep teal, emerald outline)
  {
    id: 'verdigris-rows',
    name: 'Verdigris Rows',
    x: 18,
    z: -10,
    width: 7.0,
    depth: 5.4,
    height: 18,
    district: 'work',
    archetype: 'office-tower',
    color: '#064E3B',
    edgeColor: '#2DD4BF', // Mint green outline
    interiorType: 'generic',
    isPrimary: false
  },
  // 5. East Inner: The Institute (bright cyan academy building)
  {
    id: 'agent-institute',
    name: 'The Institute',
    x: 18,
    z: 8,
    width: 6.6,
    depth: 6.6,
    height: 18,
    district: 'research',
    archetype: 'research-lab',
    color: '#0369A1',
    edgeColor: '#38BDF8', // Cyan outline
    interiorType: 'institute-classroom',
    isPrimary: true
  },
  // 6. South-East Inner: Fitness Hub (magenta wellness block)
  {
    id: 'fitness-hub',
    name: 'Fitness Hub',
    x: 10,
    z: 18,
    width: 5.6,
    depth: 5.6,
    height: 14,
    district: 'social',
    archetype: 'social-block',
    color: '#831843',
    edgeColor: '#FB7185', // Pink outline
    interiorType: 'generic',
    isPrimary: false
  },
  // 7. West Center: Central Cafe (warm coral cafe)
  {
    id: 'central-cafe',
    name: 'Central Cafe',
    x: -18,
    z: 8,
    width: 5.4,
    depth: 5.4,
    height: 13,
    district: 'social',
    archetype: 'social-block',
    color: '#9F1239',
    edgeColor: '#FDA4AF',
    interiorType: 'generic',
    isPrimary: false
  },
  // 8. South-West Inner: Terrace Park (low green terrace with garden & pond)
  {
    id: 'terrace-park',
    name: 'Terrace Park',
    x: -10,
    z: 18,
    width: 7.4,
    depth: 7.0,
    height: 4.5,
    district: 'social',
    archetype: 'social-block',
    color: '#065F46',
    edgeColor: '#34D399', // Emerald outline
    interiorType: 'generic',
    isPrimary: false
  },
  // 9. South Center: Supply Shop (compact blue hardware store)
  {
    id: 'supply-shop',
    name: 'Supply Shop',
    x: 0,
    z: 16,
    width: 5.0,
    depth: 5.0,
    height: 10,
    district: 'infrastructure',
    archetype: 'utility-structure',
    color: '#1E3A8A',
    edgeColor: '#60A5FA',
    interiorType: 'generic',
    isPrimary: false
  },
  // 10. West Outer: Noodle Bar (cozy cyber night bar)
  {
    id: 'noodle-bar',
    name: 'Noodle Bar',
    x: -26,
    z: -4,
    width: 5.0,
    depth: 5.0,
    height: 11,
    district: 'social',
    archetype: 'social-block',
    color: '#312E81',
    edgeColor: '#A78BFA',
    interiorType: 'generic',
    isPrimary: false
  },
  // 11. North-East Outer: Engineering Bay (high-tech cluster ops)
  {
    id: 'engineering-bay',
    name: 'Engineering Bay',
    x: 24,
    z: -22,
    width: 6.8,
    depth: 6.8,
    height: 22,
    district: 'work',
    archetype: 'office-tower',
    color: '#1D4ED8',
    edgeColor: '#38BDF8',
    interiorType: 'engineering-bay',
    isPrimary: true
  },
  // 12. North Center: Compute Foundry (inference GPU core)
  {
    id: 'compute-foundry',
    name: 'Compute Foundry',
    x: 4,
    z: -24,
    width: 6.6,
    depth: 6.6,
    height: 24,
    district: 'compute',
    archetype: 'data-center',
    color: '#581C87',
    edgeColor: '#C084FC',
    interiorType: 'compute-floor',
    isPrimary: true
  },
  // 13. South-East Outer: Signal Exchange (tall communications tower)
  {
    id: 'signal-exchange',
    name: 'Signal Exchange',
    x: 16,
    z: 26,
    width: 6.0,
    depth: 6.0,
    height: 25,
    district: 'broadcast',
    archetype: 'broadcast-hall',
    color: '#92400E',
    edgeColor: '#FBBF24', // Amber outline
    interiorType: 'generic',
    isPrimary: true
  },
  // 14. North-West Mid: Research Library (glass observatory)
  {
    id: 'research-library',
    name: 'Research Library',
    x: -22,
    z: -20,
    width: 6.0,
    depth: 6.0,
    height: 17,
    district: 'research',
    archetype: 'research-lab',
    color: '#0F766E',
    edgeColor: '#2DD4BF',
    interiorType: 'generic',
    isPrimary: true
  },
  // 15. North Far-West: Identity Vault (crypto DID vault)
  {
    id: 'identity-vault',
    name: 'Identity Vault',
    x: -8,
    z: -34,
    width: 5.8,
    depth: 5.8,
    height: 23,
    district: 'infrastructure',
    archetype: 'skyscraper',
    color: '#4338CA',
    edgeColor: '#818CF8',
    interiorType: 'generic',
    isPrimary: true
  },
  // 16. North Far-East: Quantum Core (protocol validation)
  {
    id: 'quantum-core',
    name: 'Quantum Core',
    x: 14,
    z: -34,
    width: 6.2,
    depth: 6.2,
    height: 26,
    district: 'compute',
    archetype: 'data-center',
    color: '#0369A1',
    edgeColor: '#00B4D8',
    interiorType: 'generic',
    isPrimary: false
  },
  // 17. East Far: Relay Station (telemetry tower)
  {
    id: 'relay-station',
    name: 'Relay Station',
    x: 30,
    z: 0,
    width: 5.4,
    depth: 5.4,
    height: 29,
    district: 'broadcast',
    archetype: 'skyscraper',
    color: '#0C4A6E',
    edgeColor: '#38BDF8',
    interiorType: 'generic',
    isPrimary: false
  },
  // 18. West Far: Cyber Arcade (community block)
  {
    id: 'cyber-arcade',
    name: 'Cyber Arcade',
    x: -26,
    z: 14,
    width: 5.4,
    depth: 5.4,
    height: 14,
    district: 'social',
    archetype: 'social-block',
    color: '#701A75',
    edgeColor: '#F472B6',
    interiorType: 'generic',
    isPrimary: false
  },
  // 19. South Mid: Metropolis Plaza (civic square)
  {
    id: 'metropolis-plaza',
    name: 'Metropolis Plaza',
    x: -4,
    z: 30,
    width: 6.4,
    depth: 6.4,
    height: 9,
    district: 'social',
    archetype: 'social-block',
    color: '#075985',
    edgeColor: '#38BDF8',
    interiorType: 'generic',
    isPrimary: false
  },
  // 20. South-West Far: Transit Terminal (transportation hub)
  {
    id: 'transit-terminal',
    name: 'Transit Terminal',
    x: -22,
    z: 26,
    width: 6.0,
    depth: 6.0,
    height: 12,
    district: 'infrastructure',
    archetype: 'utility-structure',
    color: '#1E293B',
    edgeColor: '#64748B',
    interiorType: 'generic',
    isPrimary: false
  },
  // 21. East Mid: Attestation Center (ZK proof verification)
  {
    id: 'attestation-center',
    name: 'Attestation Center',
    x: 26,
    z: 14,
    width: 5.8,
    depth: 5.8,
    height: 18,
    district: 'infrastructure',
    archetype: 'office-tower',
    color: '#4A044E',
    edgeColor: '#E879F9',
    interiorType: 'generic',
    isPrimary: false
  },
  // 22. South Far: Gateway Hub (network edge router)
  {
    id: 'gateway-hub',
    name: 'Gateway Hub',
    x: 8,
    z: 34,
    width: 5.8,
    depth: 5.8,
    height: 17,
    district: 'infrastructure',
    archetype: 'utility-structure',
    color: '#064E3B',
    edgeColor: '#34D399',
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
 * with 22 stable lot positions, doorways, and walkable sidewalk graph.
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

  // Build Connected Sidewalk Waypoint Graph (aligned to streets between lots)
  const streetCoords = [-40, -30, -20, -10, 0, 10, 20, 30, 40];
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
      if (c + 1 < gridDim) {
        edges.push([currIdx, r * gridDim + (c + 1)]);
      }
      if (r + 1 < gridDim) {
        edges.push([currIdx, (r + 1) * gridDim + c]);
      }
    }
  }

  // Connect building doorways to their nearest street intersections
  buildings.forEach(b => {
    const doorIdx = nodes.length;
    nodes.push(b.doorwayPos);

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
    gridSpacing: 10,
    bounds: { minX: -48, maxX: 48, minZ: -48, maxZ: 48 },
    intersections,
    sidewalkGraph: { nodes, edges },
    innerRingRadius: 16,
    outerRingRadius: 32,
    beltwayRadius: 46,
    radialAvenues: [0, 1, 2, 3, 4, 5, 6, 7].map(i => ({
      angle: (i * Math.PI) / 4,
      startRadius: 8,
      endRadius: 70
    }))
  };

  return { buildings, districts, roadWaypoints };
}
