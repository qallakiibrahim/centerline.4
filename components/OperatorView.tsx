import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MachinePoint, MachineModule, PointStatus, Criticality } from '../types';
import { DEFAULT_MACHINE_LAYOUT } from '../constants';
import { 
  ChevronLeft, 
  Check, 
  AlertTriangle, 
  Camera, 
  HelpCircle, 
  Sliders, 
  Info, 
  History, 
  RotateCcw,
  Maximize2,
  ZoomIn,
  ZoomOut,
  FileText,
  BookmarkCheck,
  Eye,
  SlidersHorizontal,
  ThumbsUp
} from 'lucide-react';

interface OperatorViewProps {
  points: MachinePoint[];
  layout?: MachineModule[];
  selectedMachine: string;
  activeRecipe: string;
  theme?: 'dark' | 'light';
  onUpdatePointStatus: (pointId: string, value: string, status: PointStatus, comment?: string) => void;
  pointHistory?: any[];
  machineBackgrounds: Record<string, string>;
  onUpdateMachineBackgrounds: (backgrounds: Record<string, string>) => void;
  canEditLayout?: boolean;
}

export const OperatorView: React.FC<OperatorViewProps> = ({
  points,
  layout = DEFAULT_MACHINE_LAYOUT,
  selectedMachine,
  activeRecipe,
  theme = 'dark',
  onUpdatePointStatus,
  pointHistory = [],
  machineBackgrounds,
  onUpdateMachineBackgrounds,
  canEditLayout = false
}) => {
  // Navigation states
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [activePointId, setActivePointId] = useState<string | null>(null);
  const [measuredValue, setMeasuredValue] = useState<string>('');
  const [comment, setComment] = useState<string>('');
  const [showOnlyDeviations, setShowOnlyDeviations] = useState<boolean>(false);

  // Dynamic Custom Section Background lookup
  const sectionBgUrl = useMemo(() => {
    if (!selectedSection) return null;
    return machineBackgrounds[`${selectedMachine}_${selectedSection}`] || null;
  }, [machineBackgrounds, selectedMachine, selectedSection]);

  // Points belonging to the currently zoomed-in section
  const sectionPoints = useMemo(() => {
    if (!selectedSection) return [];
    return points.filter(p => p.section === selectedSection)
      .filter(p => {
        if (!showOnlyDeviations) return true;
        return p.status && p.status !== PointStatus.OK;
      });
  }, [points, selectedSection, showOnlyDeviations]);

  const activeSectionBg = useMemo(() => {
    if (sectionBgUrl) return sectionBgUrl;
    
    // Fallback 1: First point in this section that has an image
    const pointWithImg = sectionPoints.find(p => p.imagePlaceholder && (p.imagePlaceholder.startsWith('http') || p.imagePlaceholder.startsWith('data:')));
    if (pointWithImg) return pointWithImg.imagePlaceholder;
    
    // Fallback 2: Global machine-level background
    if (machineBackgrounds[selectedMachine]) return machineBackgrounds[selectedMachine];
    
    // Fallback 3: No image
    return null;
  }, [sectionBgUrl, sectionPoints, machineBackgrounds, selectedMachine]);

  const handleSectionBgUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && selectedSection) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64data = reader.result as string;
        onUpdateMachineBackgrounds({
          ...machineBackgrounds,
          [`${selectedMachine}_${selectedSection}`]: base64data
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleClearSectionBg = () => {
    if (selectedSection) {
      const updated = { ...machineBackgrounds };
      delete updated[`${selectedMachine}_${selectedSection}`];
      onUpdateMachineBackgrounds(updated);
    }
  };

  // Group points by section for counting and overview indicators
  const sectionStats = useMemo(() => {
    const stats: Record<string, { total: number; ok: number; red: number; yellow: number }> = {};
    
    // Initialize stats for layout modules
    layout.forEach(mod => {
      stats[mod.label] = { total: 0, ok: 0, red: 0, yellow: 0 };
    });

    // Populate stats from points
    points.forEach(point => {
      const secName = point.section;
      if (!stats[secName]) {
        stats[secName] = { total: 0, ok: 0, red: 0, yellow: 0 };
      }
      
      stats[secName].total++;
      
      const status = point.status || PointStatus.OK;
      if (status === PointStatus.OK) {
        stats[secName].ok++;
      } else if (status === PointStatus.TAGGED_RED) {
        stats[secName].red++;
      } else {
        stats[secName].yellow++; // TAGGED_YELLOW or OUT_OF_SPEC
      }
    });

    return stats;
  }, [points, layout]);

  // Resolve all sections/modules to display in the overview grid
  const displaySections = useMemo(() => {
    // Start with the modules defined in the layout
    const sectionList = [...layout.map(mod => ({
      id: mod.id,
      label: mod.label,
      color: mod.color || '#3b82f6'
    }))];

    // Find any sections from the points that are not already in layout
    const existingLabels = new Set(sectionList.map(s => s.label));
    
    points.forEach(point => {
      if (point.section && !existingLabels.has(point.section)) {
        existingLabels.add(point.section);
        sectionList.push({
          id: `fallback_${point.section}`,
          label: point.section,
          color: '#6366f1' // Default indigo color for auto-added sections
        });
      }
    });

    return sectionList;
  }, [layout, points]);

  // Resolve all sections/modules to display in the overview map with coordinate fallbacks
  const resolvedModules = useMemo(() => {
    let fallbackCount = 0;
    return displaySections.map(sec => {
      const existing = layout.find(m => m.label === sec.label);
      if (existing) {
        return {
          ...existing,
          hasLayout: true
        };
      } else {
        fallbackCount++;
        // Position fallbacks at the bottom of the map in a neat row
        return {
          id: `fallback_${sec.label}`,
          label: sec.label,
          x: ((fallbackCount - 1) * 25) % 75 + 5,
          y: 76,
          width: 20,
          height: 12,
          color: '#6366f1',
          hasLayout: false
        };
      }
    });
  }, [displaySections, layout]);

  // Connected flows for background vector pipes (only connect modules with actual design layout)
  const connectedFlows = useMemo(() => {
    const withLayout = resolvedModules.filter(m => m.hasLayout);
    return [...withLayout].sort((a, b) => a.x - b.x);
  }, [resolvedModules]);

  const getSectionPointsList = (sectionName: string) => {
    return points.filter(p => p.section === sectionName);
  };

  const getPointStatusPillColor = (status?: PointStatus) => {
    if (status === PointStatus.TAGGED_RED) return 'bg-red-500/15 border-red-500/30 text-red-400 animate-pulse';
    if (status === PointStatus.TAGGED_YELLOW) return 'bg-amber-500/15 border-amber-500/30 text-amber-300';
    if (status === PointStatus.OUT_OF_SPEC) return 'bg-orange-500/15 border-orange-500/30 text-orange-400';
    return 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400';
  };

  // Currently active selected point detail
  const activePoint = useMemo(() => {
    if (!activePointId) return null;
    return points.find(p => p.id === activePointId) || null;
  }, [points, activePointId]);

  // Get dynamic target values based on active recipe
  const getPointTargets = (point: MachinePoint) => {
    if (point.recipeTargets && point.recipeTargets[activeRecipe]) {
      return point.recipeTargets[activeRecipe];
    }
    return { targetValue: point.targetValue, tolerance: point.tolerance };
  };

  // Handle opening section
  const handleSectionClick = (sectionName: string) => {
    setSelectedSection(sectionName);
    setActivePointId(null);
    setMeasuredValue('');
    setComment('');
  };

  // Handle selecting point
  const handlePointClick = (point: MachinePoint) => {
    setActivePointId(point.id);
    const targets = getPointTargets(point);
    setMeasuredValue(point.status === PointStatus.OK ? targets.targetValue.replace(/[^0-9.,]/g, '') : '');
    setComment(point.tagComment || '');
  };

  // Auto-advance helper to load the next unchecked point or go back to list
  const selectNextPoint = (currentPointId: string) => {
    if (!selectedSection) return;
    const pts = points.filter(p => p.section === selectedSection);
    const currentIndex = pts.findIndex(p => p.id === currentPointId);
    if (currentIndex !== -1 && pts.length > 1) {
      // Reorder starting from the next element
      const reordered = [...pts.slice(currentIndex + 1), ...pts.slice(0, currentIndex)];
      // Find next point that does not have status OK
      const nextPending = reordered.find(p => !p.status || p.status !== PointStatus.OK);
      if (nextPending) {
        handlePointClick(nextPending);
        return;
      }
    }
    // If all are OK or only 1 point, go back to checklist view
    setActivePointId(null);
    setMeasuredValue('');
    setComment('');
  };

  // Rapid One-Click Registration of OK status
  const handleQuickRegisterOK = (point: MachinePoint) => {
    const targets = getPointTargets(point);
    const cleanValue = targets.targetValue;
    onUpdatePointStatus(point.id, cleanValue, PointStatus.OK, 'Registrerad OK via Operatörsverktyget.');
    
    // Auto-advance
    selectNextPoint(point.id);
  };

  // Submit custom value/status
  const handleSaveStatus = (status: PointStatus) => {
    if (!activePoint) return;
    const targets = getPointTargets(activePoint);
    
    let finalValue = measuredValue.trim();
    if (!finalValue) {
      finalValue = status === PointStatus.OK ? targets.targetValue : 'Ej mätt';
    }

    onUpdatePointStatus(activePoint.id, finalValue, status, comment.trim());
    
    // Auto-advance
    selectNextPoint(activePoint.id);
  };

  // Check if a point is in warning/error state
  const getPointStatusColor = (point: MachinePoint) => {
    const status = point.status || PointStatus.OK;
    if (status === PointStatus.TAGGED_RED) return 'bg-red-500 border-red-200 ring-red-500/50';
    if (status === PointStatus.TAGGED_YELLOW) return 'bg-amber-500 border-amber-200 ring-amber-500/50';
    if (status === PointStatus.OUT_OF_SPEC) return 'bg-orange-500 border-orange-200 ring-orange-500/50';
    return 'bg-emerald-500 border-emerald-200 ring-emerald-500/50';
  };

  // Calculate dynamic section background representation based on points it has
  const getSectionStatusColor = (sectionName: string) => {
    const stats = sectionStats[sectionName];
    if (!stats || stats.total === 0) return 'border-slate-700/50 hover:border-slate-500 bg-slate-900/40 text-slate-400';
    if (stats.red > 0) return 'border-red-600/80 hover:border-red-500 bg-red-950/20 text-red-200 ring-1 ring-red-900/30';
    if (stats.yellow > 0) return 'border-amber-600/80 hover:border-amber-500 bg-amber-950/20 text-amber-200 ring-1 ring-amber-900/30';
    return 'border-emerald-600/80 hover:border-emerald-500 bg-emerald-950/20 text-emerald-200 ring-1 ring-emerald-900/30';
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto p-1 animate-in fade-in duration-500">
      
      {/* HEADER GUIDE - DONT MAKE ME THINK (DMMT) */}
      {selectedSection && (
        <div className={`p-4 md:p-6 rounded-[2rem] border ${theme === 'dark' ? 'bg-slate-950 border-slate-800' : 'bg-white border-slate-100'} shadow-md flex flex-col md:flex-row justify-between items-start md:items-center gap-4`}>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-500">Operatörsläge • Aktivt CL-program: {activeRecipe}</span>
            </div>
            <h2 className="text-xl md:text-2xl font-black tracking-tight text-slate-800 dark:text-white">
              {selectedSection}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Tryck på mätpunkterna direkt på sektionsbilden för att kvittera status eller ange mätvärden.
            </p>
          </div>

          {/* Quick controls */}
          <div className="flex flex-wrap gap-2 shrink-0">
            <button
              onClick={() => {
                setSelectedSection(null);
                setActivePointId(null);
              }}
              className="flex items-center gap-2 px-4 py-2 text-xs font-black uppercase tracking-wider text-slate-400 hover:text-white bg-slate-900 border border-slate-800 rounded-xl transition-all"
            >
              <ChevronLeft size={14} /> Översikt
            </button>
            
            <button
              onClick={() => setShowOnlyDeviations(!showOnlyDeviations)}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-black uppercase tracking-wider rounded-xl border transition-all ${
                showOnlyDeviations 
                  ? 'bg-amber-600 text-black border-amber-500' 
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
              }`}
            >
              <AlertTriangle size={14} /> {showOnlyDeviations ? 'Visar endast avvikelser' : 'Visa alla punkter'}
            </button>
          </div>
        </div>
      )}

      <AnimatePresence mode="wait">
        {!selectedSection ? (
          /* ======================================================================== */
          /*            INTERAKTIV MASKINNIVÅ (BLUEPRINT + MAPPAR HIERARKI)            */
          /* ======================================================================== */
          <motion.div
            key="overview"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.3 }}
            className={`p-6 rounded-[2.5rem] border ${
              theme === 'dark' 
                ? 'bg-gradient-to-b from-slate-950 to-slate-900 border-slate-800' 
                : 'bg-gradient-to-b from-white to-slate-50 border-slate-200'
            } shadow-2xl relative overflow-hidden`}
          >
            {/* Visual background grid pattern */}
            <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.015] pointer-events-none" 
                 style={{ 
                   backgroundImage: `linear-gradient(#3b82f6 1px, transparent 1px), linear-gradient(90deg, #3b82f6 1px, transparent 1px)`,
                   backgroundSize: '40px 40px' 
                 }}
            />

            {/* Simulated 3D blueprint wrapper */}
            <div className="relative z-10 w-full flex flex-col py-2">
              
              {/* 1. INTERAKTIV RITNINGSÖVERSIKT (MACHINE SCHEMATIC BLUEPRINT) */}
              <div className={`p-2 rounded-[2.2rem] border ${theme === 'dark' ? 'bg-slate-950/40 border-slate-800/80' : 'bg-slate-50 border-slate-200'} mb-8 relative overflow-hidden shadow-inner`}>
                {/* Blueprint Canvas Container */}
                <div className="relative w-full aspect-[21/9] min-h-[350px] sm:min-h-[460px] lg:min-h-[520px] bg-slate-950 border border-slate-900 rounded-[2rem] overflow-hidden shadow-2xl">
                  {/* Local SVG dash animation */}
                  <style>{`
                    @keyframes dash {
                      to {
                        stroke-dashoffset: -20;
                      }
                    }
                    .flow-pipe-anim {
                      animation: dash 12s linear infinite;
                    }
                  `}</style>

                  {/* Backdrop Vector Grid */}
                  <div className="absolute inset-0 opacity-[0.04] pointer-events-none" 
                       style={{ 
                         backgroundImage: `linear-gradient(#3b82f6 1px, transparent 1px), linear-gradient(90deg, #3b82f6 1px, transparent 1px)`,
                         backgroundSize: '30px 30px' 
                       }}
                  />

                  {/* Dynamic Connected Pipelines (SVG) */}
                  <svg 
                    className="absolute inset-0 w-full h-full pointer-events-none z-0" 
                    viewBox="0 0 100 100" 
                    preserveAspectRatio="none"
                  >
                    <defs>
                      <linearGradient id="blueGlow" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
                        <stop offset="50%" stopColor="#6366f1" stopOpacity="0.8" />
                        <stop offset="100%" stopColor="#ec4899" stopOpacity="0.3" />
                      </linearGradient>
                    </defs>
                    
                    {connectedFlows.map((m, idx) => {
                      if (idx === connectedFlows.length - 1) return null;
                      const next = connectedFlows[idx + 1];
                      
                      const x1 = m.x + m.width / 2;
                      const y1 = m.y + m.height / 2;
                      const x2 = next.x + next.width / 2;
                      const y2 = next.y + next.height / 2;
                      const midX = (x1 + x2) / 2;
                      
                      const pathD = `M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`;
                      
                      return (
                        <g key={`pipe-${idx}`}>
                          <path 
                            d={pathD} 
                            fill="none" 
                            stroke="#111827" 
                            strokeWidth="1.2" 
                            strokeLinecap="round"
                          />
                          <path 
                            d={pathD} 
                            fill="none" 
                            stroke="url(#blueGlow)" 
                            strokeWidth="0.4" 
                            strokeLinecap="round"
                            strokeDasharray="2, 4"
                            className="flow-pipe-anim"
                          />
                        </g>
                      );
                    })}
                  </svg>

                  {/* Absolute HTML Interactive Sektion Cards on the map */}
                  <div className="absolute inset-0 z-10 p-4">
                    {resolvedModules.map((mod) => {
                      const stats = sectionStats[mod.label] || { total: 0, ok: 0, red: 0, yellow: 0 };
                      const hasPoints = stats.total > 0;
                      
                      let borderGlowClass = 'border-slate-800 hover:border-slate-500 bg-slate-900/80 hover:bg-slate-900';
                      let textClass = 'text-slate-400 group-hover:text-white';
                      let pulseColor = 'bg-slate-500';
                      
                      if (hasPoints) {
                        if (stats.red > 0) {
                          borderGlowClass = 'border-red-900/60 hover:border-red-500 bg-red-950/25 hover:bg-red-950/45 shadow-[0_0_15px_rgba(239,68,68,0.15)]';
                          textClass = 'text-red-200';
                          pulseColor = 'bg-red-500';
                        } else if (stats.yellow > 0) {
                          borderGlowClass = 'border-amber-950/60 hover:border-amber-500 bg-amber-950/20 hover:bg-amber-950/35 shadow-[0_0_15px_rgba(245,158,11,0.1)]';
                          textClass = 'text-amber-200';
                          pulseColor = 'bg-amber-500';
                        } else {
                          borderGlowClass = 'border-emerald-950 hover:border-emerald-500 bg-emerald-950/15 hover:bg-emerald-950/30';
                          textClass = 'text-emerald-200';
                          pulseColor = 'bg-emerald-500';
                        }
                      }

                      return (
                        <motion.button
                          key={mod.id}
                          whileHover={{ scale: 1.02, zIndex: 30 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => handleSectionClick(mod.label)}
                          style={{
                            left: `${mod.x}%`,
                            top: `${mod.y}%`,
                            width: `${mod.width}%`,
                            height: `${mod.height}%`,
                            position: 'absolute'
                          }}
                          className={`rounded-xl border flex flex-col justify-between p-3.5 sm:p-4 text-left transition-all group overflow-hidden ${borderGlowClass}`}
                        >
                          {/* Glow overlay effect */}
                          <div className="absolute -right-8 -bottom-8 w-16 h-16 rounded-full opacity-[0.03] group-hover:opacity-[0.08] bg-current blur-xl transition-all duration-300" />
                          
                          {/* Section tag / pulse indicator */}
                          <div className="flex justify-between items-start w-full gap-1">
                            <span className="text-[8px] font-black uppercase text-slate-500 tracking-wider truncate">
                              {mod.hasLayout ? 'Modul' : 'Sektion'}
                            </span>
                            
                            {hasPoints && (
                              <span className="flex h-2 w-2 relative shrink-0">
                                {(stats.red > 0 || stats.yellow > 0) && (
                                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${pulseColor}`}></span>
                                )}
                                <span className={`relative inline-flex rounded-full h-2 w-2 ${pulseColor}`}></span>
                              </span>
                            )}
                          </div>

                          {/* Section label and quick points summary */}
                          <div className="space-y-0.5 relative z-10 w-full">
                            <h5 className={`font-black text-[10px] sm:text-[11px] uppercase tracking-tight leading-none truncate group-hover:text-white transition-colors ${textClass}`}>
                              {mod.label}
                            </h5>
                            
                            {hasPoints ? (
                              <div className="flex items-center gap-1.5 text-[9px] text-slate-400 font-medium">
                                <span className="font-semibold">{stats.ok}/{stats.total} Säkrad</span>
                                {stats.red > 0 && <span className="text-red-400 font-black">({stats.red}!)</span>}
                              </div>
                            ) : (
                              <span className="text-[8px] text-slate-600 italic">0 punkter</span>
                            )}
                          </div>
                        </motion.button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Bottom advice banner */}
              <div className="mt-8 bg-blue-950/20 border border-blue-900/40 rounded-2xl p-4 max-w-2xl mx-auto flex gap-3 items-center">
                <Info className="text-blue-400 shrink-0" size={20} />
                <p className="text-[11px] leading-relaxed text-blue-300">
                  <strong>Interaktiv Maskinlinje:</strong> Klicka direkt på en sektionsmodul i flödesschemat ovan för att zooma in på dess fysiska mätpunkter (setpoints) och få detaljerade instruktioner.
                </p>
              </div>
            </div>
          </motion.div>
        ) : (
          /* ======================================================================== */
          /*                 ZOOMAD VY: INTERAKTIV FOTOHIERARKI                      */
          /* ======================================================================== */
          <motion.div
            key="zoomed-section"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.3 }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-6"
          >
            {/* LARGE HIGH-RES PHOTO WITH ABSOLUTE DOTS OVERLAY */}
            <div className="lg:col-span-8 flex flex-col gap-4">
              <div className={`relative w-full aspect-[4/3] sm:aspect-[16/10] rounded-[2rem] border overflow-hidden shadow-2xl ${theme === 'dark' ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-200'}`}>
                
                {/* Dynamiskt högupplöst foto av sektionen */}
                <div className="absolute inset-0 z-0 select-none">
                  {activeSectionBg ? (
                    <img 
                      src={activeSectionBg} 
                      alt={`Sektion ${selectedSection}`} 
                      className="w-full h-full object-cover opacity-85 dark:opacity-75 transition-opacity"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-slate-500 p-8 bg-slate-900/60">
                      <Camera size={48} className="text-slate-700 animate-pulse" />
                      <span className="text-sm font-bold text-slate-400">Inget sektionsfoto tillgängligt</span>
                      {canEditLayout && (
                        <p className="text-[11px] text-slate-500 max-w-[260px] text-center">
                          Klicka på "Ladda upp foto" uppe till höger för att lägga till en anpassad bakgrundsbild för denna sektion.
                        </p>
                      )}
                    </div>
                  )}
                  {/* Subtle darkening vignette */}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-slate-950/30 pointer-events-none" />
                </div>

                {/* ABSOLUTA GLÖDANDE PUNKTER DIREKT PÅ FOTOT */}
                {sectionPoints.map((point) => {
                  const isActive = point.id === activePointId;
                  const isCritical = point.criticality === Criticality.P1;
                  const statusColorClass = getPointStatusColor(point);
                  
                  // Limit the coordinates to fit cleanly
                  const xCoord = Math.min(95, Math.max(5, point.coordinates.x));
                  const yCoord = Math.min(95, Math.max(5, point.coordinates.y));

                  return (
                    <button
                      key={point.id}
                      onClick={() => handlePointClick(point)}
                      style={{ 
                        left: `${xCoord}%`, 
                        top: `${yCoord}%`, 
                        transform: 'translate(-50%, -50%)',
                      }}
                      className="absolute z-20 group focus:outline-none transition-transform duration-300"
                    >
                      {/* Pulse ring indicator */}
                      <span className="absolute -inset-4 flex items-center justify-center">
                        <span className={`animate-ping absolute inline-flex h-12 w-12 rounded-full opacity-40 ${
                          point.status === PointStatus.TAGGED_RED ? 'bg-red-500' : 
                          point.status === PointStatus.TAGGED_YELLOW ? 'bg-amber-500' : 'bg-emerald-500'
                        }`} />
                      </span>

                      {/* Point marker circle */}
                      <div className={`relative flex items-center justify-center rounded-full border-2 transition-all duration-300 shadow-2xl ${
                        isActive 
                          ? 'w-14 h-14 scale-110 ring-4 ring-blue-500' 
                          : 'w-10 h-10 group-hover:scale-110 group-hover:ring-2 group-hover:ring-white'
                        } ${statusColorClass}`}
                      >
                        <span className="text-white text-sm font-extrabold drop-shadow-md">{point.number}</span>
                        
                        {/* Status Icon Attachment */}
                        {point.status && point.status !== PointStatus.OK && (
                          <div className="absolute -top-1 -right-1 bg-slate-900 border border-slate-700 rounded-full p-0.5 shadow-md">
                            <AlertTriangle size={10} className={point.status === PointStatus.TAGGED_RED ? 'text-red-500' : 'text-amber-500'} />
                          </div>
                        )}
                      </div>

                      {/* Tooltip hovering tag */}
                      <div className="absolute top-12 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-950/95 border border-slate-800 text-[10px] text-white font-extrabold tracking-tight px-2 py-1 rounded shadow-2xl pointer-events-none whitespace-nowrap z-50">
                        P{point.number}: {point.name}
                      </div>
                    </button>
                  );
                })}

                {/* Sektion Info Ribbon */}
                <div className="absolute top-4 left-4 z-20 bg-slate-950/80 backdrop-blur-md px-4 py-2 rounded-xl border border-slate-800 flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
                  <span className="text-xs font-black uppercase text-white tracking-wider">{selectedSection}</span>
                  <span className="text-xs text-slate-400">| {sectionPoints.length} mätpunkter</span>
                </div>

                {/* Sektion Bakgrundsredigerare (visas för Processingenjörer) */}
                {canEditLayout && (
                  <div className="absolute top-4 right-4 z-20 flex gap-2">
                    <input 
                      type="file" 
                      id="section-bg-upload-input" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={handleSectionBgUpload} 
                    />
                    <label 
                      htmlFor="section-bg-upload-input" 
                      className="cursor-pointer bg-slate-950/90 hover:bg-blue-600 hover:text-white backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-800 text-[10px] font-black uppercase tracking-wider text-slate-300 transition-all flex items-center gap-1.5 shadow-lg active:scale-95"
                    >
                      <Camera size={12} />
                      {sectionBgUrl ? 'Byt foto' : 'Ladda upp foto'}
                    </label>
                    {sectionBgUrl && (
                      <button 
                        onClick={handleClearSectionBg}
                        className="bg-red-950/90 hover:bg-red-600 text-white backdrop-blur-md px-2 py-1.5 rounded-xl border border-slate-800 text-[10px] transition-all shadow-lg active:scale-95 flex items-center justify-center"
                        title="Återställ till standard"
                      >
                        <RotateCcw size={12} />
                      </button>
                    )}
                  </div>
                )}

              </div>

            </div>

            {/* INTERACTIVE ACTION PANEL (4 Cols on wide screens) */}
            <div className="lg:col-span-4 flex flex-col gap-4">
              <AnimatePresence mode="wait">
                {activePoint ? (
                  <motion.div
                    key={`panel-${activePoint.id}`}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className={`p-4 sm:p-5 rounded-[2rem] border flex flex-col gap-4 h-full ${theme === 'dark' ? 'bg-slate-950 border-slate-800' : 'bg-white border-slate-100'} shadow-2xl relative overflow-hidden`}
                  >
                    
                    {/* Header back button & title */}
                    <div className="flex flex-col gap-1.5 border-b border-slate-800/60 pb-2.5 shrink-0">
                      <button
                        onClick={() => setActivePointId(null)}
                        className="flex items-center gap-1 self-start text-[9px] font-black uppercase tracking-wider text-slate-400 hover:text-white transition-colors bg-slate-900/60 border border-slate-800/50 py-1 px-2.5 rounded-lg"
                      >
                        <ChevronLeft size={10} /> Checklistan
                      </button>
                      
                      <div className="flex justify-between items-start gap-2">
                        <div className="min-w-0">
                          <span className="text-[8px] font-black uppercase tracking-widest text-blue-500 bg-blue-950/40 px-1.5 py-0.5 rounded-full border border-blue-900/30">
                            Punkt {activePoint.number}
                          </span>
                          <h4 className="text-sm font-black tracking-tight text-slate-800 dark:text-white mt-1 leading-tight truncate">
                            {activePoint.name}
                          </h4>
                        </div>
                        
                        <button 
                          onClick={() => setActivePointId(null)} 
                          className="text-slate-500 hover:text-white p-1"
                        >
                          <XIcon size={14} />
                        </button>
                      </div>
                    </div>

                    {/* DETALJERAD NÄRBILD & PHYSICAL SPECIFICATION BOX (SIDE-BY-SIDE GRID) */}
                    <div className="grid grid-cols-12 gap-3 shrink-0">
                      {/* DETALJERAD NÄRBILD (ZOOM VID DETALJEN) */}
                      <div className="col-span-5 relative h-24 rounded-xl border border-slate-800 overflow-hidden bg-slate-950 shadow-inner group">
                        {activeSectionBg ? (
                          <>
                            <img 
                              src={activeSectionBg} 
                              alt={`Närbild punkt ${activePoint.number}`} 
                              className="absolute w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity duration-300"
                              style={{
                                transform: `scale(4) translate(${50 - activePoint.coordinates.x}%, ${50 - activePoint.coordinates.y}%)`,
                                transformOrigin: 'center'
                              }}
                            />
                            
                            {/* Center Target overlay */}
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 pointer-events-none">
                              <span className="absolute -inset-3 flex items-center justify-center">
                                <span className={`animate-ping absolute inline-flex h-6 w-6 rounded-full opacity-60 ${
                                  activePoint.status === PointStatus.TAGGED_RED ? 'bg-red-500' : 
                                  activePoint.status === PointStatus.TAGGED_YELLOW ? 'bg-amber-500' : 'bg-emerald-500'
                                }`} />
                              </span>
                              <div className={`w-5 h-5 rounded-full border border-white flex items-center justify-center shadow-2xl ${
                                  activePoint.status === PointStatus.TAGGED_RED ? 'bg-red-500' : 
                                  activePoint.status === PointStatus.TAGGED_YELLOW ? 'bg-amber-500' : 'bg-emerald-500'
                              }`}>
                                <span className="text-[9px] font-extrabold text-white">{activePoint.number}</span>
                              </div>
                            </div>

                            {/* Sight crosshair */}
                            <div className="absolute inset-0 border border-blue-500/10 pointer-events-none" />
                            <div className="absolute top-1/2 left-0 right-0 h-px bg-blue-500/15 pointer-events-none" />
                            <div className="absolute left-1/2 top-0 bottom-0 w-px bg-blue-500/15 pointer-events-none" />
                          </>
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center gap-1 text-slate-600 bg-slate-900/40">
                            <Camera size={16} className="opacity-40 animate-pulse" />
                            <span className="text-[8px] font-bold">Ingen bild</span>
                          </div>
                        )}
                      </div>

                      {/* PHYSICAL SPECIFICATION BOX */}
                      <div className={`col-span-7 rounded-xl p-2.5 flex flex-col justify-between text-[11px] text-left border ${theme === 'dark' ? 'bg-slate-900/40 border-slate-800/80' : 'bg-slate-50 border-slate-200'}`}>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-500 uppercase text-[8px] font-bold tracking-widest">Börvärde:</span>
                          <span className="text-emerald-500 font-extrabold text-xs">{getPointTargets(activePoint).targetValue}</span>
                        </div>
                        
                        <div className="flex justify-between items-center border-t border-slate-850/50 dark:border-slate-800/50 pt-1 mt-1">
                          <span className="text-slate-500 uppercase text-[8px] font-bold tracking-widest">Tolerans:</span>
                          <span className="text-slate-600 dark:text-slate-300 font-bold font-mono text-[10px]">{getPointTargets(activePoint).tolerance}</span>
                        </div>
                        
                        <div className="flex justify-between items-center border-t border-slate-850/50 dark:border-slate-800/50 pt-1 mt-1">
                          <span className="text-slate-500 uppercase text-[8px] font-bold tracking-widest">Metod:</span>
                          <span className="text-slate-600 dark:text-slate-300 font-semibold text-[10px] truncate max-w-[85px]" title={activePoint.measureMethod}>{activePoint.measureMethod}</span>
                        </div>
                      </div>
                    </div>

                    {/* INTERACTIVE FORM FOR VALUE ENTRY */}
                    <div className="space-y-3 flex-1 flex flex-col justify-center min-h-0 overflow-y-auto">
                      
                      {/* FAST "DONT MAKE ME THINK" QUICK CHECK BUTTON (HERO ACTION) */}
                      <div className="space-y-1 shrink-0">
                        <button
                          onClick={() => handleQuickRegisterOK(activePoint)}
                          className="w-full flex items-center justify-center gap-1.5 py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-[0_0_12px_rgba(16,185,129,0.2)] hover:shadow-[0_0_15px_rgba(16,185,129,0.35)] hover:scale-[1.01] active:scale-[0.99] transition-all"
                        >
                          <Check size={14} strokeWidth={3} /> Sätt OK ({getPointTargets(activePoint).targetValue})
                        </button>
                      </div>

                      <div className="relative flex py-0.5 items-center shrink-0">
                        <div className="flex-grow border-t border-slate-850 dark:border-slate-800"></div>
                        <span className="flex-shrink mx-2 text-[8px] font-extrabold uppercase text-slate-500 tracking-widest">eller avvikelse</span>
                        <div className="flex-grow border-t border-slate-850 dark:border-slate-800"></div>
                      </div>

                      {/* Measured Value and comments side-by-side or stacked cleanly */}
                      <div className="grid grid-cols-2 gap-2 shrink-0">
                        <div className="space-y-1">
                          <label className="text-[8px] font-black uppercase tracking-wider text-slate-500 block">Mätvärde</label>
                          <input
                            type="text"
                            value={measuredValue}
                            onChange={(e) => setMeasuredValue(e.target.value)}
                            placeholder="T.ex. 142.2"
                            className={`w-full py-1.5 px-2.5 border focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-extrabold font-mono rounded-lg text-xs ${theme === 'dark' ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'}`}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[8px] font-black uppercase tracking-wider text-slate-500 block font-sans">Kommentar</label>
                          <input
                            type="text"
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            placeholder="T.ex. Sliten rulle"
                            className={`w-full py-1.5 px-2.5 border focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-lg text-xs ${theme === 'dark' ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'}`}
                          />
                        </div>
                      </div>
                    </div>

                    {/* STATUS SELECT ACTION ROW */}
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-850 dark:border-slate-800 shrink-0">
                      <button
                        onClick={() => handleSaveStatus(PointStatus.TAGGED_YELLOW)}
                        className="flex items-center justify-center gap-1.5 py-2 bg-amber-600 hover:bg-amber-500 text-black font-black text-[9px] uppercase tracking-wider rounded-lg transition-all"
                      >
                        <AlertTriangle size={11} /> Gul Tagg (P2)
                      </button>
                      <button
                        onClick={() => handleSaveStatus(PointStatus.TAGGED_RED)}
                        className="flex items-center justify-center gap-1.5 py-2 bg-red-600 hover:bg-red-500 text-white font-black text-[9px] uppercase tracking-wider rounded-lg transition-all shadow-md hover:shadow-red-900/10"
                      >
                        <AlertTriangle size={11} /> Röd Tagg (P1)
                      </button>
                    </div>

                  </motion.div>
                ) : (
                  <motion.div
                    key="panel-checklist"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className={`p-4 sm:p-5 rounded-[2rem] border flex flex-col gap-4 h-full ${theme === 'dark' ? 'bg-slate-950 border-slate-800' : 'bg-white border-slate-100'} shadow-2xl relative overflow-hidden`}
                  >
                    {/* Header */}
                    <div className="border-b border-slate-850 dark:border-slate-800/60 pb-3">
                      <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500 bg-emerald-950/40 px-2.5 py-0.5 rounded-full border border-emerald-900/30">
                        Sektions-Checklista
                      </span>
                      <h4 className="text-lg font-black tracking-tight text-slate-800 dark:text-white mt-1.5 leading-snug">
                        {selectedSection}
                      </h4>
                      <p className="text-[10px] text-slate-500 mt-1">Guidad mätpunktskontroll (Poka-Yoke)</p>
                    </div>

                    {/* Progress tracking bar */}
                    {(() => {
                      const totalCount = sectionPoints.length;
                      const okCount = sectionPoints.filter(p => p.status === PointStatus.OK).length;
                      const yellowCount = sectionPoints.filter(p => p.status === PointStatus.TAGGED_YELLOW).length;
                      const redCount = sectionPoints.filter(p => p.status === PointStatus.TAGGED_RED).length;
                      const checkedCount = okCount + yellowCount + redCount;
                      const progressPercent = totalCount > 0 ? Math.round((checkedCount / totalCount) * 100) : 0;

                      return (
                        <div className={`border rounded-2xl p-3.5 space-y-2 ${theme === 'dark' ? 'bg-slate-900/40 border-slate-800/80' : 'bg-slate-50 border-slate-200'}`}>
                          <div className="flex justify-between items-center text-[11px] font-mono">
                            <span className="text-slate-500 dark:text-slate-400 font-bold">Framsteg</span>
                            <span className="text-emerald-500 font-black">{progressPercent}% ({checkedCount}/{totalCount})</span>
                          </div>
                          
                          {/* Progress bar */}
                          <div className="w-full h-1.5 bg-slate-800/20 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 transition-all duration-500" 
                              style={{ width: `${progressPercent}%` }}
                            />
                          </div>

                          {/* Legend counters */}
                          <div className="flex justify-between text-[9px] font-mono pt-0.5 text-slate-500">
                            <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> {okCount}</span>
                            {yellowCount > 0 && <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> {yellowCount}</span>}
                            {redCount > 0 && <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" /> {redCount}</span>}
                            <span>{totalCount - checkedCount} kvar</span>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Scrollable Points List */}
                    <div className="flex-1 overflow-y-auto pr-1 space-y-2 max-h-[360px] lg:max-h-none custom-scrollbar">
                      {sectionPoints.map((p) => {
                        const targets = getPointTargets(p);
                        const isOK = p.status === PointStatus.OK;
                        const isRed = p.status === PointStatus.TAGGED_RED;
                        const isYellow = p.status === PointStatus.TAGGED_YELLOW;
                        const isChecked = !!p.status;

                        let statusBadgeColor = 'border-slate-800 bg-slate-900 text-slate-400';
                        let statusText = 'Väntar...';

                        if (isChecked) {
                          if (isOK) {
                            statusBadgeColor = 'border-emerald-900 bg-emerald-950/20 text-emerald-400';
                            statusText = 'Säkrad';
                          } else if (isRed) {
                            statusBadgeColor = 'border-red-900 bg-red-950/20 text-red-400 animate-pulse';
                            statusText = 'Avvikelse (Röd)';
                          } else if (isYellow) {
                            statusBadgeColor = 'border-amber-900 bg-amber-950/20 text-amber-300';
                            statusText = 'Varning (Gul)';
                          }
                        }

                        return (
                          <button
                            key={`list-p-${p.id}`}
                            onClick={() => handlePointClick(p)}
                            className={`w-full border p-2.5 rounded-2xl flex items-center justify-between text-left transition-all group ${theme === 'dark' ? 'border-slate-800/80 hover:border-blue-500/50 bg-slate-900/20 hover:bg-slate-900/60' : 'border-slate-200 hover:border-blue-500/50 bg-slate-50/50 hover:bg-slate-50'}`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              {/* Sequence circular indicator */}
                              <div className={`w-7 h-7 rounded-full border flex items-center justify-center font-extrabold text-xs transition-colors shrink-0 ${
                                isChecked ? statusBadgeColor : (theme === 'dark' ? 'border-slate-800 bg-slate-950 text-slate-400' : 'border-slate-200 bg-white text-slate-400')
                              }`}>
                                {p.number}
                              </div>

                              <div className="space-y-0.5 min-w-0">
                                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-white transition-colors block truncate">
                                  {p.name}
                                </span>
                                <span className="text-[9px] font-mono text-slate-500 block truncate">
                                  Börvärde: <span className="text-slate-600 dark:text-slate-400 font-semibold">{targets.targetValue}</span>
                                </span>
                              </div>
                            </div>

                            {/* Chevron or status pill */}
                            <div className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded border transition-all flex items-center gap-1 shrink-0 ${theme === 'dark' ? 'border-slate-800/80 bg-slate-950 text-slate-500 group-hover:border-blue-500/40 group-hover:text-blue-400' : 'border-slate-200 bg-white text-slate-400 group-hover:border-blue-500/40 group-hover:text-blue-500'}`}>
                              <span>{statusText}</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    <div className="mt-auto border-t border-slate-800/50 pt-2.5 text-[10px] text-slate-500 italic text-center shrink-0">
                      Tips: Klicka på en punkt i listan eller på ritningen.
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Help helper icon for small clean usage
const XIcon: React.FC<{ size?: number; className?: string }> = ({ size = 16, className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
);
