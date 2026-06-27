import React, { useState, useMemo } from 'react';
import { MachinePoint, PointHistoryLog, PointStatus, Criticality } from '../types';
import { isSectionMatch } from '../App';
import { 
  BarChart3, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2, 
  Search, 
  SlidersHorizontal, 
  Info, 
  ArrowUpRight, 
  ArrowDownRight, 
  Zap, 
  Filter, 
  ListFilter,
  Check,
  ChevronDown,
  X
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ReferenceLine, 
  ResponsiveContainer 
} from 'recharts';

interface DashboardViewProps {
  points: MachinePoint[];
  pointHistory: PointHistoryLog[];
  theme?: 'dark' | 'light';
  sections: string[];
  selectedLineName?: string;
  selectedMachineName?: string;
  activeRecipe?: string;
}

// Helpers for numeric parsing matching the proven HistoryView spec
const extractNumericValue = (str: string | undefined | null): number | null => {
  if (!str) return null;
  const normalized = str.toString().replace(',', '.');
  const matches = normalized.match(/-?[0-9]+(?:\.[0-9]+)?/g);
  if (matches && matches.length > 0) {
    return parseFloat(matches[matches.length - 1]);
  }
  return null;
};

const getTolerances = (point: MachinePoint, activeRecipe?: string) => {
  // Use recipe override if exists
  let targetStr = point.targetValue;
  let tolStr = point.tolerance || '';

  if (activeRecipe && point.recipeTargets?.[activeRecipe]) {
    targetStr = point.recipeTargets[activeRecipe].targetValue;
    tolStr = point.recipeTargets[activeRecipe].tolerance;
  }

  const target = extractNumericValue(targetStr);
  if (target === null) return { target: null, min: null, max: null, rawTarget: targetStr, rawTolerance: tolStr };

  // Parse tolerance e.g. "±0.5", "+-0.5", "+/-0.5"
  if (tolStr.includes('±') || tolStr.toLowerCase().includes('+-') || tolStr.toLowerCase().includes('+/-')) {
    const match = tolStr.replace(',', '.').match(/[0-9]+(?:\.[0-9]+)?/);
    if (match) {
      const tol = parseFloat(match[0]);
      return {
        target,
        min: target - tol,
        max: target + tol,
        rawTarget: targetStr,
        rawTolerance: tolStr
      };
    }
  }

  // Range e.g. "8.0 - 10.0" (dash/hyphen/en-dash supported)
  const rangeMatch = tolStr.replace(',', '.').match(/([0-9]+(?:\.[0-9]+)?)\s*[-–]\s*([0-9]+(?:\.[0-9]+)?)/);
  if (rangeMatch) {
    const min = parseFloat(rangeMatch[1]);
    const max = parseFloat(rangeMatch[2]);
    return {
      target,
      min,
      max,
      rawTarget: targetStr,
      rawTolerance: tolStr
    };
  }

  // Simple numeric
  const parsedTol = extractNumericValue(tolStr);
  if (parsedTol !== null) {
    return {
      target,
      min: target - parsedTol,
      max: target + parsedTol,
      rawTarget: targetStr,
      rawTolerance: tolStr
    };
  }

  return { target, min: null, max: null, rawTarget: targetStr, rawTolerance: tolStr };
};

export const DashboardView: React.FC<DashboardViewProps> = ({
  points,
  pointHistory = [],
  theme = 'dark',
  sections = [],
  selectedLineName = '',
  selectedMachineName = '',
  activeRecipe = ''
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSection, setSelectedSection] = useState('All');
  const [criticalityFilter, setCriticalityFilter] = useState<'All' | 'P1' | 'P2' | 'P3'>('All');
  const [statusFilter, setStatusFilter] = useState<'all' | 'ok' | 'tagged' | 'drift' | 'out_of_spec'>('all');
  
  // Track expanded cards to show detailed measurement tables & metadata
  const [expandedPointId, setExpandedPointId] = useState<string | null>(null);

  // Group history logs under point IDs dynamically
  const pointLogsMap = useMemo(() => {
    const map: Record<string, PointHistoryLog[]> = {};
    pointHistory.forEach(log => {
      if (!map[log.pointId]) map[log.pointId] = [];
      map[log.pointId].push(log);
    });
    // Sort oldest to newest for Recharts time axes
    Object.keys(map).forEach(pid => {
      map[pid].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    });
    return map;
  }, [pointHistory]);

  // Compute status and analytical metrics for all points in current machine context
  const analyzedPoints = useMemo(() => {
    return points.map(p => {
      const logs = pointLogsMap[p.id] || [];
      const latestLog = logs.length > 0 ? logs[logs.length - 1] : null;
      
      const { target, min, max, rawTarget, rawTolerance } = getTolerances(p, activeRecipe);
      
      let trend: 'stable' | 'up' | 'down' | 'no_data' = 'no_data';
      let stats = {
        avg: null as number | null,
        variance: null as number | null,
        minLogged: null as number | null,
        maxLogged: null as number | null,
        stdDev: null as number | null,
        isCurrentlyOutOfSpec: false,
        isDrifting: false // drifting is defined as a sequence of points steering away or multiple checks far from centerline
      };

      const numericValues = logs
        .map(l => extractNumericValue(l.value))
        .filter((v): v is number => v !== null);

      if (numericValues.length > 0) {
        const sum = numericValues.reduce((acc, curr) => acc + curr, 0);
        const avg = sum / numericValues.length;
        stats.avg = Math.round(avg * 100) / 100;
        stats.minLogged = Math.min(...numericValues);
        stats.maxLogged = Math.max(...numericValues);

        // Standard Deviation
        if (numericValues.length > 1) {
          const sqDiffs = numericValues.map(v => Math.pow(v - avg, 2));
          const avgSqDiff = sqDiffs.reduce((a, b) => a + b, 0) / (numericValues.length - 1);
          stats.stdDev = Math.round(Math.sqrt(avgSqDiff) * 100) / 100;
        } else {
          stats.stdDev = 0;
        }

        // Calculate Trend based on last 3 measurements
        if (numericValues.length >= 2) {
          const len = numericValues.length;
          const diff = numericValues[len - 1] - numericValues[len - 2];
          trend = diff > 0.05 ? 'up' : diff < -0.05 ? 'down' : 'stable';
        } else {
          trend = 'stable';
        }

        // Determine if currently out of specification
        const latestVal = extractNumericValue(latestLog?.value);
        if (latestVal !== null) {
          if ((min !== null && latestVal < min) || (max !== null && latestVal > max)) {
            stats.isCurrentlyOutOfSpec = true;
          }

          // Drift: if average value is shifted from target by more than 50% of the tolerance range
          if (target !== null && min !== null && max !== null) {
            const toleranceWidth = (max - min) / 2;
            if (toleranceWidth > 0 && Math.abs(latestVal - target) > (toleranceWidth * 0.7)) {
              stats.isDrifting = true;
            }
          }
        }
      }

      // Check current or historical tag statuses
      const isTagged = p.status === PointStatus.TAGGED_RED || p.status === PointStatus.TAGGED_YELLOW || 
                      (latestLog && (latestLog.status === PointStatus.TAGGED_RED || latestLog.status === PointStatus.TAGGED_YELLOW));

      return {
        point: p,
        logs,
        latestLog,
        target,
        min,
        max,
        rawTarget,
        rawTolerance,
        stats,
        trend,
        isTagged
      };
    });
  }, [points, pointLogsMap, activeRecipe]);

  // Apply search filtering and segment analytics
  const filteredAnalyzedPoints = useMemo(() => {
    return analyzedPoints.filter(item => {
      const p = item.point;
      const matchesSearch = 
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.description.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesSection = selectedSection === 'All' || isSectionMatch(p.section || '', selectedSection);

      let matchesCriticality = true;
      if (criticalityFilter === 'P1') matchesCriticality = p.criticality === Criticality.P1;
      if (criticalityFilter === 'P2') matchesCriticality = p.criticality === Criticality.P2;
      if (criticalityFilter === 'P3') matchesCriticality = p.criticality === Criticality.P3;

      let matchesStatus = true;
      if (statusFilter === 'ok') {
        matchesStatus = !item.isTagged && !item.stats.isCurrentlyOutOfSpec;
      } else if (statusFilter === 'tagged') {
        matchesStatus = !!item.isTagged;
      } else if (statusFilter === 'out_of_spec') {
        matchesStatus = item.stats.isCurrentlyOutOfSpec;
      } else if (statusFilter === 'drift') {
        matchesStatus = item.stats.isDrifting;
      }

      return matchesSearch && matchesSection && matchesCriticality && matchesStatus;
    });
  }, [analyzedPoints, searchTerm, selectedSection, criticalityFilter, statusFilter]);

  // Overall Statistics Panel for Process Engineer
  const systemMetrics = useMemo(() => {
    const total = analyzedPoints.length;
    const okCount = analyzedPoints.filter(i => !i.isTagged && !i.stats.isCurrentlyOutOfSpec).length;
    const taggedCount = analyzedPoints.filter(i => i.isTagged).length;
    const outOfSpecCount = analyzedPoints.filter(i => i.stats.isCurrentlyOutOfSpec).length;
    const driftingCount = analyzedPoints.filter(i => i.stats.isDrifting).length;
    
    return {
      total,
      okCount,
      taggedCount,
      outOfSpecCount,
      driftingCount,
      yieldPercent: total > 0 ? Math.round((okCount / total) * 100) : 100
    };
  }, [analyzedPoints]);

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-200 dark:border-gray-800 pb-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white uppercase tracking-wider italic flex flex-wrap items-center gap-2">
            Centerline Analys-Dashboard <span className="text-xs font-normal not-italic text-indigo-500 font-mono bg-indigo-500/10 px-2.5 py-1 rounded-full">{selectedMachineName || 'Process'}</span>
          </h2>
          <p className="text-xs text-slate-500 font-mono mt-1">
            Realtidsövervakning av alla parametertrender, toleransavvikelser och statistiska mätvärdesdrifter.
          </p>
        </div>
        
        {activeRecipe && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-500 text-xs font-bold font-mono rounded-lg">
            <Zap size={14} className="animate-pulse" />
            <span>FORMAT: {activeRecipe}</span>
          </div>
        )}
      </div>

      {/* SYSTEM QUALITY & METRICS GRID */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 sm:gap-4">
        
        {/* Metric Card: Status Index */}
        <div className={`p-4 rounded-2xl border ${
          systemMetrics.yieldPercent >= 90 ? 'bg-emerald-500/5 border-emerald-500/20' : 
          systemMetrics.yieldPercent >= 75 ? 'bg-amber-500/5 border-amber-500/20' : 'bg-red-500/5 border-red-500/20'
        } flex flex-col justify-between`}>
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Kvalitetsindex</span>
          <div className="mt-2 flex items-baseline gap-1">
            <span className={`text-2xl sm:text-3xl font-black font-mono ${
              systemMetrics.yieldPercent >= 90 ? 'text-emerald-500' : 
              systemMetrics.yieldPercent >= 75 ? 'text-amber-500' : 'text-red-500'
            }`}>{systemMetrics.yieldPercent}%</span>
          </div>
          <p className="text-[9px] text-slate-500 font-medium mt-1">Stabil centerline ratio</p>
        </div>

        {/* Metric Card: Total Monitored */}
        <div className={`p-4 rounded-2xl border ${theme === 'dark' ? 'bg-gray-900/60 border-gray-800' : 'bg-white border-slate-200'} flex flex-col justify-between`}>
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">parametrar</span>
          <div className="mt-2 text-2xl sm:text-3xl font-black font-mono text-gray-900 dark:text-white">
            {systemMetrics.total}
          </div>
          <p className="text-[9px] text-slate-500 font-medium mt-1">Totalt i databasen</p>
        </div>

        {/* Metric Card: OK Status */}
        <div className="p-4 rounded-2xl border bg-emerald-500/5 border-emerald-500/10 flex flex-col justify-between">
          <span className="text-[10px] font-black uppercase tracking-wider text-emerald-500">Inom Tolerans</span>
          <div className="mt-2 text-2xl sm:text-3xl font-black font-mono text-emerald-500">
            {systemMetrics.okCount}
          </div>
          <p className="text-[9px] text-emerald-500/80 font-medium mt-1">Inget avvikande mätvärde</p>
        </div>

        {/* Metric Card: Out of Spec */}
        <div className={`p-4 rounded-2xl border ${systemMetrics.outOfSpecCount > 0 ? 'bg-red-500/10 border-red-500/20' : 'bg-gray-500/5 border-gray-100 dark:border-gray-800'} flex flex-col justify-between`}>
          <span className="text-[10px] font-black uppercase tracking-wider text-red-500">Utanför Tolerans</span>
          <div className="mt-2 text-2xl sm:text-3xl font-black font-mono text-red-500">
            {systemMetrics.outOfSpecCount}
          </div>
          <p className="text-[9px] text-red-500/80 font-medium mt-1">Börvärdes-gränser brutna</p>
        </div>

        {/* Metric Card: Drifting */}
        <div className={`p-4 rounded-2xl border ${systemMetrics.driftingCount > 0 ? 'bg-amber-500/10 border-amber-500/20' : 'bg-gray-500/5 border-gray-100 dark:border-gray-800'} flex flex-col justify-between`}>
          <span className="text-[10px] font-black uppercase tracking-wider text-amber-500">Varna för Drift</span>
          <div className="mt-2 text-2xl sm:text-3xl font-black font-mono text-amber-500">
            {systemMetrics.driftingCount}
          </div>
          <p className="text-[9px] text-amber-500/80 font-medium mt-1">Drift i ytterzon (&gt;70% av tol)</p>
        </div>

        {/* Metric Card: Active Red/Yellow Tags */}
        <div className={`p-4 rounded-2xl border ${systemMetrics.taggedCount > 0 ? 'bg-orange-500/10 border-orange-500/20' : 'bg-gray-500/5 border-gray-100 dark:border-gray-800'} flex flex-col justify-between`}>
          <span className="text-[10px] font-black uppercase tracking-wider text-orange-400">Aktiva Taggar</span>
          <div className="mt-2 text-2xl sm:text-3xl font-black font-mono text-orange-400">
            {systemMetrics.taggedCount}
          </div>
          <p className="text-[9px] text-slate-500 font-medium mt-1">Röda/gula flaggor skapade</p>
        </div>

      </div>

      {/* FILTERS & SEARCH CONTROL CONTROLLER */}
      <div className={`p-4 sm:p-5 rounded-2xl border ${theme === 'dark' ? 'bg-gray-900 border-gray-800' : 'bg-white border-slate-200'} space-y-4`}>
        <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
          
          {/* Search bar */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" size={16} />
            <input
              type="text"
              placeholder="Hitta centerline-parameter på ID, namn eller åtgärd..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full pl-10 pr-4 py-2 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 border ${
                theme === 'dark' ? 'bg-gray-800/80 border-gray-700 text-white placeholder-gray-500' : 'bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400'
              }`}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            
            {/* Section cascade */}
            <div className="flex items-center gap-1">
              <span className="text-[10px] font-black text-slate-500 uppercase mr-1">Sektion:</span>
              <select
                value={selectedSection}
                onChange={(e) => setSelectedSection(e.target.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                  theme === 'dark' ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-slate-200 text-slate-700'
                }`}
              >
                <option value="All">Alla Sektioner</option>
                {sections.map(sec => (
                  <option key={sec} value={sec}>{sec}</option>
                ))}
              </select>
            </div>

            {/* Criticality selector */}
            <div className="flex items-center gap-1">
              <span className="text-[10px] font-black text-slate-500 uppercase mr-1">Klass:</span>
              <select
                value={criticalityFilter}
                onChange={(e) => setCriticalityFilter(e.target.value as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                  theme === 'dark' ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-slate-200 text-slate-700'
                }`}
              >
                <option value="All">Alla (P1-P3)</option>
                <option value="P1">P1 (Kritiska)</option>
                <option value="P2">P2 (Viktiga)</option>
                <option value="P3">P3 (Standard)</option>
              </select>
            </div>

          </div>

        </div>

        {/* Quick status segments */}
        <div className="flex flex-wrap gap-1.5 items-center border-t border-gray-100 dark:border-gray-800/60 pt-3 text-xs">
          <span className="text-[10px] font-black text-slate-500 uppercase mr-2 flex items-center gap-1">
            <SlidersHorizontal size={12} />
            Sortering / status:
          </span>
          {[
            { id: 'all', label: `Alla parametrar (${systemMetrics.total})`, color: 'hover:bg-indigo-500/10 active:bg-indigo-500/20' },
            { id: 'ok', label: `Inom standard/OK (${systemMetrics.okCount})`, color: 'text-emerald-500 border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10' },
            { id: 'out_of_spec', label: `Utanför Tolerans (${systemMetrics.outOfSpecCount})`, color: 'text-red-500 border-red-500/20 bg-red-500/5 hover:bg-red-500/10' },
            { id: 'drift', label: `Tolerans-varningsdrift (${systemMetrics.driftingCount})`, color: 'text-amber-500 border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/10' },
            { id: 'tagged', label: `Aktivt Taggade (${systemMetrics.taggedCount})`, color: 'text-orange-400 border-orange-500/20 bg-orange-500/5 hover:bg-orange-500/10' }
          ].map(opt => (
            <button
              key={opt.id}
              onClick={() => setStatusFilter(opt.id as any)}
              className={`px-2.5 py-1 rounded-lg border text-[10px] font-bold transition-all cursor-pointer ${
                statusFilter === opt.id 
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-md scale-[1.02]' 
                  : `${theme === 'dark' ? 'bg-gray-800/40 border-gray-700/60 text-gray-400' : 'bg-slate-100 border-slate-200 text-slate-600'} ${opt.color}`
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

      </div>

      {/* PARAMETERS LINE GRAPHS GRID (MULTI-PANEL) */}
      {filteredAnalyzedPoints.length === 0 ? (
        <div className={`p-12 text-center rounded-3xl border border-dashed ${theme === 'dark' ? 'border-gray-800 bg-gray-900/20' : 'border-slate-200 bg-slate-50/50'}`}>
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center mx-auto mb-4">
            <Info size={24} />
          </div>
          <p className="text-sm font-bold text-gray-900 dark:text-white">Inga Centerline-parametrar matchar dina sökfilter</p>
          <p className="text-xs text-slate-500 mt-1 font-mono">Prova att ändra filtrering eller sök efter en annan sektion.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredAnalyzedPoints.map(({ point: p, logs, latestLog, target, min, max, rawTarget, rawTolerance, stats, trend, isTagged }) => {
            
            // Format chart-friendly coordinates from history logs
            const chartData = logs
              .map(log => {
                const dateObj = new Date(log.timestamp);
                const measuredVal = extractNumericValue(log.value);
                const tgt = extractNumericValue(log.targetValue) ?? target ?? 0;
                
                return {
                  date: dateObj.toLocaleDateString('sv-SE', { month: 'numeric', day: 'numeric' }) + ' ' + dateObj.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' }),
                  värde: measuredVal,
                  börvärde: tgt,
                  minLimit: min ?? undefined,
                  maxLimit: max ?? undefined,
                  rawLog: log
                };
              })
              .filter(d => d.värde !== null);

            const isCurrentlyOk = !isTagged && !stats.isCurrentlyOutOfSpec;
            const currentValStr = latestLog ? latestLog.value : 'Ingen';

            return (
              <div 
                key={p.id}
                className={`rounded-2xl border transition-all duration-300 hover:shadow-lg flex flex-col justify-between ${
                  theme === 'dark' 
                    ? 'bg-gray-900/80 border-gray-800 hover:border-gray-700(10)' 
                    : 'bg-white border-slate-200 hover:border-indigo-100'
                } ${
                  stats.isCurrentlyOutOfSpec ? 'ring-1 ring-red-500/30' : 
                  stats.isDrifting ? 'ring-1 ring-amber-500/25' : ''
                }`}
              >
                {/* Visual Header */}
                <div className="p-4 border-b border-gray-100 dark:border-gray-800/80">
                  <div className="flex items-start justify-between gap-1.5">
                    <div>
                      <span className="text-[10px] font-black font-mono text-indigo-500 uppercase tracking-widest bg-indigo-500/10 px-2 py-0.5 rounded">
                        {p.id}
                      </span>
                      <span className="text-[10px] font-bold text-slate-500 font-mono ml-1.5">
                        #{p.number}
                      </span>
                      <h4 className="text-xs sm:text-sm font-extrabold text-[#0F172A] dark:text-white capitalize truncate mt-1.5" title={p.name}>
                        {p.name}
                      </h4>
                    </div>

                    {/* Status Dot / Indicator */}
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      {isTagged ? (
                        <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-orange-400 bg-orange-500/5 px-2 py-0.5 rounded-full border border-orange-500/20">
                          <AlertTriangle size={10} /> TAGG
                        </span>
                      ) : stats.isCurrentlyOutOfSpec ? (
                        <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-red-500 bg-red-500/5 px-2 py-0.5 rounded-full border border-red-500/20">
                          <AlertTriangle size={10} /> UTANFÖR
                        </span>
                      ) : stats.isDrifting ? (
                        <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-amber-500 bg-amber-500/5 px-2 py-0.5 rounded-full border border-amber-500/20">
                          <TrendingUp size={10} /> DRIFT
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-emerald-500 bg-emerald-500/5 px-2 py-0.5 rounded-full border border-emerald-500/10">
                          <CheckCircle2 size={10} /> OK
                        </span>
                      )}

                      {/* Criticality Label */}
                      <span className={`text-[8px] font-black uppercase tracking-widest font-mono ${
                        p.criticality === Criticality.P1 ? 'text-red-500' :
                        p.criticality === Criticality.P2 ? 'text-amber-500' : 'text-slate-500'
                      }`}>
                        {p.criticality === Criticality.P1 ? 'P1 KRITISK' :
                         p.criticality === Criticality.P2 ? 'P2 VIKTIG' : 'P3 STANDARD'}
                      </span>
                    </div>
                  </div>

                  <p className="text-[10px] text-slate-500 font-mono mt-1 border-t border-gray-100 dark:border-gray-800/40 pt-1 flex items-center justify-between">
                    <span>Sektion: <strong className="text-gray-700 dark:text-gray-300">{p.section}</strong></span>
                    {latestLog && (
                      <span className="text-[9px] text-[#94A3B8]">Loggad {new Date(latestLog.timestamp).toLocaleDateString('sv-SE')}</span>
                    )}
                  </p>
                </div>

                {/* TARGET & METRICS VALUES SUMMARY */}
                <div className="px-4 py-2 bg-slate-50/50 dark:bg-black/20 text-[10px] border-b border-gray-100 dark:border-gray-800/40 grid grid-cols-3 gap-2">
                  <div>
                    <span className="block text-slate-500 uppercase font-black text-[8px] tracking-wider">Centerline-Bör</span>
                    <strong className="text-indigo-500 dark:text-indigo-400 font-mono">{rawTarget} ({rawTolerance || '±0'})</strong>
                  </div>
                  <div>
                    <span className="block text-slate-500 uppercase font-black text-[8px] tracking-wider">Senaste värde</span>
                    <strong className={`font-mono ${
                      stats.isCurrentlyOutOfSpec ? 'text-red-500' :
                      stats.isDrifting ? 'text-amber-500' : 'text-emerald-500'
                    }`}>{currentValStr}</strong>
                  </div>
                  <div>
                    <span className="block text-slate-500 uppercase font-black text-[8px] tracking-wider">Statistik (Medel)</span>
                    <strong className="text-gray-700 dark:text-gray-300 font-mono">
                      {stats.avg !== null ? `${stats.avg} (±${stats.stdDev || 0})` : 'Saknas'}
                    </strong>
                  </div>
                </div>

                {/* LINE CHART ELEMENT */}
                <div className="p-3 bg-black/5 dark:bg-black/30 h-36 border-b border-gray-100 dark:border-gray-800/40 relative flex flex-col justify-end">
                  {chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData} margin={{ top: 12, right: 12, bottom: 5, left: -25 }}>
                        <XAxis 
                          dataKey="date" 
                          tick={{ fontSize: 7, fill: theme === 'dark' ? '#475569' : '#94A3B8' }} 
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis 
                          domain={[
                            (dataMin: number) => {
                              const floor = Math.min(dataMin, min ?? dataMin, target ?? dataMin);
                              return Math.floor(floor - Math.abs(floor * 0.05));
                            },
                            (dataMax: number) => {
                              const cap = Math.max(dataMax, max ?? dataMax, target ?? dataMax);
                              return Math.ceil(cap + Math.abs(cap * 0.05));
                            }
                          ]}
                          tick={{ fontSize: 7, fill: theme === 'dark' ? '#475569' : '#94A3B8' }}
                          tickLine={false}
                          axisLine={false}
                        />
                        <Tooltip
                          contentStyle={{
                            background: theme === 'dark' ? '#0F172A' : '#FFFFFF',
                            borderColor: theme === 'dark' ? '#1E293B' : '#E2E8F0',
                            borderRadius: '8px',
                            fontSize: '9px',
                            color: theme === 'dark' ? '#F1F5F9' : '#0F172A',
                            fontFamily: 'monospace'
                          }}
                        />
                        
                        {/* Target Line (Green Centerline) */}
                        {target !== null && (
                          <ReferenceLine 
                            y={target} 
                            stroke="#10B981" 
                            strokeWidth={1}
                            strokeDasharray="4 3" 
                            label={{ value: 'Target', position: 'insideRight', fill: '#10B981', fontSize: 6, fontWeight: 'bold' }} 
                          />
                        )}

                        {/* Minimum Limits Reference (Red Warning Bound) */}
                        {min !== null && (
                          <ReferenceLine 
                            y={min} 
                            stroke="#EF4444" 
                            strokeWidth={0.8}
                            strokeDasharray="2 2" 
                            label={{ value: 'Min', position: 'insideRight', fill: '#EF4444', fontSize: 6 }} 
                          />
                        )}

                        {/* Maximum Limits Reference (Red Warning Bound) */}
                        {max !== null && (
                          <ReferenceLine 
                            y={max} 
                            stroke="#EF4444" 
                            strokeWidth={0.8}
                            strokeDasharray="2 2" 
                            label={{ value: 'Max', position: 'insideRight', fill: '#EF4444', fontSize: 6 }} 
                          />
                        )}

                        <Line 
                          type="monotone" 
                          dataKey="värde" 
                          stroke={stats.isCurrentlyOutOfSpec ? '#EF4444' : stats.isDrifting ? '#F59E0B' : '#3B82F6'} 
                          strokeWidth={2.2}
                          dot={{ r: 3, fill: stats.isCurrentlyOutOfSpec ? '#EF4444' : '#3B82F6' }}
                          activeDot={{ r: 5 }} 
                          name="Börvärde"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center space-y-1 bg-slate-150/10 text-slate-400 dark:text-slate-600 text-center p-4">
                      <BarChart3 size={18} className="stroke-1" />
                      <span className="text-[9px] font-bold uppercase tracking-wider">Inga mätningar loggade</span>
                      <span className="text-[8px] font-mono leading-normal px-2">Kräver mätvärden för att rendera trendgraf.</span>
                    </div>
                  )}
                </div>

                {/* BOTTOM DETAILED ACCORDION ACTION */}
                <div>
                  <button
                    onClick={() => setExpandedPointId(expandedPointId === p.id ? null : p.id)}
                    className={`w-full py-2 px-3 text-[10px] font-bold text-center flex items-center justify-center gap-1 hover:underline transition-colors ${
                      theme === 'dark' ? 'bg-gray-800/40 text-gray-400 hover:text-white' : 'bg-slate-50 text-slate-500 hover:text-indigo-600'
                    }`}
                  >
                    <span>{expandedPointId === p.id ? 'Dölj detaljer' : 'Analysera historiska mätningar'}</span>
                    <ChevronDown size={12} className={`transition-transform duration-200 ${expandedPointId === p.id ? 'rotate-180' : ''}`} />
                  </button>

                  {/* Expanded measurements log & comment analyzer panel */}
                  {expandedPointId === p.id && (
                    <div className={`p-3 border-t text-[10px] space-y-2 ${theme === 'dark' ? 'bg-gray-950/80 border-gray-800' : 'bg-slate-50 border-slate-200'}`}>
                      <h5 className="font-extrabold uppercase tracking-wide text-slate-400 mb-1 flex items-center justify-between">
                        <span>Registrerad historik ({logs.length})</span>
                        <span className="font-mono text-[9px] text-[#64748B]">Börvärde: {rawTarget}</span>
                      </h5>
                      
                      {logs.length === 0 ? (
                        <p className="text-slate-500 font-mono italic p-1 text-[9px]">Inga historiska värden hittades för parameter {p.id}.</p>
                      ) : (
                        <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1 text-[9px] no-scrollbar">
                          {[...logs].reverse().map((log, index) => {
                            const numericLogVal = extractNumericValue(log.value);
                            const isOutOfLimit = numericLogVal !== null && (
                              (min !== null && numericLogVal < min) || 
                              (max !== null && numericLogVal > max)
                            );
                            
                            return (
                              <div 
                                key={log.id || index}
                                className={`p-1.5 rounded border flex flex-col gap-0.5 ${
                                  log.status === PointStatus.TAGGED_RED ? 'bg-red-500/10 border-red-500/20 text-red-400' :
                                  log.status === PointStatus.TAGGED_YELLOW ? 'text-amber-400 bg-amber-500/10 border-amber-500/20' :
                                  isOutOfLimit ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400' :
                                  theme === 'dark' ? 'bg-gray-900 border-gray-800/80 text-gray-300' : 'bg-white border-slate-100 text-slate-600'
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <span className="font-bold font-mono">Uppmätt: {log.value}</span>
                                  <span className="font-mono text-[8px] text-slate-500">
                                    {new Date(log.timestamp).toLocaleString('sv-SE', {
                                      month: 'short',
                                      day: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })}
                                  </span>
                                </div>
                                {log.comment && (
                                  <p className="italic opacity-90 truncate leading-snug">
                                    &quot;{log.comment}&quot;
                                  </p>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>

              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};
