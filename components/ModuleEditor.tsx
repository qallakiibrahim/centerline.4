
import React from 'react';
import { MachineModule } from '../types';
import { X, Save, Trash2, Move, Palette, Square, CheckSquare } from 'lucide-react';

interface ModuleEditorProps {
  module: MachineModule;
  onSave: (module: MachineModule) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
  theme?: 'light' | 'dark';
}

const ModuleEditor: React.FC<ModuleEditorProps> = ({ module, onSave, onDelete, onClose, theme = 'dark' }) => {
  const [formData, setFormData] = React.useState<MachineModule>({
    hasFill: false, // Ändrat till false som standard
    ...module
  });

  const handleChange = (field: keyof MachineModule, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const adjustValue = (field: 'x' | 'y' | 'width' | 'height', delta: number) => {
    setFormData(prev => {
      const currentVal = prev[field] === '' ? 0 : Number(prev[field]);
      return { ...prev, [field]: Math.max(0, Math.min(100, currentVal + delta)) };
    });
  };

  const handleSave = () => {
    const sanitized: MachineModule = {
      ...formData,
      x: formData.x === '' ? 0 : Number(formData.x),
      y: formData.y === '' ? 0 : Number(formData.y),
      width: formData.width === '' ? 10 : Number(formData.width),
      height: formData.height === '' ? 5 : Number(formData.height),
    };
    onSave(sanitized);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className={`w-full max-w-md rounded-2xl border shadow-2xl flex flex-col animate-in zoom-in duration-200 ${
        theme === 'dark' ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-200'
      }`}>
        <div className={`flex justify-between items-center p-5 border-b rounded-t-2xl ${
          theme === 'dark' ? 'border-gray-700 bg-gray-900' : 'border-gray-200 bg-gray-50'
        }`}>
          <h2 className={`text-xl font-bold flex items-center gap-2 italic ${
            theme === 'dark' ? 'text-white' : 'text-gray-900'
          }`}>
            <Move size={18} className="text-blue-500" /> Redigera Maskindel
          </h2>
          <button onClick={onClose} className={`${
            theme === 'dark' ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'
          }`}><X size={24} /></button>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <label className="block text-[10px] font-black text-gray-500 mb-1 uppercase tracking-widest">Namn på enhet</label>
            <input 
              type="text" 
              value={formData.label} 
              onChange={(e) => handleChange('label', e.target.value)} 
              className={`w-full border rounded p-2 focus:border-blue-500 outline-none ${
                theme === 'dark' ? 'bg-gray-900 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
              }`}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-4">
              <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest">Position (X / Y)</label>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400 w-4 font-mono">X:</span>
                <input 
                  type="number" 
                  value={formData.x} 
                  onChange={(e) => handleChange('x', e.target.value === '' ? '' : Number(e.target.value))} 
                  onFocus={(e) => e.target.select()}
                  className={`w-16 border rounded p-1 text-sm ${
                    theme === 'dark' ? 'bg-gray-900 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                  }`} 
                />
                <button onClick={() => adjustValue('x', -1)} className={`p-1 rounded ${
                  theme === 'dark' ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                }`}>-</button>
                <button onClick={() => adjustValue('x', 1)} className={`p-1 rounded ${
                  theme === 'dark' ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                }`}>+</button>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400 w-4 font-mono">Y:</span>
                <input 
                  type="number" 
                  value={formData.y} 
                  onChange={(e) => handleChange('y', e.target.value === '' ? '' : Number(e.target.value))} 
                  onFocus={(e) => e.target.select()}
                  className={`w-16 border rounded p-1 text-sm ${
                    theme === 'dark' ? 'bg-gray-900 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                  }`} 
                />
                <button onClick={() => adjustValue('y', -1)} className={`p-1 rounded ${
                  theme === 'dark' ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                }`}>-</button>
                <button onClick={() => adjustValue('y', 1)} className={`p-1 rounded ${
                  theme === 'dark' ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                }`}>+</button>
              </div>
            </div>

            <div className="space-y-4">
              <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest italic font-mono">Storlek (B / H)</label>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400 w-4 font-mono">B:</span>
                <input 
                  type="number" 
                  value={formData.width} 
                  onChange={(e) => handleChange('width', e.target.value === '' ? '' : Number(e.target.value))} 
                  onFocus={(e) => e.target.select()}
                  className={`w-16 border rounded p-1 text-sm ${
                    theme === 'dark' ? 'bg-gray-900 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                  }`} 
                />
                <button onClick={() => adjustValue('width', -1)} className={`p-1 rounded ${
                  theme === 'dark' ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                }`}>-</button>
                <button onClick={() => adjustValue('width', 1)} className={`p-1 rounded ${
                  theme === 'dark' ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                }`}>+</button>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400 w-4 font-mono">H:</span>
                <input 
                  type="number" 
                  value={formData.height} 
                  onChange={(e) => handleChange('height', e.target.value === '' ? '' : Number(e.target.value))} 
                  onFocus={(e) => e.target.select()}
                  className={`w-16 border rounded p-1 text-sm ${
                    theme === 'dark' ? 'bg-gray-900 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                  }`} 
                />
                <button onClick={() => adjustValue('height', -1)} className={`p-1 rounded ${
                  theme === 'dark' ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                }`}>-</button>
                <button onClick={() => adjustValue('height', 1)} className={`p-1 rounded ${
                  theme === 'dark' ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                }`}>+</button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className={`flex items-center justify-between p-3 rounded-xl border ${
              theme === 'dark' ? 'bg-gray-900/50 border-gray-700' : 'bg-gray-50 border-gray-200'
            }`}>
              <div className="flex flex-col">
                <label className={`text-sm font-bold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Fyllnad</label>
                <p className="text-[9px] text-gray-500 uppercase">Bakgrundsfärg</p>
              </div>
              <button 
                type="button"
                onClick={() => handleChange('hasFill', !formData.hasFill)}
                className={`p-1.5 rounded-lg transition-colors ${formData.hasFill ? 'bg-blue-600 text-white' : (theme === 'dark' ? 'bg-gray-700 text-gray-400' : 'bg-gray-200 text-gray-500')}`}
              >
                {formData.hasFill ? <CheckSquare size={18} /> : <Square size={18} />}
              </button>
            </div>

            <div className={`flex items-center justify-between p-3 rounded-xl border ${
              theme === 'dark' ? 'bg-gray-900/50 border-gray-700' : 'bg-gray-50 border-gray-200'
            }`}>
              <div className="flex flex-col">
                <label className={`text-sm font-bold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Radbryt</label>
                <p className="text-[9px] text-gray-500 uppercase">Textomfång</p>
              </div>
              <button 
                type="button"
                onClick={() => handleChange('wrapText', !formData.wrapText)}
                className={`p-1.5 rounded-lg transition-colors ${formData.wrapText ? 'bg-blue-600 text-white' : (theme === 'dark' ? 'bg-gray-700 text-gray-400' : 'bg-gray-200 text-gray-500')}`}
              >
                {formData.wrapText ? <CheckSquare size={18} /> : <Square size={18} />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-black text-gray-500 mb-2 uppercase tracking-widest italic">Textstorlek</label>
            <div className={`flex items-center gap-4 p-3 rounded-xl border ${
              theme === 'dark' ? 'bg-gray-900/50 border-gray-700' : 'bg-gray-50 border-gray-200'
            }`}>
              <input 
                type="range" 
                min="0.5" 
                max="5" 
                step="0.1" 
                value={formData.fontSize || 2} 
                onChange={(e) => handleChange('fontSize', Number(e.target.value))}
                className="flex-1 accent-blue-500"
              />
              <span className="text-xs font-mono text-blue-500 dark:text-blue-400 w-8 text-right">{formData.fontSize || 2}</span>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-black text-gray-500 mb-2 uppercase tracking-widest"><Palette size={10} className="inline mr-1" /> Temafärg</label>
            <div className="flex flex-wrap gap-2">
              {['#3b82f6', '#6366f1', '#eab308', '#f97316', '#ec4899', '#a855f7', '#10b981', '#ef4444', '#ffffff', '#4b5563'].map(c => (
                <button 
                  key={c}
                  type="button"
                  onClick={() => handleChange('color', c)}
                  className={`w-8 h-8 rounded-full border-2 transition-transform ${formData.color === c ? (theme === 'dark' ? 'border-white scale-110' : 'border-gray-900 scale-110') : 'border-transparent hover:scale-105'}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
        </div>

        <div className={`p-5 border-t flex justify-between rounded-b-2xl ${
          theme === 'dark' ? 'border-gray-700 bg-gray-900' : 'border-gray-200 bg-gray-50'
        }`}>
          <button onClick={() => onDelete(formData.id)} className="text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300 flex items-center gap-1 text-sm font-bold uppercase">
            <Trash2 size={16} /> Radera
          </button>
          <div className="flex gap-3">
            <button onClick={onClose} className={`px-4 py-2 font-bold uppercase text-xs tracking-widest ${
              theme === 'dark' ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'
            }`}>Avbryt</button>
            <button onClick={handleSave} className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold flex items-center gap-2 shadow-lg shadow-blue-900/40 uppercase text-xs tracking-widest transition-all active:scale-95">
              <Save size={16} /> Spara
            </button>
          </div>
        </div>
      </div>
    </div>

  );
};

export default ModuleEditor;
