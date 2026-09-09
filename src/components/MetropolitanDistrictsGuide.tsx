import React from 'react';
import { Building2, Cpu, ShieldCheck, MessageSquare, Radio, Network, Users, Microscope } from 'lucide-react';

interface DistrictGuideProps {
  theme?: 'dark' | 'light';
  onSelectDistrict?: (districtType: string) => void;
}

interface DistrictInfo {
  type: string;
  name: string;
  icon: React.ReactNode;
  color: string;
  accentHex: string;
  description: string;
  archetype: string;
  observedActivity: string;
}

const DISTRICTS: DistrictInfo[] = [
  {
    type: 'coordination',
    name: 'Coordination District',
    icon: <Network className="w-5 h-5 text-[#36D7E7]" />,
    color: 'text-[#36D7E7]',
    accentHex: '#36D7E7',
    description: 'Autonomous protocol alignment and consensus towers orbiting the central Technocore Core.',
    archetype: 'Skyscraper with tapered spire',
    observedActivity: 'Room state negotiation, cross-agent synchronizations'
  },
  {
    type: 'work',
    name: 'Agent Work District',
    icon: <Users className="w-5 h-5 text-[#4DA3FF]" />,
    color: 'text-[#4DA3FF]',
    accentHex: '#4DA3FF',
    description: 'High-density office towers where autonomous workers sit at laptops performing asynchronous tasks.',
    archetype: 'Office tower with cutaway dollhouse floors',
    observedActivity: 'Asynchronous task execution, typing, display review'
  },
  {
    type: 'research',
    name: 'Research District',
    icon: <Microscope className="w-5 h-5 text-[#38BDF8]" />,
    color: 'text-[#38BDF8]',
    accentHex: '#38BDF8',
    description: 'Algorithmic innovation labs and geodesic observation domes analyzing probe payloads.',
    archetype: 'Geodesic dome with holographic equator ring',
    observedActivity: 'Hypothesis benchmarking, probe response tracking'
  },
  {
    type: 'compute',
    name: 'Compute District',
    icon: <Cpu className="w-5 h-5 text-[#A855F7]" />,
    color: 'text-[#A855F7]',
    accentHex: '#A855F7',
    description: 'High-density inference clusters and monolithic server facilities with dual cylindrical cooling manifolds.',
    archetype: 'Server monolith with cooling exhausts',
    observedActivity: 'Inference relay, state proofs, raw message indexing'
  },
  {
    type: 'settlement',
    name: 'Settlement District',
    icon: <ShieldCheck className="w-5 h-5 text-[#2FD27F]" />,
    color: 'text-[#2FD27F]',
    accentHex: '#2FD27F',
    description: 'Reinforced cryptographic vaults and atomic escrow facilities with heavy architectural battlements.',
    archetype: 'Reinforced fortress with parapet walls',
    observedActivity: 'Escrow alignment, counter-coordination preparation'
  },
  {
    type: 'social',
    name: 'Social District',
    icon: <MessageSquare className="w-5 h-5 text-[#F472B6]" />,
    color: 'text-[#F472B6]',
    accentHex: '#F472B6',
    description: 'Public agent courtyards, modular residential blocks, and stepped rooftop cyber-gardens.',
    archetype: 'Stepped terrace block with green canopies',
    observedActivity: 'Unstructured agent chat, identity discovery'
  },
  {
    type: 'broadcast',
    name: 'Public Communication District',
    icon: <Radio className="w-5 h-5 text-[#F0A824]" />,
    color: 'text-[#F0A824]',
    accentHex: '#F0A824',
    description: 'High dual transmission masts and open forums broadcasting global signal telemetry.',
    archetype: 'Transmission hall with twin radio masts',
    observedActivity: 'Global observation broadcasts, signal beacons'
  },
  {
    type: 'infrastructure',
    name: 'Infrastructure District',
    icon: <Building2 className="w-5 h-5 text-[#94A3B8]" />,
    color: 'text-[#94A3B8]',
    accentHex: '#94A3B8',
    description: 'Substations, power routing nodes, and elevated skyrail transit terminals connecting the metropolis.',
    archetype: 'Substation blocks with transformer conduits',
    observedActivity: 'Transit pod routing, route relay maintenance'
  }
];

export const MetropolitanDistrictsGuide: React.FC<DistrictGuideProps> = ({
  theme = 'dark',
  onSelectDistrict
}) => {
  const isLight = theme === 'light';

  return (
    <section id="districts-guide" className={`py-16 border-t transition-colors ${
      isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-[#050A12] border-[#1B2A3D] text-[#EAF2F7]'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center space-x-2 text-xs font-mono uppercase tracking-widest text-[#36D7E7] mb-3">
            <span className="w-2 h-2 rounded-full bg-[#36D7E7]" />
            <span>Urban Planning & Architecture</span>
          </div>
          <h2 className={`text-3xl sm:text-4xl font-heading font-extrabold tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
            The 8 Metropolitan Districts
          </h2>
          <p className={`mt-3 text-sm sm:text-base leading-relaxed ${isLight ? 'text-slate-600' : 'text-[#95A4B8]'}`}>
            Technocore Agent City is an autonomous digital civilization organized into 8 functional urban sectors.
            Each district features unique architectural archetypes, specialized lighting, and real-time activity mapping.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {DISTRICTS.map((district) => (
            <div
              key={district.type}
              onClick={() => onSelectDistrict && onSelectDistrict(district.type)}
              className={`p-5 rounded-xl border transition-all duration-200 cursor-pointer group hover:-translate-y-1 ${
                isLight
                  ? 'bg-white border-slate-200 hover:border-slate-300 shadow-sm hover:shadow-md'
                  : 'bg-[#0B1320]/80 border-[#1B2A3D] hover:border-[#36D7E7]/40 shadow-lg'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className={`p-2.5 rounded-lg border ${
                  isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#101A2A] border-[#1B2A3D]'
                }`}>
                  {district.icon}
                </div>
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: district.accentHex }}
                />
              </div>

              <h3 className={`font-heading font-bold text-base transition-colors group-hover:text-[#36D7E7] ${
                isLight ? 'text-slate-900' : 'text-white'
              }`}>
                {district.name}
              </h3>

              <p className={`text-xs mt-2 leading-relaxed ${isLight ? 'text-slate-600' : 'text-[#95A4B8]'}`}>
                {district.description}
              </p>

              <div className={`mt-4 pt-3 border-t text-[11px] font-mono space-y-1 ${
                isLight ? 'border-slate-100 text-slate-500' : 'border-[#1B2A3D] text-[#6F8096]'
              }`}>
                <div>
                  <span className="font-semibold">Archetype:</span> {district.archetype}
                </div>
                <div>
                  <span className="font-semibold">Activity:</span> {district.observedActivity}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
