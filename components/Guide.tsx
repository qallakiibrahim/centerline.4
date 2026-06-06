
import React, { useState } from 'react';
import { BookOpen, Target, AlertTriangle, Users, GitCommit, ShieldCheck, Zap, Activity, AlertOctagon, PenBox, X, Info, Eye, ClipboardCheck, Info as InfoIcon, Edit3, Save, Image as ImageIcon, ChevronRight, Printer } from 'lucide-react';
import { DefinitionDetail } from '../types';

interface GuideProps {
  theme?: 'light' | 'dark';
  definitions: Record<string, DefinitionDetail>;
  onUpdateDefinition?: (type: string, updated: DefinitionDetail) => void;
  isDesignMode?: boolean;
}

const Guide: React.FC<GuideProps> = ({ 
  theme = 'dark', 
  definitions, 
  onUpdateDefinition,
  isDesignMode = false
}) => {
  const [selectedDef, setSelectedDef] = useState<DefinitionDetail | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<DefinitionDetail | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleEditClick = (def: DefinitionDetail) => {
    setEditForm({ ...def });
    setIsEditing(true);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (max 1MB for Base64 storage in DB)
    if (file.size > 1024 * 1024) {
      alert("Bilden är för stor. Max 1MB tillåtet för uppladdning.");
      return;
    }

    setIsUploading(true);
    try {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setEditForm(prev => prev ? { ...prev, visual: base64String } : null);
        setIsUploading(false);
      };
      reader.onerror = () => {
        alert("Kunde inte läsa filen.");
        setIsUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error("Upload error:", error);
      alert("Ett fel uppstod vid uppladdning.");
      setIsUploading(false);
    }
  };

  const handleSave = () => {
    if (editForm && onUpdateDefinition) {
      onUpdateDefinition(editForm.type, editForm);
      setSelectedDef(editForm);
      setIsEditing(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      
      {/* Definition Modal */}
      {selectedDef && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
          <div 
            className="absolute inset-0 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300"
            onClick={() => {
              setSelectedDef(null);
              setIsEditing(false);
            }}
          />
          
          <div className="relative bg-white dark:bg-gray-900 w-full max-w-2xl rounded-[2.5rem] overflow-hidden shadow-2xl border border-gray-200 dark:border-gray-800 animate-in zoom-in-95 duration-300">
            {/* Modal Header */}
            <div className="relative h-48 sm:h-64 overflow-hidden">
              <img 
                src={isEditing ? editForm?.visual : selectedDef.visual} 
                alt={selectedDef.label}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-white dark:from-gray-900 via-transparent to-transparent" />
              
              <div className="absolute top-6 right-6 flex gap-2">
                {isDesignMode && !isEditing && (
                  <button 
                    onClick={() => handleEditClick(selectedDef)}
                    className="p-2 bg-blue-600 hover:bg-blue-500 text-white rounded-full transition-all shadow-lg"
                    title="Redigera definition"
                  >
                    <Edit3 size={20} />
                  </button>
                )}
                <button 
                  onClick={() => {
                    setSelectedDef(null);
                    setIsEditing(false);
                  }}
                  className="p-2 bg-black/20 hover:bg-black/40 backdrop-blur-md text-white rounded-full transition-all"
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="absolute bottom-6 left-8 right-8">
                <div className={`text-[10px] font-black px-2 py-1 rounded bg-white dark:bg-black/40 shadow-sm ${selectedDef.color} w-fit text-center mb-2 tracking-widest uppercase`}>
                  {selectedDef.type}
                </div>
                {isEditing ? (
                  <input 
                    type="text"
                    value={editForm?.label || ''}
                    onChange={(e) => setEditForm(prev => prev ? { ...prev, label: e.target.value } : null)}
                    className="w-full bg-white/10 backdrop-blur-md border border-white/20 rounded-xl px-4 py-2 text-2xl font-black text-white uppercase italic tracking-tighter outline-none focus:ring-2 focus:ring-blue-500"
                  />
                ) : (
                  <h3 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white uppercase italic tracking-tighter">
                    {selectedDef.label}
                  </h3>
                )}
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-8 space-y-8 max-h-[50vh] overflow-y-auto no-scrollbar">
              {isEditing ? (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                      <ImageIcon size={12} /> Bild
                    </label>
                    <div className="flex gap-2">
                      <input 
                        type="text"
                        value={editForm?.visual || ''}
                        onChange={(e) => setEditForm(prev => prev ? { ...prev, visual: e.target.value } : null)}
                        className="flex-1 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Bild-URL eller ladda upp..."
                      />
                      <label className="cursor-pointer px-4 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-xs flex items-center gap-2 transition-colors whitespace-nowrap">
                        <ImageIcon size={16} />
                        {isUploading ? 'LADDAR...' : 'LADDA UPP'}
                        <input 
                          type="file" 
                          className="hidden" 
                          accept="image/*"
                          onChange={handleFileChange}
                          disabled={isUploading}
                        />
                      </label>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                      <InfoIcon size={12} /> Kort beskrivning
                    </label>
                    <input 
                      type="text"
                      value={editForm?.desc || ''}
                      onChange={(e) => setEditForm(prev => prev ? { ...prev, desc: e.target.value } : null)}
                      className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                      <InfoIcon size={12} /> Vad det är (Längre förklaring)
                    </label>
                    <textarea 
                      value={editForm?.whatIsIt || ''}
                      onChange={(e) => setEditForm(prev => prev ? { ...prev, whatIsIt: e.target.value } : null)}
                      className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px]"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                      <ClipboardCheck size={12} /> Ditt ansvar
                    </label>
                    <textarea 
                      value={editForm?.responsibility || ''}
                      onChange={(e) => setEditForm(prev => prev ? { ...prev, responsibility: e.target.value } : null)}
                      className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px]"
                    />
                  </div>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                        <InfoIcon size={18} />
                        <h4 className="text-xs font-black uppercase tracking-wider">Vad det är</h4>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed font-medium">
                        {selectedDef.whatIsIt}
                      </p>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                        <ClipboardCheck size={18} />
                        <h4 className="text-xs font-black uppercase tracking-wider">Ditt ansvar</h4>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed font-medium">
                        {selectedDef.responsibility}
                      </p>
                    </div>
                  </div>

                  {selectedDef.type === 'Setpoint' && (
                    <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800/50 p-4 rounded-2xl flex items-start gap-4">
                      <AlertOctagon className="text-purple-600 dark:text-purple-400 shrink-0 mt-1" size={20} />
                      <p className="text-xs text-purple-900 dark:text-purple-200 font-bold leading-relaxed">
                        VIKTIGT: Kritiska setpoints får aldrig ändras utan ett formellt godkännande (TDP) från en processingenjör.
                      </p>
                    </div>
                  )}

                  {selectedDef.type === 'Condition' && (
                    <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/50 p-4 rounded-2xl flex items-start gap-4">
                      <Zap className="text-green-600 dark:text-green-400 shrink-0 mt-1" size={20} />
                      <p className="text-xs text-green-900 dark:text-green-200 font-bold leading-relaxed">
                        LOGIKEN: Om grundkonditionen är dålig kommer maskinen aldrig att kunna hålla sina Centerlines stabilt över tid.
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="p-6 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-800 flex justify-end gap-3">
              {isEditing ? (
                <>
                  <button 
                    onClick={() => setIsEditing(false)}
                    className="px-6 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-xl font-bold text-sm hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                  >
                    AVBRYT
                  </button>
                  <button 
                    onClick={handleSave}
                    className="px-6 py-2 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-500 flex items-center gap-2 shadow-lg shadow-blue-500/20"
                  >
                    <Save size={16} /> SPARA ÄNDRINGAR
                  </button>
                </>
              ) : (
                <button 
                  onClick={() => setSelectedDef(null)}
                  className="px-6 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl font-bold text-sm hover:scale-105 transition-transform"
                >
                  FÖRSTÅTT
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Intro Header - Standardiserat Arbetssätt */}
      <div className="relative overflow-hidden p-8 rounded-[2.5rem] border transition-all duration-500
        bg-gradient-to-br from-blue-50 to-white border-blue-100 shadow-md
        dark:bg-gradient-to-br dark:from-blue-950 dark:to-black dark:border-blue-900/50 dark:shadow-2xl">
        
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-600 rounded-xl shadow-lg shadow-blue-500/30">
              <Zap className="text-white" size={20} />
            </div>
            <span className="text-blue-600 dark:text-blue-400 font-black text-xs uppercase tracking-[0.25em]">
              Centerline Excellence (CLX)
            </span>
          </div>
          
          <h2 className="text-4xl md:text-5xl font-black text-gray-900 dark:text-white uppercase italic tracking-tighter mb-6 leading-none">
            Standardiserat <br />
            <span className="text-blue-600 dark:text-blue-500">Arbetssätt</span>
          </h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            <p className="text-gray-700 dark:text-blue-100/90 text-lg leading-relaxed font-medium">
              Syftet med CLX är att eliminera variation genom att säkerställa att maskinen alltid körs enligt 
              fastställda <strong className="text-gray-900 dark:text-white underline decoration-blue-500 decoration-2 underline-offset-4">Golden Run-inställningar</strong>. 
              Vi går från reaktivt agerande <span className="italic opacity-70">("jag tror")</span> till faktabaserad styrning <span className="italic text-blue-600 dark:text-blue-400 font-bold">("jag vet")</span>.
            </p>
            
            <div className="hidden lg:block bg-blue-600/5 dark:bg-blue-900/20 border border-blue-200/50 dark:border-blue-800/30 p-6 rounded-2xl backdrop-blur-sm">
              <div className="flex items-start gap-4">
                <Target className="text-blue-600 dark:text-blue-400 shrink-0 mt-1" size={24} />
                <div>
                  <h4 className="text-sm font-black text-gray-900 dark:text-white uppercase mb-1">Målbild</h4>
                  <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                    100% efterlevnad av Centerline-standarder för att garantera noll haverier och maximal OEE (maskineffektivitet).
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Decorative background element */}
        <BookOpen className="absolute right-[-40px] bottom-[-60px] text-blue-600/5 dark:text-blue-500/10 w-80 h-80 -rotate-12 pointer-events-none" />
      </div>

      {/* CARD: KULTUR & STRATEGI */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-8 rounded-3xl shadow-xl hover:border-gray-300 dark:hover:border-gray-700 transition-colors">
        <div className="flex items-center gap-3 mb-8 border-b border-gray-200 dark:border-gray-800 pb-4">
          <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-xl text-purple-600 dark:text-purple-400">
            <Zap size={24} />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white uppercase tracking-wide italic">Kultur: Reaktiv vs Proaktiv</h3>
            <p className="text-xs text-gray-500 font-mono">Process Control Strategy</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-11 gap-6 items-center">
          <div className="md:col-span-5 bg-red-50 dark:bg-red-900/20 p-6 rounded-2xl border border-red-200 dark:border-red-800/50 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
              <AlertTriangle size={40} className="text-red-500" />
            </div>
            <h4 className="text-red-700 dark:text-red-400 font-black text-xs uppercase mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
              Reaktiv (Gamla sättet)
            </h4>
            <p className="text-gray-800 dark:text-gray-200 text-sm leading-relaxed italic mb-2">
              "Jag tror jag vet felet, ge mig 10 minuter."
            </p>
            <p className="text-gray-500 dark:text-gray-400 text-xs leading-relaxed">
              Baserat på känsla och erfarenhet. Problem löses tillfälligt utan spårbarhet.
            </p>
          </div>

          <div className="md:col-span-1 flex justify-center">
            <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400 dark:text-gray-600 border border-gray-200 dark:border-gray-700">
              <Activity size={20} />
            </div>
          </div>

          <div className="md:col-span-5 bg-green-50 dark:bg-green-900/20 p-6 rounded-2xl border border-green-200 dark:border-green-800/50 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
              <ShieldCheck size={40} className="text-green-500" />
            </div>
            <h4 className="text-green-700 dark:text-green-400 font-black text-xs uppercase mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500"></span>
              Proaktiv (Centerline)
            </h4>
            <p className="text-gray-800 dark:text-gray-200 text-sm leading-relaxed italic mb-2">
              "Limmängden är låg men inom tolerans. Vi agerar nu för att undvika stopp."
            </p>
            <p className="text-gray-500 dark:text-gray-400 text-xs leading-relaxed">
              Baserat på data, standarder och förutsägbarhet.
            </p>
          </div>
        </div>
        
        <div className="mt-8 bg-gray-50 dark:bg-gray-950 p-5 rounded-2xl text-sm text-gray-600 dark:text-gray-400 italic border-l-4 border-purple-500 shadow-inner">
          "Målet är att minska variabiliteten i både <span className="text-gray-900 dark:text-white font-bold">INPUT</span> (Material, Metod) och <span className="text-gray-900 dark:text-white font-bold">PROCESSEN</span> för att garantera <span className="text-gray-900 dark:text-white font-bold">OUTPUT</span>."
        </div>
      </div>

      {/* GRUNDLÄGGANDE DEFINITIONER SECTION */}
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="h-6 w-1.5 bg-green-500 rounded"></div>
          <h3 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-wider italic">
            Grundläggande Definitioner
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Centerline (CL) */}
          {definitions['CL'] && (
            <div 
              onClick={() => setSelectedDef(definitions['CL'])}
              className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-6 rounded-3xl shadow-xl hover:border-gray-300 dark:hover:border-gray-700 transition-all duration-300 hover:scale-[1.02] cursor-pointer group flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center gap-2 text-blue-500 mb-4 bg-blue-50 dark:bg-blue-900/10 p-2.5 rounded-2xl w-fit">
                  <Activity size={24} />
                </div>
                <h4 className="text-lg font-black text-gray-900 dark:text-white uppercase italic tracking-tighter">
                  {definitions['CL'].label}
                </h4>
                <p className="text-xs font-bold text-green-500 uppercase mt-1 mb-3">Parametern</p>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed font-semibold">
                  {definitions['CL'].desc}
                </p>
              </div>
              <div className="mt-4 flex items-center gap-1.5 text-xs text-blue-500 font-bold group-hover:translate-x-1 transition-transform">
                LÄS MER <ChevronRight size={14} />
              </div>
            </div>
          )}

          {/* Card 2: CPE */}
          {definitions['CPE'] && (
            <div 
              onClick={() => setSelectedDef(definitions['CPE'])}
              className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-6 rounded-3xl shadow-xl hover:border-gray-300 dark:hover:border-gray-700 transition-all duration-300 hover:scale-[1.02] cursor-pointer group flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center gap-2 text-orange-500 mb-4 bg-orange-50 dark:bg-orange-900/10 p-2.5 rounded-2xl w-fit">
                  <GitCommit size={24} />
                </div>
                <h4 className="text-lg font-black text-gray-900 dark:text-white uppercase italic tracking-tighter">
                  {definitions['CPE'].label}
                </h4>
                <p className="text-xs font-bold text-green-500 uppercase mt-1 mb-3">Hårdvaran</p>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed font-semibold">
                  {definitions['CPE'].desc}
                </p>
              </div>
              <div className="mt-4 flex items-center gap-1.5 text-xs text-blue-500 font-bold group-hover:translate-x-1 transition-transform">
                LÄS MER <ChevronRight size={14} />
              </div>
            </div>
          )}

          {/* Card 3: Formeln för framgång */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-6 rounded-3xl shadow-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-purple-500 mb-4 bg-purple-50 dark:bg-purple-900/10 p-2.5 rounded-2xl w-fit">
                <Printer size={24} />
              </div>
              <h4 className="text-lg font-black text-gray-900 dark:text-white uppercase italic tracking-tighter">
                Formeln för framgång
              </h4>
              <p className="text-xs font-bold text-green-500 uppercase mt-1 mb-3">Styrning</p>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed font-bold">
                Vi styr utdatat genom att hålla våra centerlinjer låsta.
              </p>
            </div>
            <div className="mt-4 bg-gray-50 dark:bg-gray-950 p-4 rounded-xl border border-gray-100 dark:border-gray-850 flex items-center justify-center font-mono font-black text-xl text-green-600 dark:text-green-400 tracking-wider">
              Y = f(X<sub className="text-xs">cl</sub>)
            </div>
          </div>
        </div>
      </div>

      {/* DET SANNA VÄRDET : DETALJERAD UTBILDNING */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-8 rounded-[2rem] space-y-4 shadow-lg">
          <div className="flex items-center gap-2 text-blue-500">
            <Activity size={20} />
            <h4 className="text-xs font-black uppercase tracking-wider">CL: Processparametern</h4>
          </div>
          <h3 className="text-2xl font-black text-gray-900 dark:text-white uppercase italic tracking-tight">Att styra rätt värde på skärmen</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed font-medium">
            En centerline är en inställning som operatören enkelt kan läsa av, övervaka och justera under skiftet.
          </p>
          <ul className="space-y-3 text-xs font-medium text-gray-700 dark:text-gray-300">
            <li className="flex items-start gap-2 bg-gray-50 dark:bg-gray-800/40 p-3 rounded-xl border border-gray-100 dark:border-gray-800/50">
              <span className="text-green-500 font-bold shrink-0">✔</span>
              <span><strong>Målvärde & Gränser:</strong> Varje CL har ett bestämt börvärde (target) samt övre och undre tillåtna gränser.</span>
            </li>
            <li className="flex items-start gap-2 bg-gray-50 dark:bg-gray-800/40 p-3 rounded-xl border border-gray-100 dark:border-gray-800/50">
              <span className="text-green-500 font-bold shrink-0">✔</span>
              <span><strong>HMI & Mätare:</strong> Oftast de värden du knappar in på pekskärmen eller läser av på yttre instrument.</span>
            </li>
            <li className="flex items-start gap-2 bg-gray-50 dark:bg-gray-800/40 p-3 rounded-xl border border-gray-100 dark:border-gray-800/50">
              <span className="text-green-500 font-bold shrink-0">✔</span>
              <span><strong>Proaktiv kontroll:</strong> Genom att ligga på målvärdet stoppar vi fel innan produkten påverkas.</span>
            </li>
          </ul>
        </div>

        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-8 rounded-[2rem] space-y-4 shadow-lg">
          <div className="flex items-center gap-2 text-orange-500">
            <GitCommit size={20} />
            <h4 className="text-xs font-black uppercase tracking-wider">CPE: Den fysiska hårdvaran</h4>
          </div>
          <h3 className="text-2xl font-black text-gray-900 dark:text-white uppercase italic tracking-tight">Det sanna fysiska värdet inuti</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed font-medium">
            En CPE (Critical Physical Element) är det faktiska måttet på hårdvaran inuti maskinen som utför själva omvandlingsarbetet.
          </p>
          <ul className="space-y-3 text-xs font-medium text-gray-700 dark:text-gray-300">
            <li className="flex items-start gap-2 bg-gray-50 dark:bg-gray-800/40 p-3 rounded-xl border border-gray-100 dark:border-gray-800/50">
              <span className="text-green-500 font-bold shrink-0">✔</span>
              <span><strong>Mekanisk referens:</strong> Det verkliga, millimeterprecision-avståndet mellan två valsar eller knivar.</span>
            </li>
            <li className="flex items-start gap-2 bg-gray-50 dark:bg-gray-800/40 p-3 rounded-xl border border-gray-100 dark:border-gray-800/50">
              <span className="text-green-500 font-bold shrink-0">✔</span>
              <span><strong>Kalibreringsbehov:</strong> Om din HMI visar t.ex. 4.5 men det fysiska avståndet är fel, är maskinen utom kalibrering.</span>
            </li>
            <li className="flex items-start gap-2 bg-gray-50 dark:bg-gray-800/40 p-3 rounded-xl border border-gray-100 dark:border-gray-800/50">
              <span className="text-green-500 font-bold shrink-0">✔</span>
              <span><strong>Fasta & Justerbara:</strong> Kan vara helt fasta mekaniska mått eller ställas in via Seiko-räkneverk.</span>
            </li>
          </ul>
        </div>
      </div>

      {/* KATEGORIER FÖR CENTERLINING (DE FYRA TYPERNA) */}
      <div className="space-y-6">
        <div className="text-center space-y-2 max-w-2xl mx-auto py-4">
          <h3 className="text-3xl font-black text-gray-900 dark:text-white uppercase tracking-tight italic">
            Kategorier för Centerlining
          </h3>
          <p className="text-sm text-gray-500 font-semibold leading-relaxed">
            Hur vi delar upp och hanterar maskinens olika parametrar för att säkerställa 100% repeterbarhet.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {['Static', 'Dynamic', 'Setpoint', 'Condition'].map((type) => {
            const item = definitions[type];
            if (!item) return null;
            return (
              <div 
                key={type}
                onClick={() => setSelectedDef(item)}
                className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-5 rounded-3xl hover:border-blue-500 dark:hover:border-blue-500/30 transition-all duration-300 hover:scale-[1.02] cursor-pointer flex flex-col justify-between h-full group shadow-md"
              >
                <div className="space-y-4">
                  <div className="h-40 overflow-hidden rounded-2xl relative">
                    <img 
                      src={item.visual} 
                      alt={item.label}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    <div className="absolute bottom-3 left-4">
                      <span className="text-[10px] font-black uppercase text-white bg-blue-600/90 px-2.5 py-1 rounded shadow-sm tracking-widest">
                        {type === 'Condition' ? 'CIL' : type.toUpperCase()}
                      </span>
                    </div>
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-gray-900 dark:text-white">
                      {item.label}
                    </h4>
                    <p className="text-xs text-gray-500 leading-relaxed font-semibold mt-2 line-clamp-3">
                      {item.desc}
                    </p>
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-1.5 text-xs text-blue-500 font-bold group-hover:translate-x-1 transition-transform">
                  VISA ARBETSSÄTT <ChevronRight size={12} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* LATHUND TABLE (Slide 9) */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-8 rounded-3xl shadow-xl overflow-hidden">
        <div className="flex items-center gap-3 mb-6 border-b border-gray-200 dark:border-gray-800 pb-4">
          <div className="p-3 bg-indigo-50 dark:bg-indigo-900/10 rounded-xl text-indigo-500">
            <BookOpen size={24} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white uppercase tracking-wide">Sammanfattande Lathund</h3>
            <p className="text-xs text-gray-500 font-mono">Arbetssätt för de fyra kategorierna</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800">
                <th className="py-3 px-4 text-xs font-black uppercase tracking-wider text-gray-400">Kategori</th>
                <th className="py-3 px-4 text-xs font-black uppercase tracking-wider text-gray-400">När & Hur</th>
                <th className="py-3 px-4 text-xs font-black uppercase tracking-wider text-gray-400">Vad operatören gör</th>
                <th className="py-3 px-4 text-xs font-black uppercase tracking-wider text-gray-400">Koppling</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-xs font-medium text-gray-700 dark:text-gray-300">
              <tr className="hover:bg-gray-50 dark:hover:bg-gray-800/10 transition-colors">
                <td className="py-4 px-4 font-black text-gray-900 dark:text-white text-sm">Static CL</td>
                <td className="py-4 px-4 font-semibold text-gray-600 dark:text-gray-400">Vid stopp / formatbyte</td>
                <td className="py-4 px-4 leading-relaxed">Ställer in fysiska skalor och Seiko-räkneverk.</td>
                <td className="py-4 px-4"><span className="px-2 py-1 rounded bg-gray-100 dark:bg-gray-800 font-mono text-gray-500 text-[10px] uppercase">Mekanisk hårdvara</span></td>
              </tr>
              <tr className="hover:bg-gray-50 dark:hover:bg-gray-800/10 transition-colors">
                <td className="py-4 px-4 font-black text-gray-900 dark:text-white text-sm">Dynamic CL</td>
                <td className="py-4 px-4 font-semibold text-gray-600 dark:text-gray-400">Kontinuerligt under drift</td>
                <td className="py-4 px-4 leading-relaxed">Läser av tryck/flöden och justerar vid behov.</td>
                <td className="py-4 px-4"><span className="px-2 py-1 rounded bg-cyan-50 dark:bg-cyan-900/10 text-cyan-600 dark:text-cyan-400 font-mono text-[10px] uppercase">Processens flöde</span></td>
              </tr>
              <tr className="hover:bg-gray-50 dark:hover:bg-gray-800/10 transition-colors">
                <td className="py-4 px-4 font-black text-gray-900 dark:text-white text-sm">Setpoint</td>
                <td className="py-4 px-4 font-semibold text-gray-600 dark:text-gray-400">Via receptladdning i HMI</td>
                <td className="py-4 px-4 leading-relaxed">Verifierar att PLC-värden stämmer mot standard.</td>
                <td className="py-4 px-4"><span className="px-2 py-1 rounded bg-purple-50 dark:bg-purple-900/10 text-purple-600 dark:text-purple-400 font-mono text-[10px] uppercase">Digitalt system</span></td>
              </tr>
              <tr className="hover:bg-gray-50 dark:hover:bg-gray-800/10 transition-colors">
                <td className="py-4 px-4 font-black text-gray-900 dark:text-white text-sm">Condition (CIL)</td>
                <td className="py-4 px-4 font-black text-green-500">Förebyggande / Schemalagt</td>
                <td className="py-4 px-4 leading-relaxed">Utför CIL-rutiner för att bevara grundskicket (BSC).</td>
                <td className="py-4 px-4"><span className="px-2 py-1 rounded bg-green-50 dark:bg-green-900/10 text-green-600 dark:text-green-400 font-mono text-[10px] uppercase">Slitagekontroll / CIL</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* CARD 2: ROLLER & ANSVAR (RACI) - HORIZONTAL */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-6 rounded-2xl shadow-lg hover:border-gray-300 dark:hover:border-gray-700 transition-colors md:col-span-2">
          <div className="flex items-center gap-3 mb-8 border-b border-gray-200 dark:border-gray-800 pb-4">
            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-xl text-green-600 dark:text-green-400">
              <Users size={24} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white uppercase tracking-wide">Roller & Ansvar (RACI)</h3>
              <p className="text-xs text-gray-500 font-mono">Vem gör vad?</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
            {[
              { role: 'Operatör', desc: 'Utför kontroller. Återställer till standard. Sätter Röd/Gul Tagg vid avvikelse.', icon: ShieldCheck },
              { role: 'Team Leader', desc: 'Coachar teamet. Säkerställer att standard följs. Eskalerar taggar.', icon: Target },
              { role: 'Line Tech Lead (LTL)', desc: 'Analyserar mekaniska avvikelser (CPE). Identifierar slitage.', icon: Activity },
              { role: 'Processingenjör (PE)', desc: 'Systemägare. Analyserar data. Uppdaterar standarder.', icon: GitCommit },
              { role: 'Line Leader', desc: 'Säkerställer resurser och möjliggör förbättringsarbete.', icon: Users }
            ].map((item, i) => (
              <div key={i} className="group flex flex-col gap-3 p-4 bg-gray-50 dark:bg-gray-800/30 rounded-xl border border-gray-200 dark:border-gray-700/30 hover:bg-gray-100 dark:hover:bg-gray-800/50 transition-colors">
                <div className="p-2 bg-gray-200 dark:bg-gray-900 rounded-lg text-gray-600 dark:text-gray-400 group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors w-fit">
                  <item.icon size={18} />
                </div>
                <div>
                  <h4 className="text-xs font-black text-gray-900 dark:text-white uppercase mb-2 tracking-wider">{item.role}</h4>
                  <p className="text-[10px] text-gray-500 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CARD 3: ARBETSCYKELN (4 STEG) */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-6 rounded-2xl shadow-lg hover:border-gray-300 dark:hover:border-gray-700 transition-colors md:col-span-2">
          <div className="flex items-center gap-3 mb-8 border-b border-gray-200 dark:border-gray-800 pb-4">
            <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-xl text-purple-600 dark:text-purple-400">
              <Zap size={24} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white uppercase tracking-wide">Tagg-Systemet (Arbetscykeln)</h3>
              <p className="text-xs text-gray-500 font-mono">Process vid avvikelse från standard</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 relative">
            {/* Connecting lines for desktop */}
            <div className="hidden lg:block absolute top-10 left-[12%] right-[12%] h-0.5 bg-gray-200 dark:bg-gray-800 z-0"></div>
            
            {[
              { num: 1, title: 'Identifiera', desc: 'Dokumentera VAD som ändrades och till vilket värde.', color: 'bg-blue-600', sub: 'Operatör', subColor: 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30' },
              { num: 2, title: 'Varför', desc: 'Dokumentera orsaken (t.ex. förändrat råmaterial eller mekaniskt slitage).', color: 'bg-amber-600', sub: 'Operatör / LTL', subColor: 'text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30' },
              { num: 3, title: 'Tagga', desc: 'Ansvarar för att visualisera taggen för LTL och PE för att säkerställa eskalering.', color: 'bg-red-600', sub: 'Team Leader', subColor: 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30' },
              { num: 4, title: 'Standardisering', desc: 'Analysera om standarden behöver uppdateras permanent eller om maskinen kräver underhåll.', color: 'bg-green-600', sub: 'PE / LTL', subColor: 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30' }
            ].map((step, i) => (
              <div key={i} className="relative z-10 flex flex-col items-center text-center space-y-4 p-4 rounded-2xl bg-gray-50/50 dark:bg-gray-800/20 border border-transparent hover:border-gray-200 dark:hover:border-gray-700 transition-all duration-300">
                <div className={`w-12 h-12 rounded-full ${step.color} flex items-center justify-center text-lg font-black text-white shadow-lg ring-4 ring-white dark:ring-gray-900`}>{step.num}</div>
                <div>
                  <h4 className="text-xs font-black text-gray-900 dark:text-white uppercase mb-2 tracking-wider">{step.title}</h4>
                  <p className="text-[10px] text-gray-600 dark:text-gray-400 leading-relaxed px-1 font-medium">
                    {step.desc}
                  </p>
                </div>
                <div className={`text-[9px] ${step.subColor} font-black uppercase tracking-tighter px-3 py-1 rounded-full shadow-sm`}>{step.sub}</div>
              </div>
            ))}
          </div>
        </div>

        {/* CARD 4: KRITIKALITET & AVVIKELSER */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-6 rounded-2xl shadow-lg hover:border-gray-300 dark:hover:border-gray-700 transition-colors md:col-span-2">
          <div className="flex items-center gap-3 mb-6 border-b border-gray-200 dark:border-gray-800 pb-4">
            <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-xl text-red-600 dark:text-red-400">
              <AlertTriangle size={24} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white uppercase tracking-wide">Kritikalitet & Avvikelser</h3>
              <p className="text-xs text-gray-500 font-mono">Hantering av "Out of Standard"</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* P1 */}
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 p-6 rounded-2xl space-y-4 relative overflow-hidden group transition-all hover:shadow-lg hover:shadow-red-500/5">
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-full bg-red-500 animate-pulse shadow-lg shadow-red-500/50"></div>
                <h4 className="text-red-700 dark:text-red-400 font-black text-sm uppercase tracking-tighter">P1: KRITISK</h4>
              </div>
              <div className="space-y-3">
                <p className="text-xs text-red-800/70 dark:text-red-200/60 leading-relaxed italic font-medium">Haveri- & Kvalitetsrisk. Fokus på krascher i 360°-cykeln.</p>
                <div className="space-y-2">
                  <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed"><strong className="text-red-700 dark:text-red-400 uppercase text-[10px]">Def:</strong> Fel leder garanterat till stopp eller krasch.</p>
                  <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed"><strong className="text-red-700 dark:text-red-400 uppercase text-[10px]">Åtgärd:</strong> Maskinen <span className="text-red-600 dark:text-red-400 font-bold underline decoration-2 underline-offset-2">SKALL stoppas omedelbart</span>.</p>
                </div>
                <div className="pt-3 mt-3 border-t border-red-200 dark:border-red-800/30">
                  <p className="text-[10px] text-red-700 dark:text-red-400 font-black uppercase mb-1">CIL-koppling:</p>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 italic">Alltid CIL-säkrade för att garantera inställningen.</p>
                </div>
              </div>
            </div>
            {/* P2 */}
            <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800/50 p-6 rounded-2xl space-y-4 transition-all hover:shadow-lg hover:shadow-orange-500/5">
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-full bg-orange-500 shadow-lg shadow-orange-500/50"></div>
                <h4 className="text-orange-700 dark:text-orange-400 font-black text-sm uppercase tracking-tighter">P2: VIKTIG</h4>
              </div>
              <div className="space-y-3">
                <p className="text-xs text-orange-800/70 dark:text-orange-200/60 leading-relaxed italic font-medium">Produktivitet & Slitage. Påverkar grundkondition.</p>
                <div className="space-y-2">
                  <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed"><strong className="text-orange-700 dark:text-orange-400 uppercase text-[10px]">Def:</strong> Påverkar stabilitet, spill eller orsakar slitage.</p>
                  <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed"><strong className="text-orange-700 dark:text-orange-400 uppercase text-[10px]">Åtgärd:</strong> Återställ senast vid nästa planerade stopp.</p>
                </div>
                <div className="pt-3 mt-3 border-t border-orange-200 dark:border-orange-800/30">
                  <p className="text-[10px] text-orange-700 dark:text-orange-400 font-black uppercase mb-1">CIL-koppling:</p>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 italic">Identifiera glapp innan Centerline-värdet tappas.</p>
                </div>
              </div>
            </div>
            {/* P3 */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50 p-6 rounded-2xl space-y-4 transition-all hover:shadow-lg hover:shadow-blue-500/5">
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-full bg-blue-500 shadow-lg shadow-blue-500/50"></div>
                <h4 className="text-blue-700 dark:text-blue-400 font-black text-sm uppercase tracking-tighter">P3: STANDARD</h4>
              </div>
              <div className="space-y-3">
                <p className="text-xs text-blue-800/70 dark:text-blue-200/60 leading-relaxed italic font-medium">Processoptimering. Eliminera variation.</p>
                <div className="space-y-2">
                  <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed"><strong className="text-blue-700 dark:text-blue-400 uppercase text-[10px]">Def:</strong> Parametrar som optimerar processen.</p>
                  <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed"><strong className="text-blue-700 dark:text-blue-400 uppercase text-[10px]">Åtgärd:</strong> Justeras tillbaka till standard vid upptäckt.</p>
                </div>
                <div className="pt-3 mt-3 border-t border-blue-200 dark:border-blue-800/30">
                  <p className="text-[10px] text-blue-700 dark:text-blue-400 font-black uppercase mb-1">CIL-koppling:</p>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 italic">Ingen separat eskalering krävs vid efterlevnad.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CARD 5: STYRNING (GOVERNANCE) - HORIZONTAL */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-6 rounded-2xl shadow-lg hover:border-gray-300 dark:hover:border-gray-700 transition-colors md:col-span-2">
          <div className="flex items-center gap-3 mb-8 border-b border-gray-200 dark:border-gray-800 pb-4">
            <div className="p-3 bg-cyan-100 dark:bg-cyan-900/30 rounded-xl text-cyan-600 dark:text-cyan-400">
              <Activity size={24} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white uppercase tracking-wide">Styrning (Governance)</h3>
              <p className="text-xs text-gray-500 font-mono">Uppföljning & Styrning</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gray-50 dark:bg-gray-800/40 p-6 rounded-2xl border border-gray-200 dark:border-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
              <h4 className="text-gray-900 dark:text-white font-black text-xs uppercase mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.5)]"></span>
                Daglig Styrning
              </h4>
              <p className="text-[11px] text-gray-600 dark:text-gray-400 leading-relaxed font-medium">
                Team Leader (TL) följer upp antal <strong className="text-red-600 dark:text-red-400">Röda Taggar</strong> (P1) och <strong className="text-orange-600 dark:text-orange-400">Gula Taggar</strong> (P2). 
                Status på återställning till standard rapporteras och verifieras dagligen.
              </p>
            </div>
            
            <div className="bg-gray-50 dark:bg-gray-800/40 p-6 rounded-2xl border border-gray-200 dark:border-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
              <h4 className="text-gray-900 dark:text-white font-black text-xs uppercase mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.5)]"></span>
                Veckovis Core Team
              </h4>
              <p className="text-[11px] text-gray-600 dark:text-gray-400 leading-relaxed font-medium">
                PE och LTL analyserar återkommande avvikelser för att skilja på maskinproblem (LTL) och parameteroptimering (PE). 
                <strong className="text-gray-900 dark:text-white uppercase font-black">Line Leader (LL)</strong> beslutar om prioritering av resurser.
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Guide;
