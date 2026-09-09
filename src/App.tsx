import { useState } from 'react';
import { DataProvider, useData } from './context/DataContext';
import { Navbar } from './components/Navbar';
import { HeroSection } from './components/HeroSection';
import { ProtocolExplainer } from './components/ProtocolExplainer';
import { ProbeArmsSection } from './components/ProbeArmsSection';
import { SignalMap3D } from './components/SignalMap3D';
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

  const handleExploreSignals = () => {
    const el = document.getElementById('pulse-dashboard');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleOpenInspectorForRun = (run: ProbeRun) => {
    setActiveInspectorRun(run);
    setIsRawDrawerOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#050A12] text-[#EAF2F7] flex flex-col font-sans selection:bg-[#36D7E7]/25 selection:text-[#36D7E7]">
      {/* Top Protocol Header */}
      <Navbar
        onOpenRawEvents={() => setIsRawDrawerOpen(true)}
      />

      {/* Main Narrative Sections */}
      <main className="flex-grow">
        {/* 1. Hero 3D Observatory */}
        <HeroSection onExploreSignals={handleExploreSignals} />

        {/* 2. What is Technocore & FLOP Composable Pipeline */}
        <ProtocolExplainer />

        {/* 3. Probe v1 Experiment: The 3 Arms */}
        <ProbeArmsSection />

        {/* 4. Signature 3D Signal Map */}
        <section id="signal-map" className="py-20 border-b border-[#1B2A3D] bg-[#050A12]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mb-10">
              <div className="inline-flex items-center space-x-2 text-xs font-mono text-[#36D7E7] uppercase tracking-widest mb-3">
                <span className="w-2 h-2 rounded-full bg-[#36D7E7]" />
                <span>Signature Spatial Experience</span>
              </div>
              <h2 className="text-3xl sm:text-5xl font-heading font-extrabold text-white tracking-tight">
                3D Signal Map & Room Constellation
              </h2>
              <p className="mt-4 text-base sm:text-lg text-[#95A4B8] leading-relaxed">
                Interact with room clusters in 3D WebGL space. Click any room node to inspect active agent counts,
                simulate a probe drop with expanding concentric light waves, or orbit the topology.
              </p>
            </div>

            <SignalMap3D
              selectedRoomId={selectedRoom?.id}
              onSelectRoom={(room) => setSelectedRoom(room)}
            />
          </div>
        </section>

        {/* 5. Live Pulse Observability Dashboard */}
        <LivePulseDashboard
          onOpenInspectorForRun={handleOpenInspectorForRun}
        />

        {/* 6. Insight Studio for CT & Protocol Researchers */}
        <InsightStudio />

        {/* 7. Methodology & 120s Scientific Limits */}
        <MethodologySection />

        {/* 8. About Asad Lee & Ecosystem Tooling */}
        <BuilderSection />
      </main>

      {/* Footer with Disclaimer and Portfolio Links */}
      <Footer />

      {/* Slide-Out Raw Event & JSON Schema Drawer */}
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
