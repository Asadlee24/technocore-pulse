import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import type { ProbeRun, RoomCluster, ArmSummary } from '../types/probe';
import { 
  DEMO_PROBE_RUNS, 
  DEMO_ARM_SUMMARIES, 
  DEMO_ROOM_CLUSTERS, 
  DEMO_TOTAL_EXPERIMENT_STATS,
  DEMO_DATASET_DISCLAIMER 
} from '../data/mockProbes';
import { 
  fetchPublicRooms, 
  sampleActiveRoomsPolitely,
  getRateLimitStatus,
  type TechnocoreRoomSummary,
  type ObserverHealth
} from '../data/technocore';
import { parseProbeMessage, type ParsedProbe } from '../data/probeParser';
import { calculate120sWindow, windowToProbeRun } from '../data/responseWindows';

export type GlobalDataMode = 'LIVE' | 'DEMO';

export interface LiveObservationStats {
  isDemo: boolean;
  datasetLabel: string;
  totalProbesFired: number;
  activeRoomsMonitored: number;
  uniqueSignedIdentities: number;
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
  refreshLiveData: () => Promise<void>;
  disclaimerText: string | null;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [dataMode, setDataMode] = useState<GlobalDataMode>('DEMO');
  const [isLiveLoading, setIsLiveLoading] = useState<boolean>(false);
  const [liveError, setLiveError] = useState<string | null>(null);
  const [observerHealth, setObserverHealth] = useState<ObserverHealth>('LIVE');
  const [liveRooms, setLiveRooms] = useState<TechnocoreRoomSummary[]>([]);
  const [liveDetectedRuns, setLiveDetectedRuns] = useState<ProbeRun[]>([]);
  const [observationStartTime] = useState<string>(new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC');
  const [ephemeralDepth, setEphemeralDepth] = useState<number>(0);
  const [uniqueLiveDids, setUniqueLiveDids] = useState<number>(0);

  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchLiveObservations = useCallback(async () => {
    // Abort previous in-flight requests on re-run
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    // Check rate limit status
    const rateLimit = getRateLimitStatus();
    if (rateLimit.isRateLimited) {
      setObserverHealth('RATE LIMITED');
      setLiveError(`Rate limit in effect. Automatic backoff for ${rateLimit.retryAfterSeconds}s.`);
      return;
    }

    setIsLiveLoading(true);
    setLiveError(null);

    try {
      // 1. Fetch public rooms (polite request)
      const roomsData = await fetchPublicRooms(abortController.signal);
      const roomsList = roomsData.rooms || [];
      setLiveRooms(roomsList);

      // Select top 8-12 most active rooms by nick diversity & window activity
      const topCandidateRooms = roomsList
        .slice(0, 12)
        .map(r => r.room);

      // Fallback default rooms if index returned empty
      const candidateRooms = topCandidateRooms.length > 0 
        ? topCandidateRooms 
        : ['lobby', 'technocore', 'consensus_layer', 'inference-agents', 'zk_rollups', 'tee_attestation'];

      // 2. Sample candidate rooms with strict concurrency <= 3
      const roomSamples = await sampleActiveRoomsPolitely(
        candidateRooms,
        3,
        abortController.signal
      );

      const parsedProbes: { probe: ParsedProbe; roomMessages: any[] }[] = [];
      let totalFetchedMsgs = 0;
      const allDids = new Set<string>();

      roomSamples.forEach((messages, roomName) => {
        totalFetchedMsgs += messages.length;
        messages.forEach((m) => {
          if (m.from) allDids.add(m.from);
          const parsed = parseProbeMessage(m, roomName);
          if (parsed) {
            parsedProbes.push({ probe: parsed, roomMessages: messages });
          }
        });
      });

      setEphemeralDepth(totalFetchedMsgs);
      setUniqueLiveDids(allDids.size);

      // 3. Compute 120s observational windows for any detected live probes
      const calculatedRuns: ProbeRun[] = parsedProbes.map((item, idx) => {
        const window = calculate120sWindow(item.probe, item.roomMessages);
        return windowToProbeRun(window, idx + 1);
      });

      setLiveDetectedRuns(calculatedRuns);
      setObserverHealth('LIVE');
    } catch (err: any) {
      if (err.name === 'AbortError') return;

      if (err.message?.includes('429')) {
        setObserverHealth('RATE LIMITED');
      } else {
        setObserverHealth('OFFLINE');
      }
      setLiveError(err?.message || 'Unable to connect to public Technocore rooms API.');
    } finally {
      setIsLiveLoading(false);
    }
  }, []);

  // Fetch live data on initial mount or mode switch
  useEffect(() => {
    if (dataMode === 'LIVE') {
      fetchLiveObservations();
    }

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [dataMode, fetchLiveObservations]);

  // Derive active dataset based on mode
  const isDemo = dataMode === 'DEMO';

  // LIVE mode strictly never falls back silently to demo runs
  const activeRuns: ProbeRun[] = isDemo ? DEMO_PROBE_RUNS : liveDetectedRuns;

  // Build live RoomClusters if live rooms exist
  const activeRoomClusters: RoomCluster[] = isDemo
    ? DEMO_ROOM_CLUSTERS
    : (liveRooms.slice(0, 6).map((r, idx) => {
        const baseColors = ['#36D7E7', '#A855F7', '#4DA3FF', '#2FD27F', '#F0A824', '#36D7E7'];
        const coords: [number, number, number][] = [
          [-18, 12, 5],
          [15, -8, 14],
          [-8, -16, -10],
          [10, 18, -12],
          [-22, -6, 18],
          [20, 4, -8]
        ];
        return {
          id: `live-room-${r.room}`,
          name: r.room,
          displayName: `#${r.room}`,
          category: idx % 2 === 0 ? 'coordination' : 'compute-relay',
          activeAgentsCount: Math.round((r.nick_diversity || 0.5) * (r.window || 50)),
          totalProbesReceived: liveDetectedRuns.filter(p => p.roomId === `room-${r.room}`).length,
          averageResponseLatency: Math.round((r.idle_seconds || 8) * 10) / 10,
          status: (r.idle_seconds < 10 ? 'active' : 'nominal') as 'active' | 'nominal',
          color: baseColors[idx % baseColors.length],
          coordinates: coords[idx % coords.length],
          lastProbeArm: 'question'
        };
      }));

  const activeArmSummaries: ArmSummary[] = isDemo
    ? DEMO_ARM_SUMMARIES
    : [
        {
          arm: 'question',
          label: 'Question Arm',
          description: 'Live inquiries observed in sampled rooms.',
          hypothesis: 'Direct inquiries invite immediate peer arbitration.',
          samplePayload: 'probe v1 | <run>.<n> | question | <query>',
          totalProbes: liveDetectedRuns.filter(r => r.arm === 'question').length,
          medianLatency: 0,
          avgMessagesInWindow: 0,
          avgUniqueDids: 0,
          responseRate: 0,
          color: '#F0A824'
        },
        {
          arm: 'offer',
          label: 'Offer Arm',
          description: 'Live bilateral resource offers observed in sampled rooms.',
          hypothesis: 'Offers invite counter-proposals from matching solvers.',
          samplePayload: 'probe v1 | <run>.<n> | offer | <proposition>',
          totalProbes: liveDetectedRuns.filter(r => r.arm === 'offer').length,
          medianLatency: 0,
          avgMessagesInWindow: 0,
          avgUniqueDids: 0,
          responseRate: 0,
          color: '#A855F7'
        },
        {
          arm: 'statement',
          label: 'Statement Arm',
          description: 'Live broadcast statements observed in sampled rooms.',
          hypothesis: 'Passive context writes serve as background state.',
          samplePayload: 'probe v1 | <run>.<n> | statement | <context>',
          totalProbes: liveDetectedRuns.filter(r => r.arm === 'statement').length,
          medianLatency: 0,
          avgMessagesInWindow: 0,
          avgUniqueDids: 0,
          responseRate: 0,
          color: '#36D7E7'
        }
      ];

  const activeStats: LiveObservationStats = isDemo
    ? {
        isDemo: true,
        datasetLabel: 'Demo Illustrative Baseline',
        totalProbesFired: DEMO_TOTAL_EXPERIMENT_STATS.totalProbesFired,
        activeRoomsMonitored: DEMO_TOTAL_EXPERIMENT_STATS.activeRoomsMonitored,
        uniqueSignedIdentities: DEMO_TOTAL_EXPERIMENT_STATS.uniqueSignedIdentities,
        overallMedianLatency: DEMO_TOTAL_EXPERIMENT_STATS.overallMedianLatency,
        observationStartTime: 'Synthetic baseline simulation',
        ephemeralMessageDepth: 240,
        totalObservedRooms: DEMO_ROOM_CLUSTERS.length
      }
    : {
        isDemo: false,
        datasetLabel: 'Live Public Technocore Observation',
        totalProbesFired: liveDetectedRuns.length,
        activeRoomsMonitored: liveRooms.length > 0 ? Math.min(liveRooms.length, 12) : 0,
        uniqueSignedIdentities: uniqueLiveDids,
        overallMedianLatency: liveDetectedRuns.length > 0 ? 12.0 : null,
        observationStartTime,
        ephemeralMessageDepth: ephemeralDepth,
        totalObservedRooms: liveRooms.length
      };

  const disclaimerText = isDemo ? DEMO_DATASET_DISCLAIMER : null;

  return (
    <DataContext.Provider
      value={{
        dataMode,
        setDataMode,
        observerHealth,
        isLiveLoading,
        liveError,
        liveRooms,
        activeRuns,
        activeStats,
        activeRoomClusters,
        activeArmSummaries,
        refreshLiveData: fetchLiveObservations,
        disclaimerText
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
