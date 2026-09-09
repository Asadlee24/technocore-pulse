import React, { useState, useEffect } from 'react';
import { OPERATOR_DID } from '../data/mockProbes';
import type { ProbeRun } from '../types/probe';
import { useData } from '../context/DataContext';
import { X, Copy, Check, Download, Search, Terminal } from 'lucide-react';

interface RawEventDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  initialSelectedRun?: ProbeRun | null;
}

export const RawEventDrawer: React.FC<RawEventDrawerProps> = ({
  isOpen,
  onClose,
  initialSelectedRun
}) => {
  const { activeRuns, dataMode } = useData();
  const isDemo = dataMode === 'DEMO';
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'events' | 'json'>('events');

  useEffect(() => {
    if (initialSelectedRun) {
      setSearchTerm(initialSelectedRun.id);
    }
  }, [initialSelectedRun]);

  if (!isOpen) return null;

  const filteredRuns = activeRuns.filter(r => 
    r.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.roomName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.probePayload.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.arm.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDownloadDataset = () => {
    const exportPayload = {
      dataMode,
      disclaimer: isDemo ? 'Demo dataset — illustrative data, not live Technocore experiment results.' : 'Live public Technocore observation snapshot.',
      timestamp: new Date().toISOString(),
      runs: activeRuns
    };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportPayload, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `technocore-pulse-${dataMode.toLowerCase()}-${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-2xl h-full bg-[#0B1320] border-l border-[#1B2A3D] shadow-2xl flex flex-col">
        
        {/* Drawer Header */}
        <div className="p-5 border-b border-[#1B2A3D] flex items-center justify-between bg-[#050A12]/80">
          <div className="flex items-center space-x-2.5">
            <Terminal className="w-5 h-5 text-[#36D7E7]" />
            <div>
              <h3 className="font-heading font-bold text-lg text-white">
                Raw Event Stream & Schema
              </h3>
              <p className="text-[11px] font-mono text-[#6F8096]">
                Technocore Probe v1 Recorded Runs
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleDownloadDataset}
              className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-[#101A2A] text-xs font-mono text-[#95A4B8] hover:text-[#36D7E7] border border-[#1B2A3D] transition-colors"
              title="Download full JSON dataset"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export JSON</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-[#95A4B8] hover:text-white hover:bg-[#101A2A] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Search and Mode Bar */}
        <div className="p-4 border-b border-[#1B2A3D] bg-[#0B1320] flex items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#6F8096] absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by Run, Arm, Room hash, or payload keyword..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 rounded-lg bg-[#050A12] border border-[#1B2A3D] text-xs font-mono text-white placeholder-[#6F8096] focus:outline-none focus:border-[#36D7E7]"
            />
          </div>

          <div className="flex items-center p-1 rounded-lg bg-[#050A12] border border-[#1B2A3D]">
            <button
              onClick={() => setViewMode('events')}
              className={`px-2.5 py-1 text-xs font-mono rounded ${
                viewMode === 'events'
                  ? 'bg-[#101A2A] text-white font-bold'
                  : 'text-[#6F8096] hover:text-[#95A4B8]'
              }`}
            >
              Cards
            </button>
            <button
              onClick={() => setViewMode('json')}
              className={`px-2.5 py-1 text-xs font-mono rounded ${
                viewMode === 'json'
                  ? 'bg-[#101A2A] text-[#36D7E7] font-bold'
                  : 'text-[#6F8096] hover:text-[#95A4B8]'
              }`}
            >
              JSON
            </button>
          </div>
        </div>

        {/* Drawer Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {viewMode === 'events' ? (
            filteredRuns.map((run) => (
              <div
                key={run.id}
                className="p-4 rounded-xl bg-[#050A12] border border-[#1B2A3D] space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-xs font-bold text-white">
                      Run #{run.sequence}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-[#36D7E7]/15 text-[#36D7E7] border border-[#36D7E7]/30">
                      {run.arm}
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-[#6F8096]">
                    {run.isoDate}
                  </span>
                </div>

                <div className="text-xs font-mono text-[#95A4B8]">
                  Room: <span className="text-white">{run.roomName}</span>
                </div>

                <div className="p-2.5 rounded-lg bg-[#0B1320] border border-[#1B2A3D] text-xs font-mono text-[#EAF2F7] flex items-center justify-between">
                  <span className="truncate">{run.probePayload}</span>
                  <button
                    onClick={() => handleCopy(run.probePayload, `probe-${run.id}`)}
                    className="p-1 hover:text-white transition-colors ml-2"
                  >
                    {copiedId === `probe-${run.id}` ? <Check className="w-3 h-3 text-[#2FD27F]" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>

                {/* Sub-Messages */}
                <div className="space-y-2 pt-2 border-t border-[#1B2A3D]">
                  <span className="text-[10px] font-mono text-[#6F8096] uppercase tracking-wider block">
                    Observed Replies ({run.observedMessages.length})
                  </span>

                  {run.observedMessages.map((msg) => (
                    <div
                      key={msg.id}
                      className="p-2 rounded-lg bg-[#101A2A] border border-[#1B2A3D] text-xs font-mono"
                    >
                      <div className="flex items-center justify-between text-[11px] text-[#95A4B8]">
                        <span className="text-[#2FD27F] font-semibold">
                          {msg.senderAlias || 'Agent'} (+{msg.deltaSeconds}s)
                        </span>
                        <span>{msg.signaturePreview}</span>
                      </div>
                      <p className="text-white mt-1 text-[11px]">"{msg.content}"</p>
                    </div>
                  ))}
                </div>
              </div>
            ))
          ) : (
            <div className="p-4 rounded-xl bg-[#050A12] border border-[#1B2A3D] font-mono text-xs text-[#36D7E7] overflow-x-auto">
              <pre>{JSON.stringify(filteredRuns, null, 2)}</pre>
            </div>
          )}
        </div>

        {/* Drawer Footer */}
        <div className="p-4 border-t border-[#1B2A3D] bg-[#050A12] flex items-center justify-between text-xs font-mono text-[#6F8096]">
          <span>Strict 120s window attribution protocol</span>
          <span>Operator: {OPERATOR_DID.slice(0, 12)}...</span>
        </div>

      </div>
    </div>
  );
};
