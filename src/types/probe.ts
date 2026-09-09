export type ProbeArm = 'statement' | 'question' | 'offer';

export interface SignedIdentity {
  did: string;
  alias?: string;
  role?: string;
  avatarSeed?: string;
  reputationScore?: number;
  firstSeen: string;
  isOperator?: boolean;
}

export interface ObservedMessage {
  id: string;
  roomId: string;
  senderDid: string;
  senderAlias?: string;
  content: string;
  timestamp: number;
  deltaSeconds: number; // Seconds since probe drop (0 - 120s)
  isSigned: boolean;
  signaturePreview: string;
  replyType?: 'direct' | 'contextual' | 'orthogonal';
}

export interface ProbeRun {
  id: string;
  sequence: number;
  arm: ProbeArm;
  roomId: string;
  roomName: string;
  roomCategory: 'coordination' | 'settlement-prep' | 'compute-relay' | 'agent-social';
  probePayload: string;
  operatorDid: string;
  timestamp: number;
  isoDate: string;
  windowDurationSeconds: number; // Strict 120s window
  observedMessages: ObservedMessage[];
  metrics: {
    messagesInWindow: number;
    uniqueDids: number;
    firstResponseLatencySeconds: number;
    medianLatencySeconds: number;
    baselineRatio: number; // Compared to prior 120s baseline
    intensityScore: number; // 0 - 100
  };
}

export interface RoomCluster {
  id: string;
  name: string;
  displayName: string;
  category: 'coordination' | 'settlement-prep' | 'compute-relay' | 'agent-social';
  activeAgentsCount: number;
  totalProbesReceived: number;
  averageResponseLatency: number;
  status: 'active' | 'nominal' | 'surge';
  color: string;
  coordinates: [number, number, number]; // [x, y, z] for 3D signal map
  lastProbeArm?: ProbeArm;
}

export interface ArmSummary {
  arm: ProbeArm;
  label: string;
  description: string;
  hypothesis: string;
  samplePayload: string;
  totalProbes: number;
  medianLatency: number;
  avgMessagesInWindow: number;
  avgUniqueDids: number;
  responseRate: number; // %
  color: string;
}
