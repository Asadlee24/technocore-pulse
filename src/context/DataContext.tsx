import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import type { ProbeRun, RoomCluster, ArmSummary, SignedRecord } from '../types/probe';
import { 
  fetchPublicRooms, 
  sampleActiveRoomsPolitely, 
  type TechnocoreRoomSummary,
  type ObserverHealth
} from '../data/technocore';
import { parseProbeMessage, type ParsedProbe } from '../data/probeParser';
import { calculate120sWindow, windowToProbeRun } from '../data/responseWindows';
import { verifyTechnocoreSignature, type SignatureVerificationStatus } from '../data/technocoreCrypto';

export type GlobalDataMode = 'LIVE' | 'REPLAY';

export interface ObservedIdentity {
  id: string; // Unique DID or sender identifier
  did: string;
  shortDid: string;
  alias?: string;
  verificationStatus: SignatureVerificationStatus;
  isVerified: boolean;
  firstObserved: number;
  lastObserved: number;
  freshnessLabel: string; // e.g. "Observed recently", "Last seen 8m ago"
  roomsSeen: string[];
  observedMessageCount: number;
  latestMessage?: {
    text: string;
    room: string;
    timestamp: number;
    sequence: number;
    sig?: string;
  };
}

export interface LiveObservationStats {
  isDemo: boolean;
  datasetLabel: string;
  totalProbesFired: number;
  activeRoomsMonitored: number;
  didIdentitiesObserved: number | null;
  verifiedSigningDids: number | null;
  uniqueSignedIdentities: number | null; // legacy alias
  overallMedianLatency: number | null;
  observationStartTime: string;
  ephemeralMessageDepth: number;
  totalObservedRooms: number;
}

interface DataContextType {
  dataMode: GlobalDataMode;
  setDataMode: (mode: GlobalDataMode) => void;
  observerHealth: ObserverHealth;
  isLiveLoading: boolean;
  liveError: string | null;
  liveRooms: TechnocoreRoomSummary[];
  activeRuns: ProbeRun[];
  activeStats: LiveObservationStats;
  activeRoomClusters: RoomCluster[];
  activeArmSummaries: ArmSummary[];
  signedRecords: SignedRecord[];
  observedIdentities: ObservedIdentity[];
  refreshLiveData: () => Promise<void>;
  disclaimerText: string | null;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [dataMode, setDataMode] = useState<GlobalDataMode>('LIVE');
  
  // LIVE State: Initializes strictly EMPTY (Fail Closed, Zero Synthetic Seeding)
  const [isLiveLoading, setIsLiveLoading] = useState<boolean>(true);
  const [liveError, setLiveError] = useState<string | null>(null);
  const [observerHealth, setObserverHealth] = useState<ObserverHealth>('LIVE');
  const [liveRooms, setLiveRooms] = useState<TechnocoreRoomSummary[]>([]);
  const [liveDetectedRuns, setLiveDetectedRuns] = useState<ProbeRun[]>([]);
  const [liveSignedRecords, setLiveSignedRecords] = useState<SignedRecord[]>([]);
  const [liveObservedIdentities, setLiveObservedIdentities] = useState<ObservedIdentity[]>([]);
  const [observationStartTime] = useState<string>(new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC');
  const [ephemeralDepth, setEphemeralDepth] = useState<number>(0);
  const [uniqueLiveDids, setUniqueLiveDids] = useState<number>(0);

  const abortControllerRef = useRef<AbortController | null>(null);
  const [sessionCapture, setSessionCapture] = useState<{
    runs: ProbeRun[];
    records: SignedRecord[];
    identities: ObservedIdentity[];
    rooms: TechnocoreRoomSummary[];
    capturedAt: string;
  } | null>(null);

  const fetchLiveObservations = useCallback(async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    // Fast return for REPLAY
    if (dataMode !== 'LIVE') {
      setIsLiveLoading(false);
      return;
    }

    setIsLiveLoading(true);
    setLiveError(null);

    try {
      // 1. Fetch public rooms directly from Technocore
      const roomsData = await fetchPublicRooms(abortController.signal);
      const roomsList = roomsData.rooms || [];
      setLiveRooms(roomsList);

      if (roomsList.length === 0) {
        setLiveDetectedRuns([]);
        setLiveSignedRecords([]);
        setLiveObservedIdentities([]);
        setEphemeralDepth(0);
        setUniqueLiveDids(0);
        setObserverHealth('LIVE');
        return;
      }

      // Select top active rooms by recent activity (max 8 rooms to avoid overwhelming rate limits)
      const topCandidateRooms = roomsList
        .slice(0, 8)
        .map(r => r.room);

      // 2. Sample candidate rooms politely (concurrency <= 3)
      const roomSamples = await sampleActiveRoomsPolitely(
        topCandidateRooms,
        3,
        abortController.signal
      );

      const explicitProbes: { probe: ParsedProbe; roomMessages: any[] }[] = [];
      const generalRuns: { probe: ParsedProbe; roomMessages: any[] }[] = [];
      let totalFetchedMsgs = 0;
      const allDids = new Set<string>();
      const candidateRecordsToVerify: {
        room: string;
        msg: any;
      }[] = [];

      // Identity extraction map
      const identityMap = new Map<string, {
        did: string;
        verificationStatus: SignatureVerificationStatus;
        isVerified: boolean;
        firstObserved: number;
        lastObserved: number;
        roomsSeen: Set<string>;
        observedMessageCount: number;
        latestMessage?: {
          text: string;
          room: string;
          timestamp: number;
          sequence: number;
          sig?: string;
        };
      }>();

      roomSamples.forEach((messages, roomName) => {
        totalFetchedMsgs += messages.length;
        messages.forEach((m) => {
          const sender = (m.from || '').trim();
          if (sender) {
            allDids.add(sender);
            const msgTime = new Date(m.ts).getTime() || Date.now();

            const existing = identityMap.get(sender);
            if (existing) {
              existing.observedMessageCount++;
              existing.roomsSeen.add(roomName);
              if (msgTime < existing.firstObserved) existing.firstObserved = msgTime;
              if (msgTime >= existing.lastObserved) {
                existing.lastObserved = msgTime;
                existing.latestMessage = {
                  text: m.text || '',
                  room: roomName,
                  timestamp: msgTime,
                  sequence: m.seq,
                  sig: m.sig
                };
              }
            } else {
              identityMap.set(sender, {
                did: sender,
                verificationStatus: m.sig ? 'PRESENT_UNVERIFIED' : 'UNSIGNED',
                isVerified: false,
                firstObserved: msgTime,
                lastObserved: msgTime,
                roomsSeen: new Set([roomName]),
                observedMessageCount: 1,
                latestMessage: {
                  text: m.text || '',
                  room: roomName,
                  timestamp: msgTime,
                  sequence: m.seq,
                  sig: m.sig
                }
              });
            }
          }

          const parsed = parseProbeMessage(m, roomName);
          if (parsed) {
            if (parsed.isProbe) {
              explicitProbes.push({ probe: parsed, roomMessages: messages });
            } else {
              generalRuns.push({ probe: parsed, roomMessages: messages });
            }
          }
          if (m.from) {
            candidateRecordsToVerify.push({ room: roomName, msg: m });
          }
        });
      });

      setEphemeralDepth(totalFetchedMsgs);
      setUniqueLiveDids(allDids.size);

      // Verify signatures with zero fabrication
      const verifiedList: SignedRecord[] = await Promise.all(
        candidateRecordsToVerify.slice(0, 30).map(async ({ room, msg }) => {
          let verificationStatus: SignatureVerificationStatus = 'UNSIGNED';
          let verificationReason: string | undefined;

          if (!msg.sig) {
            verificationStatus = 'UNSIGNED';
          } else {
            const result = await verifyTechnocoreSignature({
              room,
              did: msg.from,
              signature: msg.sig,
              nonce: msg.nonce,
              text: msg.text
            });
            verificationStatus = result.status;
            verificationReason = result.reason;
          }

          // Update identity verification status in identityMap
          const idEntry = identityMap.get(msg.from);
          if (idEntry && verificationStatus === 'VERIFIED') {
            idEntry.verificationStatus = 'VERIFIED';
            idEntry.isVerified = true;
          } else if (idEntry && verificationStatus === 'INVALID' && idEntry.verificationStatus !== 'VERIFIED') {
            idEntry.verificationStatus = 'INVALID';
          }

          return {
            did: msg.from,
            signature: msg.sig || null,
            verificationStatus,
            isVerified: verificationStatus === 'VERIFIED',
            verificationReason,
            timestamp: new Date(msg.ts).getTime() || Date.now(),
            isoDate: msg.ts,
            room,
            message: msg.text || '',
            sequence: msg.seq
          };
        })
      );

      // Sort newest first
      verifiedList.sort((a, b) => b.timestamp - a.timestamp);
      setLiveSignedRecords(verifiedList);

      // Format clean observed identities
      const nowMs = Date.now();
      const identitiesList: ObservedIdentity[] = Array.from(identityMap.values()).map((item) => {
        const diffMins = Math.max(0, Math.floor((nowMs - item.lastObserved) / 60000));
        const freshness = diffMins === 0 ? 'Observed recently' : `Last seen ${diffMins}m ago`;
        const short = item.did.length > 20
          ? `${item.did.slice(0, 12)}...${item.did.slice(-4)}`
          : item.did;

        return {
          id: item.did,
          did: item.did,
          shortDid: short,
          verificationStatus: item.verificationStatus,
          isVerified: item.isVerified,
          firstObserved: item.firstObserved,
          lastObserved: item.lastObserved,
          freshnessLabel: freshness,
          roomsSeen: Array.from(item.roomsSeen),
          observedMessageCount: item.observedMessageCount,
          latestMessage: item.latestMessage
        };
      });

      identitiesList.sort((a, b) => b.lastObserved - a.lastObserved);
      setLiveObservedIdentities(identitiesList);

      // Prioritize explicit probe posts, supplemented by newest general public room messages
      const combinedCandidates = [
        ...explicitProbes,
        ...generalRuns.slice(-20)
      ];

      // 3. Compute empirical 120s observational windows for each real message
      const calculatedRuns: ProbeRun[] = combinedCandidates.map((item, idx) => {
        const window = calculate120sWindow(item.probe, item.roomMessages);
        return windowToProbeRun(window, idx + 1);
      });

      calculatedRuns.sort((a, b) => b.timestamp - a.timestamp);
      setLiveDetectedRuns(calculatedRuns);
      setObserverHealth('LIVE');

      // Record in session capture buffer for truthful REPLAY capability
      setSessionCapture({
        runs: calculatedRuns,
        records: verifiedList,
        identities: identitiesList,
        rooms: roomsList,
        capturedAt: new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC'
      });
    } catch (err: any) {
      if (err.name === 'AbortError') return;

      if (err.message?.includes('429')) {
        setObserverHealth('RATE LIMITED');
      } else {
        setObserverHealth('OFFLINE');
      }
      setLiveError(err?.message || 'Unable to connect to live Technocore public API.');
    } finally {
      setIsLiveLoading(false);
    }
  }, [dataMode]);

  // Fetch immediately on mount and set polite 25s polling interval
  useEffect(() => {
    fetchLiveObservations();

    const interval = setInterval(() => {
      fetchLiveObservations();
    }, 25000);

    return () => {
      clearInterval(interval);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchLiveObservations]);

  // -------------------------------------------------------------
  // ROOM CLUSTERS: Strictly derived from active mode
  // -------------------------------------------------------------
  const activeRoomClusters: RoomCluster[] = React.useMemo(() => {
    if (dataMode === 'REPLAY') {
      const cap = sessionCapture;
      if (!cap || cap.rooms.length === 0) {
        return [];
      }
      const baseColors = ['#00B4D8', '#4CC9F0', '#0466C8', '#7B2CBF', '#F0A824', '#32D74B'];
      const coords: [number, number, number][] = [
        [0, 0, 0],
        [18, 0, 0],
        [18, 0, -18],
        [0, 0, -18],
        [-18, 0, -18],
        [-18, 0, 0],
        [-18, 0, 18],
        [0, 0, 18]
      ];
      const visualDistricts = ['coordination', 'settlement-prep', 'compute-relay', 'agent-social'] as const;

      return cap.rooms.slice(0, 8).map((r, idx) => ({
        id: `replay-room-${r.room}`,
        name: r.room,
        displayName: `#${r.room} (REPLAY)`,
        category: 'unclassified',
        visualDistrict: visualDistricts[idx % visualDistricts.length],
        didIdentitiesObserved: null,
        verifiedSigningDids: 0,
        signedIdentitiesObserved: null,
        activeAgentsCount: null,
        totalProbesReceived: cap.runs.filter(p => p.roomId === `room-${r.room}` || p.roomName.replace('#', '') === r.room).length,
        medianSubsequentLatencySeconds: null,
        averageResponseLatency: null,
        status: 'nominal' as const,
        color: baseColors[idx % baseColors.length],
        coordinates: coords[idx % coords.length],
        lastProbeArm: undefined,
        topic: r.topic || null
      }));
    }

    // LIVE Mode: Fail closed if no live rooms fetched
    if (liveRooms.length === 0) {
      return [];
    }

    const baseColors = ['#00B4D8', '#4CC9F0', '#0466C8', '#7B2CBF', '#F0A824', '#32D74B'];
    const coords: [number, number, number][] = [
      [0, 0, 0],
      [18, 0, 0],
      [18, 0, -18],
      [0, 0, -18],
      [-18, 0, -18],
      [-18, 0, 0],
      [-18, 0, 18],
      [0, 0, 18]
    ];
    const visualDistricts = ['coordination', 'settlement-prep', 'compute-relay', 'agent-social'] as const;

    return liveRooms.slice(0, 8).map((r, idx) => {
      const matchingRuns = liveDetectedRuns.filter(p => p.roomId === `room-${r.room}` || p.roomName.replace('#', '') === r.room);
      
      const roomDids = new Set<string>();
      matchingRuns.forEach(run => {
        run.observedMessages.forEach(m => {
          if (m.senderDid) roomDids.add(m.senderDid);
        });
      });

      const verifiedRoomDids = new Set<string>();
      liveSignedRecords
        .filter(rec => (rec.room === r.room || rec.room === `room-${r.room}`) && rec.verificationStatus === 'VERIFIED')
        .forEach(rec => verifiedRoomDids.add(rec.did));

      const runsWithActivity = matchingRuns.filter(p => p.metrics.messagesInWindow > 0);
      const latencies = runsWithActivity.map(p => p.metrics.firstResponseLatencySeconds).sort((a, b) => a - b);
      const measuredLatency = latencies.length > 0 ? latencies[Math.floor(latencies.length / 2)] : null;

      return {
        id: `live-room-${r.room}`,
        name: r.room,
        displayName: `#${r.room}`,
        category: 'unclassified',
        visualDistrict: visualDistricts[idx % visualDistricts.length],
        didIdentitiesObserved: roomDids.size > 0 ? roomDids.size : null,
        verifiedSigningDids: verifiedRoomDids.size > 0 ? verifiedRoomDids.size : 0,
        signedIdentitiesObserved: roomDids.size > 0 ? roomDids.size : null,
        activeAgentsCount: null,
        totalProbesReceived: matchingRuns.length,
        medianSubsequentLatencySeconds: measuredLatency,
        averageResponseLatency: measuredLatency,
        status: (r.idle_seconds < 30 ? 'active' : 'nominal') as 'active' | 'nominal',
        color: baseColors[idx % baseColors.length],
        coordinates: coords[idx % coords.length],
        lastProbeArm: matchingRuns[0]?.arm,
        topic: r.topic || null
      };
    });
  }, [dataMode, liveRooms, liveDetectedRuns, liveSignedRecords, sessionCapture]);

  // -------------------------------------------------------------
  // ARM SUMMARIES: Mode-dependent computation
  // -------------------------------------------------------------
  const activeArmSummaries: ArmSummary[] = React.useMemo(() => {
    const runsSource = dataMode === 'REPLAY' ? (sessionCapture?.runs || []) : liveDetectedRuns;

    const questionRuns = runsSource.filter(r => r.arm === 'question');
    const offerRuns = runsSource.filter(r => r.arm === 'offer');
    const statementRuns = runsSource.filter(r => r.arm === 'statement');

    const calcArm = (runs: ProbeRun[], arm: 'question' | 'offer' | 'statement', label: string, color: string): ArmSummary => {
      if (runs.length === 0) {
        return {
          arm,
          label,
          description: `Observed ${arm} signals across public Technocore rooms.`,
          hypothesis: arm === 'question' ? 'Inquiries invite subsequent participation.' : arm === 'offer' ? 'Intent offers invite counter-proposals.' : 'Context writes serve as distributed memory.',
          samplePayload: `probe v1 | live | ${arm}`,
          totalProbes: 0,
          medianLatency: 0,
          avgMessagesInWindow: 0,
          avgUniqueDids: 0,
          responseRate: 0,
          color
        };
      }
      const withActivity = runs.filter(r => r.metrics.messagesInWindow > 0);
      const rate = Math.round((withActivity.length / runs.length) * 1000) / 10;
      const avgMsgs = Math.round((runs.reduce((acc, r) => acc + r.metrics.messagesInWindow, 0) / runs.length) * 10) / 10;
      const avgDids = Math.round((runs.reduce((acc, r) => acc + r.metrics.uniqueDids, 0) / runs.length) * 10) / 10;
      const latencies = withActivity.map(r => r.metrics.firstResponseLatencySeconds).sort((a, b) => a - b);
      const medianLatency = latencies.length > 0 ? latencies[Math.floor(latencies.length / 2)] : 0;

      return {
        arm,
        label,
        description: `Observed ${arm} signals across public Technocore rooms.`,
        hypothesis: arm === 'question' ? 'Inquiries invite subsequent participation.' : arm === 'offer' ? 'Intent offers invite counter-proposals.' : 'Context writes serve as distributed memory.',
        samplePayload: runs[0]?.probePayload || `probe v1 | live | ${arm}`,
        totalProbes: runs.length,
        medianLatency,
        avgMessagesInWindow: avgMsgs,
        avgUniqueDids: avgDids,
        responseRate: rate,
        color
      };
    };

    return [
      calcArm(questionRuns, 'question', 'Question Arm', '#F0A824'),
      calcArm(offerRuns, 'offer', 'Offer Arm', '#A855F7'),
      calcArm(statementRuns, 'statement', 'Statement Arm', '#00B4D8')
    ];
  }, [dataMode, liveDetectedRuns, sessionCapture]);

  // -------------------------------------------------------------
  // SIGNED RECORDS: Strictly empirical
  // -------------------------------------------------------------
  const signedRecords: SignedRecord[] = React.useMemo(() => {
    if (dataMode === 'REPLAY') {
      return sessionCapture?.records || [];
    }
    return liveSignedRecords;
  }, [dataMode, liveSignedRecords, sessionCapture]);

  // -------------------------------------------------------------
  // OBSERVED IDENTITIES: Derived from real records
  // -------------------------------------------------------------
  const observedIdentities: ObservedIdentity[] = React.useMemo(() => {
    if (dataMode === 'REPLAY') {
      return sessionCapture?.identities || [];
    }
    return liveObservedIdentities;
  }, [dataMode, liveObservedIdentities, sessionCapture]);

  // -------------------------------------------------------------
  // LIVE OBSERVATION STATS: Scientifically honest
  // -------------------------------------------------------------
  const activeStats: LiveObservationStats = React.useMemo(() => {
    if (dataMode === 'REPLAY') {
      const cap = sessionCapture;
      if (!cap || cap.records.length === 0) {
        return {
          isDemo: false,
          datasetLabel: 'REPLAY · No Session Capture Recorded (Monitor LIVE mode first)',
          totalProbesFired: 0,
          activeRoomsMonitored: 0,
          didIdentitiesObserved: null,
          verifiedSigningDids: 0,
          uniqueSignedIdentities: null,
          overallMedianLatency: null,
          observationStartTime,
          ephemeralMessageDepth: 0,
          totalObservedRooms: 0
        };
      }
      const verifiedCapDids = new Set(cap.records.filter(r => r.verificationStatus === 'VERIFIED').map(r => r.did)).size;
      const uniqueCapDids = new Set(cap.records.map(r => r.did)).size;
      return {
        isDemo: false,
        datasetLabel: `REPLAY · Captured Session (${cap.capturedAt})`,
        totalProbesFired: cap.runs.length,
        activeRoomsMonitored: cap.rooms.length,
        didIdentitiesObserved: uniqueCapDids > 0 ? uniqueCapDids : null,
        verifiedSigningDids: verifiedCapDids,
        uniqueSignedIdentities: uniqueCapDids > 0 ? uniqueCapDids : null,
        overallMedianLatency: null,
        observationStartTime: cap.capturedAt,
        ephemeralMessageDepth: cap.records.length,
        totalObservedRooms: cap.rooms.length
      };
    }

    // LIVE Mode: Fail closed
    const allWithActivity = liveDetectedRuns.filter(r => r.metrics.messagesInWindow > 0);
    const allLatencies = allWithActivity.map(r => r.metrics.firstResponseLatencySeconds).sort((a, b) => a - b);
    const overallMedian = allLatencies.length > 0 ? allLatencies[Math.floor(allLatencies.length / 2)] : null;

    let datasetLabel = 'LIVE Public Technocore Ingestion';
    if (isLiveLoading && liveRooms.length === 0) {
      datasetLabel = 'CONNECTING TO PUBLIC OBSERVATORY...';
    } else if (liveError) {
      datasetLabel = 'OBSERVATORY FEED UNAVAILABLE';
    } else if (observerHealth === 'RATE LIMITED') {
      datasetLabel = 'RATE LIMITED';
    } else if (liveRooms.length === 0) {
      datasetLabel = 'ZERO PUBLIC ROOMS DETECTED';
    }

    // Deduplicate distinct verified DIDs (multiple messages signed by 1 DID = 1 verified DID)
    const verifiedUniqueDids = new Set(
      liveSignedRecords.filter(r => r.verificationStatus === 'VERIFIED').map(r => r.did)
    ).size;

    return {
      isDemo: false,
      datasetLabel,
      totalProbesFired: liveDetectedRuns.length,
      activeRoomsMonitored: liveRooms.length,
      didIdentitiesObserved: uniqueLiveDids > 0 ? uniqueLiveDids : null,
      verifiedSigningDids: verifiedUniqueDids,
      uniqueSignedIdentities: uniqueLiveDids > 0 ? uniqueLiveDids : null,
      overallMedianLatency: overallMedian,
      observationStartTime,
      ephemeralMessageDepth: ephemeralDepth,
      totalObservedRooms: liveRooms.length
    };
  }, [dataMode, isLiveLoading, liveError, observerHealth, liveRooms, liveDetectedRuns, liveSignedRecords, uniqueLiveDids, ephemeralDepth, observationStartTime, sessionCapture]);

  return (
    <DataContext.Provider
      value={{
        dataMode,
        setDataMode,
        observerHealth,
        isLiveLoading,
        liveError,
        liveRooms,
        activeRuns: dataMode === 'REPLAY' ? (sessionCapture?.runs || []) : liveDetectedRuns,
        activeStats,
        activeRoomClusters,
        activeArmSummaries,
        signedRecords,
        observedIdentities,
        refreshLiveData: fetchLiveObservations,
        disclaimerText: 'Real-time observation of Technocore public endpoints. Every identity, metric, and activity event is derived strictly from real observed records.'
      }}
    >
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};
