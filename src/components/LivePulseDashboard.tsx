import React, { useState } from 'react';
import type { ProbeRun, ProbeArm, ObservedMessage } from '../types/probe';
import { useData } from '../context/DataContext';
import { 
  ShieldCheck, Terminal, Copy, Check, Eye, 
  CheckCircle2, Radio, RefreshCw 
} from 'lucide-react';

interface LivePulseDashboardProps {
  onOpenInspectorForRun?: (run: ProbeRun) => void;
}

export const LivePulseDashboard: React.FC<LivePulseDashboardProps> = ({ onOpenInspectorForRun }) => {
  const { observerHealth, activeRuns, activeStats, activeArmSummaries, isLiveLoading, refreshLiveData } = useData();

  const [selectedRunId, setSelectedRunId] = useState<string>(activeRuns[0]?.id || '');
  const [armFilter, setArmFilter] = useState<ProbeArm | 'all'>('all');
  const [hoveredMessage, setHoveredMessage] = useState<ObservedMessage | null>(null);
  const [copiedDid, setCopiedDid] = useState<string | null>(null);

  const filteredRuns = activeRuns.filter(r => armFilter === 'all' || r.arm === armFilter);
  const currentRun = activeRuns.find(r => r.id === selectedRunId) || activeRuns[0] || null;

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedDid(id);
    setTimeout(() => setCopiedDid(null), 2000);
  };

  const getArmColor = (arm: ProbeArm) => {
    switch (arm) {
      case 'question': return '#F0A824';
      case 'offer': return '#A855F7';
      case 'statement': return '#36D7E7';
      default: return '#36D7E7';
    }
  };

  return (
    <section id="pulse-dashboard" className="py-20 border-b border-[#1B2A3D] bg-[#050A12] relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="inline-flex items-center space-x-2 text-xs font-mono text-[#36D7E7] uppercase tracking-widest mb-3">
              <span className="w-2 h-2 rounded-full bg-[#2FD27F] animate-ping" />
              <span>Live Observational Stream</span>
            </div>
            <h2 className="text-3xl sm:text-5xl font-heading font-extrabold text-white tracking-tight">
              Live Pulse Dashboard
            </h2>
            <p className="mt-4 text-base sm:text-lg text-[#95A4B8] max-w-2xl leading-relaxed">
              Inspect subsequent room activity captured within the strict 120-second window following probe posts.
            </p>
          </div>

          {/* Filter Bar */}
          <div className="flex items-center space-x-3">
            <div className="flex items-center p-1.5 rounded-xl bg-[#0B1320] border border-[#1B2A3D]">
              {(['all', 'question', 'offer', 'statement'] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setArmFilter(filter)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono capitalize transition-all ${
                    armFilter === filter
                      ? 'bg-[#101A2A] text-white font-semibold border border-[#36D7E7]/40 shadow-sm'
                      : 'text-[#6F8096] hover:text-[#95A4B8]'
                  }`}
                >
                  {filter === 'all' ? 'All Arms' : filter}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* DATA STATUS BANNER: Real Technocore Ingestion */}
        <div 
          className="mt-8 p-4 rounded-xl border text-xs font-mono flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg transition-all"
          style={{
            backgroundColor: 'rgba(47, 210, 127, 0.08)',
            borderColor: 'rgba(47, 210, 127, 0.4)'
          }}
        >
          <div className="flex items-center space-x-3">
            <CheckCircle2 className="w-5 h-5 text-[#2FD27F] flex-shrink-0" />
            <div>
              <span className="font-bold text-[#2FD27F]">
                LIVE TECHNOCORE INGESTION ACTIVE:
              </span>{' '}
              <span className="text-[#EAF2F7]">
                Continuous stream from public Technocore rooms (<code className="text-[#36D7E7]">https://technocore.chat</code>) since {activeStats.observationStartTime}.
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-2 flex-shrink-0">
            <button
              onClick={() => refreshLiveData()}
              disabled={isLiveLoading}
              className="flex items-center space-x-1 px-3 py-1.5 rounded bg-[#2FD27F]/20 hover:bg-[#2FD27F]/30 text-[#2FD27F] font-bold transition-colors border border-[#2FD27F]/40 text-[11px]"
            >
              <RefreshCw className={`w-3 h-3 ${isLiveLoading ? 'animate-spin' : ''}`} />
              <span>Refresh Ingestion</span>
            </button>
          </div>
        </div>

        {/* Dashboard Content: Check if we have active runs or show Empty State for Live */}
        {activeRuns.length === 0 ? (
          /* LIVE OBSERVATION EMPTY STATE (Clean, honest, informative) */
          <div className="mt-8 p-8 rounded-2xl bg-[#0B1320] border border-[#1B2A3D] text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-[#101A2A] border border-[#36D7E7]/30 flex items-center justify-center mx-auto text-[#36D7E7]">
              <Radio className="w-6 h-6 animate-pulse" />
            </div>

            <div className="max-w-xl mx-auto space-y-2">
              <h3 className="font-heading font-bold text-2xl text-white">
                Actively Listening for Live Probes
              </h3>
              <p className="text-xs font-mono text-[#95A4B8] leading-relaxed">
                Technocore public rooms are ephemeral and messages rotate rapidly.
                In the current observation buffer (<strong className="text-white">{activeStats.ephemeralMessageDepth} messages</strong> sampled across <strong className="text-white">{activeStats.activeRoomsMonitored} public rooms</strong>), zero active <code className="text-[#36D7E7]">probe v1</code> posts were detected.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-lg mx-auto pt-2 text-left font-mono text-xs">
              <div className="p-3 rounded-lg bg-[#050A12] border border-[#1B2A3D]">
                <span className="text-[#6F8096] text-[10px] uppercase block">Observer Status</span>
                <span className={`text-xs font-bold font-mono block mt-0.5 ${
                  observerHealth === 'LIVE' ? 'text-[#2FD27F]' :
                  observerHealth === 'RATE LIMITED' ? 'text-[#F0A824]' : 'text-[#36D7E7]'
                }`}>
                  {observerHealth}
                </span>
              </div>
              <div className="p-3 rounded-lg bg-[#050A12] border border-[#1B2A3D]">
                <span className="text-[#6F8096] text-[10px] uppercase block">Observed Index Rooms</span>
                <span className="text-[#36D7E7] text-sm font-bold block mt-0.5">{activeStats.totalObservedRooms}</span>
              </div>
              <div className="p-3 rounded-lg bg-[#050A12] border border-[#1B2A3D]">
                <span className="text-[#6F8096] text-[10px] uppercase block">Signed DIDs Seen</span>
                <span className="text-[#2FD27F] text-sm font-bold block mt-0.5">{activeStats.uniqueSignedIdentities}</span>
              </div>
            </div>

            <div className="pt-4">
              <button
                onClick={() => refreshLiveData()}
                disabled={isLiveLoading}
                className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-[#36D7E7] text-[#050A12] font-mono text-xs font-bold hover:bg-[#36D7E7]/90 transition-all shadow-lg shadow-[#36D7E7]/20"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLiveLoading ? 'animate-spin' : ''}`} />
                <span>Refresh Live Ingestion</span>
              </button>
            </div>
          </div>
        ) : (
          /* DASHBOARD GRID: Left runs selector, Right 120s Timeline + Metrics */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-8 items-start">
            
            {/* Left: Probe Runs Selector List */}
            <div className="lg:col-span-4 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-[#1B2A3D]">
                <span className="text-xs font-mono text-[#6F8096] uppercase tracking-wider">
                  Recorded Probe Runs ({filteredRuns.length})
                </span>
                <span className="text-[10px] font-mono text-[#2FD27F]">
                  Live Ingestion
                </span>
              </div>

              <div className="space-y-2.5 max-h-[640px] overflow-y-auto pr-1">
                {filteredRuns.map((run) => {
                  const isSelected = run.id === currentRun?.id;
                  const armColor = getArmColor(run.arm);

                  return (
                    <div
                      key={run.id}
                      onClick={() => setSelectedRunId(run.id)}
                      className={`p-4 rounded-xl cursor-pointer transition-all border text-left ${
                        isSelected
                          ? 'bg-[#101A2A] border-[#36D7E7] shadow-xl shadow-[#36D7E7]/5'
                          : 'bg-[#0B1320] border-[#1B2A3D] hover:border-[#95A4B8]/30 hover:bg-[#0B1320]/80'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="font-mono text-xs font-bold text-white">
                            Run #{run.sequence}
                          </span>
                          <span
                            className="px-2 py-0.5 rounded text-[10px] font-mono uppercase font-semibold"
                            style={{
                              backgroundColor: `${armColor}20`,
                              color: armColor,
                              border: `1px solid ${armColor}40`
                            }}
                          >
                            {run.arm}
                          </span>
                        </div>
                        <span className="text-[11px] font-mono text-[#6F8096]">
                          {run.metrics.firstResponseLatencySeconds}s latency
                        </span>
                      </div>

                      <div className="font-heading font-medium text-xs text-[#EAF2F7] mt-2 truncate">
                        {run.roomName}
                      </div>

                      <p className="font-mono text-[11px] text-[#95A4B8] mt-1 line-clamp-1">
                        {run.probePayload}
                      </p>

                      <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-[#1B2A3D] text-[11px] font-mono text-[#6F8096]">
                        <span>{run.metrics.messagesInWindow} messages in 120s</span>
                        <span className="text-[#2FD27F]">{run.metrics.uniqueDids} signed DIDs</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right: Active Run 120s Window Timeline & Deep Dive */}
            {currentRun && (
              <div className="lg:col-span-8 space-y-6">
                
                {/* Active Run Header Card */}
                <div className="p-6 rounded-2xl bg-[#0B1320] border border-[#1B2A3D] shadow-2xl">
                  <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-[#1B2A3D]">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: getArmColor(currentRun.arm) }}
                        />
                        <h3 className="font-heading font-bold text-xl text-white">
                          Probe Run #{currentRun.sequence} · {currentRun.roomName}
                        </h3>
                      </div>
                      <div className="flex items-center space-x-2 font-mono text-xs text-[#95A4B8] mt-1.5">
                        <span>Target Category: <strong className="text-white capitalize">{currentRun.roomCategory}</strong></span>
                        <span>·</span>
                        <span>Dispatched: <strong className="text-white">{currentRun.isoDate}</strong></span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      {onOpenInspectorForRun && (
                        <button
                          onClick={() => onOpenInspectorForRun(currentRun)}
                          className="flex items-center space-x-1.5 px-3 py-1 rounded-lg bg-[#101A2A] border border-[#1B2A3D] hover:border-[#36D7E7]/40 text-[#95A4B8] hover:text-[#36D7E7] font-mono text-xs transition-colors"
                          title="Inspect Raw Event Stream"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Raw Stream</span>
                        </button>
                      )}
                      <span className="px-3 py-1 rounded-lg bg-[#101A2A] border border-[#36D7E7]/30 text-[#36D7E7] font-mono text-xs">
                        120s Window Active
                      </span>
                    </div>
                  </div>

                  {/* Probe Payload Code Banner */}
                  <div className="mt-4 p-3 rounded-xl bg-[#050A12] border border-[#1B2A3D] flex items-center justify-between gap-4">
                    <div className="flex items-center space-x-2 text-xs font-mono truncate">
                      <Terminal className="w-4 h-4 text-[#36D7E7] flex-shrink-0" />
                      <span className="text-[#EAF2F7] truncate">{currentRun.probePayload}</span>
                    </div>
                    <button
                      onClick={() => handleCopy(currentRun.probePayload, 'payload')}
                      className="p-1 text-[#95A4B8] hover:text-white rounded transition-colors flex-shrink-0"
                      title="Copy Payload"
                    >
                      {copiedDid === 'payload' ? <Check className="w-3.5 h-3.5 text-[#2FD27F]" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  {/* 4 Quick Metrics for this Run */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                    <div className="p-3 rounded-xl bg-[#101A2A] border border-[#1B2A3D]">
                      <span className="text-[10px] font-mono text-[#6F8096] uppercase">First Subsequent Message</span>
                      <div className="text-lg font-bold font-mono text-[#F0A824] mt-0.5">
                        +{currentRun.metrics.firstResponseLatencySeconds}s
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-[#101A2A] border border-[#1B2A3D]">
                      <span className="text-[10px] font-mono text-[#6F8096] uppercase">Median Subsequent Latency</span>
                      <div className="text-lg font-bold font-mono text-white mt-0.5">
                        {currentRun.metrics.medianLatencySeconds}s
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-[#101A2A] border border-[#1B2A3D]">
                      <div className="flex items-center justify-between text-[10px] font-mono text-[#6F8096] uppercase">
                        <span>Activity Baseline</span>
                        <span className="text-[9px] text-[#4DA3FF] px-1 rounded bg-[#4DA3FF]/10 border border-[#4DA3FF]/20">HEURISTIC</span>
                      </div>
                      <div className="text-lg font-bold font-mono text-[#2FD27F] mt-0.5">
                        {currentRun.metrics.baselineRatio}x normal
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-[#101A2A] border border-[#1B2A3D]">
                      <div className="flex items-center justify-between text-[10px] font-mono text-[#6F8096] uppercase">
                        <span>Intensity Score</span>
                        <span className="text-[9px] text-[#36D7E7] px-1 rounded bg-[#36D7E7]/10 border border-[#36D7E7]/20">VISUAL SCORE</span>
                      </div>
                      <div className="text-lg font-bold font-mono text-[#36D7E7] mt-0.5">
                        {currentRun.metrics.intensityScore} / 100
                      </div>
                    </div>
                  </div>
                </div>

                {/* 120-Second Response Window Timeline Interactive Chart */}
                <div className="p-6 rounded-2xl bg-[#0B1320] border border-[#1B2A3D] shadow-2xl">
                  <div className="flex items-center justify-between pb-4 border-b border-[#1B2A3D]">
                    <div>
                      <h4 className="font-heading font-bold text-lg text-white">
                        120-Second Observation Window Visualization
                      </h4>
                      <p className="text-xs font-mono text-[#95A4B8] mt-0.5">
                        Plotted along post-probe time axis (0s to 120s cutoff).
                      </p>
                    </div>
                    <div className="flex items-center space-x-2 text-[11px] font-mono text-[#6F8096]">
                      <span className="w-2 h-2 rounded-full bg-[#36D7E7]" />
                      <span>Probe Drop</span>
                      <span className="w-2 h-2 rounded-full bg-[#2FD27F] ml-2" />
                      <span>Observed Message</span>
                    </div>
                  </div>

                  {/* Interactive Timeline Rail */}
                  <div className="mt-8 relative py-8 px-4 bg-[#050A12] rounded-xl border border-[#1B2A3D] overflow-x-auto">
                    
                    {/* Baseline Time Axis Line */}
                    <div className="relative h-2 w-full bg-[#101A2A] rounded-full border border-[#1B2A3D]">
                      <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-[#36D7E7]/30 to-transparent w-full rounded-full" />
                    </div>

                    {/* Time Axis Ticks */}
                    <div className="flex justify-between text-[10px] font-mono text-[#6F8096] mt-3">
                      <span>0s (Probe Drop)</span>
                      <span>30s</span>
                      <span>60s (Midpoint)</span>
                      <span>90s</span>
                      <span className="text-[#F0A824]">120s (Cutoff)</span>
                    </div>

                    {/* Probe Origin Point (t = 0s) */}
                    <div
                      className="absolute top-4 -ml-3 flex flex-col items-center group cursor-pointer"
                      style={{ left: '16px' }}
                    >
                      <div className="w-6 h-6 rounded-full bg-[#36D7E7] border-2 border-[#050A12] flex items-center justify-center text-[#050A12] font-bold text-[10px] shadow-lg shadow-[#36D7E7]/40 animate-pulse">
                        P
                      </div>
                      <span className="text-[10px] font-mono text-[#36D7E7] font-bold mt-1">
                        t=0s
                      </span>
                    </div>

                    {/* Plotted Observed Messages */}
                    {currentRun.observedMessages.map((msg, idx) => {
                      const leftPercentage = Math.min(94, Math.max(6, (msg.deltaSeconds / 120) * 94));
                      const isHovered = hoveredMessage?.id === msg.id;

                      return (
                        <div
                          key={msg.id}
                          onMouseEnter={() => setHoveredMessage(msg)}
                          className="absolute top-3 -ml-3 flex flex-col items-center cursor-pointer group z-20"
                          style={{ left: `${leftPercentage}%` }}
                        >
                          <div
                            className={`w-7 h-7 rounded-full border-2 border-[#050A12] flex items-center justify-center text-xs font-mono transition-transform ${
                              isHovered
                                ? 'scale-125 bg-white text-[#050A12] shadow-xl shadow-[#2FD27F]/50 ring-2 ring-[#2FD27F]'
                                : 'bg-[#2FD27F] text-[#050A12] hover:scale-110 shadow-md shadow-[#2FD27F]/30'
                            }`}
                          >
                            {idx + 1}
                          </div>
                          <span className="text-[10px] font-mono text-[#2FD27F] font-semibold mt-1">
                            +{msg.deltaSeconds}s
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Message Details Preview Card */}
                  <div className="mt-6 p-4 rounded-xl bg-[#101A2A] border border-[#1B2A3D]">
                    {hoveredMessage ? (
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center space-x-2">
                            <ShieldCheck className="w-4 h-4 text-[#2FD27F]" />
                            <span className="font-heading font-bold text-sm text-white">
                              {hoveredMessage.senderAlias || 'Anonymous Agent'}
                            </span>
                            <span className="text-xs font-mono text-[#36D7E7]">
                              (+{hoveredMessage.deltaSeconds}s following probe)
                            </span>
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono uppercase bg-[#2FD27F]/20 text-[#2FD27F] font-semibold">
                              {hoveredMessage.replyType || 'subsequent activity'}
                            </span>
                          </div>

                          <div className="flex items-center space-x-2 font-mono text-[11px] text-[#95A4B8]">
                            <span>DID: {hoveredMessage.senderDid.slice(0, 16)}...</span>
                            <button
                              onClick={() => handleCopy(hoveredMessage.senderDid, hoveredMessage.id)}
                              className="p-1 hover:text-white transition-colors"
                              title="Copy DID"
                            >
                              {copiedDid === hoveredMessage.id ? <Check className="w-3 h-3 text-[#2FD27F]" /> : <Copy className="w-3 h-3" />}
                            </button>
                          </div>
                        </div>

                        <p className="text-xs font-mono text-[#EAF2F7] bg-[#050A12] p-3 rounded-lg border border-[#1B2A3D] leading-relaxed">
                          "{hoveredMessage.content}"
                        </p>

                        <div className="flex items-center justify-between text-[10px] font-mono text-[#6F8096]">
                          <span>Signature Digest: {hoveredMessage.signaturePreview}</span>
                          <span className="text-[#2FD27F]">✓ Cryptographically Verified</span>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-3 text-xs font-mono text-[#95A4B8]">
                        Hover over any numbered point above to inspect the message content, verified DID, and timing delta.
                      </div>
                    )}
                  </div>

                </div>

                {/* Arm Comparison Bar Matrix (Accurately Labeled) */}
                <div className="p-6 rounded-2xl bg-[#0B1320] border border-[#1B2A3D] shadow-2xl">
                  <div className="flex items-center justify-between pb-4 border-b border-[#1B2A3D]">
                    <div>
                      <h4 className="font-heading font-bold text-lg text-white">
                        Live Arm Activity Comparison
                      </h4>
                      <p className="text-xs font-mono text-[#95A4B8] mt-0.5">
                        Aggregated values from live observed probe runs in current session.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4 mt-6">
                    {activeArmSummaries.map((arm) => (
                      <div key={arm.arm} className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs font-mono">
                          <div className="flex items-center space-x-2">
                            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: arm.color }} />
                            <span className="text-white font-bold">{arm.label}</span>
                          </div>
                          <div className="space-x-4 text-[#95A4B8]">
                            <span>Median Latency: <strong className="text-white">{arm.medianLatency > 0 ? `${arm.medianLatency}s` : 'N/A'}</strong></span>
                            <span>Avg msgs: <strong className="text-white">{arm.avgMessagesInWindow}</strong></span>
                            <span style={{ color: arm.color }}>
                              {arm.responseRate}% 120s window activity rate
                            </span>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="h-3 w-full bg-[#101A2A] rounded-full overflow-hidden border border-[#1B2A3D]">
                          <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{
                              width: `${Math.max(5, (1 - arm.medianLatency / 35) * 100)}%`,
                              backgroundColor: arm.color
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            )}

          </div>
        )}

      </div>
    </section>
  );
};
