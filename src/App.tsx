import { useState } from 'react';
import { DataProvider, useData } from './context/DataContext';
import { Navbar } from './components/Navbar';
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

function AppContent() {
  const { activeRoomClusters } = useData();
  const [isRawDrawerOpen, setIsRawDrawerOpen] = useState<boolean>(false);
  const [selectedRoom, setSelectedRoom] = useState<RoomCluster>(activeRoomClusters[0]);
  const [activeInspectorRun, setActiveInspectorRun] = useState<ProbeRun | null>(null);

  const handleOpenInspectorForRun = (run: ProbeRun) => {
    setActiveInspectorRun(run);
    setIsRawDrawerOpen(true);
  };

  return (
    <div className="min-h-screen flex flex-col font-sans bg-[#050A12] text-[#EAF2F7] selection:bg-[#36D7E7]/25 selection:text-[#36D7E7]">
      {/* Top Navigation Bar */}
      <Navbar onOpenRawEvents={() => setIsRawDrawerOpen(true)} />

      {/* Main Narrative - Centerpiece: Giant Technocore Agent City */}
      <main className="flex-grow">
        {/* 1. GIANT AGENT CITY HERO VIEWPORT */}
        <section id="signal-map" className="relative w-full px-2 sm:px-4 lg:px-6 pt-3 pb-6">
          <div className="w-full mx-auto">
            {/* Minimal Header Tagline */}
            <div className="flex flex-wrap items-center justify-between gap-2 px-2 mb-2.5">
              <div className="flex items-center space-x-2">
                <span className="text-[11px] font-mono uppercase tracking-widest font-bold text-[#36D7E7]">
                  Autonomous Agent Metropolis
                </span>
                <span className="hidden sm:inline text-xs text-[#6F8096]">·</span>
                <span className="hidden sm:inline text-xs font-mono text-[#95A4B8]">
                  Procedural 3D WebGL Digital Civilization
                </span>
              </div>
              <div className="text-[11px] font-mono text-[#6F8096]">
                Click towers to inspect · Enter office interiors · Drag to orbit · Press Fullscreen to expand
              </div>
            </div>

            {/* Giant 3D Canvas */}
            <SignalMap3D
              selectedRoomId={selectedRoom?.id}
              onSelectRoom={(room) => setSelectedRoom(room)}
            />
          </div>
        </section>

        {/* 2. OBSERVATORY: LIVE PULSE DASHBOARD */}
        <LivePulseDashboard
          onOpenInspectorForRun={handleOpenInspectorForRun}
        />

        {/* 3. PROTOCOL FOUNDATION: WHAT IS TECHNOCORE? */}
        <ProtocolExplainer />

        {/* 4. PROBE V1 EXPERIMENT: THE 3 ARMS */}
        <ProbeArmsSection />

        {/* 5. INSIGHT STUDIO */}
        <InsightStudio />

        {/* 6. SCIENTIFIC METHODOLOGY */}
        <MethodologySection />

        {/* 7. BUILDER SHOWCASE: ASAD LEE */}
        <BuilderSection />
      </main>

      {/* Footer */}
      <Footer />

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
