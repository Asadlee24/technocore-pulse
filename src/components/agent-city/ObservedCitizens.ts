import * as THREE from 'three';
import type { ObservedIdentity } from '../../context/DataContext';
import type { RoomCluster } from '../../types/probe';
import type { RoadWaypoints } from './cityLayout';
import { AgentWorker } from './AgentWorker';

export interface RenderedCitizen {
  identity: ObservedIdentity;
  worker: AgentWorker;
  assignedBuildingId: string;
  isSeated: boolean;
  currentActivity?: {
    type: 'typing' | 'walking';
    endTime: number;
    sourceText: string;
    sourceRoom: string;
    sourceSeq?: number;
  };
}

/**
 * Deterministic hash from DID string to derive visual aesthetics
 */
function hashString(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i);
  }
  return Math.abs(hash);
}

function getVisorColorForIdentity(identity: ObservedIdentity): string {
  if (identity.verificationStatus === 'VERIFIED') {
    const palette = ['#00B4D8', '#32D74B', '#4CC9F0', '#C77DFF', '#38BDF8'];
    const h = hashString(identity.did);
    return palette[h % palette.length];
  }
  if (identity.verificationStatus === 'PRESENT_UNVERIFIED') {
    return '#F0A824'; // Amber
  }
  return '#94A3B8'; // Slate grey for unsigned
}

export class ObservedCitizens {
  public group: THREE.Group;
  public renderedCitizens: Map<string, RenderedCitizen> = new Map();
  public maxRendered: number = 16;
  public totalObservedCount: number = 0;
  public renderedCount: number = 0;

  private roadWaypoints: RoadWaypoints;
  private buildingsMap: Map<string, { id: string; position: [number, number, number]; doorwayPos: [number, number, number] }> = new Map();
  private identityMap: Map<string, ObservedIdentity> = new Map();

  constructor(
    roadWaypoints: RoadWaypoints,
    buildingList: { id: string; position: [number, number, number]; doorwayPos: [number, number, number] }[]
  ) {
    this.group = new THREE.Group();
    this.group.name = 'observed-citizens-group';
    this.roadWaypoints = roadWaypoints;

    buildingList.forEach(b => this.buildingsMap.set(b.id, b));
  }

  /**
   * Updates the rendered citizen population strictly from real observed identities.
   * If identities.length === 0, renders 0 avatars (honest empty state).
   */
  public updateIdentities(
    identities: ObservedIdentity[],
    roomClusters: RoomCluster[]
  ) {
    this.totalObservedCount = identities.length;
    this.identityMap.clear();
    identities.forEach(id => this.identityMap.set(id.did, id));

    // Sort by last observed timestamp (newest first) and cap to maxRendered
    const activeSlice = identities
      .slice()
      .sort((a, b) => b.lastObserved - a.lastObserved)
      .slice(0, this.maxRendered);

    this.renderedCount = activeSlice.length;
    const currentRenderedDids = new Set(activeSlice.map(id => id.did));

    // 1. Remove citizens no longer in active rendered slice
    this.renderedCitizens.forEach((citizen, did) => {
      if (!currentRenderedDids.has(did)) {
        this.group.remove(citizen.worker.group);
        citizen.worker.dispose();
        this.renderedCitizens.delete(did);
      }
    });

    // 2. Add or update citizens in the active slice
    activeSlice.forEach((id, idx) => {
      const existing = this.renderedCitizens.get(id.did);
      if (existing) {
        existing.identity = id;
        return;
      }

      // Determine building assignment from identity's seen rooms
      let assignedBuildingId = 'technocore-tower';
      const latestRoom = id.latestMessage?.room || id.roomsSeen[0];

      if (latestRoom) {
        // Try finding matching room cluster
        const matchedCluster = roomClusters.find(c => c.name === latestRoom || c.displayName.includes(latestRoom));
        if (matchedCluster) {
          const found = Array.from(this.buildingsMap.values()).find(b => b.id.includes(matchedCluster.name) || b.id.includes(matchedCluster.id));
          if (found) assignedBuildingId = found.id;
        }
      }

      // Default fallback among major landmark lots based on hash
      if (!this.buildingsMap.has(assignedBuildingId)) {
        const landmarkIds = ['technocore-tower', 'engineering-bay', 'agent-institute', 'compute-foundry', 'signal-exchange', 'technocore-plaza'];
        const h = hashString(id.did);
        assignedBuildingId = landmarkIds[h % landmarkIds.length];
      }

      const bInfo = this.buildingsMap.get(assignedBuildingId);
      const visorColor = getVisorColorForIdentity(id);

      // Distribute position: some near doorways, some along nearby sidewalks
      const h = hashString(id.did);
      const angle = (h % 360) * (Math.PI / 180);
      const radius = 2.0 + (h % 4) * 0.8;

      let posX = bInfo ? bInfo.doorwayPos[0] + Math.cos(angle) * radius : (idx % 4) * 4 - 6;
      let posZ = bInfo ? bInfo.doorwayPos[2] + Math.sin(angle) * radius : Math.floor(idx / 4) * 4 - 6;
      const posY = 0;

      // Snap slightly to sidewalk bounds
      if (this.roadWaypoints?.intersections?.length > 0) {
        const nearest = this.roadWaypoints.intersections[h % this.roadWaypoints.intersections.length];
        if (nearest && Math.hypot(posX - nearest[0], posZ - nearest[2]) > 14) {
          posX = nearest[0] + Math.cos(angle) * 1.5;
          posZ = nearest[2] + Math.sin(angle) * 1.5;
        }
      }

      const worker = new AgentWorker({
        x: posX,
        y: posY,
        z: posZ,
        rotationY: angle + Math.PI,
        isSeated: false,
        visorColor,
        activityState: id.isVerified ? 'surge' : 'active'
      });

      this.group.add(worker.group);

      this.renderedCitizens.set(id.did, {
        identity: id,
        worker,
        assignedBuildingId,
        isSeated: false
      });
    });
  }

  /**
   * Triggers a brief 3.5s event visualization strictly for a real observed message.
   */
  public triggerEventForIdentity(did: string, msg: { text: string; room: string; sequence?: number }) {
    const citizen = this.renderedCitizens.get(did);
    if (!citizen) return;

    citizen.currentActivity = {
      type: citizen.isSeated ? 'typing' : 'walking',
      endTime: performance.now() + 3500,
      sourceText: msg.text,
      sourceRoom: msg.room,
      sourceSeq: msg.sequence
    };

    // Small jump/turn indicating active message transmission
    citizen.worker.group.rotation.y += 0.2;
  }

  /**
   * Per-frame animation update.
   * Quiet when idle: when no new message is arriving, citizen remains quiet.
   */
  public update(delta: number, now: number) {
    this.renderedCitizens.forEach((citizen) => {
      const activity = citizen.currentActivity;
      if (activity && now < activity.endTime) {
        // Active real event in progress
        citizen.worker.update(delta * 1.6);
      } else {
        if (activity) {
          // Event finished - return quietly to rest
          citizen.currentActivity = undefined;
        }
        // Subtle resting breathing animation (scale subtle Y oscillation)
        citizen.worker.update(delta * 0.25);
      }
    });
  }

  public getCitizenPosition(did: string): THREE.Vector3 | null {
    const citizen = this.renderedCitizens.get(did);
    if (citizen) {
      const pos = new THREE.Vector3();
      citizen.worker.group.getWorldPosition(pos);
      return pos;
    }
    return null;
  }

  public getCitizenMesh(did: string): THREE.Object3D | null {
    const citizen = this.renderedCitizens.get(did);
    return citizen?.worker.group || null;
  }

  public getCitizen(did: string): ObservedIdentity | null {
    return this.identityMap.get(did) || null;
  }

  public dispose() {
    this.renderedCitizens.forEach((c) => {
      this.group.remove(c.worker.group);
      c.worker.dispose();
    });
    this.renderedCitizens.clear();
    this.identityMap.clear();
  }
}
