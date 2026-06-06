import React, { useState } from 'react';
import { X, Printer, FileText, UserCheck, Calendar, ShieldCheck, AlertCircle } from 'lucide-react';
import { DocumentMetadata } from '../types';
import { translations } from '../translations';

interface PrintModalProps {
  metadata: DocumentMetadata;
  onPrint: (updatedMetadata: DocumentMetadata) => void;
  onClose: () => void;
  theme?: 'dark' | 'light';
}

const PrintModal: React.FC<PrintModalProps> = ({ metadata, onPrint, onClose, theme = 'dark' }) => {
  const [localMetadata, setLocalMetadata] = useState<DocumentMetadata>(metadata);
  const t = translations.sv;

  const handlePrint = () => {
    onPrint(localMetadata);
  };

  const inputClass = `w-full ${theme === 'dark' ? 'bg-black border-gray-800 text-white' : 'bg-white border-gray-300 text-gray-900'} border-2 rounded-xl px-4 py-3 focus:border-blue-600 outline-none font-mono text-sm transition-all`;
  const labelClass = `text-[10px] font-black ${theme === 'dark' ? 'text-gray-500' : 'text-gray-600'} uppercase tracking-widest mb-1 block`;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 backdrop-blur-lg p-4">
      <div className={`${theme === 'dark' ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'} w-full max-w-2xl rounded-[2.5rem] border shadow-2xl flex flex-col overflow-hidden animate-in zoom-in duration-300 transition-colors`}>
        
        {/* Header */}
        <div className={`flex justify-between items-center p-6 md:p-8 ${theme === 'dark' ? 'bg-black/40 border-gray-800' : 'bg-gray-50 border-gray-200'} border-b shrink-0`}>
          <div>
            <h2 className={`text-2xl md:text-3xl font-black ${theme === 'dark' ? 'text-white' : 'text-gray-900'} flex items-center gap-3 italic tracking-tighter uppercase`}>
              <Printer className="text-blue-500 w-8 h-8" /> {t.printOptions}
            </h2>
            <p className={`${theme === 'dark' ? 'text-gray-500' : 'text-gray-600'} text-xs md:text-sm mt-1`}>{t.verifyDocInfo}</p>
          </div>
          <button onClick={onClose} className={`p-3 ${theme === 'dark' ? 'bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-900'} rounded-full transition-all`}>
            <X size={24} />
          </button>
        </div>

        <div className="p-6 md:p-8 space-y-6 overflow-y-auto max-h-[60vh]">
          
          <div className={`p-4 rounded-xl text-xs leading-relaxed flex gap-3 ${theme === 'dark' ? 'bg-blue-900/20 text-blue-300 border border-blue-800/50' : 'bg-blue-50 text-blue-800 border border-blue-100'}`}>
            <AlertCircle className="shrink-0" size={16} />
            <div>
              <strong>{t.isoRequirement}:</strong> {t.isoCheckText}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className={labelClass}>{t.documentId}</label>
                <div className="relative">
                  <FileText size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                  <input type="text" value={localMetadata.id} onChange={e => setLocalMetadata({...localMetadata, id: e.target.value})} className={inputClass} />
                </div>
              </div>
              <div>
                <label className={labelClass}>{t.version}</label>
                <input type="text" value={localMetadata.version} onChange={e => setLocalMetadata({...localMetadata, version: e.target.value})} className={inputClass} />
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className={labelClass}>{t.validFrom}</label>
                <div className="relative">
                  <Calendar size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                  <input type="date" value={localMetadata.validFrom} onChange={e => setLocalMetadata({...localMetadata, validFrom: e.target.value})} className={inputClass} />
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-gray-700/50">
            <div className="space-y-4">
              <div>
                <label className={labelClass}>{t.issuedBy}</label>
                <div className="relative">
                  <UserCheck size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                  <input type="text" value={localMetadata.issuedBy} onChange={e => setLocalMetadata({...localMetadata, issuedBy: e.target.value})} className={inputClass} />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className={labelClass}>{t.approvedBy}</label>
                <div className="relative">
                  <ShieldCheck size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-green-500 pointer-events-none" />
                  <input type="text" value={localMetadata.approvedBy} onChange={e => setLocalMetadata({...localMetadata, approvedBy: e.target.value})} className={`${inputClass} border-green-500/30 focus:border-green-500`} />
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className={`p-6 md:p-8 ${theme === 'dark' ? 'bg-black/40 border-gray-800' : 'bg-gray-50 border-gray-200'} border-t grid grid-cols-2 gap-4 md:flex md:justify-end shrink-0`}>
          <button onClick={onClose} className={`w-full md:w-auto px-2 md:px-8 py-4 ${theme === 'dark' ? 'text-gray-500 hover:text-white' : 'text-gray-500 hover:text-gray-900'} font-bold transition-colors`}>{t.cancel}</button>
          <button onClick={handlePrint} className="w-full md:w-auto px-2 md:px-16 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] md:text-sm shadow-xl shadow-blue-900/40 transition-all active:scale-95 whitespace-nowrap flex items-center justify-center gap-2">
            <Printer size={18} /> {t.print}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PrintModal;
