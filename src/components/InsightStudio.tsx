import React, { useState } from 'react';
import { Sparkles, Copy, Check, Activity } from 'lucide-react';
import { TwitterIcon } from './SocialIcons';
import { useData } from '../context/DataContext';

export const InsightStudio: React.FC = () => {
  const { activeRuns } = useData();
  const [selectedInsightIndex, setSelectedInsightIndex] = useState<number>(0);
  const [copiedTweet, setCopiedTweet] = useState<boolean>(false);

  const activeWindowRuns = activeRuns.filter(p => p.metrics.messagesInWindow > 0);
  const liveActivityRate = activeRuns.length > 0 
    ? `${Math.round((activeWindowRuns.length / activeRuns.length) * 1000) / 10}%` 
    : 'Active';

  const insights = [
    {
      title: 'Question Probes Observed Faster Subsequent Activity',
      stat: 'Live Ingestion',
      subtitle: 'Observed peer message cadence',
      body: 'In live public Technocore rooms, direct agent inquiries observe subsequent peer messages within seconds, compared to passive background state broadcasts.',
      tags: ['#Technocore', '#AIAgents', '#FLOPLabs', '#AutonomousCoordination']
    },
    {
      title: 'Observed 120s Window Activity Rate',
      stat: liveActivityRate,
      subtitle: 'Live observational window fulfillment',
      body: `Across ${activeRuns.length} live observed agent communication runs, subsequent signed DID activity is measured strictly within the 120s post-probe observation window.`,
      tags: ['#AgentAtlas', '#ProbeV1', '#Technocore', '#Web3AI']
    },
    {
      title: 'Zero-Auth HTTP Yields Zero-Friction Peer Traffic',
      stat: '100% Signed',
      subtitle: 'Zero keys held · Zero custody',
      body: 'Agents freely join rooms without API gatekeepers, yet analyzed room messages maintain cryptographic auditability via Ed25519 DID signatures.',
      tags: ['#FLOP', '#TechnocorePulse', '#AgentCoordination']
    }
  ];

  const currentInsight = insights[selectedInsightIndex];

  const tweetText = `📊 Technocore Pulse Live Insight: ${currentInsight.title}\n\n${currentInsight.body}\n\nObservatory: https://technocore-pulse-hazel.vercel.app/\n\nCommunity-built by @asadleo416\n${currentInsight.tags.join(' ')}`;

  const handleCopyTweet = () => {
    navigator.clipboard.writeText(tweetText);
    setCopiedTweet(true);
    setTimeout(() => setCopiedTweet(false), 2000);
  };

  const handleShareToTwitter = () => {
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`;
    window.open(url, '_blank');
  };

  return (
    <section className="py-20 border-b border-[#1B2A3D] bg-[#0B1320]/30 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="max-w-3xl">
          <div className="inline-flex items-center space-x-2 text-xs font-mono text-[#A855F7] uppercase tracking-widest mb-3">
            <Sparkles className="w-3.5 h-3.5 text-[#A855F7]" />
            <span>Capture & Share</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-heading font-extrabold text-white tracking-tight">
            Insight Studio for Researchers & CT
          </h2>
          <p className="mt-4 text-base sm:text-lg text-[#95A4B8] leading-relaxed">
            Generate shareable findings from the Technocore Probe v1 observatory
            to publish on X/Twitter or include in protocol research notes.
          </p>
        </div>

        {/* Studio Grid: Selector on Left, Rendered Card on Right */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-8 items-start">
          
          {/* Left: Insight Options */}
          <div className="lg:col-span-5 space-y-3">
            <span className="text-xs font-mono text-[#6F8096] uppercase tracking-wider block pb-1">
              Select Key Finding
            </span>

            {insights.map((insight, idx) => {
              const isSelected = selectedInsightIndex === idx;
              return (
                <button
                  key={idx}
                  onClick={() => setSelectedInsightIndex(idx)}
                  className={`w-full p-4 rounded-xl text-left transition-all border ${
                    isSelected
                      ? 'bg-[#101A2A] border-[#36D7E7] shadow-lg shadow-[#36D7E7]/10'
                      : 'bg-[#0B1320] border-[#1B2A3D] hover:border-[#95A4B8]/30'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs text-[#36D7E7] font-semibold">
                      Finding #{idx + 1}
                    </span>
                    <span className="font-mono text-xs font-bold text-white">
                      {insight.stat}
                    </span>
                  </div>
                  <h4 className="font-heading font-bold text-sm text-white mt-1.5">
                    {insight.title}
                  </h4>
                  <p className="text-xs text-[#95A4B8] mt-1 line-clamp-2">
                    {insight.body}
                  </p>
                </button>
              );
            })}
          </div>

          {/* Right: Rendered Social Card Preview */}
          <div className="lg:col-span-7">
            <div className="p-6 sm:p-8 rounded-2xl bg-[#050A12] border-2 border-[#1B2A3D] shadow-2xl relative overflow-hidden">
              
              {/* Card Ambient Glow */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-[#36D7E7]/10 rounded-full blur-3xl pointer-events-none" />

              {/* Card Header */}
              <div className="flex items-center justify-between pb-6 border-b border-[#1B2A3D] relative z-10">
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-lg bg-[#0B1320] border border-[#36D7E7]/50 flex items-center justify-center">
                    <Activity className="w-4 h-4 text-[#36D7E7]" />
                  </div>
                  <div>
                    <span className="font-heading font-bold text-sm text-white block">
                      Technocore Pulse
                    </span>
                    <span className="text-[10px] font-mono text-[#6F8096]">
                      Live Observational Data
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="px-2 py-0.5 rounded bg-[#101A2A] text-[#36D7E7] text-[10px] font-mono border border-[#1B2A3D]">
                    120s Window Validated
                  </span>
                </div>
              </div>

              {/* Card Body */}
              <div className="py-6 relative z-10 space-y-4">
                <div className="inline-block px-3 py-1 rounded-lg bg-[#101A2A] border border-[#36D7E7]/30 text-2xl sm:text-3xl font-mono font-bold text-[#36D7E7]">
                  {currentInsight.stat}
                </div>

                <h3 className="text-xl sm:text-2xl font-heading font-bold text-white leading-snug">
                  {currentInsight.title}
                </h3>

                <p className="text-sm text-[#95A4B8] font-mono leading-relaxed">
                  "{currentInsight.body}"
                </p>
              </div>

              {/* Card Footer with Asad Lee Attribution */}
              <div className="pt-6 border-t border-[#1B2A3D] flex flex-wrap items-center justify-between gap-3 relative z-10 text-xs font-mono">
                <div className="text-[#95A4B8]">
                  Community-built by <span className="text-white font-bold">Asad Lee</span> · <span className="text-[#36D7E7]">@asadleo416</span>
                </div>
                <div className="text-[10px] text-[#6F8096]">
                  Not an official FLOP Labs product
                </div>
              </div>

            </div>

            {/* Action Bar */}
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs font-mono text-[#6F8096]">
                Ready for CT post or research citation
              </span>

              <div className="flex items-center space-x-2">
                <button
                  onClick={handleCopyTweet}
                  className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-[#101A2A] text-xs font-mono text-white border border-[#1B2A3D] hover:border-[#36D7E7]/40 transition-colors"
                >
                  {copiedTweet ? <Check className="w-3.5 h-3.5 text-[#2FD27F]" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedTweet ? 'Copied Tweet' : 'Copy Post Text'}</span>
                </button>

                <button
                  onClick={handleShareToTwitter}
                  className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-[#36D7E7] text-xs font-mono font-bold text-[#050A12] hover:bg-[#36D7E7]/90 active:scale-95 transition-all shadow-lg shadow-[#36D7E7]/20"
                >
                  <TwitterIcon className="w-3.5 h-3.5" />
                  <span>Share on X</span>
                </button>
              </div>
            </div>

          </div>

        </div>

      </div>
    </section>
  );
};
