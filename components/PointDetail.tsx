import React, { useState } from 'react';
import { MachinePoint, Criticality, PointStatus, PointHistoryLog } from '../types';
import { AlertTriangle, Video, AlertOctagon, PenBox, Zap, Tag, CheckCircle2, ChevronRight, Activity, Calendar, Clock, MessageSquare, ExternalLink, Info } from 'lucide-react';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ReferenceLine 
} from 'recharts';

interface PointDetailProps {
  point: MachinePoint;
  activeRecipe?: string;
  onUpdate: (point: MachinePoint) => void;
  onEdit: () => void;
  onClose: () => void;
  theme?: 'dark' | 'light';
  onRegisterValue?: (point: MachinePoint, value: string, status: PointStatus, comment?: string) => void;
  pointHistory?: PointHistoryLog[];
}

const PointDetail: React.FC<PointDetailProps> = ({ 
  point, 
  activeRecipe, 
  onUpdate, 
  onEdit, 
  onClose, 
  theme = 'dark',
  onRegisterValue,
  pointHistory = []
}) => {
  const [actualValueInput, setActualValueInput] = useState('');
  const [showWarning, setShowWarning] = useState(false);
  const [warningReason, setWarningReason] = useState('');
  const [tagComment, setTagComment] = useState('');
  const [isSavedLog, setIsSavedLog] = useState(false);
  const [isPlayingVideo, setIsPlayingVideo] = useState(false);

  // Helper to parse video URLs
  const getEmbeddableVideo = (url?: string) => {
    if (!url) return null;
    
    // SharePoint & Microsoft Stream/M365 formats
    const isSharePoint = url.includes('.sharepoint.com') || url.includes('onedrive.live.com') || url.includes('microsoft365.com') || url.includes('stream.office.com');
    if (isSharePoint) {
      let embedUrl = url;
      
      // SharePoint sharing url converter: replace standard path with embed block
      if (embedUrl.includes('/:v:/') && !embedUrl.includes('/:v:/e')) {
        embedUrl = embedUrl.replace('/:v:/', '/:v:/e/');
      }
      
      // Ensure embed view parameter is present
      if (!embedUrl.includes('action=embedview')) {
        embedUrl = embedUrl + (embedUrl.includes('?') ? '&' : '?') + 'action=embedview';
      }

      return {
        type: 'sharepoint',
        embedUrl: embedUrl
      };
    }
    
    // YouTube formats
    const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]+)/);
    if (ytMatch) {
      return {
        type: 'youtube',
        embedUrl: `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1`
      };
    }
    
    // Direct link to video formats
    if (url.match(/\.(mp4|webm|ogg)$/i)) {
      return {
        type: 'direct',
        embedUrl: url
      };
    }

    // Default or other arbitrary link
    return {
      type: 'other',
      embedUrl: url
    };
  };

  const videoMeta = getEmbeddableVideo(point.videoUrl);

  const handleStatusChange = (newStatus: PointStatus) => {
    onUpdate({ ...point, status: newStatus, lastChecked: new Date().toISOString() });
    
    // Log quick action changes too
    if (onRegisterValue) {
      const currentTarget = hasOverride ? point.recipeTargets![activeRecipe!].targetValue : point.targetValue;
      onRegisterValue(point, currentTarget, newStatus, 'Status ändrad via snabbval.');
    }
  };

  const hasOverride = activeRecipe && point.recipeTargets?.[activeRecipe];
  const targetValue = hasOverride ? point.recipeTargets![activeRecipe].targetValue : point.targetValue;
  const tolerance = hasOverride ? point.recipeTargets![activeRecipe].tolerance : point.tolerance;

  const isP1 = point.criticality === Criticality.P1;
  const isP2 = point.criticality === Criticality.P2;

  // Filter history for this specific point
  const getDisplayValue = (valStr: string | undefined | null) => {
    if (!valStr) return '';
    const str = valStr.toString();
    if (str.includes('=')) {
      return str.split('=').pop()?.trim() || str;
    }
    return str;
  };

  const historyForPoint = (pointHistory || [])
    .filter(h => h.pointId === point.id)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  // Helper to extract the core numeric value out of any string (e.g. "Visare B1 = 142" -> 142)
  const extractNumericValue = (str: string | undefined | null): number | null => {
    if (!str) return null;
    const normalized = str.toString().replace(',', '.');
    const matches = normalized.match(/-?[0-9]+(?:\.[0-9]+)?/g);
    if (matches && matches.length > 0) {
      // Pick the last matched number which usually represents the setpoint
      return parseFloat(matches[matches.length - 1]);
    }
    return null;
  };

  const getTolerancesForDetail = (targetStr: string, tolStr: string) => {
    const target = extractNumericValue(targetStr);
    if (target === null) return { target: null, min: null, max: null };

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
      const min = target - parsedTol;
      const max = target + parsedTol;
      return {
        target,
        min,
        max
      };
    }

    return { target, min: null, max: null };
  };

  // Tolerance check function
  const checkTolerance = (actualStr: string, targetStr: string, toleranceStr: string): { isInside: boolean; reason?: string } => {
    const actual = extractNumericValue(actualStr);
    const target = extractNumericValue(targetStr);
    
    if (actual === null || target === null) {
      return { isInside: true }; // non-numeric parameters always pass automated tolerance checking
    }

    // Parse tolerance e.g. "±0.5" or "+/-0.5" or "0.5"
    if (toleranceStr.includes('±') || toleranceStr.toLowerCase().includes('+-') || toleranceStr.toLowerCase().includes('+/-')) {
      const match = toleranceStr.replace(',', '.').match(/[0-9]+(?:\.[0-9]+)?/);
      if (match) {
        const tol = parseFloat(match[0]);
        const min = target - tol;
        const max = target + tol;
        const inside = actual >= min && actual <= max;
        return {
          isInside: inside,
          reason: `Värdet ${actual} ligger utanför godkänd tolerans ±${tol} (Godkänt intervall: ${min.toFixed(2)} - ${max.toFixed(2)})`
        };
      }
    }

    const rangeMatch = toleranceStr.replace(',', '.').match(/([0-9]+(?:\.[0-9]+)?)\s*[-–]\s*([0-9]+(?:\.[0-9]+)?)/);
    if (rangeMatch) {
      const min = parseFloat(rangeMatch[1]);
      const max = parseFloat(rangeMatch[2]);
      const inside = actual >= min && actual <= max;
      return {
        isInside: inside,
        reason: `Värdet ${actual} ligger utanför godkänt intervall: ${min} - ${max}`
      };
    }

    // Direct numeric fallback
    const parsedTol = extractNumericValue(toleranceStr);
    if (parsedTol !== null) {
      const min = target - parsedTol;
      const max = target + parsedTol;
      const inside = actual >= min && actual <= max;
      return {
        isInside: inside,
        reason: `Värdet ${actual} ligger utanför godkänd tolerans ±${parsedTol} (Godkänt intervall: ${min.toFixed(2)} - ${max.toFixed(2)})`
      };
    }

    return { isInside: true };
  };

  const handleRegisterValue = (e: React.FormEvent) => {
    e.preventDefault();
    if (!actualValueInput.trim()) return;

    const res = checkTolerance(actualValueInput, targetValue, tolerance);

    if (res.isInside) {
      onRegisterValue?.(point, actualValueInput, PointStatus.OK);
      onUpdate({
        ...point,
        status: PointStatus.OK,
        lastChecked: new Date().toISOString(),
        tagComment: ''
      });
      setIsSavedLog(true);
      setShowWarning(false);
      setTagComment('');
      setActualValueInput('');
      setTimeout(() => setIsSavedLog(false), 3000);
    } else {
      setShowWarning(true);
      setWarningReason(res.reason || 'Värdet ligger utanför uppsatt standardtolerans.');
    }
  };

  const handleCreateDeviationTag = () => {
    if (!actualValueInput.trim()) return;
    
    if (!tagComment.trim()) {
      alert("Ange beskrivning av avvikelsen (Tagg-kommentar)!");
      return;
    }

    onRegisterValue?.(point, actualValueInput, PointStatus.TAGGED_RED, tagComment);
    onUpdate({
      ...point,
      status: PointStatus.TAGGED_RED,
      lastChecked: new Date().toISOString(),
      tagComment: tagComment
    });

    setIsSavedLog(true);
    setShowWarning(false);
    setTagComment('');
    setActualValueInput('');
    setTimeout(() => setIsSavedLog(false), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 print:hidden">
      <div className={`${theme === 'dark' ? 'bg-gray-800 border-gray-600' : 'bg-white border-[#E2E8F0]'} w-full max-w-6xl max-h-[95vh] rounded-2xl border shadow-xl overflow-hidden flex flex-col transition-colors duration-300`}>
        
        {/* Header */}
        <div className={`flex flex-col md:flex-row md:items-center justify-between p-6 border-b ${theme === 'dark' ? 'border-gray-700 bg-gray-900' : 'border-[#E2E8F0] bg-slate-50'} gap-4`}>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
               <span className={`${theme === 'dark' ? 'bg-gray-700 text-gray-300' : 'bg-slate-200 text-slate-600'} px-2 py-1 rounded text-sm font-mono`}>{point.id}</span>
               <h2 className={`text-xl md:text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-[#0F172A]'}`}>{point.name}</h2>
            </div>
            <p className="text-gray-400 mt-1">{point.section} &bull; Punkt #{point.number}</p>
          </div>
          
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 font-semibold flex-wrap">
            {/* Status Quick Select */}
            <div className={`flex flex-wrap ${theme === 'dark' ? 'bg-gray-950 border-gray-700' : 'bg-slate-100 border-[#E2E8F0]'} p-1 rounded-xl border`}>
              <button 
                onClick={() => handleStatusChange(PointStatus.OK)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${point.status === PointStatus.OK || !point.status ? 'bg-green-600 text-white' : 'text-slate-500 hover:text-slate-700 dark:hover:text-gray-300'}`}
              >
                <CheckCircle2 size={14} /> OK
              </button>
              <button 
                onClick={() => handleStatusChange(PointStatus.TAGGED_YELLOW)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${point.status === PointStatus.TAGGED_YELLOW ? 'bg-[#D97706] text-white' : 'text-slate-500 hover:text-slate-700 dark:hover:text-gray-300'}`}
              >
                <Tag size={14} /> Gul Tagg (P2)
              </button>
              <button 
                onClick={() => handleStatusChange(PointStatus.TAGGED_RED)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${point.status === PointStatus.TAGGED_RED ? 'bg-[#DC2626] text-white' : 'text-slate-500 hover:text-slate-700 dark:hover:text-gray-300'}`}
              >
                <AlertTriangle size={14} /> Röd Tagg (P1)
              </button>
            </div>

            <div className="hidden sm:block h-8 w-px bg-gray-300 dark:bg-gray-700 mx-1"></div>

            <div className="flex gap-2">
              {isP1 && (
                <span className="px-3 py-1 bg-red-100 dark:bg-red-900/50 text-[#DC2626] dark:text-red-200 text-xs font-bold uppercase rounded border border-red-200 dark:border-red-800 flex items-center gap-2">
                  <AlertOctagon size={14} />
                  P1
                </span>
              )}
              {isP2 && (
                <span className="px-3 py-1 bg-amber-100 dark:bg-orange-900/50 text-[#D97706] dark:text-orange-200 text-xs font-bold uppercase rounded border border-amber-200 dark:border-orange-800 flex items-center gap-2">
                  <Tag size={14} />
                  P2
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          
          {/* Main Layout: Visuals & Controls */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Left: Images */}
            <div className="lg:col-span-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Image 1 */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">1. Översikt</label>
                  <div className={`relative aspect-[4/3] ${theme === 'dark' ? 'bg-black border-gray-600' : 'bg-slate-200 border-slate-300'} rounded-2xl overflow-hidden border group shadow-xl transition-colors duration-300`}>
                    <img src={point.imagePlaceholder} alt="Overview" className="w-full h-full object-cover" />
                  </div>
                </div>

                {/* Image 2 */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">2. Detalj / Inställning</label>
                  <div className={`relative aspect-[4/3] ${theme === 'dark' ? 'bg-black border-gray-600' : 'bg-slate-200 border-slate-300'} rounded-2xl overflow-hidden border group shadow-xl transition-colors duration-300`}>
                    {point.imagePlaceholder2 ? (
                      <img src={point.imagePlaceholder2} alt="Detail" className="w-full h-full object-cover" />
                    ) : (
                      <div className={`w-full h-full flex items-center justify-center ${theme === 'dark' ? 'bg-gray-900 text-gray-700' : 'bg-slate-100 text-slate-400'} italic text-sm`}>Ingen detaljbild</div>
                    )}
                  </div>
                </div>
              </div>

              {point.videoUrl ? (
                <div className="space-y-4">
                  {!isPlayingVideo ? (
                    <button 
                      onClick={() => setIsPlayingVideo(true)}
                      className={`w-full py-4 ${theme === 'dark' ? 'bg-blue-950/45 hover:bg-blue-900 border-blue-800' : 'bg-blue-50 hover:bg-blue-100 border-blue-200'} rounded-xl flex items-center justify-center gap-3 transition-all border group shadow-md`}
                    >
                      <Video size={24} className="text-blue-500 group-hover:scale-110 transition-transform animate-pulse" />
                      <span className={`font-bold ${theme === 'dark' ? 'text-blue-200' : 'text-blue-700'}`}>Spela upp instruktionsfilm</span>
                    </button>
                  ) : (
                    <div className={`p-4 ${theme === 'dark' ? 'bg-gray-950 border-gray-800' : 'bg-slate-50 border-slate-200'} border rounded-2xl space-y-4 shadow-inner`}>
                      <div className="flex justify-between items-center pb-2 border-b border-gray-800 flex-wrap gap-2">
                        <span className="text-xs font-bold text-gray-400 flex items-center gap-1.5">
                          <span className="w-2 h-2 bg-red-500 rounded-full animate-ping"></span>
                          Instruktionsfilm {videoMeta?.type === 'sharepoint' && '(SharePoint / Stream)'}
                        </span>
                        <div className="flex gap-2">
                          <a 
                            href={point.videoUrl} 
                            target="_blank" 
                            rel="noreferrer" 
                            className="px-2 py-1 bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white rounded text-xs font-bold transition-all flex items-center gap-1"
                          >
                            <ExternalLink size={12} />
                            Öppna externt
                          </a>
                          <button 
                            onClick={() => setIsPlayingVideo(false)}
                            className="px-2 py-1 bg-red-600/20 hover:bg-red-600 text-red-500 hover:text-white rounded text-xs font-bold transition-all"
                          >
                            Stäng spelare
                          </button>
                        </div>
                      </div>

                      <div className="relative aspect-video rounded-xl overflow-hidden bg-black border border-gray-800">
                        {videoMeta?.type === 'youtube' && (
                          <iframe 
                            src={videoMeta.embedUrl} 
                            title="Instruktionsfilm"
                            className="w-full h-full"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
                            allowFullScreen
                          />
                        )}
                        {videoMeta?.type === 'sharepoint' && (
                          <iframe 
                            src={videoMeta.embedUrl} 
                            title="Instruktionsfilm SharePoint"
                            className="w-full h-full"
                            allow="autoplay" 
                            allowFullScreen
                          />
                        )}
                        {videoMeta?.type === 'direct' && (
                          <video 
                            src={videoMeta.embedUrl} 
                            controls 
                            autoPlay 
                            className="w-full h-full object-contain"
                          />
                        )}
                        {videoMeta?.type === 'other' && (
                          <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center space-y-4">
                            <span className="text-xs text-gray-400 font-medium">Länken kan inte direktuppspelas här:</span>
                            <div className="font-mono text-xs text-blue-400 bg-gray-950 p-2 rounded max-w-full truncate">{point.videoUrl}</div>
                            <a 
                              href={point.videoUrl} 
                              target="_blank" 
                              rel="noreferrer" 
                              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold shadow transition-all flex items-center gap-2 animate-bounce"
                            >
                              Öppna instruktionsfilm i ny flik
                            </a>
                          </div>
                        )}
                      </div>

                      {videoMeta?.type === 'sharepoint' && (
                        <div className={`p-3 rounded-lg text-xs flex gap-2.5 ${theme === 'dark' ? 'bg-blue-950/20 text-blue-300 border-blue-900/50' : 'bg-blue-50 text-blue-800 border-blue-100'} border`}>
                          <Info size={16} className="text-blue-500 shrink-0 mt-0.5" />
                          <div className="space-y-1">
                            <p className="font-black">💡 Information om SharePoint-videor:</p>
                            <p className="opacity-90">Eftersom SharePoint kräver ett giltigt **Microsoft 365-konto** inom din organisation, måste du vara inloggad på datorn eller webbläsaren för att kunna spela upp den här.</p>
                            <p className="opacity-90">Om videon visas som en tom ruta eller frågar efter inloggning, kan du klicka på knappen **Öppna externt** ovan för att se videon direkt i Microsoft Stream.</p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <button 
                  disabled
                  title="Ingen instruktionsfilm tillagd för denna punkt"
                  className={`w-full py-4 ${theme === 'dark' ? 'bg-gray-900/30 border-gray-800' : 'bg-slate-50 border-slate-200'} rounded-xl flex items-center justify-center gap-3 border opacity-60 cursor-not-allowed`}
                >
                  <Video size={24} className="text-gray-500" />
                  <span className={`font-bold ${theme === 'dark' ? 'text-gray-500' : 'text-slate-400'}`}>Ingen instruktionsfilm (Klicka på redigera för att lägga till)</span>
                </button>
              )}
            </div>

            {/* Right: Info & Input Form */}
            <div className="lg:col-span-4 space-y-6">
              {/* Target & Tolerances */}
              <div className={`${theme === 'dark' ? 'bg-gray-900/80 border-gray-700' : 'bg-white border-[#E2E8F0]'} p-6 rounded-2xl border shadow-inner`}>
                <div className="space-y-6">
                  <div>
                    <span className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] block mb-2">Målvärde (Centerline)</span>
                    <div className="flex items-baseline gap-2">
                       <span className={`text-5xl font-black ${theme === 'dark' ? 'text-green-400' : 'text-green-600'} font-mono tracking-tighter`}>{targetValue}</span>
                       <span className="text-slate-600 font-bold italic text-sm">Target</span>
                    </div>
                    {hasOverride && (
                      <div className="mt-2.5 px-3 py-1.5 bg-cyan-700/15 border border-cyan-700/30 text-cyan-600 dark:text-cyan-400 rounded-xl text-[9px] font-black uppercase tracking-wider flex items-center gap-1.5 self-start">
                        <span className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-pulse"></span>
                        Formatunikt: {activeRecipe}
                      </div>
                    )}
                  </div>

                  <div className={`grid grid-cols-2 gap-6 pt-6 border-t ${theme === 'dark' ? 'border-gray-800' : 'border-[#E2E8F0]'}`}>
                    <div>
                      <span className="text-slate-600 text-[10px] font-black uppercase tracking-widest block mb-1">Tolerans</span>
                      <span className={`font-bold text-lg ${theme === 'dark' ? 'text-gray-200' : 'text-[#0F172A]'}`}>{tolerance || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-slate-600 text-[10px] font-black uppercase tracking-widest block mb-1">Mätmetod</span>
                      <span className={`font-bold text-lg ${theme === 'dark' ? 'text-gray-200' : 'text-[#0F172A]'}`}>{point.measureMethod}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* OPERATOR ACTUAL VALUE FORM */}
              <div className={`${theme === 'dark' ? 'bg-gray-900/80 border-gray-700' : 'bg-slate-50 border-[#E2E8F0]'} p-6 rounded-2xl border shadow-lg space-y-4`}>
                <div className="flex items-center gap-2">
                  <Activity size={18} className="text-blue-500" />
                  <span className="text-[#0F172A] dark:text-white font-black text-xs uppercase tracking-wider">Registrera uppmätt värde</span>
                </div>

                {!showWarning ? (
                  <form onSubmit={handleRegisterValue} className="space-y-3">
                    <div className="flex flex-col sm:flex-row gap-2 w-full">
                      <input 
                        type="text"
                        placeholder="Uppmätt värde (t.ex. 8,5)"
                        value={actualValueInput}
                        onChange={(e) => setActualValueInput(e.target.value)}
                        className={`flex-1 min-w-0 px-4 py-2.5 rounded-lg font-mono font-bold text-base focus:outline-none focus:ring-2 focus:ring-blue-500 border ${
                          theme === 'dark' ? 'bg-gray-850 border-gray-700 text-white' : 'bg-white border-slate-200 text-[#0F172A]'
                        }`}
                      />
                      <button 
                        type="submit"
                        className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm rounded-lg transition-colors whitespace-nowrap shrink-0 sm:w-auto w-full"
                      >
                        Registrera
                      </button>
                    </div>

                    {isSavedLog && (
                      <div className="text-xs text-green-500 font-bold animate-pulse text-center bg-green-500/10 py-1.5 rounded-md">
                        ✔ Mätvärde sparat och loggat! (OK)
                      </div>
                    )}
                  </form>
                ) : (
                  <div className="space-y-3 p-4 rounded-xl border border-red-500/30 bg-red-500/5 animate-in fade-in zoom-in duration-200">
                    <div className="flex items-start gap-2.5 text-red-600 dark:text-red-400 text-xs leading-relaxed font-semibold">
                      <AlertTriangle size={18} className="shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold underline uppercase tracking-wider mb-1">Toleransavvikelse!</p>
                        <p>{warningReason}</p>
                      </div>
                    </div>

                    <div className="space-y-2 pt-2 border-t border-red-500/20">
                      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">
                        Beskriv orsaken till avvikelsen (Tagg-kommentar)
                      </label>
                      <textarea 
                        value={tagComment}
                        onChange={(e) => setTagComment(e.target.value)}
                        placeholder="Skriv t.ex. Varför värdet ställdes utanför, slitage, material-avvikelse..."
                        className={`w-full p-2 rounded border focus:outline-none focus:ring-2 focus:ring-red-500 text-xs font-semibold ${
                          theme === 'dark' ? 'bg-gray-850 border-gray-750 text-white' : 'bg-white border-slate-300 text-slate-800'
                        }`}
                        rows={2}
                      />
                    </div>

                    <div className="flex gap-2 pt-1">
                      <button 
                        onClick={handleCreateDeviationTag}
                        className="flex-1 py-2 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded uppercase tracking-wider transition-colors"
                      >
                        Skapa Röd Tagg & Spara
                      </button>
                      <button 
                        onClick={() => { setShowWarning(false); setTagComment(''); }}
                        className={`px-3 py-2 text-xs font-bold rounded ${
                          theme === 'dark' ? 'bg-gray-800 text-gray-400 hover:text-white' : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                        }`}
                      >
                        Avbryt
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {isP1 && (
                <div className={`bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-500/30 p-5 rounded-2xl flex items-start gap-4 shadow-lg shadow-red-900/10`}>
                  <AlertOctagon className="text-red-500 shrink-0 mt-1" size={28} />
                  <div>
                    <h4 className="font-black text-red-600 dark:text-red-400 uppercase text-xs tracking-widest mb-1">Hög Risk / Kraschvarning</h4>
                    <p className="text-red-800 dark:text-red-200/70 text-sm leading-relaxed font-semibold">
                      Felaktig inställning här kan leda till allvarlig maskinskada i formverktyget. 
                      Säkerställ att maskinen är i nödstopp innan justering.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* POINT-SPECIFIC HISTORY AND GRAPH (HORIZONTAL FLOW) */}
          <div className={`pt-8 border-t ${theme === 'dark' ? 'border-gray-700' : 'border-[#E2E8F0]'}`}>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Activity size={18} className="text-green-500" />
                  <h3 className="text-base font-black text-gray-900 dark:text-white uppercase tracking-wider italic">
                    Historik & Trend för denna punkt (Optimering)
                  </h3>
                </div>
                <span className="text-[10px] font-bold text-slate-500">{historyForPoint.length} mätningar</span>
              </div>

              {historyForPoint.length > 0 ? (
                (() => {
                  const chartLogs = [...historyForPoint].reverse();
                  const parsedTolerance = getTolerancesForDetail(targetValue, tolerance);
                  const targetNum = parsedTolerance.target;
                  const minLimit = parsedTolerance.min;
                  const maxLimit = parsedTolerance.max;

                  const chartData = chartLogs
                    .map((log) => {
                      const val = extractNumericValue(log.value);
                      if (val === null) return null;
                      
                      const dateObj = new Date(log.timestamp);
                      const dateStr = dateObj.toLocaleDateString('sv-SE', { month: 'numeric', day: 'numeric' }) + 
                        ' ' + dateObj.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' });

                      return {
                        timestamp: log.timestamp,
                        date: dateStr,
                        value: val,
                        target: targetNum ?? undefined,
                        minLimit: minLimit ?? undefined,
                        maxLimit: maxLimit ?? undefined,
                        status: log.status
                      };
                    })
                    .filter((d): d is NonNullable<typeof d> => d !== null);

                  return (
                    <div className="space-y-4">
                      {/* Visuell trendkurva (Recharts chart) */}
                      <div className={`h-56 ${theme === 'dark' ? 'bg-gray-1000/60 border-gray-750' : 'bg-slate-50 border-slate-200'} border rounded-2xl p-4 flex flex-col justify-between relative overflow-hidden shadow-inner`}>
                        <div className="absolute top-2 left-3 flex gap-2 text-[10px] font-semibold text-slate-400 z-10">
                          <span>Målvärde: <strong className={theme === 'dark' ? 'text-white' : 'text-slate-700'}>{targetValue}</strong></span>
                          <span>&bull;</span>
                          <span>Tolerans: <strong className={theme === 'dark' ? 'text-white' : 'text-slate-700'}>{tolerance}</strong></span>
                        </div>

                        <div className="flex-1 w-full pt-4">
                          {chartData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                              <LineChart data={chartData} margin={{ top: 15, right: 10, bottom: 0, left: -25 }}>
                                <XAxis 
                                  dataKey="date" 
                                  tick={{ fontSize: 8, fill: theme === 'dark' ? '#94A3B8' : '#64748B' }} 
                                  tickLine={false}
                                  axisLine={false}
                                />
                                <YAxis 
                                  domain={[
                                    (dataMin: number) => {
                                      const floor = Math.min(dataMin, minLimit ?? dataMin, targetNum ?? dataMin);
                                      return Math.floor(floor - Math.max(1, Math.abs(floor * 0.05)));
                                    },
                                    (dataMax: number) => {
                                      const cap = Math.max(dataMax, maxLimit ?? dataMax, targetNum ?? dataMax);
                                      return Math.ceil(cap + Math.max(1, Math.abs(cap * 0.05)));
                                    }
                                  ]}
                                  tick={{ fontSize: 8, fill: theme === 'dark' ? '#94A3B8' : '#64748B' }}
                                  tickLine={false}
                                  axisLine={false}
                                />
                                <Tooltip
                                  contentStyle={{
                                    background: theme === 'dark' ? '#1E293B' : '#FFFFFF',
                                    borderColor: theme === 'dark' ? '#334155' : '#E2E8F0',
                                    borderRadius: '8px',
                                    fontSize: '10px',
                                    color: theme === 'dark' ? '#F8FAFC' : '#0F172A',
                                    fontFamily: 'monospace'
                                  }}
                                  formatter={(value: any) => [`${value}`, 'Mätvärde']}
                                />
                                
                                {targetNum !== null && (
                                  <ReferenceLine 
                                    y={targetNum} 
                                    stroke="#10B981" 
                                    strokeWidth={1.5}
                                    strokeDasharray="4 3" 
                                    opacity={0.8}
                                  />
                                )}

                                {minLimit !== null && (
                                  <ReferenceLine 
                                    y={minLimit} 
                                    stroke="#EF4444" 
                                    strokeWidth={1}
                                    strokeDasharray="3 3" 
                                    opacity={0.6}
                                  />
                                )}

                                {maxLimit !== null && (
                                  <ReferenceLine 
                                    y={maxLimit} 
                                    stroke="#EF4444" 
                                    strokeWidth={1}
                                    strokeDasharray="3 3" 
                                    opacity={0.6}
                                  />
                                )}

                                <Line 
                                  type="monotone" 
                                  dataKey="value" 
                                  stroke="#3B82F6" 
                                  strokeWidth={2.5}
                                  dot={(props: any) => {
                                    const { cx, cy, payload } = props;
                                    const isOK = payload.status === PointStatus.OK;
                                    return (
                                      <circle 
                                        cx={cx} 
                                        cy={cy} 
                                        r={4.5} 
                                        fill={isOK ? '#10B981' : '#EF4444'} 
                                        stroke={theme === 'dark' ? '#0F172A' : '#FFFFFF'} 
                                        strokeWidth={1.5} 
                                      />
                                    );
                                  }}
                                  activeDot={{ r: 6 }} 
                                />
                              </LineChart>
                            </ResponsiveContainer>
                          ) : (
                            <div className="absolute inset-0 flex flex-col items-center justify-center space-y-1 text-slate-400 dark:text-slate-600 text-center p-4">
                              <Activity size={24} className="stroke-1 animate-pulse" />
                              <span className="text-[10px] font-bold uppercase tracking-wider">Mätvärden saknar numeriska siffror</span>
                              <span className="text-[9px] font-mono leading-normal px-2">Trendgrafen visas endast för kvantifierbara centerline-parametrar.</span>
                            </div>
                          )}
                        </div>

                        <div className="flex justify-between text-[8px] font-black uppercase text-slate-500 tracking-wider mt-1">
                          <span>Dåtid &larr;</span>
                          <span>Senaste mätning &rarr;</span>
                        </div>
                      </div>

                      {/* HORIZONTAL TIMELINE ROW */}
                      <div className="overflow-x-auto pb-4 pt-1 flex gap-3 scroll-smooth">
                        {historyForPoint.map((log) => {
                          const isOK = log.status === PointStatus.OK;
                          const dateObj = new Date(log.timestamp);
                          const formattedDate = dateObj.toLocaleDateString('sv-SE', { month: 'short', day: 'numeric' });
                          const formattedTime = dateObj.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' });

                          const displayVal = getDisplayValue(log.value);
                          const displayTgt = getDisplayValue(log.targetValue);

                          return (
                            <div 
                              key={log.id} 
                              className={`min-w-[180px] p-3 rounded-xl border flex flex-col justify-between shrink-0 transition-all ${
                                isOK 
                                  ? (theme === 'dark' ? 'bg-green-950/15 border-green-500/20 hover:border-green-500/40' : 'bg-green-50/40 border-green-200 hover:border-green-300') 
                                  : (theme === 'dark' ? 'bg-red-950/15 border-red-500/20 hover:border-red-500/40' : 'bg-red-50/40 border-red-200 hover:border-red-300')
                              }`}
                            >
                              <div className="flex justify-between items-center mb-1">
                                <span className="text-[9px] text-slate-500 font-bold flex items-center gap-1">
                                  <Calendar size={10} /> {formattedDate}
                                  <Clock size={10} /> {formattedTime}
                                </span>
                                <span className={`text-[8px] font-black px-1.5 py-0.5 rounded ${
                                  isOK ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
                                }`}>
                                  {isOK ? 'OK' : 'TAGG'}
                                </span>
                              </div>

                              <div className="flex items-baseline gap-1.5 mt-1.5 mb-1">
                                <span className={`text-lg font-black font-mono tracking-tight ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>
                                  {displayVal}
                                </span>
                                <span className="text-[9px] text-slate-400 font-medium">
                                  (Bör: {displayTgt})
                                </span>
                              </div>

                              {log.comment && (
                                <div className="mt-1 text-[9px] text-slate-500 dark:text-slate-400 italic bg-black/5 dark:bg-black/20 p-1.5 rounded flex items-start gap-1">
                                  <MessageSquare size={10} className="shrink-0 mt-0.5 text-blue-500" />
                                  <span className="line-clamp-2 leading-tight">{log.comment}</span>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()
              ) : (
                <div className={`text-center py-6 text-xs text-slate-500 font-medium italic border border-dashed rounded-xl ${
                  theme === 'dark' ? 'bg-gray-900/20 border-gray-700' : 'bg-slate-50 border-slate-250'
                }`}>
                  Ingen tidigare mätdata lagrad för denna punkt ännu. Genom att ange värden ovan skapar ni löpande historik.
                </div>
              )}
            </div>
          </div>

          {/* AI Support */}
          <div className={`pt-6 border-t ${theme === 'dark' ? 'border-gray-700' : 'border-[#E2E8F0]'}`}>
            <div className={`${theme === 'dark' ? 'bg-gray-900/40 border-gray-700' : 'bg-slate-50 border-slate-300'} border border-dashed rounded-2xl p-6 text-center shadow-inner`}>
              <div className="flex flex-col items-center gap-3 text-slate-500">
                <Zap size={32} className="opacity-20 text-blue-500 animate-pulse" />
                <p className="font-bold italic">AI-stöd & Processoptimering aktivt</p>
                <p className="text-xs max-w-md mx-auto opacity-60 font-medium">
                  Systemet analyserar kontinuerligt avvikelser i historiken för att rekommendera optimala gränser för centerlines och sänka energiförluster.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className={`p-4 border-t ${theme === 'dark' ? 'border-gray-700 bg-gray-900' : 'border-[#E2E8F0] bg-slate-50'} flex justify-between items-center gap-4`}>
          <button 
             onClick={onEdit} 
             className={`flex items-center gap-2 px-6 py-3 ${theme === 'dark' ? 'bg-gray-800 hover:bg-gray-700 text-gray-300 border-gray-600' : 'bg-white hover:bg-slate-100 text-slate-600 border-[#E2E8F0]'} border rounded-lg transition-colors font-medium text-sm group`}
             title="Redigera värden"
          >
             <PenBox size={18} className={`${theme === 'dark' ? 'text-gray-400 group-hover:text-white' : 'text-slate-500 group-hover:text-[#0F172A]'}`} />
             Redigera Punkt
          </button>

          <button 
            onClick={onClose} 
            className="px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold transition-colors shadow-lg shadow-blue-900/50"
          >
            Stäng
          </button>
        </div>
      </div>
    </div>
  );
};

export default PointDetail;
