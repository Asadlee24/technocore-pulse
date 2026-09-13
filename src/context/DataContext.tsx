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
import { verifyTechnocoreSignature } from '../data/technocoreCrypto';
import {
  DEMO_ROOM_SUMMARIES,
  DEMO_RUNS,
  DEMO_SIGNED_RECORDS,
  DEMO_ROOM_CLUSTERS,
  DEMO_ARM_SUMMARIES,
  DEMO_DATASET_LABEL,
  DEMO_DISCLAIMER_TEXT
} from '../data/demoCityData';

export type GlobalDataMode = 'LIVE' | 'DEMO' | 'REPLAY';

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
  const [observationStartTime] = useState<string>(new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC');
  const [ephemeralDepth, setEphemeralDepth] = useState<number>(0);
  const [uniqueLiveDids, setUniqueLiveDids] = useState<number>(0);

  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchLiveObservations = useCallback(async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    // Fast return for DEMO or REPLAY
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

      roomSamples.forEach((messages, roomName) => {
        totalFetchedMsgs += messages.length;
        messages.forEach((m) => {
          if (m.from) allDids.add(m.from);
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
          let verificationStatus: 'VERIFIED' | 'INVALID' | 'PRESENT_UNVERIFIED' | 'UNSIGNED' = 'UNSIGNED';
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

          return {
            did: msg.from,
            signature: msg.sig || null,
            verificationStatus,
            isVerified: verificationStatus === 'VERIFIED',
            verificationReason,
            timestamp: new Date(msg.ts).getTime(),
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

      // Sort newest first
      calculatedRuns.sort((a, b) => b.timestamp - a.timestamp);

      setLiveDetectedRuns(calculatedRuns);
      setObserverHealth('LIVE');
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

  // Fetch immediately on mount and set a polite 25s polling interval
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
    if (dataMode === 'DEMO') {
      return DEMO_ROOM_CLUSTERS;
    }

    if (dataMode === 'REPLAY') {
      return DEMO_ROOM_CLUSTERS.map(c => ({
        ...c,
        id: c.id.replace('demo-', 'replay-'),
        displayName: c.displayName.replace('(DEMO)', '(REPLAY)')
      }));
    }

    // LIVE Mode: Fail closed if no live rooms fetched
    if (liveRooms.length === 0) {
      return [];
    }

    const baseColors = ['#36D7E7', '#A855F7', '#4DA3FF', '#2FD27F', '#F0A824', '#38BDF8'];
    const coords: [number, number, number][] = [
      [-18, 12, 5],
      [15, -8, 14],
      [-8, -16, -10],
      [10, 18, -12],
      [-22, -6, 18],
      [20, 4, -8],
      [-14, 14, -14],
      [16, -12, -8]
    ];
    const visualDistricts = ['coordination', 'settlement-prep', 'compute-relay', 'agent-social'] as const;

    return liveRooms.slice(0, 8).map((r, idx) => {
      const matchingRuns = liveDetectedRuns.filter(p => p.roomId === `room-${r.room}` || p.roomName.replace('#', '') === r.room);
      
      // Calculate real unique DIDs and verified signing DIDs observed in this specific room
      const roomDids = new Set<string>();
      matchingRuns.forEach(run => {
        run.observedMessages.forEach(m => {
          if (m.senderDid) roomDids.add(m.senderDid);
        });
      });

      // Calculate verified signing DIDs from liveSignedRecords for this room
      const verifiedRoomDids = new Set<string>();
      liveSignedRecords
        .filter(rec => (rec.room === r.room || rec.room === `room-${r.room}`) && rec.verificationStatus === 'VERIFIED')
        .forEach(rec => verifiedRoomDids.add(rec.did));

      // Calculate empirical median subsequent message latency if observation window had subsequent messages
      const runsWithActivity = matchingRuns.filter(p => p.metrics.messagesInWindow > 0);
      const latencies = runsWithActivity.map(p => p.metrics.firstResponseLatencySeconds).sort((a, b) => a - b);
      const measuredLatency = latencies.length > 0 ? latencies[Math.floor(latencies.length / 2)] : null;

      return {
        id: `live-room-${r.room}`,
        name: r.room,
        displayName: `#${r.room}`,
        // Category is strictly unclassified in LIVE mode; visualDistrict is an explicit 3D architectural assignment
        category: 'unclassified',
        visualDistrict: visualDistricts[idx % visualDistricts.length],
        didIdentitiesObserved: roomDids.size > 0 ? roomDids.size : null,
        verifiedSigningDids: verifiedRoomDids.size > 0 ? verifiedRoomDids.size : 0,
        signedIdentitiesObserved: roomDids.size > 0 ? roomDids.size : null, // legacy alias
        activeAgentsCount: null, // Zero fabrication: never estimate from diversity metrics
        totalProbesReceived: matchingRuns.length,
        medianSubsequentLatencySeconds: measuredLatency, // Strictly measured from 120s window or null (NEVER idle_seconds)
        averageResponseLatency: measuredLatency, // Legacy alias
        status: (r.idle_seconds < 30 ? 'active' : 'nominal') as 'active' | 'nominal',
        color: baseColors[idx % baseColors.length],
        coordinates: coords[idx % coords.length],
        lastProbeArm: matchingRuns[0]?.arm,
        topic: r.topic || null // Direct untrusted string from API response, no hardcoded claims
      };
    });
  }, [dataMode, liveRooms, liveDetectedRuns, liveSignedRecords]);

  // -------------------------------------------------------------
  // ARM SUMMARIES: Mode-dependent computation
  // -------------------------------------------------------------
  const activeArmSummaries: ArmSummary[] = React.useMemo(() => {
    if (dataMode === 'DEMO') {
      return DEMO_ARM_SUMMARIES;
    }
    if (dataMode === 'REPLAY') {
      return DEMO_ARM_SUMMARIES;
    }

    // LIVE mode: compute strictly from detected runs
    const questionRuns = liveDetectedRuns.filter(r => r.arm === 'question');
    const offerRuns = liveDetectedRuns.filter(r => r.arm === 'offer');
    const statementRuns = liveDetectedRuns.filter(r => r.arm === 'statement');

    const calcArm = (runs: ProbeRun[], arm: 'question' | 'offer' | 'statement', label: string, color: string): ArmSummary => {
      if (runs.length === 0) {
        return {
          arm,
          label,
          description: `Live ${arm} observations in public rooms.`,
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
        description: `Live ${arm} observations in public rooms.`,
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
      calcArm(statementRuns, 'statement', 'Statement Arm', '#36D7E7')
    ];
  }, [dataMode, liveDetectedRuns]);

  // -------------------------------------------------------------
  // SIGNED RECORDS: Mode-dependent extraction
  // -------------------------------------------------------------
  const signedRecords: SignedRecord[] = React.useMemo(() => {
    if (dataMode === 'DEMO') {
      return DEMO_SIGNED_RECORDS;
    }
    if (dataMode === 'REPLAY') {
      return DEMO_SIGNED_RECORDS.map(r => ({
        ...r,
        message: r.message.replace('[DEMO MESSAGE]', '[REPLAY RECORD]')
      }));
    }

    // LIVE mode: Strictly empirical verified / unverified signatures
    // Zero manufactured hex strings; zero fake operator verification
    return liveSignedRecords;
  }, [dataMode, liveSignedRecords]);

  // -------------------------------------------------------------
  // LIVE OBSERVATION STATS: Scientifically honest
  // -------------------------------------------------------------
  const activeStats: LiveObservationStats = React.useMemo(() => {
    if (dataMode === 'DEMO') {
      return {
        isDemo: true,
        datasetLabel: DEMO_DATASET_LABEL,
        totalProbesFired: DEMO_RUNS.length,
        activeRoomsMonitored: DEMO_ROOM_SUMMARIES.length,
        didIdentitiesObserved: 6,
        verifiedSigningDids: 4,
        uniqueSignedIdentities: 6,
        overallMedianLatency: 1.4,
        observationStartTime,
        ephemeralMessageDepth: 24,
        totalObservedRooms: DEMO_ROOM_SUMMARIES.length
      };
    }

    if (dataMode === 'REPLAY') {
      return {
        isDemo: true,
        datasetLabel: 'REPLAY · Historical Capture Dataset',
        totalProbesFired: DEMO_RUNS.length,
        activeRoomsMonitored: DEMO_ROOM_SUMMARIES.length,
        didIdentitiesObserved: 6,
        verifiedSigningDids: 4,
        uniqueSignedIdentities: 6,
        overallMedianLatency: 1.4,
        observationStartTime,
        ephemeralMessageDepth: 24,
        totalObservedRooms: DEMO_ROOM_SUMMARIES.length
      };
    }

    // LIVE Mode: Fail closed
    const allWithActivity = liveDetectedRuns.filter(r => r.metrics.messagesInWindow > 0);
    const allLatencies = allWithActivity.map(r => r.metrics.firstResponseLatencySeconds).sort((a, b) => a - b);
    const overallMedian = allLatencies.length > 0 ? allLatencies[Math.floor(allLatencies.length / 2)] : null;

    let datasetLabel = 'Live Public Technocore Ingestion';
    if (isLiveLoading && liveRooms.length === 0) {
      datasetLabel = 'LOADING LIVE DATA...';
    } else if (liveError) {
      datasetLabel = 'LIVE DATA UNAVAILABLE';
    } else if (observerHealth === 'RATE LIMITED') {
      datasetLabel = 'RATE LIMITED';
    } else if (liveRooms.length === 0) {
      datasetLabel = 'ZERO PUBLIC ROOMS ACTIVE';
    }

    const verifiedCount = liveSignedRecords.filter(r => r.verificationStatus === 'VERIFIED').length;

    return {
      isDemo: false,
      datasetLabel,
      totalProbesFired: liveDetectedRuns.length,
      activeRoomsMonitored: liveRooms.length,
      didIdentitiesObserved: uniqueLiveDids > 0 ? uniqueLiveDids : null,
      verifiedSigningDids: verifiedCount > 0 ? verifiedCount : 0,
      uniqueSignedIdentities: uniqueLiveDids > 0 ? uniqueLiveDids : null, // legacy alias
      overallMedianLatency: overallMedian,
      observationStartTime,
      ephemeralMessageDepth: ephemeralDepth,
      totalObservedRooms: liveRooms.length
    };
  }, [dataMode, isLiveLoading, liveError, observerHealth, liveRooms, liveDetectedRuns, liveSignedRecords, uniqueLiveDids, ephemeralDepth, observationStartTime]);

  return (
    <DataContext.Provider
      value={{
        dataMode,
        setDataMode,
        observerHealth,
        isLiveLoading,
        liveError,
        liveRooms,
        activeRuns: dataMode === 'DEMO' ? DEMO_RUNS : liveDetectedRuns,
        activeStats,
        activeRoomClusters,
        activeArmSummaries,
        signedRecords,
        refreshLiveData: fetchLiveObservations,
        disclaimerText: dataMode === 'DEMO' ? DEMO_DISCLAIMER_TEXT : null
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
