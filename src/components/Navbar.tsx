import React from 'react';
import { Activity, ExternalLink, Layers, RefreshCw, Sun, Moon } from 'lucide-react';
import { TwitterIcon, GithubIcon } from './SocialIcons';
import { useData } from '../context/DataContext';

interface NavbarProps {
  onOpenRawEvents: () => void;
  theme?: 'dark' | 'light';
  onToggleTheme?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenRawEvents,
  theme = 'dark',
  onToggleTheme
}) => {
  const { observerHealth, isLiveLoading, refreshLiveData } = useData();
  const isLight = theme === 'light';

  return (
    <header className={`sticky top-0 z-50 w-full border-b backdrop-blur-xl transition-colors ${
      isLight
        ? 'bg-white/90 border-slate-200 text-slate-800 shadow-sm'
        : 'bg-[#050A12]/90 border-[#1B2A3D] text-[#EAF2F7]'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand Logo & Metropolis Indicator */}
        <div className="flex items-center space-x-3">
          <a href="#" className="flex items-center space-x-2.5 group">
            <div className={`relative w-8 h-8 rounded-lg border flex items-center justify-center transition-colors shadow-md ${
              isLight
                ? 'bg-sky-50 border-sky-300 group-hover:border-sky-500'
                : 'bg-[#0B1320] border-[#36D7E7]/40 group-hover:border-[#36D7E7]'
            }`}>
              <Activity className="w-4 h-4 text-[#36D7E7] animate-pulse" />
              <span className="absolute -top-1 -right-1 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#2FD27F] opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#2FD27F]" />
              </span>
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className={`font-heading font-bold text-base tracking-tight transition-colors ${
                  isLight ? 'text-slate-900 group-hover:text-[#0284C7]' : 'text-white group-hover:text-[#36D7E7]'
                }`}>
                  Technocore Agent City
                </span>
                <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                  isLight ? 'bg-sky-50 text-sky-700 border-sky-200' : 'bg-[#101A2A] text-[#36D7E7] border-[#1B2A3D]'
                }`}>
                  Metropolis
                </span>
              </div>
              <span className={`block text-[10px] font-mono ${isLight ? 'text-slate-500' : 'text-[#6F8096]'}`}>
                Community-built by Asad Lee
              </span>
            </div>
          </a>
        </div>

        {/* Navigation Anchors */}
        <nav className={`hidden md:flex items-center space-x-6 text-xs font-mono ${
          isLight ? 'text-slate-600' : 'text-[#95A4B8]'
        }`}>
          <a href="#signal-map" className={isLight ? 'hover:text-[#0284C7]' : 'hover:text-[#36D7E7]'}>
            3D City
          </a>
          <a href="#districts-guide" className={isLight ? 'hover:text-[#0284C7]' : 'hover:text-[#36D7E7]'}>
            Districts
          </a>
          <a href="#pulse-dashboard" className={isLight ? 'hover:text-[#0284C7]' : 'hover:text-[#36D7E7]'}>
            Observatory
          </a>
          <a href="#methodology" className={isLight ? 'hover:text-[#0284C7]' : 'hover:text-[#36D7E7]'}>
            Methodology
          </a>
          <a href="#builder" className={isLight ? 'hover:text-slate-900' : 'hover:text-white'}>
            Builder
          </a>
        </nav>

        {/* Controls: Theme Switcher, Live Telemetry & Links */}
        <div className="flex items-center space-x-2.5">
          
          {/* Theme Switcher in Navbar */}
          {onToggleTheme && (
            <button
              onClick={onToggleTheme}
              className={`p-2 rounded-xl border transition-all ${
                isLight
                  ? 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100 shadow-sm'
                  : 'bg-[#101A2A] text-[#F0A824] border-[#1B2A3D] hover:border-[#F0A824]/50'
              }`}
              title={isLight ? "Switch to Dark Night Theme" : "Switch to White/Daylight Theme"}
            >
              {isLight ? <Sun className="w-4 h-4 text-amber-600" /> : <Moon className="w-4 h-4 text-amber-400" />}
            </button>
          )}

          {/* Real-Time Live Feed Indicator & Refresh */}
          <div className={`flex items-center space-x-2 px-2.5 py-1 rounded-xl border shadow-inner ${
            isLight ? 'bg-slate-100 border-slate-200' : 'bg-[#0B1320] border-[#1B2A3D]'
          }`}>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#2FD27F] opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#2FD27F]" />
            </span>
            <span className="text-xs font-mono font-bold text-[#2FD27F]">
              LIVE
            </span>
            <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
              isLight ? 'bg-white text-slate-600 border-slate-200' : 'bg-[#101A2A] text-[#95A4B8] border-[#1B2A3D]'
            }`}>
              {observerHealth}
            </span>
            <button
              onClick={() => refreshLiveData()}
              disabled={isLiveLoading}
              className={`p-1 transition-colors ${isLight ? 'text-slate-600 hover:text-[#0284C7]' : 'text-[#95A4B8] hover:text-[#36D7E7]'}`}
              title="Refresh Live Data Feed"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLiveLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Raw Event Drawer Trigger */}
          <button
            onClick={onOpenRawEvents}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-mono border transition-all ${
              isLight
                ? 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 shadow-sm'
                : 'bg-[#101A2A] text-[#95A4B8] border-[#1B2A3D] hover:text-[#36D7E7]'
            }`}
            title="Inspect Raw Event Stream"
          >
            <Layers className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Events</span>
          </button>

          {/* Social Links */}
          <div className={`flex items-center space-x-1 pl-1 border-l ${isLight ? 'border-slate-200' : 'border-[#1B2A3D]'}`}>
            <a
              href="https://x.com/asadleo416"
              target="_blank"
              rel="noopener noreferrer"
              className={`p-1.5 rounded-lg transition-all ${
                isLight ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100' : 'text-[#95A4B8] hover:text-[#36D7E7] hover:bg-[#101A2A]'
              }`}
              title="Follow @asadleo416 on X"
            >
              <TwitterIcon className="w-4 h-4" />
            </a>
            <a
              href="https://github.com/Asadlee24"
              target="_blank"
              rel="noopener noreferrer"
              className={`p-1.5 rounded-lg transition-all ${
                isLight ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100' : 'text-[#95A4B8] hover:text-white hover:bg-[#101A2A]'
              }`}
              title="View Asadlee24 on GitHub"
            >
              <GithubIcon className="w-4 h-4" />
            </a>
            <a
              href="https://asad-lee-portfolio.vercel.app/"
              target="_blank"
              rel="noopener noreferrer"
              className={`hidden sm:flex items-center space-x-1 px-2.5 py-1 text-xs font-mono rounded-lg transition-all ${
                isLight
                  ? 'bg-sky-50 text-sky-800 border border-sky-300 hover:bg-sky-100'
                  : 'bg-[#36D7E7]/10 text-[#36D7E7] border border-[#36D7E7]/30 hover:bg-[#36D7E7]/20'
              }`}
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
