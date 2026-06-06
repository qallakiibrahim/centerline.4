
import React from 'react';
import { MachinePoint, PointStatus, Criticality } from '../types';
import { Search, AlertTriangle, CheckCircle2, Tag, Filter, ChevronDown } from 'lucide-react';
import { CRITICALITY_COLORS } from '../constants';
import { translations } from '../translations';

import CustomSelect from './CustomSelect';

interface ParameterTableProps {
  points: MachinePoint[];
  sections: string[];
  activeRecipe?: string;
  onPointSelect: (point: MachinePoint) => void;
  onUpdatePoint: (point: MachinePoint) => void;
  getQrUrl: (id: string, size?: number) => string;
  theme?: 'light' | 'dark';
  sectionFilter?: string;
  onSectionFilterChange?: (value: string) => void;
}

const ParameterTable: React.FC<ParameterTableProps> = ({ 
  points, 
  sections, 
  activeRecipe, 
  onPointSelect, 
  onUpdatePoint, 
  getQrUrl, 
  theme = 'dark',
  sectionFilter: propSectionFilter,
  onSectionFilterChange: propOnSectionFilterChange
}) => {
  const [filter, setFilter] = React.useState('');
  const [localSectionFilter, setLocalSectionFilter] = React.useState<string | 'All'>('All');
  const [statusFilter, setStatusFilter] = React.useState<PointStatus | 'All'>('All');
  const t = translations.sv;

  const sectionFilter = propSectionFilter !== undefined ? propSectionFilter : localSectionFilter;
  const setSectionFilter = propOnSectionFilterChange !== undefined ? propOnSectionFilterChange : setLocalSectionFilter;

  const filteredPoints = points.filter(p => {
    const matchesText = p.name.toLowerCase().includes(filter.toLowerCase()) || p.id.toLowerCase().includes(filter.toLowerCase());
    const matchesSection = sectionFilter === 'All' || p.section === sectionFilter;
    const matchesStatus = statusFilter === 'All' || p.status === statusFilter;
    return matchesText && matchesSection && matchesStatus;
  });

  const handleStatusToggle = (e: React.MouseEvent, point: MachinePoint, newStatus: PointStatus) => {
    e.stopPropagation();
    onUpdatePoint({ ...point, status: newStatus, lastChecked: new Date().toISOString() });
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-[#E2E8F0] dark:border-gray-700 shadow-xl overflow-hidden flex flex-col h-full print:bg-white print:border-black print:rounded-none print:shadow-none transition-colors duration-300">
      
      <div className="p-4 border-b border-[#E2E8F0] dark:border-gray-700 flex flex-col lg:flex-row gap-4 justify-between bg-slate-50 dark:bg-gray-900/50 print:hidden">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 dark:text-gray-500" size={18} />
          <input 
            type="text" 
            placeholder={t.searchPlaceholder}
            className="w-full bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 text-[#0F172A] dark:text-white pl-10 pr-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <CustomSelect
            value={sectionFilter}
            onChange={(val) => setSectionFilter(val)}
            options={[
              { value: 'All', label: t.allSections },
              ...sections.map(s => ({ value: s, label: s }))
            ]}
            placeholder={t.allSections}
            icon={<Filter size={14} className="text-slate-500 dark:text-gray-400" />}
            variant="filter"
            className="min-w-[160px]"
          />

          <CustomSelect
            value={statusFilter}
            onChange={(val) => setStatusFilter(val as any)}
            options={[
              { value: 'All', label: t.allStatus },
              ...Object.values(PointStatus).map(s => ({ value: s, label: s }))
            ]}
            placeholder={t.allStatus}
            icon={<Tag size={14} className="text-slate-500 dark:text-gray-400" />}
            variant="filter"
            className="min-w-[160px]"
          />
        </div>
      </div>

      <div className="grid grid-cols-12 gap-2 px-6 py-3 bg-slate-50 dark:bg-gray-900 text-[10px] uppercase font-black text-slate-500 tracking-widest border-b border-[#E2E8F0] dark:border-gray-700 print:bg-gray-100 print:text-black print:border-black">
        <div className="col-span-1">{t.number}</div>
        <div className="col-span-4 print:col-span-5">{t.parameterAndCriticality}</div>
        <div className="col-span-3 text-center print:hidden">{t.statusAction}</div>
        <div className="col-span-2 text-right print:col-span-3 print:text-right">{t.value}</div>
        <div className="col-span-2 text-right pr-4">QR</div>
        <div className="hidden print:block col-span-1 text-right italic font-normal">{t.sign}</div>
      </div>

      <div className="overflow-y-auto flex-1 divide-y divide-[#E2E8F0] dark:divide-gray-700 print:divide-black print:overflow-visible">
        {filteredPoints.map((point) => {
          const hasOverride = activeRecipe && point.recipeTargets?.[activeRecipe];
          const displayTarget = hasOverride ? point.recipeTargets![activeRecipe].targetValue : point.targetValue;
          const displayTolerance = hasOverride ? point.recipeTargets![activeRecipe].tolerance : point.tolerance;

          return (
            <div 
              key={point.id} 
              onClick={() => onPointSelect(point)}
              className={`grid grid-cols-12 gap-2 px-6 py-4 items-center hover:bg-slate-50 dark:hover:bg-gray-700/50 cursor-pointer group transition-colors print:text-black print:py-5 print:break-inside-avoid ${point.status === PointStatus.TAGGED_RED ? 'bg-red-50 dark:bg-red-900/10' : point.status === PointStatus.TAGGED_YELLOW ? 'bg-amber-50 dark:bg-orange-900/10' : ''}`}
            >
              <div className="col-span-1 font-mono text-slate-400 dark:text-gray-500 group-hover:text-blue-600 dark:group-hover:text-white font-bold print:text-black print:text-xl print:italic">{point.number}</div>
              <div className="col-span-4 print:col-span-5 space-y-2">
                <div>
                  <div className="font-bold text-slate-800 dark:text-gray-200 group-hover:text-blue-600 dark:group-hover:text-blue-300 transition-colors leading-tight print:text-black print:text-lg">{point.name}</div>
                  <div className="text-[10px] text-slate-500 italic mt-0.5 print:text-gray-600">{point.measureMethod}</div>
                </div>
                <div className="flex items-center gap-2 print:hidden">
                  <span className={`w-2 h-2 rounded-full ${CRITICALITY_COLORS[point.criticality]}`}></span>
                  <span className="text-[9px] text-slate-500 font-bold uppercase">{point.criticality.split(':')[0]}</span>
                </div>
              </div>
              
              <div className="col-span-3 flex flex-col items-center gap-2 print:hidden">
                {point.status && point.status !== PointStatus.OK ? (
                  <div className={`flex items-center gap-1 px-2 py-1 rounded text-[9px] font-black uppercase tracking-tighter ${
                    point.status === PointStatus.TAGGED_RED ? 'bg-[#DC2626] text-white' : 
                    point.status === PointStatus.TAGGED_YELLOW ? 'bg-[#D97706] text-white' : 
                    'bg-yellow-600 text-white'
                  }`}>
                    <AlertTriangle size={10} /> {point.status}
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-green-500 text-[9px] font-bold uppercase">
                    <CheckCircle2 size={12} /> OK
                  </div>
                )}
                
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={(e) => handleStatusToggle(e, point, PointStatus.OK)}
                    className="p-1 bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400 rounded hover:bg-green-600 hover:text-white transition-colors"
                    title={t.markAsOk}
                  >
                    <CheckCircle2 size={14} />
                  </button>
                  <button 
                    onClick={(e) => handleStatusToggle(e, point, PointStatus.TAGGED_YELLOW)}
                    className="p-1 bg-amber-100 dark:bg-orange-900/40 text-amber-600 dark:text-orange-400 rounded hover:bg-[#D97706] hover:text-white transition-colors"
                    title={t.tagYellow}
                  >
                    <Tag size={14} />
                  </button>
                  <button 
                    onClick={(e) => handleStatusToggle(e, point, PointStatus.TAGGED_RED)}
                    className="p-1 bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 rounded hover:bg-[#DC2626] hover:text-white transition-colors"
                    title={t.tagRed}
                  >
                    <AlertTriangle size={14} />
                  </button>
                </div>
              </div>

              <div className="col-span-2 text-right print:col-span-3 flex flex-col items-end">
                <div className="font-mono text-green-600 dark:text-green-400 font-black text-xl leading-none print:text-black print:text-2xl">{displayTarget}</div>
                {hasOverride && (
                  <span className="text-[8px] bg-cyan-500/15 border border-cyan-500/20 text-cyan-600 dark:text-cyan-400 font-extrabold px-1 py-0.2 rounded-md mt-1 uppercase tracking-wider print:hidden">
                    Formatunikt
                  </span>
                )}
                <div className="text-[10px] text-slate-500 font-bold italic mt-1 print:text-gray-700">{t.tolerance} {displayTolerance || 'Standard'}</div>
              </div>

              <div className="col-span-2 flex justify-end pr-2">
                 <div className="bg-white p-2 rounded shadow-2xl group-hover:scale-[2.5] transition-transform origin-right z-20 print:shadow-none print:border print:border-black print:p-1">
                   <img src={getQrUrl(point.id, 200)} alt="QR" className="w-8 h-8 block print:w-14 print:h-14" />
                 </div>
              </div>

              <div className="hidden print:block col-span-1 border-b border-gray-300 h-8 ml-2"></div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ParameterTable;

