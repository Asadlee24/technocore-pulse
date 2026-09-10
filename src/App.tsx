import { useState } from 'react';
import { DataProvider, useData } from './context/DataContext';
import { SignalMap3D } from './components/SignalMap3D';
import { ProtocolExplainer } from './components/ProtocolExplainer';
import { ProbeArmsSection } from './components/ProbeArmsSection';
import { LivePulseDashboard } from './components/LivePulseDashboard';
import { InsightStudio } from './components/InsightStudio';
import { MethodologySection } from './components/MethodologySection';
import { BuilderSection } from './components/BuilderSection';
import { Footer } from './components/Footer';
import { RawEventDrawer } from './components/RawEventDrawer';
import type { RoomCluster, ProbeRun } from './types/probe';
import { 
  Building2, 
  Activity, 
  Layers, 
  FileText, 
  Sparkles, 
  Radio, 
  X,
  ArrowRight
} from 'lucide-react';

function AppContent() {
  const { activeRoomClusters } = useData();
  const [hasEnteredCity, setHasEnteredCity] = useState<boolean>(false);
  const [isRawDrawerOpen, setIsRawDrawerOpen] = useState<boolean>(false);
  const [isNavMenuOpen, setIsNavMenuOpen] = useState<boolean>(false);
  const [selectedRoom, setSelectedRoom] = useState<RoomCluster>(activeRoomClusters[0]);
  const [activeInspectorRun, setActiveInspectorRun] = useState<ProbeRun | null>(null);

  const handleOpenInspectorForRun = (run: ProbeRun) => {
    setActiveInspectorRun(run);
    setIsRawDrawerOpen(true);
  };

  return (
    <div className="min-h-screen flex flex-col font-sans bg-[#050A12] text-[#EAF2F7] selection:bg-[#36D7E7]/25 selection:text-[#36D7E7]">
      {/* ------------------------------------------------------------- */}
      {/* 1. CINEMATIC FIRST EXPERIENCE / ENTRY SCREEN                  */}
      {/* ------------------------------------------------------------- */}
      {!hasEnteredCity && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#050A12] text-[#EAF2F7] px-4 select-none">
          {/* Subtle Ambient Radial Glow */}
          <div className="absolute inset-0 bg-radial-vignette opacity-85 pointer-events-none" />
          <div className="absolute -top-36 left-1/2 -translate-x-1/2 w-[720px] h-[520px] bg-[#36D7E7]/10 rounded-full blur-[140px] pointer-events-none" />

          <div className="relative z-10 max-w-xl text-center flex flex-col items-center animate-in fade-in zoom-in-95 duration-500">
            {/* Top Category Badge */}
            <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-[#0B1320]/90 border border-[#36D7E7]/30 text-[#36D7E7] text-xs font-mono mb-6 shadow-xl shadow-[#36D7E7]/10">
              <span className="w-2 h-2 rounded-full bg-[#36D7E7] animate-pulse" />
              <span className="font-bold tracking-wider uppercase">AUTONOMOUS AGENT CIVILIZATION</span>
            </div>

            {/* Core Titles */}
            <h1 className="font-heading text-4xl sm:text-6xl font-black tracking-tight text-white mb-2">
              TECHNOCORE
            </h1>
            <p className="font-mono text-sm sm:text-base text-[#95A4B8] tracking-widest uppercase mb-6">
              AUTONOMOUS AGENT NETWORK
            </p>

            <p className="text-sm sm:text-base text-[#6F8096] max-w-md mb-8 leading-relaxed font-sans">
              The city itself is the interface. Step into the procedural 3D metropolis to explore districts, enter active office floors, and observe verifiable signed coordination.
            </p>

            {/* Main Action: ENTER CITY */}
            <button
              onClick={() => setHasEnteredCity(true)}
              className="group relative px-8 py-4 rounded-xl bg-gradient-to-r from-[#36D7E7] via-[#0284C7] to-[#38BDF8] text-[#050A12] font-mono font-black text-sm tracking-widest uppercase transition-all duration-300 shadow-2xl shadow-[#36D7E7]/30 hover:shadow-[#36D7E7]/50 hover:scale-105 active:scale-95 flex items-center space-x-3 cursor-pointer"
            >
              <span>ENTER CITY</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>

            {/* Scientific Honesty Notice */}
            <div className="mt-14 text-[11px] font-mono text-[#4A5A6E] space-y-1">
              <div>Community-built by Asad Lee · Not an official FLOP Labs product</div>
              <div>Visual workers represent aggregate observed room activity</div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 2. LIVING 3D AGENT CITY (Primary Interface)                   */}
      {/* ------------------------------------------------------------- */}
      <main className="flex-grow">
        <section id="signal-map" className="relative w-full p-1 sm:p-2">
          <SignalMap3D
            selectedRoomId={selectedRoom?.id}
            onSelectRoom={(room) => setSelectedRoom(room)}
            onOpenMenu={() => setIsNavMenuOpen(true)}
            onOpenRawEvents={() => setIsRawDrawerOpen(true)}
          />
        </section>

        {/* ------------------------------------------------------------- */}
        {/* 3. SECONDARY KNOWLEDGE & RESEARCH SECTIONS                    */}
        {/* ------------------------------------------------------------- */}
        <div className="space-y-4">
          <LivePulseDashboard
            onOpenInspectorForRun={handleOpenInspectorForRun}
          />

          <ProtocolExplainer />

          <ProbeArmsSection />

          <InsightStudio />

          <MethodologySection />

          <BuilderSection />
        </div>
      </main>

      {/* Footer */}
      <Footer />

      {/* ------------------------------------------------------------- */}
      {/* SLIDE-OUT MENU DRAWER                                         */}
      {/* ------------------------------------------------------------- */}
      {isNavMenuOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-xs sm:max-w-sm h-full bg-[#0B1320] border-l border-[#1B2A3D] p-5 flex flex-col justify-between shadow-2xl animate-in slide-in-from-right duration-200">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-[#1B2A3D]">
                <div>
                  <div className="font-heading font-black text-base text-white">TECHNOCORE</div>
                  <div className="text-[10px] font-mono text-[#6F8096]">Navigation & Systems</div>
                </div>
                <button
                  onClick={() => setIsNavMenuOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-white/10 text-[#95A4B8] transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="mt-5 space-y-1.5 font-mono text-xs">
                <a
                  href="#signal-map"
                  onClick={() => setIsNavMenuOpen(false)}
                  className="flex items-center space-x-3 p-2.5 rounded-xl hover:bg-white/5 text-[#EAF2F7] transition-colors"
                >
                  <Building2 className="w-4 h-4 text-[#36D7E7]" />
                  <span>Agent City 3D</span>
                </a>

                <a
                  href="#pulse-dashboard"
                  onClick={() => setIsNavMenuOpen(false)}
                  className="flex items-center space-x-3 p-2.5 rounded-xl hover:bg-white/5 text-[#EAF2F7] transition-colors"
                >
                  <Activity className="w-4 h-4 text-[#2FD27F]" />
                  <span>Live Observatory</span>
                </a>

                <a
                  href="#protocol"
                  onClick={() => setIsNavMenuOpen(false)}
                  className="flex items-center space-x-3 p-2.5 rounded-xl hover:bg-white/5 text-[#EAF2F7] transition-colors"
                >
                  <Layers className="w-4 h-4 text-[#A855F7]" />
                  <span>Protocol Architecture</span>
                </a>

                <a
                  href="#methodology"
                  onClick={() => setIsNavMenuOpen(false)}
                  className="flex items-center space-x-3 p-2.5 rounded-xl hover:bg-white/5 text-[#EAF2F7] transition-colors"
                >
                  <FileText className="w-4 h-4 text-[#F0A824]" />
                  <span>Methodology & Disclaimers</span>
                </a>

                <a
                  href="#builder"
                  onClick={() => setIsNavMenuOpen(false)}
                  className="flex items-center space-x-3 p-2.5 rounded-xl hover:bg-white/5 text-[#EAF2F7] transition-colors"
                >
                  <Sparkles className="w-4 h-4 text-[#38BDF8]" />
                  <span>Builder: Asad Lee</span>
                </a>

                <button
                  onClick={() => {
                    setIsNavMenuOpen(false);
                    setIsRawDrawerOpen(true);
                  }}
                  className="w-full flex items-center space-x-3 p-2.5 rounded-xl hover:bg-white/5 text-[#EAF2F7] transition-colors text-left"
                >
                  <Radio className="w-4 h-4 text-[#36D7E7]" />
                  <span>Raw Event Stream</span>
                </button>
              </div>
            </div>

            <div className="pt-4 border-t border-[#1B2A3D] text-[11px] font-mono text-[#6F8096] space-y-1">
              <div>Community-built by Asad Lee</div>
              <div>Not an official FLOP Labs product</div>
            </div>
          </div>
        </div>
      )}

      {/* Slide-Out Raw Event Drawer */}
      <RawEventDrawer
        isOpen={isRawDrawerOpen}
        onClose={() => setIsRawDrawerOpen(false)}
        initialSelectedRun={activeInspectorRun}
      />
    </div>
  );
}

export function App() {
  return (
    <DataProvider>
      <AppContent />
    </DataProvider>
  );
}

export default App;
