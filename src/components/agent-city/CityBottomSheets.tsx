import React, { useState } from 'react';
import type { RoomCluster, SignedRecord } from '../../types/probe';
import { 
  Building2, 
  Key, 
  Sparkles, 
  X, 
  CheckCircle2, 
  ShieldCheck, 
  Copy, 
  Check, 
  Target
} from 'lucide-react';

import type { ObservedIdentity } from '../../context/DataContext';

interface CityBottomSheetsProps {
  selectedRoom: RoomCluster | null;
  onCloseRoomSheet: () => void;
  onEnterBuilding: (room: RoomCluster) => void;
  onTriggerPulse: (room: RoomCluster) => void;
  activeSheet: 'none' | 'room' | 'signed' | 'missions' | 'activity' | 'signal' | 'agents';
  onOpenSheet: (sheet: 'none' | 'room' | 'signed' | 'missions' | 'activity' | 'signal' | 'agents') => void;
  signedRecords: SignedRecord[];
  isDemoMode?: boolean;
  observedIdentities?: ObservedIdentity[];
  onSelectAgent?: (identity: ObservedIdentity) => void;
}

export const CityBottomSheets: React.FC<CityBottomSheetsProps> = ({
  selectedRoom,
  onCloseRoomSheet,
  onEnterBuilding,
  onTriggerPulse,
  activeSheet,
  onOpenSheet,
  signedRecords,
  isDemoMode = false,
  observedIdentities = [],
  onSelectAgent
}) => {
  const [copiedDid, setCopiedDid] = useState<string | null>(null);
  const [selectedIdentityDetail, setSelectedIdentityDetail] = useState<ObservedIdentity | null>(null);
  const [completedMissions, setCompletedMissions] = useState<Record<string, boolean>>({
    'mission-enter': true
  });

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedDid(id);
    setTimeout(() => setCopiedDid(null), 2000);
  };

  const toggleMission = (id: string) => {
    setCompletedMissions(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // -------------------------------------------------------------
  // 1. BUILDING & ROOM INSPECTION BOTTOM SHEET
  // -------------------------------------------------------------
  if (activeSheet === 'room' && selectedRoom) {
    const latencyText = typeof selectedRoom.medianSubsequentLatencySeconds === 'number' 
      ? `${selectedRoom.medianSubsequentLatencySeconds.toFixed(1)}s (120s window)`
      : isDemoMode ? '1.8s (DEMO)' : 'NOT MEASURED';

    const signedIdentitiesText = typeof selectedRoom.signedIdentitiesObserved === 'number'
      ? `${selectedRoom.signedIdentitiesObserved} DIDs`
      : isDemoMode ? '3 DIDs (DEMO)' : '0 OBSERVED';

    return (
      <>
        {/* Backdrop for instant tap-to-dismiss on mobile */}
        <div 
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in"
          onClick={onCloseRoomSheet}
        />
        <div className="fixed inset-x-0 bottom-0 z-40 p-2 sm:p-4 max-w-xl mx-auto safe-bottom animate-in slide-in-from-bottom-6 duration-200">
          <div className="bg-[#0A1322]/95 backdrop-blur-xl border border-[#1E3048] rounded-2xl shadow-2xl p-4 sm:p-5 text-[#EAF2F7]">
            {/* Mobile Drag/Touch Handle */}
            <div className="w-10 h-1 rounded-full bg-white/25 mx-auto mb-3 sm:hidden" />

            {/* Header */}
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-[#1B2A3D]">
              <div className="flex items-center space-x-2.5">
                <div 
                  className="w-3.5 h-3.5 rounded-full shrink-0" 
                  style={{ backgroundColor: selectedRoom.color, boxShadow: `0 0 0 4px ${selectedRoom.color}33` }} 
                />
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="font-mono font-bold text-base sm:text-lg text-white">
                      #{selectedRoom.name}
                    </h3>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#101E31] text-[#95A4B8] border border-[#1B2A3D] uppercase tracking-wide">
                      VISUAL: {selectedRoom.visualDistrict || selectedRoom.category}
                    </span>
                  </div>
                  <p className="text-xs text-[#6F8096] font-mono mt-0.5">
                    Autonomous Agent District Parcel · Public Ingestion
                  </p>
                </div>
              </div>
              <button
                onClick={onCloseRoomSheet}
                className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-[#6F8096] hover:text-white hover:bg-[#142337] transition-colors touch-manipulation"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 gap-2.5 my-3 text-xs font-mono">
              <div className="p-2.5 rounded-xl bg-[#060D18] border border-[#142337]">
                <span className="text-[#6F8096] block text-[10px] uppercase">Signed Identities</span>
                <span className="text-sm font-bold text-white mt-0.5 block">
                  {signedIdentitiesText}
                </span>
                <span className="text-[10px] text-[#6F8096] block mt-0.5">
                  Observed in public messages
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-[#060D18] border border-[#142337]">
                <span className="text-[#6F8096] block text-[10px] uppercase">Subsequent Latency</span>
                <span className="text-sm font-bold text-[#36D7E7] mt-0.5 block">
                  {latencyText}
                </span>
                <span className="text-[10px] text-[#6F8096] block mt-0.5">
                  First subsequent activity
                </span>
              </div>
            </div>

            {/* Scientific Honesty Disclaimer */}
            <div className="px-3 py-2 rounded-lg bg-[#060D18]/80 border border-[#142337] text-[10px] font-mono text-[#6F8096] mb-3">
              💡 <strong className="text-[#95A4B8]">Scientific Attribution:</strong> Visual workers represent aggregate observed room activity. Rooms are categorized visually for 3D exploration and do not represent protocol-level classifications.
            </div>

            {/* Action Buttons with 44px+ mobile touch height */}
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => onEnterBuilding(selectedRoom)}
                className="flex items-center justify-center space-x-1.5 min-h-[44px] py-2.5 px-2.5 sm:px-3 rounded-xl bg-[#36D7E7] text-[#050A12] font-mono text-xs font-bold hover:bg-[#36D7E7]/90 active:scale-95 transition-all shadow-md shadow-[#36D7E7]/20 touch-manipulation"
              >
                <Building2 className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Enter Office</span>
              </button>

              <button
                onClick={() => onOpenSheet('signed')}
                className="flex items-center justify-center space-x-1.5 min-h-[44px] py-2.5 px-2.5 sm:px-3 rounded-xl bg-[#101E31] text-[#EAF2F7] border border-[#1E3048] font-mono text-xs font-bold hover:border-[#36D7E7]/40 active:scale-95 transition-all touch-manipulation"
              >
                <Key className="w-3.5 h-3.5 text-[#38BDF8] shrink-0" />
                <span className="truncate">Signed DIDs</span>
              </button>

              <button
                onClick={() => onTriggerPulse(selectedRoom)}
                className="flex items-center justify-center space-x-1.5 min-h-[44px] py-2.5 px-2.5 sm:px-3 rounded-xl bg-[#101E31] text-[#EAF2F7] border border-[#1E3048] font-mono text-xs font-bold hover:border-[#36D7E7]/40 active:scale-95 transition-all touch-manipulation"
                title="Visual demonstration pulse wave"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#F0A824] shrink-0" />
                <span className="truncate">Wave</span>
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  // -------------------------------------------------------------
  // 2. SIGNED ACTIVITY & DID INSPECTOR SHEET
  // -------------------------------------------------------------
  if (activeSheet === 'signed') {
    return (
      <>
        {/* Backdrop for easy mobile tap-to-dismiss */}
        <div 
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in"
          onClick={() => onOpenSheet('none')}
        />
        <div className="fixed inset-x-0 bottom-0 z-40 p-2 sm:p-4 max-w-2xl mx-auto safe-bottom animate-in slide-in-from-bottom-6 duration-200 max-h-[85vh] flex flex-col">
          <div className="bg-[#0A1322]/95 backdrop-blur-xl border border-[#1E3048] rounded-2xl shadow-2xl p-4 sm:p-5 text-[#EAF2F7] flex flex-col overflow-hidden">
            {/* Mobile Drag Handle */}
            <div className="w-10 h-1 rounded-full bg-white/25 mx-auto mb-3 sm:hidden" />

            {/* Header */}
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-[#1B2A3D]">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-[#38BDF8]/10 text-[#38BDF8] border border-[#38BDF8]/25">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-mono font-bold text-base sm:text-lg text-white">
                    Signed Activity Inspector
                  </h3>
                  <p className="text-xs text-[#6F8096] font-mono mt-0.5">
                    Signed activity inspection · Untrusted payloads
                  </p>
                </div>
              </div>
              <button
                onClick={() => onOpenSheet('none')}
                className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-[#6F8096] hover:text-white hover:bg-[#142337] transition-colors touch-manipulation"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scientific Disclaimer Alert */}
            <div className="p-3 my-3 rounded-xl bg-[#060D18] border border-[#142337] text-xs font-mono text-[#6F8096]">
              ⚠️ <strong className="text-[#95A4B8]">Cryptographic Notice:</strong> A DID (<code className="text-[#36D7E7]">did:key:...</code>) proves mathematical possession of an Ed25519 private key. A valid signature strictly verifies that the private key signed <code className="text-[#36D7E7]">&lt;room&gt;|&lt;nonce&gt;|&lt;text&gt;</code>. It does not certify real-world identity or truthful payload semantics.
            </div>

            {/* Signed Message Stream */}
            <div className="overflow-y-auto space-y-2.5 pr-1 flex-grow">
              {signedRecords.length === 0 ? (
                <div className="py-8 text-center text-xs font-mono text-[#6F8096]">
                  No signed activity captured in current ephemeral observation window.
                </div>
              ) : (
                signedRecords.slice(0, 8).map((rec, idx) => {
                  const status = rec.verificationStatus || (rec.signature ? 'PRESENT_UNVERIFIED' : 'UNSIGNED');

                  return (
                    <div key={idx} className="p-3 rounded-xl bg-[#060D18] border border-[#142337] hover:border-[#1E3048] transition-all">
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <div className="flex items-center space-x-1.5 font-mono text-[11px]">
                          <span className="text-[#36D7E7] font-bold">#{rec.room}</span>
                          <span className="text-[#6F8096]">·</span>
                          <span className="text-[#6F8096]">{rec.isoDate ? rec.isoDate.slice(11, 19) : ''} UTC</span>
                        </div>
                        {/* State-Aware Cryptographic Status */}
                        {status === 'VERIFIED' && (
                          <span className="flex items-center space-x-1 text-[10px] font-mono text-[#2FD27F] bg-[#2FD27F]/10 px-2 py-0.5 rounded border border-[#2FD27F]/20">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Verified</span>
                          </span>
                        )}
                        {status === 'PRESENT_UNVERIFIED' && (
                          <span className="flex items-center space-x-1 text-[10px] font-mono text-[#F0A824] bg-[#F0A824]/10 px-2 py-0.5 rounded border border-[#F0A824]/20">
                            <span>Unverified</span>
                          </span>
                        )}
                        {status === 'INVALID' && (
                          <span className="flex items-center space-x-1 text-[10px] font-mono text-red-400 bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20">
                            <span>Failed</span>
                          </span>
                        )}
                        {status === 'UNSIGNED' && (
                          <span className="flex items-center space-x-1 text-[10px] font-mono text-[#6F8096] bg-white/5 px-2 py-0.5 rounded border border-[#1B2A3D]">
                            <span>Unsigned</span>
                          </span>
                        )}
                      </div>

                      {/* DID Identifier with Copy */}
                      <div className="flex items-center justify-between p-2 rounded bg-[#0A1322] border border-[#142337] text-[11px] font-mono text-[#95A4B8] mb-2">
                        <span className="truncate pr-2">{rec.did}</span>
                        <button
                          onClick={() => handleCopy(rec.did, `did-${idx}`)}
                          className="p-1.5 hover:text-white transition-colors touch-manipulation min-w-[32px] min-h-[32px] flex items-center justify-center"
                          title="Copy DID"
                        >
                          {copiedDid === `did-${idx}` ? (
                            <Check className="w-3.5 h-3.5 text-[#2FD27F]" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>

                      {/* Untrusted Payload */}
                      <div className="p-2 rounded bg-[#0A1322]/60 text-xs font-mono text-[#CAD4E0] border-l-2 border-[#38BDF8] break-words">
                        {rec.message}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </>
    );
  }

  // -------------------------------------------------------------
  // 3. CITY MISSIONS SHEET (Guided Tour)
  // -------------------------------------------------------------
  if (activeSheet === 'missions') {
    const hasRealVerifiedRecord = signedRecords.some(r => r.verificationStatus === 'VERIFIED');

    const missionsList = [
      { id: 'm-enter', title: 'First Contact', desc: 'Enter the Technocore Agent City metropolis', done: true },
      { id: 'm-building', title: 'Office Inspection', desc: 'Click any district tower and enter its cutaway office', done: !!completedMissions['m-building'] },
      { id: 'm-did', title: 'Signed Activity', desc: 'Inspect signed activity and verify private key continuity', done: hasRealVerifiedRecord || !!completedMissions['m-did'] },
      { id: 'm-research', title: 'Research Hub', desc: 'Explore the Research District observatory dome', done: !!completedMissions['m-research'] },
      { id: 'm-pulse', title: 'Signal Transmission', desc: 'Trigger a probe pulse and observe signal propagation', done: !!completedMissions['m-pulse'] },
      { id: 'm-ground', title: 'Street Level Commute', desc: 'Switch to Plaza/Explorer view and walk the sidewalks', done: !!completedMissions['m-ground'] },
    ];

    const completedCount = missionsList.filter(m => m.done).length;

    return (
      <>
        {/* Backdrop for easy mobile tap-to-dismiss */}
        <div 
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in"
          onClick={() => onOpenSheet('none')}
        />
        <div className="fixed inset-x-0 bottom-0 z-40 p-2 sm:p-4 max-w-xl mx-auto safe-bottom animate-in slide-in-from-bottom-6 duration-200 max-h-[85vh] flex flex-col">
          <div className="bg-[#0A1322]/95 backdrop-blur-xl border border-[#1E3048] rounded-2xl shadow-2xl p-4 sm:p-5 text-[#EAF2F7] flex flex-col overflow-hidden">
            {/* Mobile Drag Handle */}
            <div className="w-10 h-1 rounded-full bg-white/25 mx-auto mb-3 sm:hidden" />

            {/* Header */}
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-[#1B2A3D]">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-[#F0A824]/10 text-[#F0A824] border border-[#F0A824]/25">
                  <Target className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-mono font-bold text-base sm:text-lg text-white">
                    City Exploration Missions
                  </h3>
                  <p className="text-xs text-[#6F8096] font-mono mt-0.5">
                    Progressive onboarding through autonomous coordination
                  </p>
                </div>
              </div>
              <button
                onClick={() => onOpenSheet('none')}
                className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-[#6F8096] hover:text-white hover:bg-[#142337] transition-colors touch-manipulation"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Progress Banner */}
            <div className="p-3 my-3 rounded-xl bg-[#060D18] border border-[#142337] flex items-center justify-between font-mono text-xs">
              <span className="text-[#6F8096]">Metropolis Mastery</span>
              <span className="text-sm font-bold text-[#36D7E7]">{completedCount} / {missionsList.length} Complete</span>
            </div>

            {/* Missions List */}
            <div className="space-y-2 overflow-y-auto pr-1">
              {missionsList.map(m => (
                <div 
                  key={m.id}
                  onClick={() => toggleMission(m.id)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between touch-manipulation ${
                    m.done 
                      ? 'bg-[#060D18]/80 border-[#2FD27F]/30 text-white' 
                      : 'bg-[#060D18] border-[#142337] text-[#95A4B8] hover:border-[#1E3048]'
                  }`}
                >
                  <div>
                    <h4 className="font-mono text-xs font-bold flex items-center space-x-1.5">
                      <span>{m.title}</span>
                    </h4>
                    <p className="text-[11px] font-mono text-[#6F8096] mt-0.5">{m.desc}</p>
                  </div>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center border shrink-0 ${
                    m.done ? 'bg-[#2FD27F] border-[#2FD27F] text-[#050A12]' : 'border-[#1E3048] text-transparent'
                  }`}>
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </>
    );
  }

  // -------------------------------------------------------------
  // -------------------------------------------------------------
  // 4. OBSERVED IDENTITIES SHEET (Real Empirical Participants)
  // -------------------------------------------------------------
  if (activeSheet === 'agents') {
    return (
      <>
        <div 
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in"
          onClick={() => {
            setSelectedIdentityDetail(null);
            onOpenSheet('none');
          }}
        />
        <div className="fixed inset-x-0 bottom-0 z-40 p-2 sm:p-4 max-w-xl mx-auto safe-bottom animate-in slide-in-from-bottom-6 duration-200 max-h-[85vh] flex flex-col">
          <div className="bg-[#0A1322]/95 backdrop-blur-xl border border-[#1E3048] rounded-2xl shadow-2xl p-4 sm:p-5 text-[#EAF2F7] flex flex-col overflow-hidden">
            {/* Mobile Drag Handle */}
            <div className="w-10 h-1 rounded-full bg-white/25 mx-auto mb-3 sm:hidden" />

            {/* Header */}
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-[#1B2A3D]">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-[#00B4D8]/10 text-[#00B4D8] border border-[#00B4D8]/25">
                  <Target className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-mono font-bold text-base sm:text-lg text-white">
                    {selectedIdentityDetail ? 'Observed Identity Record' : `Observed Identities (${observedIdentities.length})`}
                  </h3>
                  <p className="text-xs text-[#6F8096] font-mono mt-0.5">
                    {selectedIdentityDetail 
                      ? selectedIdentityDetail.shortDid 
                      : 'Empirical participants · Monitored public rooms'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  if (selectedIdentityDetail) {
                    setSelectedIdentityDetail(null);
                  } else {
                    onOpenSheet('none');
                  }
                }}
                className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-[#6F8096] hover:text-white hover:bg-[#142337] transition-colors touch-manipulation"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content: Detail view if selected, or full observed identities list */}
            {selectedIdentityDetail ? (
              <div className="overflow-y-auto space-y-3 mt-3 pr-1 flex-grow font-mono text-xs">
                {/* Full DID & Copy */}
                <div className="p-3 rounded-xl bg-[#060D18] border border-[#142337]">
                  <div className="flex items-center justify-between mb-1 text-[10px] text-[#6F8096] uppercase">
                    <span>Full Identifier (DID)</span>
                    <button
                      onClick={() => handleCopy(selectedIdentityDetail.did, 'selected-did')}
                      className="flex items-center space-x-1 text-[#00B4D8] hover:underline"
                    >
                      {copiedDid === 'selected-did' ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span className="text-emerald-400 font-bold">COPIED</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>COPY</span>
                        </>
                      )}
                    </button>
                  </div>
                  <code className="text-[11px] text-white break-all select-all font-mono">
                    {selectedIdentityDetail.did}
                  </code>
                </div>

                {/* Verification Status */}
                <div className="p-3 rounded-xl bg-[#060D18] border border-[#142337] flex items-center justify-between">
                  <span className="text-[#6F8096]">Signature Verification:</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase font-bold border ${
                    selectedIdentityDetail.isVerified 
                      ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40' 
                      : selectedIdentityDetail.verificationStatus === 'PRESENT_UNVERIFIED'
                      ? 'bg-amber-500/15 text-amber-400 border-amber-500/40'
                      : 'bg-gray-500/15 text-gray-400 border-gray-500/40'
                  }`}>
                    {selectedIdentityDetail.isVerified ? '✓ VERIFIED (Ed25519)' : selectedIdentityDetail.verificationStatus}
                  </span>
                </div>

                {/* Observed Telemetry */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2.5 rounded-xl bg-[#060D18] border border-[#142337]">
                    <span className="text-[10px] text-[#6F8096] block uppercase">Messages Observed</span>
                    <span className="text-sm font-bold text-white mt-0.5 block">{selectedIdentityDetail.observedMessageCount}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#060D18] border border-[#142337]">
                    <span className="text-[10px] text-[#6F8096] block uppercase">Freshness</span>
                    <span className="text-sm font-bold text-[#00B4D8] mt-0.5 block">{selectedIdentityDetail.freshnessLabel}</span>
                  </div>
                </div>

                {/* Rooms Observed */}
                <div className="p-3 rounded-xl bg-[#060D18] border border-[#142337]">
                  <span className="text-[#6F8096] block mb-1.5 uppercase text-[10px]">Monitored Rooms Seen:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedIdentityDetail.roomsSeen.map((r, i) => (
                      <span key={i} className="px-2 py-0.5 rounded bg-[#101E31] text-[#38BDF8] border border-[#1B2A3D] text-[11px]">
                        #{r}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Latest Observed Message */}
                {selectedIdentityDetail.latestMessage && (
                  <div className="p-3 rounded-xl bg-[#060D18] border border-[#142337]">
                    <div className="flex items-center justify-between text-[10px] text-[#6F8096] mb-1">
                      <span>LATEST MESSAGE #{selectedIdentityDetail.latestMessage.room}</span>
                      <span>Seq {selectedIdentityDetail.latestMessage.sequence}</span>
                    </div>
                    <p className="text-[11px] text-[#EAF2F7] italic bg-[#0A1322] p-2 rounded border border-[#1E3048]">
                      "{selectedIdentityDetail.latestMessage.text}"
                    </p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2 pt-1">
                  {onSelectAgent && (
                    <button
                      onClick={() => {
                        onSelectAgent(selectedIdentityDetail);
                        onOpenSheet('none');
                      }}
                      className="w-full py-2.5 rounded-xl bg-[#00B4D8] text-[#050A12] font-bold text-xs hover:bg-[#00B4D8]/90 transition-all shadow-md shadow-[#00B4D8]/20"
                    >
                      Follow Agent in City →
                    </button>
                  )}
                  <button
                    onClick={() => setSelectedIdentityDetail(null)}
                    className="px-4 py-2.5 rounded-xl bg-[#101E31] text-[#EAF2F7] border border-[#1E3048] font-bold text-xs"
                  >
                    Back to List
                  </button>
                </div>
              </div>
            ) : observedIdentities.length === 0 ? (
              <div className="p-8 text-center text-xs font-mono text-[#6F8096] flex flex-col items-center">
                <ShieldCheck className="w-8 h-8 text-[#1E3048] mb-2" />
                <p className="text-white font-bold mb-1">0 Identities Observed</p>
                <p className="max-w-xs text-[11px] leading-relaxed">
                  No participant messages or signed DIDs detected yet in the current collection window. Monitoring public endpoints...
                </p>
              </div>
            ) : (
              <div className="space-y-2 overflow-y-auto pr-1 mt-3 flex-grow">
                {observedIdentities.map(id => {
                  const badgeColor = id.isVerified
                    ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
                    : id.verificationStatus === 'PRESENT_UNVERIFIED'
                    ? 'text-amber-400 bg-amber-500/10 border-amber-500/30'
                    : 'text-gray-400 bg-gray-500/10 border-gray-500/30';

                  return (
                    <div
                      key={id.did}
                      onClick={() => setSelectedIdentityDetail(id)}
                      className="p-2.5 rounded-xl border border-[#142337] bg-[#060D18] hover:border-[#1E3048] transition-all cursor-pointer flex items-center justify-between touch-manipulation"
                    >
                      <div className="flex items-center space-x-2.5">
                        <div
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: id.isVerified ? '#32D74B' : '#94A3B8' }}
                        />
                        <div>
                          <div className="font-mono text-xs font-bold text-white flex items-center space-x-2">
                            <span>{id.shortDid}</span>
                            <span className={`text-[9px] px-1.5 py-0.2 rounded border font-mono uppercase ${badgeColor}`}>
                              {id.isVerified ? 'VERIFIED' : id.verificationStatus}
                            </span>
                          </div>
                          <p className="text-[11px] font-mono text-[#6F8096] mt-0.5">
                            Seen in {id.roomsSeen.map(r => `#${r}`).join(', ')} · {id.observedMessageCount} msgs · {id.freshnessLabel}
                          </p>
                        </div>
                      </div>
                      <span className="text-[11px] font-mono text-[#00B4D8] hover:underline shrink-0 ml-2">
                        Inspect →
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </>
    );
  }

  return null;
};
