import React, { useState, useMemo } from 'react';
import { PointHistoryLog, MachinePoint, PointStatus } from '../types';
import { Search, Filter, Calendar, BarChart3, Clock, AlertTriangle, CheckCircle2, Sliders, ChevronDown, ListFilter, Activity, MessageSquare, Download } from 'lucide-react';
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

interface HistoryViewProps {
  points: MachinePoint[];
  pointHistory: PointHistoryLog[];
  theme?: 'dark' | 'light';
  sections: string[];
  selectedLineName?: string;
  selectedMachineName?: string;
}

// Helper to extract the core numeric value out of any string (e.g. "Visare B1 = 142" -> 142)
const extractNumericValue = (str: string | undefined | null): number | null => {
  if (!str) return null;
  const normalized = str.toString().replace(',', '.');
  const matches = normalized.match(/-?[0-9]+(?:\.[0-9]+)?/g);
  if (matches && matches.length > 0) {
    // Pick the last matched number
    return parseFloat(matches[matches.length - 1]);
  }
  return null;
};

const HistoryView: React.FC<HistoryViewProps> = ({ 
  points, 
  pointHistory = [], 
  theme = 'dark',
  sections = [],
  selectedLineName = '',
  selectedMachineName = ''
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSection, setSelectedSection] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState<'All' | 'OK' | 'TAGS'>('All');
  
  const handleExportCSV = () => {
    if (filteredHistory.length === 0) return;
    
    // Byte-order-mark (BOM) to force Excel to parse UTF-8 content correctly
    const BOM = "\uFEFF";
    
    // Column headers
    const headers = [
      "Punkt ID",
      "Punktnamn",
      "Sektion",
      "Förpackningsformat (Recept)",
      "Uppmätt Värde",
      "Börvärde (Target)",
      "Tolerans",
      "Status",
      "Tidpunkt",
      "Kommentar"
    ];
    
    const rows = filteredHistory.map(log => {
      const dateObj = new Date(log.timestamp);
      const formattedDate = dateObj.toLocaleDateString('sv-SE') + ' ' + dateObj.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' });
      return [
        log.pointId || '',
        log.pointName || '',
        log.section || '',
        log.recipeName || 'Standard',
        log.value || '',
        log.targetValue || '',
        log.tolerance || '',
        log.status === PointStatus.OK ? 'OK' : 'TAGGAD',
        formattedDate,
        log.comment || ''
      ];
    });

    // We use ';' as separator since Swedish locales use decimal comma (e.g. 8,5)
    // Semicolon separates columns perfectly without breaking decimal floats in Excel.
    const csvContent = BOM + [
      headers.join(';'),
      ...rows.map(row => row.map(val => {
        const escaped = val.toString().replace(/"/g, '""');
        return `"${escaped}"`;
      }).join(';'))
    ].join('\n');

    // Create secure URL block and initiate download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    const fileName = `Centerline_Historik_${selectedMachineName || 'Process'}_${new Date().toISOString().substring(0,10)}.csv`;
    link.setAttribute("download", fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  // Filter global history so it ONLY contains points for the selected machine/line hierarchy!
  const machineSpecificHistory = useMemo(() => {
    const validPointIds = new Set(points.map(p => p.id));
    return pointHistory.filter(log => validPointIds.has(log.pointId));
  }, [pointHistory, points]);

  // Selection for active optimization chart
  const [selectedOptPointId, setSelectedOptPointId] = useState<string>(() => {
    return points[0]?.id || '';
  });

  // Safe fallback if selected ID does not exist in currently selected machine's points
  const activeOptPointId = useMemo(() => {
    const exists = points.some(p => p.id === selectedOptPointId);
    if (!exists && points.length > 0) {
      return points[0].id;
    }
    return selectedOptPointId;
  }, [points, selectedOptPointId]);

  // Filter global log history using our scoped history list
  const filteredHistory = useMemo(() => {
    return [...machineSpecificHistory]
      .filter(log => {
        const matchesSearch = 
          log.pointName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          log.pointId.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (log.comment || '').toLowerCase().includes(searchTerm.toLowerCase());
        
        const point = points.find(p => p.id === log.pointId);
        const matchesSection = selectedSection === 'All' || (point && point.section === selectedSection);
        
        const matchesStatus = 
          selectedStatus === 'All' ||
          (selectedStatus === 'OK' && log.status === PointStatus.OK) ||
          (selectedStatus === 'TAGS' && (log.status === PointStatus.TAGGED_RED || log.status === PointStatus.TAGGED_YELLOW));

        return matchesSearch && matchesSection && matchesStatus;
      })
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [machineSpecificHistory, searchTerm, selectedSection, selectedStatus, points]);

  // Point lookup
  const selectedOptPoint = useMemo(() => {
    return points.find(p => p.id === activeOptPointId) || points[0] || null;
  }, [points, activeOptPointId]);

  // Optimization chart data (sorted oldest to newest for linear time)
  const optimizationChartData = useMemo(() => {
    if (!activeOptPointId) return [];
    return machineSpecificHistory
      .filter(log => log.pointId === activeOptPointId)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
      .map(log => {
        const dateObj = new Date(log.timestamp);
        return {
          time: dateObj.toLocaleDateString('sv-SE', { month: 'short', day: 'numeric' }) + ' ' + dateObj.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' }),
          värde: extractNumericValue(log.value) ?? 0,
          status: log.status,
          börvärde: extractNumericValue(log.targetValue) ?? 0,
          rawDate: log.timestamp
        };
      })
      .filter(d => d.värde !== null);
  }, [machineSpecificHistory, activeOptPointId]);

  // Limit guidelines for the selected parameter
  const optLimits = useMemo(() => {
    if (!selectedOptPoint) return { target: null, min: null, max: null };
    
    const target = extractNumericValue(selectedOptPoint.targetValue);
    if (target === null) return { target: null, min: null, max: null };

    const tolStr = selectedOptPoint.tolerance || '';
    
    // Parse tolerance e.g. "±0.5" or "+-0.5" or "+/-0.5"
    if (tolStr.includes('±') || tolStr.toLowerCase().includes('+-') || tolStr.toLowerCase().includes('+/-')) {
      const match = tolStr.replace(',', '.').match(/[0-9]+(?:\.[0-9]+)?/);
      if (match) {
        const tol = parseFloat(match[0]);
        return {
          target,
          min: target - tol,
          max: target + tol
        };
      }
    }

    // Range e.g. "8.0 - 10.0"
    const rangeMatch = tolStr.replace(',', '.').match(/([0-9]+(?:\.[0-9]+)?)\s*[-–]\s*([0-9]+(?:\.[0-9]+)?)/);
    if (rangeMatch) {
      const min = parseFloat(rangeMatch[1]);
      const max = parseFloat(rangeMatch[2]);
      return {
        target,
        min,
        max
      };
    }

    // Simple numeric
    const parsedTol = extractNumericValue(tolStr);
    if (parsedTol !== null) {
      return {
        target,
        min: target - parsedTol,
        max: target + parsedTol
      };
    }

    return { target, min: null, max: null };
  }, [selectedOptPoint]);

  // Horizontal Point Tracing Structure: group history entries per point
  const ptMap = useMemo(() => {
    const map: Record<string, PointHistoryLog[]> = {};
    machineSpecificHistory.forEach(log => {
      if (!map[log.pointId]) map[log.pointId] = [];
      map[log.pointId].push(log);
    });
    // Sort logs inside each point by date descending
    Object.keys(map).forEach(pid => {
      map[pid].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    });
    return map;
  }, [machineSpecificHistory]);

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300">
      
      {/* SECTION 1: HEADER & STATS */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-200 dark:border-gray-800 pb-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white uppercase tracking-wider italic flex flex-wrap items-center gap-2">
            Optimering & Historik <span className="text-xs font-normal not-italic text-blue-500 font-mono bg-blue-500/10 px-2.5 py-1 rounded-full">{selectedMachineName || 'Process'}</span>
          </h2>
          <p className="text-xs text-slate-500 font-mono mt-1">
            Granskar {selectedMachineName ? `${selectedMachineName} (${selectedLineName})` : 'valda maskiner'}. Spårar centerline-börvärde och toleransavvikelser löpande.
          </p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <div className="flex-1 sm:flex-initial bg-blue-500/10 border border-blue-500/20 px-4 py-2 rounded-xl text-center">
            <span className="block text-xl font-bold text-blue-500 font-mono">{machineSpecificHistory.length}</span>
            <span className="text-[9px] font-black uppercase tracking-wider text-slate-500">Mätningar loggade</span>
          </div>
          <div className="flex-1 sm:flex-initial bg-red-500/10 border border-red-500/10 px-4 py-2 rounded-xl text-center">
            <span className="block text-xl font-bold text-red-500 font-mono">
              {machineSpecificHistory.filter(h => h.status === PointStatus.TAGGED_RED).length}
            </span>
            <span className="text-[9px] font-black uppercase tracking-wider text-slate-500">Avvikelser (Taggar)</span>
          </div>
        </div>
      </div>

      {/* SECTION 2: INDIVIDUAL PARAMETER GRAPH / OPTIMIZATION (Slide 3/4/7 trend graph visualization) */}
      <div className={`${theme === 'dark' ? 'bg-gray-900 border-gray-800' : 'bg-white border-slate-200'} border p-4 sm:p-6 rounded-2xl sm:rounded-3xl shadow-xl transition-colors duration-300`}>
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6 pb-4 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-2xl text-blue-600 dark:text-blue-400">
              <BarChart3 size={24} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-[#0F172A] dark:text-white uppercase tracking-tight">
                Processoptimering per Centerline-punkt
              </h3>
              <p className="text-xs text-slate-500 font-mono">Hitta den mest stabila körområdesprofilen för en punkt</p>
            </div>
          </div>

          {/* Point Selector */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full lg:w-auto">
            <span className="text-xs text-slate-500 font-bold whitespace-nowrap uppercase">Välj punkt:</span>
            <select
              value={selectedOptPointId}
              onChange={(e) => setSelectedOptPointId(e.target.value)}
              className={`w-full lg:w-72 px-3 py-2 rounded-xl text-xs font-bold border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                theme === 'dark' ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-slate-200 text-slate-800'
              }`}
            >
              <option value="">-- Välj centerline --</option>
              {points.map(p => (
                <option key={p.id} value={p.id}>
                  {p.id} - {p.name} (#{p.number})
                </option>
              ))}
            </select>
          </div>
        </div>

        {selectedOptPoint ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Chart Area */}
            <div className="lg:col-span-8 bg-black/10 dark:bg-black/40 p-4 rounded-2xl border border-gray-100 dark:border-gray-800/60 h-72">
              {optimizationChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={optimizationChartData}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                    <XAxis 
                      dataKey="time" 
                      tick={{ fontSize: 9, fill: '#6B7280' }} 
                      dy={10}
                    />
                    <YAxis 
                      tick={{ fontSize: 9, fill: '#6B7280' }}
                      dx={-10}
                      domain={['auto', 'auto']}
                    />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: theme === 'dark' ? '#1F2937' : '#F3F4F6',
                        borderColor: '#3B82F6',
                        borderRadius: '12px',
                        fontSize: '11px',
                        color: theme === 'dark' ? '#FFF' : '#333'
                      }}
                    />
                    
                    {/* Upper Limit Red Reference Line */}
                    {optLimits.max !== null && (
                      <ReferenceLine 
                        y={optLimits.max} 
                        stroke="#EF4444" 
                        strokeDasharray="4 4" 
                        label={{ value: `Max tol (${optLimits.max})`, fill: '#EF4444', fontSize: 10, position: 'top' }}
                      />
                    )}
                    
                    {/* Target Green Reference Line */}
                    {optLimits.target !== null && (
                      <ReferenceLine 
                        y={optLimits.target} 
                        stroke="#10B981" 
                        strokeWidth={1.5} 
                        strokeDasharray="2 2"
                        label={{ value: `Börvärde (${optLimits.target})`, fill: '#10B981', fontSize: 10, position: 'insideBottomLeft' }}
                      />
                    )}

                    {/* Lower Limit Red Reference Line */}
                    {optLimits.min !== null && (
                      <ReferenceLine 
                        y={optLimits.min} 
                        stroke="#EF4444" 
                        strokeDasharray="4 4" 
                        label={{ value: `Min tol (${optLimits.min})`, fill: '#EF4444', fontSize: 10, position: 'bottom' }}
                      />
                    )}

                    <Line 
                      type="monotone" 
                      dataKey="värde" 
                      stroke="#3B82F6" 
                      strokeWidth={3} 
                      dot={{ r: 5, fill: '#3B82F6', strokeWidth: 1 }} 
                      activeDot={{ r: 8 }} 
                      name="Uppmätt värde"
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-xs text-slate-500 italic">
                  Ingen mätdata finns ännu för att rita graf. Registrera ett mätvärde på kartan eller listan!
                </div>
              )}
            </div>

            {/* Parameter specifications & optimization hints */}
            <div className="lg:col-span-4 space-y-4">
              <div className={`p-4 rounded-xl border ${theme === 'dark' ? 'bg-gray-950/40 border-gray-800' : 'bg-slate-50 border-slate-200'}`}>
                <h4 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-2">Specifikation</h4>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-gray-100 dark:border-gray-800/40">
                    <span className="text-slate-500">Centerline ID:</span>
                    <span className="font-bold text-[#0F172A] dark:text-white font-mono">{selectedOptPoint.id}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-gray-100 dark:border-gray-800/40">
                    <span className="text-slate-500">Benämning:</span>
                    <span className="font-bold text-[#0F172A] dark:text-white">{selectedOptPoint.name}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-gray-100 dark:border-gray-800/40">
                    <span className="text-slate-500">Huvud-börvärde:</span>
                    <span className="font-mono font-black text-green-500 text-sm">{selectedOptPoint.targetValue}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-500">Toleransfönster:</span>
                    <span className="font-bold text-[#0F172A] dark:text-white font-mono">{selectedOptPoint.tolerance}</span>
                  </div>
                </div>
              </div>

              {/* Engineer decision block */}
              <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-xl space-y-2">
                <div className="flex items-center gap-1.5 text-blue-500 font-bold text-xs">
                  <Sliders size={14} />
                  <span>Ingenjörs-åtgärd</span>
                </div>
                <p className="text-[11px] text-[#0F172A] dark:text-blue-200/80 leading-relaxed font-semibold">
                  Om trendgrafen visar att maskinen ständigt går bäst stabilt på ett annat värde än nuvarande standard, bör processingenjören uppdatera börvärdet (Target) i systemet för att standardisera det nya optimala driftsläget.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-10 text-xs text-slate-500 font-medium italic">
            Inga centerline-punkter definierade i systemet.
          </div>
        )}
      </div>

      {/* SECTION 3: HORIZONTAL HISTORICAL GRID (Horizontal Point Trace) */}
      <div className={`${theme === 'dark' ? 'bg-gray-900 border-gray-800' : 'bg-white border-slate-200'} border p-4 sm:p-6 rounded-2xl sm:rounded-3xl shadow-xl transition-colors duration-300`}>
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100 dark:border-gray-800">
          <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 rounded-2xl text-indigo-600 dark:text-indigo-400">
            <Activity size={24} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-[#0F172A] dark:text-white uppercase tracking-tight">
              Punkt-för-punkt Utvecklingsvyn (Horisontell Spårning)
            </h3>
            <p className="text-xs text-slate-500 font-mono">Horisontell tidsaxel av mätvärden för direkt jämförelse</p>
          </div>
        </div>

        <div className="space-y-4">
          {points.length > 0 ? (
            <div className="divide-y divide-gray-100 dark:divide-gray-800/50">
              {points.map((point) => {
                const logsForThisPoint = ptMap[point.id] || [];
                return (
                  <div key={point.id} className="py-4 first:pt-0 last:pb-0 grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                    {/* Point Info Label */}
                    <div className="md:col-span-3 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500 px-1.5 py-0.5 rounded font-bold">
                          {point.id}
                        </span>
                        <span className="text-xs font-black text-slate-700 dark:text-gray-200 truncate block max-w-[180px]">
                          {point.name}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Target: <strong className="font-mono text-green-500 font-black">{point.targetValue}</strong> ({point.tolerance})
                      </div>
                    </div>

                    {/* Timeline Trace */}
                    <div className="md:col-span-9 overflow-x-auto flex gap-2 py-1 scroll-smooth no-scrollbar">
                      {logsForThisPoint.length > 0 ? (
                        logsForThisPoint.map((log) => {
                          const isOK = log.status === PointStatus.OK;
                          const dateObj = new Date(log.timestamp);
                          const dateStr = dateObj.toLocaleDateString('sv-SE', { month: 'short', day: 'numeric' });
                          return (
                            <div 
                              key={log.id} 
                              className={`px-3 py-1.5 rounded-lg border min-w-[100px] text-center flex flex-col justify-between shrink-0 ${
                                isOK 
                                  ? (theme === 'dark' ? 'bg-green-950/20 border-green-500/20' : 'bg-green-50 border-green-200')
                                  : (theme === 'dark' ? 'bg-red-950/20 border-red-500/20' : 'bg-red-50 border-red-200')
                              }`}
                            >
                              <span className="text-[8px] text-slate-400 font-mono block xl:inline mb-1">
                                {dateStr}
                              </span>
                              <span className="text-xs font-mono font-black text-[#0F172A] dark:text-white">
                                {log.value}
                              </span>
                              <span className={`text-[8px] font-black uppercase mt-1 ${isOK ? 'text-green-500' : 'text-red-500'}`}>
                                {isOK ? 'OK' : 'TAGG'}
                              </span>
                            </div>
                          );
                        })
                      ) : (
                        <span className="text-xs text-slate-500 italic py-1">Inget loggat mätvärde ännu.</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-6 text-xs text-slate-500">Inga punkter definierade.</div>
          )}
        </div>
      </div>

      {/* SECTION 4: FULL RECONCILED HISTORIC LOG TIMELINE */}
      <div className={`${theme === 'dark' ? 'bg-gray-900 border-gray-800' : 'bg-white border-slate-200'} border p-4 sm:p-6 rounded-2xl sm:rounded-3xl shadow-xl transition-colors duration-300`}>
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6 border-b border-gray-100 dark:border-gray-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-100 dark:bg-orange-900/30 rounded-2xl text-amber-600 dark:text-orange-400">
              <ListFilter size={24} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-[#0F172A] dark:text-white uppercase tracking-tight">
                Mätvärdesregister & Händelselogg
              </h3>
              <p className="text-xs text-slate-500 font-mono">Totalt register av alla kontrollerade parametrar</p>
            </div>
          </div>

          {/* Table Filters */}
          <div className="grid grid-cols-1 sm:flex sm:flex-wrap gap-2 w-full lg:w-auto">
            {/* Search */}
            <div className="relative w-full sm:w-auto">
              <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-slate-400" size={14} />
              <input 
                type="text" 
                placeholder="Sök på punkt eller kommentar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`pl-8 pr-3 py-1.5 rounded-lg text-xs font-bold border focus:outline-none focus:ring-1 focus:ring-blue-500 w-full sm:w-60 ${
                  theme === 'dark' ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-slate-200 text-slate-800'
                }`}
              />
            </div>

            {/* Sektion select */}
            <select
              value={selectedSection}
              onChange={(e) => setSelectedSection(e.target.value)}
              className={`px-2 py-1.5 rounded-lg text-xs font-bold border focus:outline-none focus:ring-1 focus:ring-blue-500 w-full sm:w-auto ${
                theme === 'dark' ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-slate-200 text-slate-800'
              }`}
            >
              <option value="All">Alla Sektioner</option>
              {sections.map(sec => (
                <option key={sec} value={sec}>{sec}</option>
              ))}
            </select>

            {/* Status select */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as any)}
              className={`px-2 py-1.5 rounded-lg text-xs font-bold border focus:outline-none focus:ring-1 focus:ring-blue-500 w-full sm:w-auto ${
                theme === 'dark' ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-slate-200 text-slate-800'
              }`}
            >
              <option value="All">Alla Status</option>
              <option value="OK">Endast OK</option>
              <option value="TAGS">Endast Taggar</option>
            </select>

            {/* Export XLS/CSV Button */}
            <button
              onClick={handleExportCSV}
              disabled={filteredHistory.length === 0}
              title="Exportera filtrerad historik till excel/CSV"
              className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all md:w-auto w-full ${
                filteredHistory.length === 0
                  ? 'opacity-40 cursor-not-allowed bg-gray-500/10 text-gray-500'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md active:scale-[0.98]'
              }`}
            >
              <Download size={13} />
              Exportera Excel (CSV)
            </button>
          </div>
        </div>

        {/* Mobile View: Cards */}
        <div className="space-y-3 md:hidden">
          {filteredHistory.length > 0 ? (
            filteredHistory.map((log) => {
              const isOK = log.status === PointStatus.OK;
              const dateObj = new Date(log.timestamp);
              const formattedDate = dateObj.toLocaleDateString('sv-SE', { year: 'numeric', month: '2-digit', day: '2-digit' });
              const formattedTime = dateObj.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' });

              return (
                <div 
                  key={log.id} 
                  className={`p-4 rounded-xl border transition-all ${
                    !isOK 
                      ? (theme === 'dark' ? 'bg-red-550/[0.04] border-red-900/30' : 'bg-red-50 border-red-200')
                      : (theme === 'dark' ? 'bg-gray-900/60 border-gray-800' : 'bg-slate-50 border-slate-200')
                  }`}
                >
                  <div className="flex justify-between items-start gap-2 mb-2">
                    <div>
                      <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                        <span className="font-mono text-[9px] bg-slate-200 dark:bg-slate-800 text-slate-500 px-1 py-0.5 rounded font-black">
                          {log.pointId}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                          <Clock size={10} />
                          {formattedDate} {formattedTime}
                        </span>
                      </div>
                      <h4 className="text-xs font-bold text-[#0F172A] dark:text-gray-200 leading-tight">
                        {log.pointName}
                      </h4>
                    </div>
                    {isOK ? (
                      <span className="inline-flex items-center gap-1 text-green-500 font-bold uppercase text-[9px] shrink-0">
                        <CheckCircle2 size={11} /> OK
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-red-500 font-black uppercase text-[9px] bg-red-500/10 px-2 py-0.5 rounded shrink-0">
                        <AlertTriangle size={11} /> TAGG
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-2 py-2 my-2 border-y border-gray-100 dark:border-gray-800/60 text-center font-mono">
                    <div>
                      <span className="block text-[8px] uppercase tracking-wider text-slate-400 font-sans font-bold">Uppmätt</span>
                      <span className={`text-xs font-black ${isOK ? 'text-green-500' : 'text-red-500'}`}>
                        {log.value}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[8px] uppercase tracking-wider text-slate-400 font-sans font-bold">Börvärde</span>
                      <span className="text-xs font-bold text-slate-600 dark:text-gray-300">
                        {log.targetValue}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[8px] uppercase tracking-wider text-slate-400 font-sans font-bold">Tolerans</span>
                      <span className="text-xs font-bold text-slate-500">
                        {log.tolerance}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 mt-2 flex-wrap text-[10px]">
                    <span className="font-bold text-slate-500 bg-slate-100 dark:bg-slate-800/40 px-2 py-0.5 rounded-md">
                      Format: {log.recipeName || 'Standard'}
                    </span>
                    {log.comment && (
                      <div className="min-w-0 max-w-[60%] flex items-center gap-1 text-slate-500 italic truncate" title={log.comment}>
                        <MessageSquare size={10} className="shrink-0 text-blue-500" />
                        <span className="truncate">{log.comment}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="py-6 text-center text-slate-500 italic text-xs">
              Hittade inga loggade mätvärden som matchade dina filter.
            </div>
          )}
        </div>

        {/* Audit Trail Table (Desktop view: md and up) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800 opacity-60">
                <th className="py-3 px-4 font-black uppercase tracking-wider text-slate-500 text-[10px]">Punkt</th>
                <th className="py-3 px-4 font-black uppercase tracking-wider text-slate-500 text-[10px]">Datum & Tid</th>
                <th className="py-3 px-4 font-black uppercase tracking-wider text-slate-500 text-[10px]">Format / Recept</th>
                <th className="py-3 px-4 font-black uppercase tracking-wider text-slate-500 text-[10px]">Uppmätt</th>
                <th className="py-3 px-4 font-black uppercase tracking-wider text-slate-500 text-[10px]">Börvärde</th>
                <th className="py-3 px-4 font-black uppercase tracking-wider text-slate-500 text-[10px]">Tolerans</th>
                <th className="py-3 px-4 font-black uppercase tracking-wider text-slate-500 text-[10px]">Status</th>
                <th className="py-3 px-4 font-black uppercase tracking-wider text-slate-500 text-[10px] w-1/3">Kommentar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800 font-medium">
              {filteredHistory.length > 0 ? (
                filteredHistory.map((log) => {
                  const isOK = log.status === PointStatus.OK;
                  const dateObj = new Date(log.timestamp);
                  const formattedDate = dateObj.toLocaleDateString('sv-SE', { year: 'numeric', month: '2-digit', day: '2-digit' });
                  const formattedTime = dateObj.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' });

                  return (
                    <tr 
                      key={log.id} 
                      className={`hover:bg-gray-50 dark:hover:bg-gray-800/20 transition-colors ${
                        !isOK ? 'bg-red-500/[0.04]' : ''
                      }`}
                    >
                      <td className="py-3.5 px-4 font-bold">
                        <span className="font-mono text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500 px-1 py-0.5 rounded mr-1.5 font-bold">{log.pointId}</span>
                        <span className="text-[#0F172A] dark:text-gray-200">{log.pointName}</span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-500">
                        <span className="flex items-center gap-1">
                          <Clock size={12} />
                          {formattedDate} {formattedTime}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-600 dark:text-gray-400">
                        {log.recipeName || 'Standard'}
                      </td>
                      <td className={`py-3.5 px-4 font-black font-mono text-sm ${isOK ? 'text-green-500' : 'text-red-500'}`}>
                        {log.value}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-600 dark:text-gray-400">
                        {log.targetValue}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-500">
                        {log.tolerance}
                      </td>
                      <td className="py-3.5 px-4">
                        {isOK ? (
                          <span className="inline-flex items-center gap-1 text-green-500 font-bold uppercase text-[9px]">
                            <CheckCircle2 size={12} /> OK
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-red-500 font-black uppercase text-[9px] bg-red-500/10 px-2 py-0.5 rounded">
                            <AlertTriangle size={12} /> TAGG
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 leading-relaxed max-w-xs truncate" title={log.comment}>
                        {log.comment ? (
                          <span className="flex items-start gap-1 font-semibold text-slate-600 dark:text-gray-400">
                            <MessageSquare size={12} className="shrink-0 mt-0.5 text-blue-500" />
                            {log.comment}
                          </span>
                        ) : (
                          <span className="italic opacity-40">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500 italic">
                    Hittade inga loggade mätvärden som matchade dina filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};

export default HistoryView;
