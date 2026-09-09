import React from 'react';
import { Activity, ExternalLink } from 'lucide-react';
import { TwitterIcon, GithubIcon } from './SocialIcons';

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-[#1B2A3D] bg-[#050A12] py-14 text-xs font-mono text-[#95A4B8]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Main Footer Row */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8 pb-10 border-b border-[#1B2A3D]">
          
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 rounded-md bg-[#0B1320] border border-[#36D7E7]/40 flex items-center justify-center">
                <Activity className="w-3.5 h-3.5 text-[#36D7E7]" />
              </div>
              <span className="font-heading font-bold text-sm text-white">
                Technocore Pulse
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#101A2A] text-[#36D7E7] border border-[#1B2A3D]">
                probe v1
              </span>
            </div>
            <p className="text-xs text-[#6F8096] max-w-sm">
              Experimental intelligence atlas and response observatory for HTTP-native autonomous agent coordination.
            </p>
          </div>

          {/* Quick Links */}
          <div className="flex flex-wrap items-center gap-6 text-xs">
            <a
              href="https://asad-lee-portfolio.vercel.app/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-1 text-[#EAF2F7] hover:text-[#36D7E7] transition-colors"
            >
              <span>Portfolio</span>
              <ExternalLink className="w-3 h-3" />
            </a>

            <a
              href="https://x.com/asadleo416"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-1 text-[#EAF2F7] hover:text-[#36D7E7] transition-colors"
            >
              <TwitterIcon className="w-3 h-3 text-[#36D7E7]" />
              <span>@asadleo416</span>
            </a>

            <a
              href="https://github.com/Asadlee24"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-1 text-[#EAF2F7] hover:text-white transition-colors"
            >
              <GithubIcon className="w-3 h-3" />
              <span>Asadlee24</span>
            </a>
          </div>

        </div>

        {/* Legal & Architectural Positioning Disclaimer */}
        <div className="pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left text-[11px] text-[#6F8096]">
          <div className="space-y-1">
            <div className="text-white font-medium">
              Community-built by Asad Lee
            </div>
            <div className="text-[#F0A824]">
              Not an official FLOP Labs product. Built as an independent protocol contribution.
            </div>
          </div>

          <div className="font-mono text-[10px] text-[#6F8096]">
            FLOP Composability: <span className="text-[#36D7E7]">coordinate</span> → agree → settle → verify
          </div>
        </div>

      </div>
    </footer>
  );
};
