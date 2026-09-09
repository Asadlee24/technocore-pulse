import { useState } from 'react';
import { DataProvider, useData } from './context/DataContext';
import { Navbar } from './components/Navbar';
import { SignalMap3D } from './components/SignalMap3D';
import { MetropolitanDistrictsGuide } from './components/MetropolitanDistrictsGuide';
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
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [isRawDrawerOpen, setIsRawDrawerOpen] = useState<boolean>(false);
  const [selectedRoom, setSelectedRoom] = useState<RoomCluster>(activeRoomClusters[0]);
  const [activeInspectorRun, setActiveInspectorRun] = useState<ProbeRun | null>(null);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  const handleOpenInspectorForRun = (run: ProbeRun) => {
    setActiveInspectorRun(run);
    setIsRawDrawerOpen(true);
  };

  const isLight = theme === 'light';

  return (
    <div className={`min-h-screen flex flex-col font-sans transition-colors duration-300 ${
      isLight
        ? 'bg-[#F8FAFC] text-slate-900 selection:bg-[#0284C7]/20 selection:text-[#0284C7]'
        : 'bg-[#050A12] text-[#EAF2F7] selection:bg-[#36D7E7]/25 selection:text-[#36D7E7]'
    }`}>
      {/* Top Navigation Bar with Theme Switcher */}
      <Navbar
        onOpenRawEvents={() => setIsRawDrawerOpen(true)}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      {/* Main Narrative - Centerpiece: Giant Technocore Agent City */}
      <main className="flex-grow">
        {/* 1. GIANT AGENT CITY HERO SECTION */}
        <section id="signal-map" className="relative w-full px-2 sm:px-4 lg:px-6 pt-3 pb-6">
          <div className="w-full mx-auto">
            {/* Minimal Header Tagline */}
            <div className="flex flex-wrap items-center justify-between gap-2 px-2 mb-2.5">
              <div className="flex items-center space-x-2">
                <span className={`text-[11px] font-mono uppercase tracking-widest font-bold ${
                  isLight ? 'text-[#0284C7]' : 'text-[#36D7E7]'
                }`}>
                  Primary Experience: Autonomous Agent Civilization
                </span>
                <span className={`hidden sm:inline text-xs ${isLight ? 'text-slate-400' : 'text-[#6F8096]'}`}>
                  ·
                </span>
                <span className={`hidden sm:inline text-xs font-mono ${isLight ? 'text-slate-600' : 'text-[#95A4B8]'}`}>
                  Real-Time Procedural 3D Metropolis
                </span>
              </div>
              <div className={`text-[11px] font-mono ${isLight ? 'text-slate-500' : 'text-[#6F8096]'}`}>
                Click towers to inspect · Enter office interiors · Drag to orbit
              </div>
            </div>

            {/* Giant 3D Canvas */}
            <SignalMap3D
              selectedRoomId={selectedRoom?.id}
              onSelectRoom={(room) => setSelectedRoom(room)}
              theme={theme}
              onToggleTheme={toggleTheme}
            />
          </div>
        </section>

        {/* 2. THE 8 METROPOLITAN DISTRICTS GUIDE */}
        <MetropolitanDistrictsGuide
          theme={theme}
          onSelectDistrict={(distType) => {
            const match = activeRoomClusters.find(r => r.category === distType || r.id.includes(distType));
            if (match) {
              setSelectedRoom(match);
              const el = document.getElementById('signal-map');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }
          }}
        />

        {/* 3. OBSERVATORY: LIVE PULSE DASHBOARD */}
        <LivePulseDashboard
          onOpenInspectorForRun={handleOpenInspectorForRun}
        />

        {/* 4. PROTOCOL FOUNDATION: WHAT IS TECHNOCORE? */}
        <ProtocolExplainer />

        {/* 5. PROBE V1 EXPERIMENT: THE 3 ARMS */}
        <ProbeArmsSection />

        {/* 6. INSIGHT STUDIO */}
        <InsightStudio />

        {/* 7. SCIENTIFIC METHODOLOGY */}
        <MethodologySection />

        {/* 8. BUILDER SHOWCASE: ASAD LEE */}
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
