import React from 'react';
import { Hero3DCanvas } from './Hero3DCanvas';
import { useData } from '../context/DataContext';
import { ArrowRight, Compass, ShieldCheck, Activity, Terminal, Sparkles, AlertCircle, CheckCircle2 } from 'lucide-react';

interface HeroSectionProps {
  onExploreSignals: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ onExploreSignals }) => {
  const { dataMode, activeStats } = useData();
  const isDemo = dataMode === 'DEMO';

  return (
    <section className="relative min-h-[92vh] flex items-center justify-center overflow-hidden border-b border-[#1B2A3D] bg-grid-pattern pt-8 pb-16">
      
      {/* 3D Visualizer Background */}
      <div className="absolute inset-0 z-0">
        <Hero3DCanvas />
      </div>

      {/* Main Content Container */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center flex flex-col items-center">
        
        {/* Subtle Author Credit & Experiment Tag */}
        <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-[#0B1320]/90 border border-[#36D7E7]/30 backdrop-blur-md mb-6 shadow-lg shadow-[#36D7E7]/10 animate-fade-in">
          <span className={`w-2 h-2 rounded-full ${isDemo ? 'bg-[#F0A824]' : 'bg-[#2FD27F]'} animate-ping`} />
          <span className="text-xs font-mono font-medium text-[#36D7E7]">
            probe v1 observatory
          </span>
          <span className="text-xs text-[#6F8096]">·</span>
          <span className="text-xs font-mono text-[#95A4B8]">
            Community-built by <span className="text-white font-semibold">Asad Lee</span>
          </span>
        </div>

        {/* DATA INTEGRITY NOTICE: Visible disclaimer right below title/header */}
        <div className="mb-6 w-full max-w-2xl">
          {isDemo ? (
            <div className="flex items-center justify-center space-x-2 px-4 py-2 rounded-xl bg-[#F0A824]/10 border border-[#F0A824]/40 text-[#F0A824] text-xs font-mono shadow-lg">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>
                <strong>Demo Dataset:</strong> Illustrative benchmark data, not live Technocore experiment results.
              </span>
            </div>
          ) : (
            <div className="flex items-center justify-center space-x-2 px-4 py-2 rounded-xl bg-[#2FD27F]/10 border border-[#2FD27F]/40 text-[#2FD27F] text-xs font-mono shadow-lg">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>
                <strong>Live Public Ingestion:</strong> Connected to Technocore public endpoints. Observation active.
              </span>
            </div>
          )}
        </div>

        {/* Powerful Hero Headline */}
        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-heading font-extrabold tracking-tight text-white max-w-4xl leading-[1.08]">
          Visualizing agent communication{' '}
          <span className="bg-gradient-to-r from-[#36D7E7] via-[#4DA3FF] to-[#A855F7] bg-clip-text text-transparent">
            in the wild.
          </span>
        </h1>

        {/* Narrative Description */}
        <p className="mt-6 text-base sm:text-xl text-[#95A4B8] max-w-2xl font-normal leading-relaxed">
          A public data observatory measuring subsequent peer activity following labelled{' '}
          <code className="text-[#36D7E7] bg-[#101A2A] px-2 py-0.5 rounded text-sm font-mono border border-[#1B2A3D]">
            probe v1
          </code>{' '}
          broadcasts across HTTP-native, zero-auth Technocore rooms.
        </p>

        {/* Dual Call-to-Actions */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <button
            onClick={onExploreSignals}
            className="flex items-center space-x-2 px-6 py-3.5 rounded-xl font-mono text-sm font-semibold bg-[#36D7E7] text-[#050A12] hover:bg-[#36D7E7]/90 active:scale-95 transition-all shadow-xl shadow-[#36D7E7]/25"
          >
            <span>Explore Signals</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <a
            href="#signal-map"
            className="flex items-center space-x-2 px-6 py-3.5 rounded-xl font-mono text-sm font-medium bg-[#101A2A]/90 text-white border border-[#1B2A3D] hover:border-[#36D7E7]/40 hover:bg-[#101A2A] transition-all backdrop-blur-md"
          >
            <Compass className="w-4 h-4 text-[#4DA3FF]" />
            <span>Launch 3D Signal Map</span>
          </a>

          <a
            href="#methodology"
            className="flex items-center space-x-2 px-5 py-3.5 rounded-xl font-mono text-xs text-[#95A4B8] hover:text-[#36D7E7] transition-all"
          >
            <span>See Methodology & Caveats</span>
          </a>
        </div>

        {/* Key KPI Stats Grid (Directly tied to Global Data State) */}
        <div className="mt-14 w-full max-w-4xl grid grid-cols-2 sm:grid-cols-4 gap-3.5 sm:gap-4 text-left">
          
          <div className="p-4 rounded-xl bg-[#0B1320]/80 backdrop-blur-md border border-[#1B2A3D] hover:border-[#36D7E7]/30 transition-colors">
            <div className="flex items-center justify-between text-[#6F8096] text-xs font-mono">
              <span>{isDemo ? 'Probes Fired' : 'Probes Captured'}</span>
              <Activity className="w-3.5 h-3.5 text-[#36D7E7]" />
            </div>
            <div className="mt-2 text-2xl sm:text-3xl font-bold font-mono text-white">
              {activeStats.totalProbesFired}
            </div>
            <div className="text-[11px] font-mono text-[#95A4B8] mt-1">
              {isDemo ? 'Illustrative benchmark' : 'Current live buffer'}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#0B1320]/80 backdrop-blur-md border border-[#1B2A3D] hover:border-[#36D7E7]/30 transition-colors">
            <div className="flex items-center justify-between text-[#6F8096] text-xs font-mono">
              <span>Median Latency</span>
              <Terminal className="w-3.5 h-3.5 text-[#F0A824]" />
            </div>
            <div className="mt-2 text-2xl sm:text-3xl font-bold font-mono text-[#F0A824]">
              {activeStats.overallMedianLatency !== null ? `${activeStats.overallMedianLatency}s` : 'Observing'}
            </div>
            <div className="text-[11px] font-mono text-[#95A4B8] mt-1">
              {isDemo ? 'Demo response window' : 'Subsequent message gap'}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#0B1320]/80 backdrop-blur-md border border-[#1B2A3D] hover:border-[#36D7E7]/30 transition-colors">
            <div className="flex items-center justify-between text-[#6F8096] text-xs font-mono">
              <span>Signed Identities</span>
              <ShieldCheck className="w-3.5 h-3.5 text-[#2FD27F]" />
            </div>
            <div className="mt-2 text-2xl sm:text-3xl font-bold font-mono text-[#2FD27F]">
              {activeStats.uniqueSignedIdentities > 0 ? `${activeStats.uniqueSignedIdentities}+` : '0'}
            </div>
            <div className="text-[11px] font-mono text-[#95A4B8] mt-1">
              {isDemo ? 'Simulated DID keys' : 'Live observed DIDs'}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#0B1320]/80 backdrop-blur-md border border-[#1B2A3D] hover:border-[#36D7E7]/30 transition-colors">
            <div className="flex items-center justify-between text-[#6F8096] text-xs font-mono">
              <span>Active Rooms</span>
              <Sparkles className="w-3.5 h-3.5 text-[#A855F7]" />
            </div>
            <div className="mt-2 text-2xl sm:text-3xl font-bold font-mono text-white">
              {activeStats.activeRoomsMonitored}
            </div>
            <div className="text-[11px] font-mono text-[#95A4B8] mt-1">
              {isDemo ? '6 mock clusters' : 'Sampled public rooms'}
            </div>
          </div>

        </div>

      </div>
    </section>
  );
};
