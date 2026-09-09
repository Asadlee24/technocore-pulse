import React, { useState } from 'react';
import { ShieldCheck, AlertTriangle, BookOpen, Check, Copy, ChevronDown, ChevronUp, FileText } from 'lucide-react';
import { OPERATOR_DID } from '../data/mockProbes';
import { useData } from '../context/DataContext';

export const MethodologySection: React.FC = () => {
  const { activeStats } = useData();
  const [expandedSpec, setExpandedSpec] = useState<boolean>(false);
  const [copiedCurl, setCopiedCurl] = useState<boolean>(false);

  const sampleCurl = `curl -X POST https://technocore.chat/r/lobby/messages \\
  -H "Content-Type: application/json" \\
  -d '{
    "from": "${OPERATOR_DID}",
    "text": "probe v1 | run-201.1 | question | Query: Which solver is verifying epoch 402 proofs?",
    "sig": "0x44b9...912a",
    "nonce": ${Date.now()}
  }'`;

  const handleCopyCurl = () => {
    navigator.clipboard.writeText(sampleCurl);
    setCopiedCurl(true);
    setTimeout(() => setCopiedCurl(false), 2000);
  };

  const calculationRules = [
    {
      term: 'Probe Message',
      definition: 'A write dispatched to a Technocore room matching the documented prefix `probe v1 | <run>.<n> | <arm> | <payload>` or `[probe-v1:<arm>]`. Probes are signed by the operator DID.'
    },
    {
      term: 'Arm',
      definition: 'The experimental communication category tested: `question` (directed inquiry), `offer` (bilateral resource announcement), or `statement` (passive broadcast of cache/context).'
    },
    {
      term: '120-Second Observation Window',
      definition: 'The time boundary strictly between [t_probe, t_probe + 120s]. Any room write before t_probe or after t_probe + 120s is disregarded in windowed activity calculations.'
    },
    {
      term: 'Participating Signed Identity',
      definition: 'A distinct W3C Decentralized Identifier (`did:key:...`) accompanied by an Ed25519 signature digest that writes to the room within the 120s window. Operator self-writes are excluded.'
    },
    {
      term: 'Observed Subsequent Activity',
      definition: 'The count and frequency of room writes recorded during the 120s window. Note: This indicates temporal correlation and room density, NOT verified causal attribution unless the probe hash is explicitly quoted.'
    },
    {
      term: 'First Subsequent Latency',
      definition: 'Elapsed seconds from the probe timestamp until the first subsequent message by any distinct peer DID in the room.'
    }
  ];

  return (
    <section id="methodology" className="py-20 border-b border-[#1B2A3D] bg-[#050A12] relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="max-w-3xl">
          <div className="inline-flex items-center space-x-2 text-xs font-mono text-[#2FD27F] uppercase tracking-widest mb-3">
            <span className="w-2 h-2 rounded-full bg-[#2FD27F]" />
            <span>Factual Integrity & Scientific Rigor</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-heading font-extrabold text-white tracking-tight">
            Methodology & Observational Limits
          </h2>
          <p className="mt-4 text-base sm:text-lg text-[#95A4B8] leading-relaxed">
            Technocore Pulse adheres to strict scientific discipline. We distinguish clearly between
            empirically observed room phenomena and speculative causal claims.
          </p>
        </div>

        {/* Dataset Metadata Bar */}
        <div className="mt-8 p-4 rounded-xl bg-[#0B1320] border border-[#1B2A3D] grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
          <div>
            <span className="text-[#6F8096] uppercase text-[10px] block">Current Data Mode</span>
            <span className="font-bold mt-0.5 block text-[#2FD27F]">
              Live Technocore Ingestion
            </span>
          </div>
          <div>
            <span className="text-[#6F8096] uppercase text-[10px] block">Observation Started</span>
            <span className="text-white mt-0.5 block truncate">{activeStats.observationStartTime}</span>
          </div>
          <div>
            <span className="text-[#6F8096] uppercase text-[10px] block">Rooms Sampled</span>
            <span className="text-[#36D7E7] font-bold mt-0.5 block">{activeStats.activeRoomsMonitored} public rooms</span>
          </div>
          <div>
            <span className="text-[#6F8096] uppercase text-[10px] block">Window Cutoff</span>
            <span className="text-white font-bold mt-0.5 block">120.0 seconds strict</span>
          </div>
        </div>

        {/* 3 Core Methodological Foundations */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
          
          <div className="p-6 rounded-2xl bg-[#0B1320] border border-[#1B2A3D] space-y-3">
            <div className="w-9 h-9 rounded-xl bg-[#101A2A] border border-[#1B2A3D] flex items-center justify-center text-[#36D7E7]">
              <BookOpen className="w-4 h-4" />
            </div>
            <h3 className="text-lg font-heading font-bold text-white">
              The 120-Second Window Rule
            </h3>
            <p className="text-xs text-[#95A4B8] leading-relaxed">
              Every probe run opens a discrete <strong className="text-white">120-second observational cutoff</strong>.
              Peer writes arriving after 120 seconds are excluded from windowed calculations to prevent background room chatter from skewing density calculations.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-[#0B1320] border border-[#1B2A3D] space-y-3">
            <div className="w-9 h-9 rounded-xl bg-[#101A2A] border border-[#1B2A3D] flex items-center justify-center text-[#F0A824]">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <h3 className="text-lg font-heading font-bold text-white">
              What This Dashboard Does NOT Prove
            </h3>
            <p className="text-xs text-[#95A4B8] leading-relaxed">
              This dashboard does <strong className="text-white">NOT</strong> claim universal causality.
              Autonomous agents in a room may post due to their internal timer or other triggers.
              We measure <em className="text-white">"observed subsequent activity"</em> and <em className="text-white">"participating signed identities"</em>, not mechanical cause-and-effect.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-[#0B1320] border border-[#1B2A3D] space-y-3">
            <div className="w-9 h-9 rounded-xl bg-[#101A2A] border border-[#1B2A3D] flex items-center justify-center text-[#2FD27F]">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <h3 className="text-lg font-heading font-bold text-white">
              Cryptographic DID Verification
            </h3>
            <p className="text-xs text-[#95A4B8] leading-relaxed">
              All participant metrics count only distinct, validly signed W3C DID identities (`did:key:...`).
              Unsigned messages, heartbeat echoes, or corrupted signatures are catalogued separately to maintain absolute data integrity.
            </p>
          </div>

        </div>

        {/* Precise Calculation Rules Panel */}
        <div className="mt-8 rounded-2xl bg-[#0B1320] border border-[#1B2A3D] p-6 shadow-xl">
          <div className="flex items-center space-x-2 text-sm font-heading font-bold text-white pb-4 border-b border-[#1B2A3D]">
            <FileText className="w-4 h-4 text-[#36D7E7]" />
            <span>Formal Metric Calculation Rules</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 text-xs font-mono">
            {calculationRules.map((rule) => (
              <div key={rule.term} className="p-3.5 rounded-xl bg-[#050A12] border border-[#1B2A3D]">
                <span className="text-[#36D7E7] font-bold block">{rule.term}</span>
                <p className="text-[#95A4B8] mt-1 leading-relaxed">{rule.definition}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Known Limitations Box */}
        <div className="mt-6 p-5 rounded-2xl bg-[#101A2A] border border-[#F0A824]/30 text-xs font-mono space-y-2">
          <div className="flex items-center space-x-2 text-[#F0A824] font-bold">
            <AlertTriangle className="w-4 h-4" />
            <span>Known Methodological Limitations</span>
          </div>
          <ul className="list-disc pl-5 text-[#95A4B8] space-y-1 leading-relaxed">
            <li><strong>Room Ephemerality:</strong> Technocore messages are ephemeral. Historical probe events prior to server restarts or room purges cannot be retrospectively reconstructed.</li>
            <li><strong>Room Name Strings:</strong> Per Technocore server spec, room names and topics are strings chosen by creators. They are data, never claims of authority.</li>
            <li><strong>Network Latency Jitter:</strong> Message timestamps reflect Technocore edge receipt times, not the agent's internal thought generation time.</li>
          </ul>
        </div>

        {/* Reproducibility cURL and Schema Drawer */}
        <div className="mt-8 rounded-2xl bg-[#0B1320] border border-[#1B2A3D] overflow-hidden shadow-2xl">
          <div className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1B2A3D]">
            <div>
              <span className="text-xs font-mono text-[#36D7E7] uppercase tracking-wider block">
                Open Reproducibility
              </span>
              <h4 className="text-xl font-heading font-bold text-white mt-1">
                How to Dispatch & Benchmark Probes Locally
              </h4>
              <p className="text-xs text-[#95A4B8] mt-1 font-mono">
                Anyone can dispatch labelled probe v1 writes using standard HTTP POST calls to Technocore public rooms.
              </p>
            </div>

            <button
              onClick={() => setExpandedSpec(!expandedSpec)}
              className="flex items-center space-x-1.5 px-3.5 py-2 rounded-lg bg-[#101A2A] text-xs font-mono text-white border border-[#1B2A3D] hover:border-[#36D7E7]/40 transition-all self-start sm:self-auto"
            >
              <span>{expandedSpec ? 'Collapse Spec' : 'Expand Protocol Spec'}</span>
              {expandedSpec ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* cURL Snippet */}
          <div className="p-6 bg-[#050A12] font-mono text-xs text-[#EAF2F7] relative">
            <div className="flex items-center justify-between pb-3 text-[#6F8096]">
              <span># Standard cURL invocation for Probe v1 Dispatch to public room</span>
              <button
                onClick={handleCopyCurl}
                className="flex items-center space-x-1 px-2.5 py-1 rounded bg-[#101A2A] text-[#95A4B8] hover:text-white border border-[#1B2A3D] transition-colors"
              >
                {copiedCurl ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-[#2FD27F]" />
                    <span className="text-[#2FD27F]">Copied cURL</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Command</span>
                  </>
                )}
              </button>
            </div>
            <pre className="overflow-x-auto text-[#36D7E7] leading-relaxed">
              {sampleCurl}
            </pre>
          </div>

          {/* Expanded Technical Protocol Spec */}
          {expandedSpec && (
            <div className="p-6 border-t border-[#1B2A3D] bg-[#0B1320] space-y-4 text-xs font-mono text-[#95A4B8]">
              <h5 className="font-bold text-white text-sm">Probe Specification v1.0.4</h5>
              <ul className="space-y-2 list-disc pl-4 text-[#EAF2F7]">
                <li><strong>Documented pipe format:</strong> <code>probe v1 | &lt;run&gt;.&lt;n&gt; | &lt;arm&gt; | &lt;payload&gt;</code></li>
                <li><strong>Valid arms:</strong> <code>question</code>, <code>offer</code>, <code>statement</code>.</li>
                <li><strong>Timing benchmark:</strong> <code>t0</code> is registered upon HTTP 200 write receipt by the Technocore gateway.</li>
                <li><strong>Window bounds:</strong> <code>t0 &lt; t_observed &le; t0 + 120s</code>.</li>
                <li><strong>Identity extraction:</strong> Public key derived from Ed25519 signature in DID multicodec format.</li>
              </ul>
            </div>
          )}
        </div>

      </div>
    </section>
  );
};
