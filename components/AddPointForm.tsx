import React, { useState } from 'react';
import { MachinePoint, Criticality, MachineModule } from '../types';
import { X, Save, MapPin, Eye, EyeOff, MousePointer2, Upload, ChevronDown, RefreshCw } from 'lucide-react';
import MachineMap from './MachineMap';
import CustomSelect from './CustomSelect';

interface AddPointFormProps {
  existingPoints: MachinePoint[];
  initialData?: MachinePoint;
  layout?: MachineModule[];
  recipes: string[];
  theme?: 'dark' | 'light';
  lines: { id: string; name: string }[];
  machines: Record<string, string[]>;
  sections: Record<string, string[]>;
  defaultLineId?: string;
  defaultMachine?: string;
  defaultSection?: string;
  onSave: (point: MachinePoint) => void;
  onCancel: () => void;
}

const AddPointForm: React.FC<AddPointFormProps> = ({ 
  existingPoints, 
  initialData, 
  layout, 
  recipes, 
  theme = 'dark',
  lines = [],
  machines = {},
  sections = {},
  defaultLineId,
  defaultMachine,
  defaultSection,
  onSave, 
  onCancel 
}) => {
  const isEditing = !!initialData;
  const nextNumber = existingPoints.length > 0 ? Math.max(...existingPoints.map(p => p.number)) + 1 : 1;

  const [selectedLineId, setSelectedLineId] = useState<string>(
    initialData?.lineId ?? defaultLineId ?? (lines && lines.length > 0 ? lines[0].id : '')
  );
  
  const [selectedMachineName, setSelectedMachineName] = useState<string>(
    initialData?.machine ?? defaultMachine ?? (selectedLineId && machines[selectedLineId] ? machines[selectedLineId][0] : '')
  );

  const [formData, setFormData] = useState<Partial<MachinePoint>>({
    number: initialData?.number ?? nextNumber,
    id: initialData?.id ?? `P-${nextNumber < 10 ? '0' + nextNumber : nextNumber}`,
    name: initialData?.name ?? '',
    section: initialData?.section ?? (defaultSection !== 'All' ? defaultSection : '') ?? '',
    description: initialData?.description ?? '',
    targetValue: initialData?.targetValue ?? '',
    tolerance: initialData?.tolerance ?? '',
    measureMethod: initialData?.measureMethod ?? '',
    criticality: initialData?.criticality ?? Criticality.P2,
    imagePlaceholder: initialData?.imagePlaceholder ?? 'https://picsum.photos/400/300?grayscale',
    imagePlaceholder2: initialData?.imagePlaceholder2 ?? '',
    videoUrl: initialData?.videoUrl ?? '',
    coordinates: initialData?.coordinates ?? { x: 50, y: 50 },
    visibleOnMap: initialData?.visibleOnMap ?? true,
    phaseAngle: initialData?.phaseAngle,
    recipeTargets: initialData?.recipeTargets ?? {}
  });

  const [phaseAngleStr, setPhaseAngleStr] = useState<string>(initialData?.phaseAngle?.toString() ?? '');

  const handleChange = (field: keyof MachinePoint, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleRecipeChange = (recipe: string, field: 'targetValue' | 'tolerance', value: string) => {
    const currentTargets = { ...(formData.recipeTargets || {}) };
    if (!currentTargets[recipe]) {
      currentTargets[recipe] = { targetValue: '', tolerance: '' };
    }
    currentTargets[recipe][field] = value;
    
    // Clean up empty recipe overrides to save space
    if (!currentTargets[recipe].targetValue && !currentTargets[recipe].tolerance) {
      delete currentTargets[recipe];
    }
    
    handleChange('recipeTargets', currentTargets);
  };

  const copyStandardToAllRecipes = () => {
    if (!formData.targetValue) {
      alert("Ange ett standardmålvärde först!");
      return;
    }
    const overrides: Record<string, { targetValue: string; tolerance: string }> = {};
    recipes.forEach(r => {
      overrides[r] = {
        targetValue: formData.targetValue || '',
        tolerance: formData.tolerance || ''
      };
    });
    handleChange('recipeTargets', overrides);
  };

  const handleFileUpload = (field: 'imagePlaceholder' | 'imagePlaceholder2', event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        handleChange(field, reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCoordinateChange = (x: number, y: number) => {
    setFormData(prev => ({
      ...prev,
      coordinates: { x, y }
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.targetValue || !formData.measureMethod) {
      alert("Vänligen fyll i alla obligatoriska fält (Benämning, Målvärde, Mätmetod)");
      return;
    }
    const finalPoint: MachinePoint = { 
      ...formData as MachinePoint, 
      lineId: selectedLineId,
      machine: selectedMachineName,
      section: formData.section || '',
      phaseAngle: phaseAngleStr ? parseFloat(phaseAngleStr) : undefined 
    };
    onSave(finalPoint);
  };

  const previewPoint = { 
    ...formData as MachinePoint, 
    id: isEditing ? formData.id! : 'PREVIEW',
    lineId: selectedLineId,
    machine: selectedMachineName
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className={`${theme === 'dark' ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-200'} w-full max-w-4xl max-h-[90vh] rounded-2xl border shadow-2xl flex flex-col transition-colors duration-300`}>
        
        <div className={`flex justify-between items-center p-6 border-b ${theme === 'dark' ? 'border-gray-700 bg-gray-900' : 'border-gray-200 bg-gray-50'} rounded-t-2xl`}>
          <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} flex items-center gap-2`}>
            {isEditing ? 'Redigera punkt' : 'Lägg till ny kontrollpunkt'}
            <span className={`text-sm font-normal ${theme === 'dark' ? 'text-gray-400 bg-gray-800 border-gray-700' : 'text-gray-500 bg-gray-100 border-gray-200'} px-2 py-1 rounded border`}>#{formData.number}</span>
          </h2>
          <button onClick={onCancel} className="text-gray-400 hover:text-white transition-colors">
            <X size={32} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className={`text-blue-400 font-bold uppercase text-xs tracking-widest border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'} pb-2`}>Grundinformation</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-gray-500 mb-1 uppercase">Nummer</label>
                    <input type="number" value={formData.number} onChange={(e) => handleChange('number', parseInt(e.target.value))} className={`w-full ${theme === 'dark' ? 'bg-gray-900 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'} rounded p-2`} />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-500 mb-1 uppercase">ID</label>
                    <input type="text" value={formData.id} onChange={(e) => handleChange('id', e.target.value)} className={`w-full ${theme === 'dark' ? 'bg-gray-900 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'} rounded p-2 font-mono`} />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-500 mb-1 uppercase">Benämning *</label>
                  <input type="text" value={formData.name} onChange={(e) => handleChange('name', e.target.value)} className={`w-full ${theme === 'dark' ? 'bg-gray-900 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'} rounded p-2`} required />
                </div>

                {/* Hierarkikoppling */}
                <div className="space-y-4 p-4 bg-gray-900/40 dark:bg-black/30 rounded-2xl border border-gray-700/50 dark:border-gray-800">
                  <div className="flex items-center gap-1.5 pb-2 border-b border-gray-700/30">
                    <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                    <span className="text-[11px] font-black uppercase text-gray-400 tracking-wider">Koppla till fabrikshierarki</span>
                  </div>
                  
                  {/* Linje */}
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">1. Produktionslinje</label>
                    <CustomSelect
                      value={selectedLineId}
                      onChange={(val) => {
                        setSelectedLineId(val);
                        const machs = machines[val] || [];
                        const firstMach = machs[0] || '';
                        setSelectedMachineName(firstMach);
                        handleChange('section', '');
                      }}
                      options={lines.map(l => ({ value: l.id, label: l.name }))}
                      placeholder="Välj linje..."
                      variant="form"
                    />
                  </div>

                  {/* Maskin */}
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">2. Maskinenhet</label>
                    <CustomSelect
                      value={selectedMachineName}
                      onChange={(val) => {
                        setSelectedMachineName(val);
                        handleChange('section', '');
                      }}
                      options={(machines[selectedLineId] || []).map(m => ({ value: m, label: m }))}
                      placeholder="Välj maskin..."
                      variant="form"
                    />
                  </div>

                  {/* Sektion */}
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">3. Maskinsektion</label>
                    <CustomSelect
                      value={formData.section || ''}
                      onChange={(val) => handleChange('section', val)}
                      options={(sections[selectedMachineName] || []).map(sec => ({ value: sec, label: sec }))}
                      placeholder="Välj sektion..."
                      variant="form"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className={`text-green-400 font-bold uppercase text-xs tracking-widest border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'} pb-2`}>Värden</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-gray-500 mb-1 uppercase">Målvärde *</label>
                    <input type="text" value={formData.targetValue} onChange={(e) => handleChange('targetValue', e.target.value)} className={`w-full ${theme === 'dark' ? 'bg-gray-900 border-gray-600 text-green-400' : 'bg-white border-gray-300 text-green-600'} rounded p-2 font-bold`} required />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-500 mb-1 uppercase">Tolerans</label>
                    <input type="text" value={formData.tolerance} onChange={(e) => handleChange('tolerance', e.target.value)} className={`w-full ${theme === 'dark' ? 'bg-gray-900 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'} rounded p-2`} />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-500 mb-1 uppercase">Mätmetod *</label>
                  <input type="text" value={formData.measureMethod} onChange={(e) => handleChange('measureMethod', e.target.value)} className={`w-full ${theme === 'dark' ? 'bg-gray-900 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'} rounded p-2`} required />
                </div>
                 <div>
                   <label className="block text-[10px] font-black text-gray-500 mb-1 uppercase">Kritikalitet</label>
                   <CustomSelect
                     value={formData.criticality || ''}
                     onChange={(val) => handleChange('criticality', val)}
                     options={Object.values(Criticality).map(c => ({ value: c, label: c }))}
                     placeholder="Välj kritikalitet..."
                     variant="form"
                   />
                </div>
                <div>
                   <label className="block text-[10px] font-black text-cyan-400 mb-1 uppercase">Fasningsvinkel (0-360°)</label>
                   <div className="flex items-center gap-2">
                     <input 
                       type="number" 
                       min="0" 
                       max="360" 
                       value={phaseAngleStr} 
                       onChange={(e) => setPhaseAngleStr(e.target.value)} 
                       placeholder="t.ex. 180"
                       className={`w-full ${theme === 'dark' ? 'bg-gray-900 border-gray-600 text-cyan-400' : 'bg-white border-gray-300 text-cyan-600'} rounded p-2 font-mono`} 
                     />
                     <span className="text-gray-500 font-bold">°</span>
                   </div>
                   <p className="text-[9px] text-gray-600 mt-1 italic">Lämna tomt om punkten inte är synk-beroende.</p>
                </div>
              </div>
            </div>

            {/* FORMAT/RECEPT OVERRIDES MATRIX */}
            <div className={`space-y-4 pt-6 mt-6 border-t ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
                <div>
                  <h3 className="text-cyan-400 font-bold uppercase text-xs tracking-widest flex items-center gap-2">
                    <RefreshCw size={14} className="text-cyan-400" />
                    Formatspecifika Börvärden (Receptmatris)
                  </h3>
                  <p className="text-[10px] text-gray-500 mt-1 italic">
                    Ange avvikande börvärden för specifika format. Lämna tomt för att använda standardvärdet (Universell inställning).
                  </p>
                </div>
                <button
                  type="button"
                  onClick={copyStandardToAllRecipes}
                  className="shrink-0 px-3 py-1.5 bg-cyan-700/30 hover:bg-cyan-700/50 border border-cyan-600/40 text-cyan-300 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all"
                >
                  Koppla standardvärde till alla recept
                </button>
              </div>

              <div className={`overflow-hidden border ${theme === 'dark' ? 'border-gray-700 bg-gray-900/40' : 'border-slate-200 bg-slate-50'} rounded-xl`}>
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className={`border-b ${theme === 'dark' ? 'border-gray-700 bg-gray-900/80 text-gray-400' : 'border-slate-200 bg-slate-100 text-slate-500'} text-[10px] uppercase font-black tracking-widest`}>
                      <th className="py-2.5 px-4 w-5/12 text-[10px] uppercase font-bold text-gray-500">Förpackningsformat (Recept)</th>
                      <th className="py-2.5 px-3 text-[10px] uppercase font-bold text-gray-500">Börvärde (Target)</th>
                      <th className="py-2.5 px-3 text-[10px] uppercase font-bold text-gray-500">Tolerans</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${theme === 'dark' ? 'divide-gray-700' : 'divide-slate-200'}`}>
                    {recipes.map((recipe) => {
                      const recVal = formData.recipeTargets?.[recipe] || { targetValue: '', tolerance: '' };
                      const inputBg = theme === 'dark' ? 'bg-gray-950/60 border-gray-700 placeholder-gray-600 focus:border-cyan-500' : 'bg-white border-slate-300 placeholder-slate-400 focus:border-blue-500';
                      const rowText = theme === 'dark' ? 'text-slate-200' : 'text-slate-800';
                      
                      return (
                        <tr key={recipe} className="hover:bg-cyan-500/5 transition-colors animate-none">
                          <td className={`py-3 px-4 font-bold text-sm ${rowText} flex items-center gap-2`}>
                            <span className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-pulse"></span>
                            {recipe}
                          </td>
                          <td className="py-2 px-3">
                            <input
                              type="text"
                              value={recVal.targetValue}
                              placeholder={formData.targetValue ? `Standard: ${formData.targetValue}` : 'Standard...'}
                              onChange={(e) => handleRecipeChange(recipe, 'targetValue', e.target.value)}
                              className={`w-full border text-xs rounded p-2 focus:outline-none transition-colors font-semibold ${inputBg} ${recVal.targetValue ? (theme === 'dark' ? 'text-cyan-400 font-bold border-cyan-700' : 'text-cyan-600 font-bold border-cyan-400') : ''}`}
                            />
                          </td>
                          <td className="py-2 px-3">
                            <input
                              type="text"
                              value={recVal.tolerance}
                              placeholder={formData.tolerance ? `Standard: ${formData.tolerance}` : 'Standard...'}
                              onChange={(e) => handleRecipeChange(recipe, 'tolerance', e.target.value)}
                              className={`w-full border text-xs rounded p-2 focus:outline-none transition-colors ${inputBg} ${recVal.tolerance ? (theme === 'dark' ? 'text-white border-cyan-700' : 'text-[#0F172A] border-cyan-400') : ''}`}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className={`space-y-4 pt-4 border-t ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
              <h3 className={`text-pink-400 font-bold uppercase text-xs tracking-widest border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'} pb-2`}>Bilder & Referenser</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <label className="block text-[10px] font-black text-gray-500 uppercase">Referensbild 1 (Översikt)</label>
                  <div className={`aspect-video ${theme === 'dark' ? 'bg-gray-900 border-gray-700' : 'bg-gray-100 border-gray-300'} rounded-xl overflow-hidden border relative group`}>
                    <img src={formData.imagePlaceholder} className="w-full h-full object-cover" alt="Preview 1" />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                       <button type="button" onClick={() => document.getElementById('file-upload-1')?.click()} className="p-2 bg-blue-600 rounded-lg text-white"><Upload size={18} /></button>
                    </div>
                    <input id="file-upload-1" type="file" className="hidden" onChange={(e) => handleFileUpload('imagePlaceholder', e)} accept="image/*" />
                  </div>
                  <input 
                    type="text" 
                    value={formData.imagePlaceholder} 
                    onChange={(e) => handleChange('imagePlaceholder', e.target.value)}
                    placeholder="Bild-URL 1..." 
                    className={`w-full ${theme === 'dark' ? 'bg-gray-900 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'} rounded p-2 text-xs`} 
                  />
                </div>

                <div className="space-y-3">
                  <label className="block text-[10px] font-black text-gray-500 uppercase">Referensbild 2 (Detalj/Inställning)</label>
                  <div className={`aspect-video ${theme === 'dark' ? 'bg-gray-900 border-gray-700' : 'bg-gray-100 border-gray-300'} rounded-xl overflow-hidden border relative group`}>
                    {formData.imagePlaceholder2 ? (
                      <img src={formData.imagePlaceholder2} className="w-full h-full object-cover" alt="Preview 2" />
                    ) : (
                      <div className={`w-full h-full flex items-center justify-center ${theme === 'dark' ? 'text-gray-700' : 'text-gray-400'} italic text-xs`}>Ingen bild vald</div>
                    )}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                       <button type="button" onClick={() => document.getElementById('file-upload-2')?.click()} className="p-2 bg-blue-600 rounded-lg text-white"><Upload size={18} /></button>
                    </div>
                    <input id="file-upload-2" type="file" className="hidden" onChange={(e) => handleFileUpload('imagePlaceholder2', e)} accept="image/*" />
                  </div>
                  <input 
                    type="text" 
                    value={formData.imagePlaceholder2 || ''} 
                    onChange={(e) => handleChange('imagePlaceholder2', e.target.value)}
                    placeholder="Bild-URL 2..." 
                    className={`w-full ${theme === 'dark' ? 'bg-gray-900 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'} rounded p-2 text-xs`} 
                  />
                </div>
              </div>
            </div>

            {/* Video-URL block */}
            <div className={`space-y-4 pt-4 border-t ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
              <h3 className={`text-blue-400 font-bold uppercase text-xs tracking-widest border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'} pb-2`}>Instruktionsfilm</h3>
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-gray-500 uppercase">Länk till instruktionsfilm (Stödjer SharePoint, Stream, Teams, OneDrive, YouTube eller MP4)</label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={formData.videoUrl || ''} 
                    onChange={(e) => handleChange('videoUrl', e.target.value)}
                    placeholder="Klistra in SharePoint-delningslänk, YouTube-länk eller MP4-fil-webbadress..." 
                    className={`w-full ${theme === 'dark' ? 'bg-gray-900 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'} rounded p-2 text-xs`} 
                  />
                  {formData.videoUrl && (
                    <button 
                      type="button" 
                      onClick={() => handleChange('videoUrl', '')} 
                      className={`px-3 py-2 rounded border text-xs font-bold ${theme === 'dark' ? 'border-red-800 bg-red-950/40 text-red-400 hover:bg-red-900/40' : 'border-red-200 bg-red-50 text-red-600 hover:bg-red-100'}`}
                    >
                      Rensa
                    </button>
                  )}
                </div>
                <p className="text-[10px] text-gray-500 italic">Vi stödjer vanliga **SharePoint-, Stream- och OneDrive-delningslänkar**! De konverteras automatiskt i bakgrunden till inbäddat format så att operatörer kan titta på instruktionerna direkt vid punkten i appen (kräver att de har behörighet till filen i er organisation).</p>
              </div>
            </div>

            <div className={`space-y-4 pt-4 border-t ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
               <div className="flex justify-between items-center">
                  <h3 className="text-purple-400 font-bold uppercase text-xs tracking-widest">Positionering</h3>
                  <div className="flex items-center gap-2 text-[10px] text-gray-500 uppercase font-black">
                    <MousePointer2 size={12} className="text-blue-500" /> Klicka på kartan för att placera
                  </div>
               </div>

               {formData.visibleOnMap && (
                 <div className={`${theme === 'dark' ? 'bg-gray-900 border-gray-700' : 'bg-gray-100 border-gray-300'} p-2 rounded-xl border overflow-hidden`}>
                    <MachineMap 
                      points={existingPoints} 
                      layout={layout}
                      previewPoint={previewPoint} 
                      onMapClick={handleCoordinateChange}
                      theme={theme}
                    />
                 </div>
               )}
            </div>

            <div className={`grid grid-cols-2 gap-4 md:flex md:justify-end pt-6 border-t ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
              <button type="button" onClick={onCancel} className="w-full md:w-auto px-2 md:px-6 py-3 text-gray-400 hover:text-gray-600 dark:hover:text-white font-bold">Avbryt</button>
              <button type="submit" className="w-full md:w-auto px-4 md:px-8 py-3 bg-green-600 hover:bg-green-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-green-900/40">
                <Save size={20} /> {isEditing ? 'Uppdatera' : 'Spara'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddPointForm;
