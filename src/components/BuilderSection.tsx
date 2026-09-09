import React from 'react';
import { ExternalLink } from 'lucide-react';
import { TwitterIcon, GithubIcon } from './SocialIcons';

export const BuilderSection: React.FC = () => {
  const ecosystemProjects = [
    {
      name: 'Technocore Console',
      role: 'Core Management Surface',
      description: 'Developer workspace for monitoring room states, configuring agent listeners, and dispatching signed writes.',
      tag: 'Technocore Ecosystem'
    },
    {
      name: 'Technocore Explorer',
      role: 'Room & Message Ledger',
      description: 'Public real-time explorer indexing raw message events, room metadata, and agent write cadences.',
      tag: 'Observability'
    },
    {
      name: 'Technocore Agent Kit',
      role: 'Autonomous Client SDK',
      description: 'Zero-dependency TypeScript/Python SDK enabling autonomous agents to connect to Technocore rooms via HTTP.',
      tag: 'SDK / Tooling'
    },
    {
      name: 'Bridgr',
      role: 'Cross-Chain Coordination',
      description: 'Multi-network intent relayer aligning off-chain solver negotiations with atomic settlement escrows.',
      tag: 'Interoperability'
    },
    {
      name: 'Warp',
      role: 'State Synchronization Engine',
      description: 'Ultra-low-latency broadcast engine for high-frequency autonomous agent state consensus.',
      tag: 'Infra'
    },
    {
      name: 'MinterBot',
      role: 'Autonomous Execution Agent',
      description: 'Smart contract interaction daemon executing pre-agreed conditions based on Technocore coordination signals.',
      tag: 'Agent System'
    }
  ];

  return (
    <section id="builder" className="py-20 border-b border-[#1B2A3D] bg-[#050A12] relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="max-w-3xl">
          <div className="inline-flex items-center space-x-2 text-xs font-mono text-[#36D7E7] uppercase tracking-widest mb-3">
            <span className="w-2 h-2 rounded-full bg-[#36D7E7]" />
            <span>Open Source Builder</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-heading font-extrabold text-white tracking-tight">
            About the Builder
          </h2>
          <p className="mt-4 text-base sm:text-lg text-[#95A4B8] leading-relaxed">
            Technocore Pulse is a public research contribution designed and engineered by <strong className="text-white">Asad Lee</strong>.
          </p>
        </div>

        {/* Builder Profile Bio Card */}
        <div className="mt-12 p-6 sm:p-8 rounded-2xl bg-[#0B1320] border border-[#1B2A3D] shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          
          <div className="max-w-2xl">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-xl bg-[#101A2A] border border-[#36D7E7]/40 flex items-center justify-center font-heading font-bold text-xl text-[#36D7E7] shadow-lg shadow-[#36D7E7]/10">
                AL
              </div>
              <div>
                <h3 className="text-xl font-heading font-bold text-white">
                  Asad Lee
                </h3>
                <p className="text-xs font-mono text-[#95A4B8]">
                  Web3 Builder · Protocol Developer · Open-Source Contributor
                </p>
              </div>
            </div>

            <p className="mt-4 text-sm text-[#95A4B8] leading-relaxed">
              Focused on autonomous agent coordination, decentralized state machines, and zero-custody protocol architecture.
              Dedicated to building clean, high-impact public goods and observability tooling for emerging decentralized ecosystems.
            </p>

            <div className="mt-4 text-xs font-mono text-[#6F8096]">
              Presentation: <span className="text-[#36D7E7]">Community-built by Asad Lee</span> · Non-custodial research
            </div>
          </div>

          {/* Direct Author Action Links */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto flex-shrink-0">
            <a
              href="https://asad-lee-portfolio.vercel.app/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center space-x-2 px-5 py-3 rounded-xl bg-[#36D7E7] text-[#050A12] font-mono text-xs font-bold hover:bg-[#36D7E7]/90 active:scale-95 transition-all shadow-xl shadow-[#36D7E7]/20"
            >
              <span>View Portfolio</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>

            <a
              href="https://x.com/asadleo416"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center space-x-2 px-4 py-3 rounded-xl bg-[#101A2A] text-white border border-[#1B2A3D] font-mono text-xs hover:border-[#36D7E7]/40 transition-colors"
            >
              <TwitterIcon className="w-3.5 h-3.5 text-[#36D7E7]" />
              <span>Follow @asadleo416</span>
            </a>

            <a
              href="https://github.com/Asadlee24"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center space-x-2 px-4 py-3 rounded-xl bg-[#101A2A] text-white border border-[#1B2A3D] font-mono text-xs hover:border-[#36D7E7]/40 transition-colors"
            >
              <GithubIcon className="w-3.5 h-3.5 text-[#95A4B8]" />
              <span>GitHub / Asadlee24</span>
            </a>
          </div>

        </div>

        {/* Selected Portfolio / Ecosystem Projects Grid */}
        <div className="mt-12">
          <div className="flex items-center justify-between pb-4 border-b border-[#1B2A3D]">
            <div>
              <span className="text-xs font-mono text-[#6F8096] uppercase tracking-wider block">
                Selected Protocol & Tooling Portfolio
              </span>
              <h4 className="text-lg font-heading font-bold text-white mt-0.5">
                Related Agent Infrastructure & Products
              </h4>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
            {ecosystemProjects.map((proj) => (
              <div
                key={proj.name}
                className="p-5 rounded-2xl bg-[#0B1320] border border-[#1B2A3D] hover:border-[#36D7E7]/40 transition-all group"
              >
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded bg-[#101A2A] text-[#36D7E7] text-[10px] font-mono border border-[#1B2A3D]">
                    {proj.tag}
                  </span>
                  <span className="text-[11px] font-mono text-[#6F8096]">
                    by Asad Lee
                  </span>
                </div>

                <h5 className="font-heading font-bold text-base text-white mt-3 group-hover:text-[#36D7E7] transition-colors">
                  {proj.name}
                </h5>

                <div className="text-xs font-mono text-[#4DA3FF] mt-0.5">
                  {proj.role}
                </div>

                <p className="text-xs text-[#95A4B8] mt-2.5 leading-relaxed">
                  {proj.description}
                </p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </section>
  );
};
