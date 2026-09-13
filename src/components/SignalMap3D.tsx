import React, { useEffect, useRef, useState } from 'react';
import { useData } from '../context/DataContext';
import type { RoomCluster } from '../types/probe';
import {
  Compass,
  Users,
  Activity,
  Play,
  Pause,
  X,
  Menu,
  ChevronDown,
  Maximize2,
  Minimize2,
  ExternalLink
} from 'lucide-react';
import { AgentCity3D } from './agent-city/AgentCity3D';
import type { CameraViewLevel } from './agent-city/CityLODManager';
import { CityBottomSheets } from './agent-city/CityBottomSheets';

interface SignalMap3DProps {
  onSelectRoom?: (room: RoomCluster) => void;
  selectedRoomId?: string;
  onOpenMenu?: () => void;
  onOpenRawEvents?: () => void;
}

const DEFAULT_ROOM: RoomCluster = {
  id: 'lot-technocore-tower',
  name: 'technocore',
  displayName: '#technocore-tower',
  category: 'unclassified',
  visualDistrict: 'coordination',
  signedIdentitiesObserved: null,
  activeAgentsCount: null,
  totalProbesReceived: 0,
  medianSubsequentLatencySeconds: null,
  averageResponseLatency: null,
  status: 'active',
  color: '#00B4D8',
  coordinates: [0, 0, 0]
};

export const SignalMap3D: React.FC<SignalMap3DProps> = ({
  onSelectRoom,
  selectedRoomId: _selectedRoomId,
  onOpenMenu,
  onOpenRawEvents: _onOpenRawEvents
}) => {
  const { 
    dataMode, 
    setDataMode, 
    activeRoomClusters, 
    signedRecords, 
    activeStats, 
    observedIdentities 
  } = useData();
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Camera & View states
  const [cityViewLevel, setCityViewLevel] = useState<CameraViewLevel>('city');
  const [selectedRoom, setSelectedRoom] = useState<RoomCluster>(activeRoomClusters[0] || DEFAULT_ROOM);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isModeMenuOpen, setIsModeMenuOpen] = useState<boolean>(false);

  // Tour State
  const [isTourActive, setIsTourActive] = useState<boolean>(false);
  const [tourCaption, setTourCaption] = useState<string>('');
  const [tourShotName, setTourShotName] = useState<string>('');
  const [tourProgress, setTourProgress] = useState<number>(0);

  // Real Observed Citizens Render Count (capped at 16 in 3D viewport)
  const [renderedAvatarCount, setRenderedAvatarCount] = useState<number>(0);

  // Bottom Event Strip State
  const [eventStripText, setEventStripText] = useState<string>(
    '◆ Technocore Pulse Observatory online. Waiting for verified public broadcasts...'
  );

  // Bottom sheets: 'none' | 'room' | 'signed' | 'missions' | 'activity' | 'signal' | 'agents'
  const [activeSheet, setActiveSheet] = useState<'none' | 'room' | 'signed' | 'missions' | 'activity' | 'signal' | 'agents'>('none');

  // Sync selected room when activeRoomClusters update
  useEffect(() => {
    if (activeRoomClusters.length > 0) {
      setSelectedRoom(prev => {
        const found = activeRoomClusters.find(r => r.id === prev.id);
        return found || activeRoomClusters[0];
      });
    }
  }, [activeRoomClusters]);

  // Sync latest verified message or state to event strip
  useEffect(() => {
    if (signedRecords.length > 0) {
      const latest = signedRecords[0];
      const verifiedTag = latest.verificationStatus === 'VERIFIED' ? '✓ VERIFIED' : '● OBSERVED';
      setEventStripText(`◆ [${verifiedTag}] #${latest.room} · ${latest.did.slice(0, 16)}...: "${latest.message.slice(0, 48)}"`);
    } else if (observedIdentities.length > 0) {
      setEventStripText(`◆ Technocore Pulse online. ${observedIdentities.length} real identities observed in active public rooms.`);
    } else {
      setEventStripText('◆ Technocore Pulse Observatory online. Polling public rooms for signed agent messages...');
    }
  }, [signedRecords, observedIdentities.length]);

  // Fullscreen toggle
  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        if (wrapperRef.current?.requestFullscreen) {
          await wrapperRef.current.requestFullscreen();
        }
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        }
      }
    } catch {
      setIsFullscreen(prev => !prev);
      setTimeout(() => window.dispatchEvent(new Event('resize')), 80);
    }
  };

  const handleTourToggle = () => {
    setIsTourActive(prev => !prev);
    setActiveSheet('none');
  };

  const handlePerspectiveCycle = () => {
    if (cityViewLevel === 'city') {
      setCityViewLevel('building');
    } else if (cityViewLevel === 'building') {
      setCityViewLevel('interior');
    } else {
      setCityViewLevel('city');
    }
  };

  const activeDisplayRoom = selectedRoom || activeRoomClusters[0] || DEFAULT_ROOM;

  return (
    <div
      ref={wrapperRef}
      className={`relative w-full transition-all duration-200 bg-[#050A12] text-[#EAF2F7] overflow-hidden ${
        isFullscreen
          ? 'fixed inset-0 z-[9999] w-screen h-screen'
          : 'h-[100dvh] sm:h-[calc(100vh-4.5rem)] sm:min-h-[640px] sm:rounded-2xl border-b sm:border border-[#1B2A3D] shadow-2xl shadow-black/90'
      }`}
    >
      {/* ------------------------------------------------------------- */}
      {/* 1. TOP-LEFT IDENTITY PANEL                                    */}
      {/* ------------------------------------------------------------- */}
      <div className="absolute top-3 left-3 sm:top-4 sm:left-4 z-20 pointer-events-auto select-none">
        <div className="flex items-center space-x-2.5 p-2 sm:p-2.5 rounded-2xl bg-[#0A1128]/85 backdrop-blur-xl border border-[#1E3048] shadow-2xl">
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-heading font-black tracking-wider text-xs sm:text-sm text-white">
                TECHNOCORE PULSE
              </span>
              <div className="relative">
                <button
                  onClick={() => setIsModeMenuOpen(!isModeMenuOpen)}
                  className={`flex items-center space-x-1 px-2 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase border transition-all ${
                    dataMode === 'LIVE'
                      ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
                      : 'bg-cyan-500/15 border-cyan-500/40 text-cyan-400'
                  }`}
                  title="Toggle Global Data Stream Mode"
                >
                  <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${
                    dataMode === 'LIVE' ? 'bg-emerald-400' : 'bg-cyan-400'
                  }`} />
                  <span>{dataMode}</span>
                  <ChevronDown className="w-2.5 h-2.5 opacity-70" />
                </button>

                {/* Dropdown Menu */}
                {isModeMenuOpen && (
                  <div className="absolute top-full left-0 mt-1.5 w-48 rounded-xl bg-[#0B1320]/95 border border-[#1B2A3D] p-1 shadow-2xl backdrop-blur-xl z-50 animate-in fade-in zoom-in-95">
                    <button
                      onClick={() => { setDataMode('LIVE'); setIsModeMenuOpen(false); }}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-mono flex items-center justify-between hover:bg-white/5"
                    >
                      <span className="text-emerald-400 font-bold">● LIVE</span>
                      <span className="text-[10px] text-[#6F8096]">Real Public API</span>
                    </button>
                    <button
                      onClick={() => { setDataMode('REPLAY'); setIsModeMenuOpen(false); }}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-mono flex items-center justify-between hover:bg-white/5"
                    >
                      <span className="text-cyan-400 font-bold">● REPLAY</span>
                      <span className="text-[10px] text-[#6F8096]">Captured Session</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
            <p className="text-[10px] font-mono text-[#6F8096] mt-0.5">
              AGENT CITY · {dataMode === 'LIVE' ? 'PUBLIC OBSERVATION' : 'SESSION CAPTURE'}
            </p>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 2. TOP-RIGHT SOURCE STATUS PANEL                               */}
      {/* ------------------------------------------------------------- */}
      <div className="absolute top-3 right-3 sm:top-4 sm:right-4 z-20 pointer-events-auto select-none">
        <div className="p-2 sm:p-2.5 rounded-2xl bg-[#0A1128]/85 backdrop-blur-xl border border-[#1E3048] shadow-2xl text-right font-mono text-xs">
          <div>
            <div className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider mb-1">
              {dataMode === 'LIVE' ? 'LIVE OBSERVATION' : 'SESSION REPLAY'}
            </div>
            <div className="space-y-0.5 text-[10px]">
              <div className="flex justify-between gap-3 text-white">
                <span className="text-[#6F8096]">Rooms:</span>
                <span className="font-bold">{activeStats.activeRoomsMonitored}</span>
              </div>
              <div className="flex justify-between gap-3 text-[#38BDF8]">
                <span className="text-[#6F8096]">Distinct DIDs:</span>
                <span className="font-bold">{activeStats.didIdentitiesObserved ?? observedIdentities.length}</span>
              </div>
              <div className="flex justify-between gap-3 text-purple-400">
                <span className="text-[#6F8096]">Verified DIDs:</span>
                <span className="font-bold">{activeStats.verifiedSigningDids ?? 0}</span>
              </div>
              <div className="flex justify-between gap-3 text-amber-400">
                <span className="text-[#6F8096]">Rendered 3D:</span>
                <span className="font-bold">{renderedAvatarCount} of {observedIdentities.length}</span>
              </div>
              <div className="flex justify-between gap-3 text-emerald-400">
                <span className="text-[#6F8096]">Freshness:</span>
                <span className="font-bold">&lt; 25s</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 3. CINEMATIC TOUR BANNER & CONTROLS (during active tour)      */}
      {/* ------------------------------------------------------------- */}
      {isTourActive && (
        <div className="absolute top-16 sm:top-20 inset-x-0 z-30 flex items-center justify-center px-3 pointer-events-none select-none">
          <div className="flex items-center space-x-3 px-4 py-2.5 rounded-2xl bg-[#0A1128]/95 backdrop-blur-2xl border border-[#00B4D8]/50 shadow-2xl shadow-[#00B4D8]/20 pointer-events-auto max-w-xl text-xs font-mono animate-in fade-in slide-in-from-top-4">
            <button
              onClick={() => setIsTourActive(false)}
              className="p-1 rounded-lg bg-[#142337] text-[#00B4D8] hover:text-white hover:bg-[#1E3048] transition-colors"
              title="Pause Tour"
            >
              <Pause className="w-3.5 h-3.5" />
            </button>
            <div className="flex-grow">
              <div className="flex items-center justify-between text-[10px] text-[#00B4D8] mb-0.5">
                <span className="font-bold uppercase tracking-wider">{tourShotName || 'Cinematic Tour'}</span>
                <span>{Math.round(tourProgress * 100)}%</span>
              </div>
              <p className="text-white text-[11px] truncate max-w-sm sm:max-w-md">
                {tourCaption}
              </p>
            </div>
            <button
              onClick={() => setIsTourActive(false)}
              className="p-1 rounded-lg text-[#6F8096] hover:text-white hover:bg-white/10 transition-colors"
              title="Exit Tour"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 4. PRIMARY 3D CITY WORLD                                      */}
      {/* ------------------------------------------------------------- */}
      <div className="w-full h-full relative">
        <AgentCity3D
          activeRoomClusters={activeRoomClusters}
          selectedRoom={activeDisplayRoom}
          viewLevel={cityViewLevel}
          onViewLevelChange={setCityViewLevel}
          theme="dark"
          isTourActive={isTourActive}
          onTourStepChange={(caption, shotName, prog) => {
            setTourCaption(caption);
            setTourShotName(shotName);
            setTourProgress(prog);
          }}
          onExitTour={() => setIsTourActive(false)}
          onSimulationEvent={(msg) => setEventStripText(msg)}
          onCitizensUpdate={(rendered, _total) => {
            setRenderedAvatarCount(rendered);
          }}
          observedIdentities={observedIdentities}
          latestSignedRecord={signedRecords[0]}
          onSelectRoom={(room) => {
            setSelectedRoom(room);
            if (onSelectRoom) onSelectRoom(room);
          }}
          onOpenBuildingSheet={(room) => {
            setSelectedRoom(room);
            setActiveSheet('room');
          }}
        />
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 5. BOTTOM EVENT TICKER STRIP                                  */}
      {/* ------------------------------------------------------------- */}
      <div className="absolute bottom-18 sm:bottom-20 inset-x-0 z-20 flex items-center justify-center px-3 pointer-events-none select-none">
        <div className="flex items-center space-x-2 px-3.5 py-1.5 rounded-xl bg-[#0A1128]/85 backdrop-blur-xl border border-[#1E3048] shadow-lg pointer-events-auto max-w-xl text-[11px] font-mono text-[#CAD4E0] truncate animate-in fade-in">
          <span className="w-2 h-2 rounded-full bg-[#00B4D8] animate-ping shrink-0" />
          <span className="truncate">{eventStripText}</span>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 6. RESTRAINED HERO BOTTOM DOCK (5 Primary Controls)           */}
      {/* ------------------------------------------------------------- */}
      <div className="absolute bottom-3 sm:bottom-4 inset-x-0 z-20 flex items-center justify-between px-3 sm:px-6 safe-bottom pointer-events-none select-none">
        {/* Left attribution link: "Built by Asad Lee" */}
        <div className="hidden md:flex items-center space-x-1.5 text-[11px] font-mono pointer-events-auto bg-[#0A1128]/85 px-3 py-1.5 rounded-xl border border-[#1E3048]">
          <span className="text-[#6F8096]">Built by</span>
          <a
            href="https://asad-lee-portfolio.vercel.app/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#00B4D8] hover:underline font-bold flex items-center space-x-1"
          >
            <span>Asad Lee</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        {/* Center: 5 Primary Dock Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2 p-1.5 rounded-2xl bg-[#0A1128]/90 backdrop-blur-xl border border-[#1E3048] shadow-2xl pointer-events-auto mx-auto md:mx-0">
          {/* 1. Explore View Switcher */}
          <button
            onClick={handlePerspectiveCycle}
            className="flex items-center space-x-1.5 min-h-[42px] px-3 sm:px-3.5 py-2 rounded-xl text-xs font-mono font-bold transition-all bg-[#101E31] hover:bg-white/10 text-white border border-[#1E3048] active:scale-95 touch-manipulation shrink-0"
            title={`Camera View Scale: ${cityViewLevel.toUpperCase()}`}
          >
            <Compass className="w-3.5 h-3.5 text-[#00B4D8]" />
            <span className="text-[11px] sm:text-xs uppercase">{cityViewLevel}</span>
          </button>

          {/* 2. Agents Sheet */}
          <button
            onClick={() => setActiveSheet(activeSheet === 'agents' ? 'none' : 'agents')}
            className={`flex items-center space-x-1.5 min-h-[42px] px-3 sm:px-3.5 py-2 rounded-xl text-xs font-mono font-bold transition-all border active:scale-95 touch-manipulation shrink-0 ${
              activeSheet === 'agents'
                ? 'bg-[#00B4D8] text-[#050A12] border-[#00B4D8]'
                : 'bg-[#101E31] text-white border-[#1E3048] hover:bg-white/10'
            }`}
            title="Inspect Observed Agent Identities"
          >
            <Users className="w-3.5 h-3.5 text-[#38BDF8]" />
            <span className="text-[11px] sm:text-xs">AGENTS</span>
          </button>

          {/* 3. Activity Sheet */}
          <button
            onClick={() => setActiveSheet(activeSheet === 'activity' ? 'none' : 'activity')}
            className={`flex items-center space-x-1.5 min-h-[42px] px-3 sm:px-3.5 py-2 rounded-xl text-xs font-mono font-bold transition-all border active:scale-95 touch-manipulation shrink-0 ${
              activeSheet === 'activity'
                ? 'bg-[#00B4D8] text-[#050A12] border-[#00B4D8]'
                : 'bg-[#101E31] text-white border-[#1E3048] hover:bg-white/10'
            }`}
            title="Inspect Recent Message Feed"
          >
            <Activity className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-[11px] sm:text-xs">ACTIVITY</span>
          </button>

          {/* 4. 58s Cinematic Tour Toggle */}
          <button
            onClick={handleTourToggle}
            className={`flex items-center space-x-1.5 min-h-[42px] px-3 sm:px-3.5 py-2 rounded-xl text-xs font-mono font-bold transition-all border active:scale-95 touch-manipulation shrink-0 ${
              isTourActive
                ? 'bg-[#F72585] text-white border-[#F72585] shadow-lg shadow-[#F72585]/30'
                : 'bg-[#101E31] text-white border-[#1E3048] hover:border-[#00B4D8]/50'
            }`}
            title="Play 58-second Directed Cinematic Tour"
          >
            <Play className="w-3.5 h-3.5 text-[#F72585]" />
            <span className="text-[11px] sm:text-xs">TOUR</span>
          </button>

          {/* 5. Navigation Menu Drawer */}
          {onOpenMenu && (
            <button
              onClick={onOpenMenu}
              className="flex items-center space-x-1.5 min-h-[42px] px-3 sm:px-3.5 py-2 rounded-xl text-xs font-mono font-bold transition-all bg-[#101E31] text-[#95A4B8] border border-[#1E3048] hover:text-white hover:bg-white/10 active:scale-95 touch-manipulation shrink-0"
              title="Open Navigation Menu"
            >
              <Menu className="w-3.5 h-3.5 text-[#00B4D8]" />
              <span className="text-[11px] sm:text-xs">MENU</span>
            </button>
          )}
        </div>

        {/* Right fullscreen button */}
        <div className="hidden md:flex pointer-events-auto">
          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-xl text-xs font-mono transition-all border bg-[#0A1128]/85 text-[#95A4B8] border-[#1E3048] hover:text-white hover:border-[#00B4D8]/40"
            title={isFullscreen ? 'Exit Fullscreen' : 'Full Screen'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4 text-[#00B4D8]" /> : <Maximize2 className="w-4 h-4 text-[#00B4D8]" />}
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 7. SLIDING BOTTOM SHEETS                                      */}
      {/* ------------------------------------------------------------- */}
      <CityBottomSheets
        activeSheet={activeSheet}
        selectedRoom={activeDisplayRoom}
        signedRecords={signedRecords}
        observedIdentities={observedIdentities}
        onSelectAgent={(_identity) => {
          setCityViewLevel('interior');
        }}
        onOpenSheet={setActiveSheet}
        onCloseRoomSheet={() => setActiveSheet('none')}
        onEnterBuilding={() => {
          setCityViewLevel('interior');
          setActiveSheet('none');
        }}
        onTriggerPulse={() => {}}
      />
    </div>
  );
};
