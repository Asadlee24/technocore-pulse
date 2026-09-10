import React, { useEffect, useRef, useState } from 'react';
import { useData } from '../context/DataContext';
import type { RoomCluster, ProbeArm } from '../types/probe';
import {
  Sparkles,
  Maximize2,
  Minimize2,
  ChevronDown,
  Compass,
  Activity,
  Key,
  Target,
  Building2,
  Menu,
  Play
} from 'lucide-react';
import { AgentCity3D } from './agent-city/AgentCity3D';
import type { CameraViewLevel } from './agent-city/CityLODManager';
import { CityBottomSheets } from './agent-city/CityBottomSheets';

interface SignalMap3DProps {
  onSelectRoom?: (room: RoomCluster) => void;
  selectedRoomId?: string;
  activeFilter?: ProbeArm | 'all';
  onOpenMenu?: () => void;
  onOpenRawEvents?: () => void;
}

const DEFAULT_ROOM: RoomCluster = {
  id: 'live-room-technocore',
  name: 'technocore',
  displayName: '#technocore',
  category: 'coordination',
  activeAgentsCount: 16,
  totalProbesReceived: 8,
  averageResponseLatency: 1.8,
  status: 'active',
  color: '#36D7E7',
  coordinates: [0, 0, 0],
  lastProbeArm: 'question'
};

export const SignalMap3D: React.FC<SignalMap3DProps> = ({
  onSelectRoom,
  selectedRoomId: _selectedRoomId,
  activeFilter: _activeFilter = 'all',
  onOpenMenu,
  onOpenRawEvents
}) => {
  const { dataMode, setDataMode, activeRoomClusters, signedRecords } = useData();
  const wrapperRef = useRef<HTMLDivElement>(null);
  
  // Minimal internal camera and sheet state
  const [cityViewLevel, setCityViewLevel] = useState<CameraViewLevel>('city');
  const [cameraPerspective, setCameraPerspective] = useState<'orbit' | 'drone' | 'plaza'>('orbit');
  const [selectedRoom, setSelectedRoom] = useState<RoomCluster>(activeRoomClusters[0] || DEFAULT_ROOM);
  const [isSimulatingPulse, setIsSimulatingPulse] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isShowcase, setIsShowcase] = useState<boolean>(false);
  const [isModeMenuOpen, setIsModeMenuOpen] = useState<boolean>(false);
  
  // Bottom sheet state: 'none' | 'room' | 'signed' | 'missions' | 'activity' | 'signal'
  const [activeSheet, setActiveSheet] = useState<'none' | 'room' | 'signed' | 'missions' | 'activity' | 'signal'>('none');

  // Sync selected room when activeRoomClusters updates
  useEffect(() => {
    if (activeRoomClusters.length > 0) {
      setSelectedRoom(prev => {
        const found = activeRoomClusters.find(r => r.id === prev.id);
        return found || activeRoomClusters[0];
      });
    }
  }, [activeRoomClusters]);

  // Fullscreen toggle
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
      setTimeout(() => window.dispatchEvent(new Event('resize')), 80);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

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

  const handleTriggerPulse = (roomToPulse?: RoomCluster) => {
    if (roomToPulse) setSelectedRoom(roomToPulse);
    setIsSimulatingPulse(true);
    setTimeout(() => {
      setIsSimulatingPulse(false);
    }, 2800);
  };

  const handlePerspectiveCycle = () => {
    if (cameraPerspective === 'orbit') {
      setCameraPerspective('drone');
    } else if (cameraPerspective === 'drone') {
      setCameraPerspective('plaza');
    } else {
      setCameraPerspective('orbit');
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
          : 'h-[calc(100vh-4.5rem)] min-h-[640px] rounded-2xl border border-[#1B2A3D] shadow-2xl shadow-black/90'
      }`}
    >
      {/* ------------------------------------------------------------- */}
      {/* MINIMAL TOP HUD: Brand, LIVE/DEMO/REPLAY badge, and Actions   */}
      {/* ------------------------------------------------------------- */}
      <div className="absolute top-0 inset-x-0 z-20 flex items-center justify-between px-3 sm:px-5 py-3 bg-[#0B1320]/75 backdrop-blur-xl border-b border-[#1B2A3D]/70 pointer-events-auto">
        {/* Left: Brand + Strict Global Mode Badge */}
        <div className="flex items-center space-x-2.5">
          <div className="flex items-center space-x-2">
            <span className="font-heading font-black tracking-wider text-sm sm:text-base text-white">
              TECHNOCORE
            </span>
            <span className="hidden md:inline-block text-xs font-mono text-[#6F8096]">
              Agent City
            </span>
          </div>

          {/* Mode Selector Pill */}
          <div className="relative">
            <button
              onClick={() => setIsModeMenuOpen(!isModeMenuOpen)}
              className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase border transition-all hover:scale-105 active:scale-95 ${
                dataMode === 'LIVE'
                  ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
                  : dataMode === 'DEMO'
                  ? 'bg-amber-500/15 border-amber-500/40 text-amber-400'
                  : 'bg-cyan-500/15 border-cyan-500/40 text-cyan-400'
              }`}
              title="Click to toggle between LIVE, DEMO, and REPLAY data modes"
            >
              <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${
                dataMode === 'LIVE' ? 'bg-emerald-400' : dataMode === 'DEMO' ? 'bg-amber-400' : 'bg-cyan-400'
              }`} />
              <span>● {dataMode}</span>
              <ChevronDown className="w-2.5 h-2.5 opacity-70" />
            </button>

            {/* Dropdown Menu */}
            {isModeMenuOpen && (
              <div className="absolute top-full left-0 mt-1.5 w-52 rounded-xl bg-[#0B1320]/95 border border-[#1B2A3D] p-1 shadow-2xl backdrop-blur-xl z-50 animate-in fade-in zoom-in-95">
                <div className="px-2.5 py-1 text-[9px] font-mono uppercase tracking-widest text-[#6F8096] border-b border-[#1B2A3D]/50 mb-1">
                  Global Data Stream Mode
                </div>
                <button
                  onClick={() => { setDataMode('LIVE'); setIsModeMenuOpen(false); }}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-mono flex items-center justify-between hover:bg-white/5 transition-colors"
                >
                  <span className="text-emerald-400 font-bold">● LIVE</span>
                  <span className="text-[10px] text-[#6F8096]">Real public rooms</span>
                </button>
                <button
                  onClick={() => { setDataMode('DEMO'); setIsModeMenuOpen(false); }}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-mono flex items-center justify-between hover:bg-white/5 transition-colors"
                >
                  <span className="text-amber-400 font-bold">● DEMO</span>
                  <span className="text-[10px] text-[#6F8096]">Synthetic illustrative</span>
                </button>
                <button
                  onClick={() => { setDataMode('REPLAY'); setIsModeMenuOpen(false); }}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-mono flex items-center justify-between hover:bg-white/5 transition-colors"
                >
                  <span className="text-cyan-400 font-bold">● REPLAY</span>
                  <span className="text-[10px] text-[#6F8096]">Captured window</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Center: District/Perspective Indicator (Desktop only) */}
        <div className="hidden lg:flex items-center space-x-2 text-xs font-mono text-[#95A4B8]">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: activeDisplayRoom.color }} />
          <span className="text-white font-bold">{activeDisplayRoom.displayName}</span>
          <span className="text-[#6F8096]">·</span>
          <span className="text-[11px] text-[#36D7E7] uppercase tracking-wider">
            {cameraPerspective.toUpperCase()} CAM
          </span>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center space-x-2">
          {/* Showcase Mode Button */}
          <button
            onClick={() => setIsShowcase(!isShowcase)}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all border ${
              isShowcase
                ? 'bg-red-500/20 text-red-400 border-red-500/50 shadow-lg shadow-red-500/20'
                : 'bg-[#101A2A] text-[#EAF2F7] border-[#1B2A3D] hover:border-[#36D7E7]/50'
            }`}
            title="Play 18s automated showcase demonstration tour"
          >
            <Play className={`w-3 h-3 ${isShowcase ? 'text-red-400' : 'text-[#36D7E7]'}`} />
            <span className="hidden sm:inline">SHOWCASE</span>
          </button>

          {/* Fullscreen Toggle */}
          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-lg text-xs font-mono transition-all border bg-[#101A2A] text-[#95A4B8] border-[#1B2A3D] hover:text-white hover:border-[#36D7E7]/40"
            title={isFullscreen ? "Exit Fullscreen" : "Full Screen"}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4 text-[#36D7E7]" /> : <Maximize2 className="w-4 h-4 text-[#36D7E7]" />}
          </button>

          {/* Menu Drawer Toggle */}
          {onOpenMenu && (
            <button
              onClick={onOpenMenu}
              className="p-2 rounded-lg text-xs font-mono transition-all border bg-[#101A2A] text-[#95A4B8] border-[#1B2A3D] hover:text-white hover:border-[#36D7E7]/40"
              title="Open Navigation Menu"
            >
              <Menu className="w-4 h-4 text-[#36D7E7]" />
            </button>
          )}
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* PRIMARY 3D CITY WORLD (occupies 100% of viewport)             */}
      {/* ------------------------------------------------------------- */}
      <div className="w-full h-full relative">
        <AgentCity3D
          activeRoomClusters={activeRoomClusters}
          selectedRoom={activeDisplayRoom}
          viewLevel={cityViewLevel}
          onViewLevelChange={setCityViewLevel}
          cameraPerspective={cameraPerspective}
          onPerspectiveChange={setCameraPerspective}
          theme="dark"
          onSelectRoom={(room) => {
            setSelectedRoom(room);
            if (onSelectRoom) onSelectRoom(room);
          }}
          onOpenBuildingSheet={(room) => {
            setSelectedRoom(room);
            setActiveSheet('room');
          }}
          isSimulatingPulse={isSimulatingPulse}
          onPulseComplete={() => setIsSimulatingPulse(false)}
          isShowcase={isShowcase}
          onExitShowcase={() => setIsShowcase(false)}
        />
      </div>

      {/* ------------------------------------------------------------- */}
      {/* MINIMAL GAME-STYLE BOTTOM NAVIGATION                          */}
      {/* ------------------------------------------------------------- */}
      <div className="absolute bottom-4 inset-x-0 z-20 flex items-center justify-center px-2 pointer-events-none">
        <div className="flex items-center gap-1.5 sm:gap-2 p-1.5 rounded-2xl bg-[#0B1320]/85 backdrop-blur-xl border border-[#1B2A3D] shadow-2xl shadow-black/80 pointer-events-auto">
          {/* Explore Perspective Switcher */}
          <button
            onClick={handlePerspectiveCycle}
            className="flex items-center space-x-1.5 min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-mono font-bold transition-all bg-[#101A2A] hover:bg-white/10 text-white border border-[#1B2A3D] active:scale-95"
            title={`Camera: ${cameraPerspective.toUpperCase()} (Click to cycle Orbit / Drone / Plaza)`}
          >
            <Compass className="w-4 h-4 text-[#36D7E7]" />
            <span>EXPLORE</span>
            <span className="hidden sm:inline text-[10px] text-[#6F8096] uppercase">({cameraPerspective})</span>
          </button>

          {/* Activity Drawer / Sheet */}
          <button
            onClick={() => {
              if (onOpenRawEvents) {
                onOpenRawEvents();
              } else {
                setActiveSheet(activeSheet === 'activity' ? 'none' : 'activity');
              }
            }}
            className={`flex items-center space-x-1.5 min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-mono font-bold transition-all border active:scale-95 ${
              activeSheet === 'activity'
                ? 'bg-[#36D7E7] text-[#050A12] border-[#36D7E7]'
                : 'bg-[#101A2A] text-white border-[#1B2A3D] hover:bg-white/10'
            }`}
            title="Inspect Recent Observed Activity"
          >
            <Activity className="w-4 h-4 text-[#2FD27F]" />
            <span>ACTIVITY</span>
          </button>

          {/* Signed Activity & DID Inspector */}
          <button
            onClick={() => setActiveSheet(activeSheet === 'signed' ? 'none' : 'signed')}
            className={`flex items-center space-x-1.5 min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-mono font-bold transition-all border active:scale-95 ${
              activeSheet === 'signed'
                ? 'bg-[#36D7E7] text-[#050A12] border-[#36D7E7]'
                : 'bg-[#101A2A] text-white border-[#1B2A3D] hover:bg-white/10'
            }`}
            title="Inspect Signed Records and DIDs"
          >
            <Key className="w-4 h-4 text-[#F0A824]" />
            <span>SIGNAL</span>
          </button>

          {/* Missions Tracker */}
          <button
            onClick={() => setActiveSheet(activeSheet === 'missions' ? 'none' : 'missions')}
            className={`flex items-center space-x-1.5 min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-mono font-bold transition-all border active:scale-95 ${
              activeSheet === 'missions'
                ? 'bg-[#36D7E7] text-[#050A12] border-[#36D7E7]'
                : 'bg-[#101A2A] text-white border-[#1B2A3D] hover:bg-white/10'
            }`}
            title="City Exploration Missions"
          >
            <Target className="w-4 h-4 text-[#A855F7]" />
            <span className="hidden sm:inline">MISSIONS</span>
          </button>

          {/* Current Building Sheet Trigger */}
          <button
            onClick={() => setActiveSheet(activeSheet === 'room' ? 'none' : 'room')}
            className={`hidden md:flex items-center space-x-1.5 min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-mono font-bold transition-all border active:scale-95 ${
              activeSheet === 'room'
                ? 'bg-[#36D7E7] text-[#050A12] border-[#36D7E7]'
                : 'bg-[#101A2A] text-white border-[#1B2A3D] hover:bg-white/10'
            }`}
            title="Inspect Active Tower Telemetry"
          >
            <Building2 className="w-4 h-4 text-[#36D7E7]" />
            <span className="truncate max-w-[90px]">{activeDisplayRoom.displayName}</span>
          </button>

          {/* Pulse Simulator Button */}
          <button
            onClick={() => handleTriggerPulse(activeDisplayRoom)}
            disabled={isSimulatingPulse}
            className="flex items-center space-x-1.5 min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-mono font-bold transition-all bg-[#36D7E7] text-[#050A12] hover:bg-[#36D7E7]/90 active:scale-95 disabled:opacity-50 shadow-lg shadow-[#36D7E7]/25"
            title="Dispatch a Probe Wave into the District"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{isSimulatingPulse ? 'PULSING...' : 'PULSE'}</span>
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* MOBILE-FIRST SLIDING BOTTOM SHEETS                            */}
      {/* ------------------------------------------------------------- */}
      <CityBottomSheets
        activeSheet={activeSheet}
        selectedRoom={activeDisplayRoom}
        signedRecords={signedRecords}
        isDemoMode={dataMode === 'DEMO'}
        onOpenSheet={setActiveSheet}
        onCloseRoomSheet={() => setActiveSheet('none')}
        onEnterBuilding={() => {
          setCityViewLevel('interior');
          setActiveSheet('none');
        }}
        onTriggerPulse={() => {
          handleTriggerPulse(activeDisplayRoom);
        }}
      />
    </div>
  );
};
