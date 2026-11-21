import type { RoomCluster } from "../../types/probe";

export type CityDistrictType =
  | "coordination"
  | "work"
  | "research"
  | "compute"
  | "settlement"
  | "social"
  | "broadcast"
  | "infrastructure";

export type BuildingArchetype =
  | "skyscraper"
  | "office-tower"
  | "research-lab"
  | "data-center"
  | "settlement-vault"
  | "social-block"
  | "broadcast-hall"
  | "utility-structure";

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

// The north end has an extra row of blocks between the downtown grid and the quay.
export const CITY_GRID = {
  streetXs: [-63, -45, -27, -9, 9, 27, 45, 63],
  streetZs: [-81, -63, -45, -27, -9, 9, 27, 45, 63],
  shore: 102,
  quaysideGardens: [[-76, -40], [76, -40], [-76, 40], [76, 40]] as const,
  quayTram: { z: -94, halfLength: 87, stopXs: [-65, 65] },
};

export const QUAY_WALK = { z: -99.15, length: 165, depth: 3.5, crossingX: 30, crossingWidth: 3.1 };

export const CIVIC_SPACES = [
  { name: "FLOP Plaza", x: 0, z: 0, kind: "plaza" },
  { name: "Harbor Gardens", x: -18, z: -72, kind: "garden" },
  { name: "Quay Market", x: 18, z: -72, kind: "market" },
  { name: "West Square", x: -36, z: -18, kind: "garden" },
  { name: "East Library Garden", x: 36, z: 18, kind: "garden" },
  { name: "South Play Park", x: -18, z: 54, kind: "playground" },
  { name: "Station Forecourt", x: 54, z: -72, kind: "market" },
  { name: "West Green", x: -54, z: 18, kind: "garden" },
] as const;

export const DISTRICT_CONFIGS: Record<
  CityDistrictType,
  {
    name: string;
    sectorIndex: number;
    color: string;
    archetype: BuildingArchetype;
    description: string;
  }
> = {
  coordination: {
    name: "Coordination District",
    sectorIndex: 0,
    color: "#00B4D8",
    archetype: "skyscraper",
    description: "Autonomous protocol alignment and consensus towers",
  },
  work: {
    name: "Agent Work District",
    sectorIndex: 1,
    color: "#00B4D8",
    archetype: "office-tower",
    description:
      "High-density autonomous agent office towers and desk complexes",
  },
  research: {
    name: "Research District",
    sectorIndex: 2,
    color: "#00B4D8",
    archetype: "research-lab",
    description: "Algorithmic innovation, probe analysis laboratories",
  },
  compute: {
    name: "Compute District",
    sectorIndex: 3,
    color: "#00B4D8",
    archetype: "data-center",
    description: "High-density inference clusters and relay matrix",
  },
  settlement: {
    name: "Settlement District",
    sectorIndex: 4,
    color: "#0466C8",
    archetype: "settlement-vault",
    description: "Atomic escrow and cryptographic settlement vaults",
  },
  social: {
    name: "Social District",
    sectorIndex: 5,
    color: "#00B4D8",
    archetype: "social-block",
    description: "Public agent courtyards, modular residential clusters",
  },
  broadcast: {
    name: "Public Communication District",
    sectorIndex: 6,
    color: "#00B4D8",
    archetype: "broadcast-hall",
    description: "Global signal transmission masts and open forums",
  },
  infrastructure: {
    name: "Infrastructure District",
    sectorIndex: 7,
    color: "#94A3B8",
    archetype: "utility-structure",
    description: "Network routing terminals, power nodes, transit hubs",
  },
};

/**
 * Calculates building height based on observed metric:
 * height = clamp(6 + log2(activityMetric + 1) * 4.5, 7, 34)
 */
export function calculateBuildingHeight(
  activityMetric?: number | null,
  _fallbackIndex: number = 0,
): number {
  const metric =
    typeof activityMetric === "number" && activityMetric > 0
      ? activityMetric
      : 0;
  const calculated = 6 + Math.log2(metric + 1) * 4.5;
  return Math.min(34, Math.max(7, Math.round(calculated * 10) / 10));
}

/**
 * Get rooftop beacon color mapped from lastProbeArm:
 */
export function getBeaconColor(lastProbeArm?: string): string {
  switch (lastProbeArm) {
    case "question":
      return "#00B4D8";
    case "offer":
      return "#00B4D8";
    case "statement":
      return "#00B4D8";
    default:
      return "#00B4D8";
  }
}

/**
 * Maps a RoomCluster to one of the 8 canonical visual districts
 */
export function mapRoomToDistrict(
  room: RoomCluster,
  index: number,
): CityDistrictType {
  if (room.visualDistrict) {
    if (room.visualDistrict === "coordination")
      return index % 2 === 0 ? "coordination" : "work";
    if (room.visualDistrict === "compute-relay") return "compute";
    if (room.visualDistrict === "settlement-prep") return "settlement";
    if (room.visualDistrict === "agent-social")
      return index % 2 === 0 ? "social" : "broadcast";
  }

  const allDistricts: CityDistrictType[] = [
    "coordination",
    "work",
    "research",
    "compute",
    "settlement",
    "social",
    "broadcast",
    "infrastructure",
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
    coordination: [],
    work: [],
    research: [],
    compute: [],
    settlement: [],
    social: [],
    broadcast: [],
    infrastructure: [],
  };

  const districtKeys = Object.keys(DISTRICT_CONFIGS) as CityDistrictType[];
  const totalSectors = districtKeys.length; // 8
  const sectorAngleStep = (Math.PI * 2) / totalSectors;

  const slots: [number, number][] = [];
  for (const z of CITY_GRID.streetZs.slice(0, -1).map(street => street + 9)) {
    for (const x of CITY_GRID.streetXs.slice(0, -1).map(street => street + 9)) {
      if (!CIVIC_SPACES.some(space => space.x === x && space.z === z)) slots.push([x, z]);
    }
  }
  // Fill the blocks around the plaza first, then side streets and the waterfront.
  slots.sort(([ax, az], [bx, bz]) => Math.hypot(ax, az) - Math.hypot(bx, bz) || az - bz || ax - bx);
  rooms.slice(0, 48).forEach((room, index) => {
    const [x, z] = slots[index];
    const seed = Math.abs(Math.sin(index * 12.9898 + 7.31));
    const district = districtKeys[index % districtKeys.length];
    // Mostly human-scale blocks; taller buildings form occasional skyline anchors.
    const downtown = Math.hypot(x, z) < 43;
    const waterfront = z < -63;
    const high = downtown && index % 5 === 0;
    const medium = index % (downtown ? 3 : 5) === 0;
    const height = waterfront ? 5.6 + seed * 3.1 : high
      ? 21 + seed * 5
      : medium
        ? 12 + seed * 3
        : 6 + seed * 4.5;
    // Interpret room names only as an architectural theme, never as measured work.
    const name = room.name.toLowerCase();
    const themedArchetype: BuildingArchetype | undefined = name === "technocore" ? "skyscraper"
      : /(^|[-_])(lab|research|probe|benchmark)([-_]|$)/.test(name) ? "research-lab"
      : /(^|[-_])(gpu|compute|inference|model)([-_]|$)/.test(name) ? "data-center"
      : /(^|[-_])(tclk|escrow|settlement|offers)([-_]|$)/.test(name) ? "settlement-vault"
      : /^(lobby|general|web_chat|meta)$/.test(name) ? "social-block"
      : /^(announcements|pin)$/.test(name) ? "broadcast-hall"
      : /(^|[-_])(relay|bridge|rpc|routing)([-_]|$)/.test(name) ? "utility-structure" : undefined;
    const b: BuildingLayout = {
      room,
      position: [x, 0, z],
      width: waterfront ? 8.7 + seed * .55 : 7.4 + (index % 3) * .55,
      depth: waterfront ? 6.5 + (1 - seed) * .57 : 7.2 + (index % 2) * .7,
      height: Math.round(height * 10) / 10,
      district,
      archetype: themedArchetype ?? (high
        ? "skyscraper"
        : medium
          ? "office-tower"
          : index % 3 === 0
            ? "social-block"
            : index % 3 === 1
              ? "research-lab"
              : index % 5 === 0
              ? "data-center"
              : "broadcast-hall"),
      color: "#00B4D8",
      beaconColor: getBeaconColor(room.lastProbeArm),
      windowDensity: 8,
      rotationY: 0,
      isPrimaryRoom: true,
    };
    buildings.push(b);
    districtsMap[district].push(b);
  });

  // 3. Construct District Metadata
  const districts: CityDistrictLayout[] = districtKeys.map((distType) => {
    const cfg = DISTRICT_CONFIGS[distType];
    const bList = districtsMap[distType];
    const avgX =
      bList.length > 0
        ? bList.reduce((sum, b) => sum + b.position[0], 0) / bList.length
        : Math.cos(cfg.sectorIndex * sectorAngleStep) * 35;
    const avgZ =
      bList.length > 0
        ? bList.reduce((sum, b) => sum + b.position[2], 0) / bList.length
        : Math.sin(cfg.sectorIndex * sectorAngleStep) * 35;

    return {
      type: distType,
      name: cfg.name,
      sectorIndex: cfg.sectorIndex,
      angle: cfg.sectorIndex * sectorAngleStep,
      center: [avgX, 0, avgZ],
      color: cfg.color,
      buildings: bList,
    };
  });

  // Legacy paths used by the older city scene components.
  const roadWaypoints: RoadWaypoints = {
    innerRingRadius: 14,
    outerRingRadius: 28,
    beltwayRadius: 43,
    radialAvenues: districtKeys.map((_, i) => ({
      // Avenues are placed precisely halfway between districts (inter-district avenues)
      angle: (i + 0.5) * sectorAngleStep,
      startRadius: 8,
      endRadius: 65,
    })),
  };

  return { buildings, districts, roadWaypoints };
}
