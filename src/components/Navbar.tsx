import React from 'react';
import { Activity, ExternalLink, Layers, RefreshCw } from 'lucide-react';
import { TwitterIcon, GithubIcon } from './SocialIcons';
import { useData } from '../context/DataContext';

interface NavbarProps {
  onOpenRawEvents: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenRawEvents }) => {
  const { observerHealth, isLiveLoading, refreshLiveData } = useData();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-[#1B2A3D] bg-[#050A12]/90 backdrop-blur-xl transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand Logo & Pulse Dot */}
        <div className="flex items-center space-x-3">
          <a href="#" className="flex items-center space-x-2.5 group">
            <div className="relative w-8 h-8 rounded-lg bg-[#0B1320] border border-[#36D7E7]/40 flex items-center justify-center group-hover:border-[#36D7E7] transition-colors shadow-lg shadow-[#36D7E7]/10">
              <Activity className="w-4 h-4 text-[#36D7E7] animate-pulse" />
              <span className="absolute -top-1 -right-1 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#2FD27F] opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#2FD27F]" />
              </span>
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="font-heading font-bold text-base tracking-tight text-white group-hover:text-[#36D7E7] transition-colors">
                  Technocore Pulse
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#101A2A] text-[#36D7E7] border border-[#1B2A3D]">
                  probe v1
                </span>
              </div>
              <span className="block text-[10px] font-mono text-[#6F8096]">
                Community-built by Asad Lee
              </span>
            </div>
          </a>
        </div>

        {/* Navigation Anchors */}
        <nav className="hidden md:flex items-center space-x-6 text-xs font-mono text-[#95A4B8]">
          <a href="#protocol" className="hover:text-[#36D7E7] transition-colors">
            Protocol Fit
          </a>
          <a href="#experiment" className="hover:text-[#36D7E7] transition-colors">
            Probe Arms
          </a>
          <a href="#signal-map" className="hover:text-[#36D7E7] transition-colors">
            3D Map
          </a>
          <a href="#pulse-dashboard" className="hover:text-[#36D7E7] transition-colors">
            Observatory
          </a>
          <a href="#methodology" className="hover:text-[#36D7E7] transition-colors">
            Methodology
          </a>
          <a href="#builder" className="hover:text-white transition-colors">
            Builder
          </a>
        </nav>

        {/* Real-Time Live Feed Indicator & Refresh */}
        <div className="flex items-center space-x-3">
          
          <div className="flex items-center space-x-2 px-2.5 py-1 rounded-xl bg-[#0B1320] border border-[#1B2A3D] shadow-inner">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#2FD27F] opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#2FD27F]" />
            </span>
            <span className="text-xs font-mono font-bold text-[#2FD27F]">
              LIVE
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#101A2A] text-[#95A4B8] border border-[#1B2A3D]">
              {observerHealth}
            </span>
            <button
              onClick={() => refreshLiveData()}
              disabled={isLiveLoading}
              className="p-1 text-[#95A4B8] hover:text-[#36D7E7] transition-colors"
              title="Refresh Live Data Feed"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLiveLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Raw Event Drawer Trigger */}
          <button
            onClick={onOpenRawEvents}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-mono bg-[#101A2A] text-[#95A4B8] border border-[#1B2A3D] hover:text-[#36D7E7] hover:border-[#36D7E7]/40 transition-all"
            title="Inspect Raw Event Stream"
          >
            <Layers className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Events</span>
          </button>

          {/* Social Links */}
          <div className="flex items-center space-x-1 pl-1 border-l border-[#1B2A3D]">
            <a
              href="https://x.com/asadleo416"
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 text-[#95A4B8] hover:text-[#36D7E7] hover:bg-[#101A2A] rounded-lg transition-all"
              title="Follow @asadleo416 on X"
            >
              <TwitterIcon className="w-4 h-4" />
            </a>
            <a
              href="https://github.com/Asadlee24"
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 text-[#95A4B8] hover:text-white hover:bg-[#101A2A] rounded-lg transition-all"
              title="View Asadlee24 on GitHub"
            >
              <GithubIcon className="w-4 h-4" />
            </a>
            <a
              href="https://asad-lee-portfolio.vercel.app/"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:flex items-center space-x-1 px-2.5 py-1 text-xs font-mono rounded-lg bg-[#36D7E7]/10 text-[#36D7E7] border border-[#36D7E7]/30 hover:bg-[#36D7E7]/20 transition-all"
              title="View Asad Lee Portfolio"
            >
              <span>Portfolio</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

        </div>

      </div>
    </header>
  );
};
