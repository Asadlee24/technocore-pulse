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

  // A walkable seven-by-seven street grid. The central block is the community plaza.
  const slots: [number, number][] = [];
  for (let z = -3; z <= 3; z++)
    for (let x = -3; x <= 3; x++)
      if (x !== 0 || z !== 0) slots.push([x * 18, z * 18]);
  rooms.slice(0, 48).forEach((room, index) => {
    const [x, z] = slots[index];
    const seed = Math.abs(Math.sin(index * 12.9898 + 7.31));
    const district = districtKeys[index % districtKeys.length];
    // Mostly human-scale blocks; taller buildings form occasional skyline anchors.
    const high = index % 9 === 0;
    const medium = index % 4 === 0;
    const height = high
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
      width: 7.4 + (index % 3) * 0.55,
      depth: 7.2 + (index % 2) * 0.7,
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
      endRadius: 65,
    })),
  };

  return { buildings, districts, roadWaypoints };
}
