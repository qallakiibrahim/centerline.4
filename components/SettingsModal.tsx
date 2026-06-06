import React, { useState, useRef, useEffect } from 'react';
import { X, Upload, Save, Image as ImageIcon, Link, Globe, CheckCircle2, Copy, Wifi, Info, Cloud, ShieldCheck, FileText, UserCheck, Calendar } from 'lucide-react';
import { DocumentMetadata } from '../types';

interface SettingsModalProps {
  currentMapUrl: string | null;
  currentLogoUrl: string | null;
  currentPublicUrl: string;
  currentMetadata: DocumentMetadata;
  onSave: (settings: { mapUrl: string | null; logoUrl: string | null; publicUrl: string; metadata: DocumentMetadata }) => void;
  onClose: () => void;
  theme?: 'dark' | 'light';
}

const SettingsModal: React.FC<SettingsModalProps> = ({ currentMapUrl, currentLogoUrl, currentPublicUrl, currentMetadata, onSave, onClose, theme = 'dark' }) => {
  const [mapUrl, setMapUrl] = useState<string | null>(currentMapUrl);
  const [logoUrl, setLogoUrl] = useState<string | null>(currentLogoUrl);
  const [publicUrl, setPublicUrl] = useState<string>(currentPublicUrl);
  const [metadata, setMetadata] = useState<DocumentMetadata>(currentMetadata);
  const [urlPreview, setUrlPreview] = useState('');
  const [copyFeedback, setCopyFeedback] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

  useEffect(() => {
    let base = publicUrl.trim().replace(/\/$/, "");
    if (!base) base = window.location.origin;
    if (base && !base.startsWith('http')) base = 'http://' + base;
    
    // If we are on a real domain, preview that instead of the setting
    if (!isLocalhost) {
      setUrlPreview(window.location.origin);
    } else {
      setUrlPreview(base);
    }
  }, [publicUrl, isLocalhost]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(urlPreview);
    setCopyFeedback(true);
    setTimeout(() => setCopyFeedback(false), 2000);
  };

  const handleSave = () => {
    let finalUrl = publicUrl.trim().replace(/\/$/, "");
    if (finalUrl && !finalUrl.startsWith('http')) finalUrl = 'http://' + finalUrl;
    onSave({ mapUrl, logoUrl, publicUrl: finalUrl, metadata });
    onClose();
  };

  const inputClass = `w-full ${theme === 'dark' ? 'bg-black border-gray-800 text-white' : 'bg-white border-gray-300 text-gray-900'} border-2 rounded-xl px-4 py-3 focus:border-blue-600 outline-none font-mono text-sm transition-all`;
  const labelClass = `text-[10px] font-black ${theme === 'dark' ? 'text-gray-500' : 'text-gray-600'} uppercase tracking-widest mb-1 block`;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 backdrop-blur-lg p-4">
      <div className={`${theme === 'dark' ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'} w-full max-w-4xl rounded-[2.5rem] border shadow-2xl flex flex-col overflow-hidden animate-in zoom-in duration-300 transition-colors max-h-[90vh]`}>
        
        {/* Header */}
        <div className={`flex justify-between items-center p-8 ${theme === 'dark' ? 'bg-black/40 border-gray-800' : 'bg-gray-50 border-gray-200'} border-b shrink-0`}>
          <div>
            <h2 className={`text-3xl font-black ${theme === 'dark' ? 'text-white' : 'text-gray-900'} flex items-center gap-3 italic tracking-tighter uppercase`}>
              <Globe className="text-blue-500 w-8 h-8" /> Systeminställningar
            </h2>
            <p className={`${theme === 'dark' ? 'text-gray-500' : 'text-gray-600'} text-sm mt-1`}>Konfigurera din industriella SOP-portal</p>
          </div>
          <button onClick={onClose} className={`p-3 ${theme === 'dark' ? 'bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-900'} rounded-full transition-all`}>
            <X size={24} />
          </button>
        </div>

        <div className="p-8 space-y-10 overflow-y-auto">
          
          {/* STEP 1: NETWORK STATUS */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            {/* ... (Network content remains same) ... */}
            <div className="space-y-6">
              {!isLocalhost ? (
                /* CLOUD MODE VIEW */
                <div className="bg-blue-600/10 border-2 border-blue-500/30 p-8 rounded-3xl space-y-4">
                  <div className="flex items-center gap-3 text-blue-400 font-black uppercase tracking-widest text-sm">
                    <Cloud size={24} />
                    <span>Cloud Deployment Aktiv</span>
                  </div>
                  <p className="text-gray-300 text-sm leading-relaxed">
                    Appen körs på en publik webbadress. Du behöver inte ställa in någon IP-adress – systemet använder automatiskt <strong>{window.location.hostname}</strong> för alla QR-koder.
                  </p>
                  <div className="flex items-center gap-2 text-green-400 text-xs font-bold uppercase pt-2">
                    <ShieldCheck size={16} />
                    Alla enheter på internet har åtkomst
                  </div>
                </div>
              ) : (
                /* LOCAL MODE VIEW */
                <div className={`space-y-4`}>
                  <label className="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em] flex items-center gap-2">
                    <Wifi size={14} /> Datorns IP (för lokalt Wi-Fi)
                  </label>
                  <div className="relative">
                    <Link className={`absolute left-4 top-1/2 -translate-y-1/2 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`} size={20} />
                    <input 
                      type="text" 
                      value={publicUrl}
                      onChange={(e) => setPublicUrl(e.target.value)}
                      placeholder="t.ex. 192.168.1.50"
                      className={`w-full ${theme === 'dark' ? 'bg-black border-gray-800 text-white' : 'bg-white border-gray-300 text-gray-900'} border-2 rounded-2xl px-6 pl-14 py-5 focus:border-blue-600 outline-none font-mono text-lg transition-all`}
                    />
                  </div>
                  <div className={`bg-amber-500/10 border ${theme === 'dark' ? 'border-amber-900/30 text-amber-400' : 'border-amber-200 text-amber-700'} p-4 rounded-xl text-[11px] leading-relaxed`}>
                    <div className="font-bold flex items-center gap-2 mb-1"><Info size={14}/> Lokal begränsning</div>
                    Eftersom du kör på localhost måste du ange din dators IP för att mobiler ska kunna se instruktionerna.
                  </div>
                </div>
              )}
            </div>

            {/* LIVE PREVIEW BOX */}
            <div className={`${theme === 'dark' ? 'bg-black/40 border-gray-800' : 'bg-gray-50 border-gray-200'} rounded-[2rem] p-8 border flex flex-col items-center justify-center text-center space-y-6`}>
              <div className="space-y-2 w-full">
                <span className={`text-[10px] font-black ${theme === 'dark' ? 'text-gray-600' : 'text-gray-500'} uppercase tracking-widest`}>Aktiv länk för QR-koder</span>
                <div className={`${theme === 'dark' ? 'bg-gray-950 border-gray-800' : 'bg-white border-gray-200'} p-4 rounded-xl border flex items-center justify-between`}>
                  <code className="text-blue-500 text-sm truncate font-mono">{urlPreview}</code>
                  <button onClick={handleCopyLink} className={`p-2 ${theme === 'dark' ? 'hover:bg-gray-800 text-gray-500 hover:text-white' : 'hover:bg-gray-100 text-gray-400 hover:text-gray-900'} rounded-lg transition-colors`}>
                    {copyFeedback ? <CheckCircle2 size={18} className="text-green-500" /> : <Copy size={18} />}
                  </button>
                </div>
              </div>

              <div className="relative group">
                <div className="bg-white p-5 rounded-2xl shadow-2xl">
                  <img 
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(urlPreview)}&margin=4&ecc=H&format=svg`} 
                    alt="Test QR" 
                    className="w-32 h-32"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* DOCUMENT METADATA (ISO) */}
          <div className={`pt-8 border-t ${theme === 'dark' ? 'border-gray-800' : 'border-gray-200'} space-y-6`}>
            <div className="flex items-center justify-between">
               <h3 className={`text-lg font-black ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} uppercase tracking-widest flex items-center gap-2 italic`}>
                 <FileText size={20} className="text-amber-500" /> Dokumentinformation (ISO)
               </h3>
               <span className="text-[10px] uppercase font-bold bg-amber-500/20 text-amber-500 px-2 py-1 rounded">Manuell Hantering</span>
            </div>
            
            {/* TODO: AUTOMATION - Detta ska i framtiden hämtas från inloggad användare och godkännandeflöde */}
            <div className={`grid grid-cols-1 md:grid-cols-3 gap-6 ${theme === 'dark' ? 'bg-black/40 border-gray-800' : 'bg-gray-50 border-gray-200'} p-8 rounded-[2rem] border`}>
              
              <div className="space-y-4">
                <div>
                  <label className={labelClass}>Dokument-ID</label>
                  <input type="text" value={metadata.id} onChange={e => setMetadata({...metadata, id: e.target.value})} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Version / Utgåva</label>
                  <input type="text" value={metadata.version} onChange={e => setMetadata({...metadata, version: e.target.value})} className={inputClass} />
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className={labelClass}>Giltig Från (Datum)</label>
                  <div className="relative">
                    <Calendar size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                    <input type="date" value={metadata.validFrom} onChange={e => setMetadata({...metadata, validFrom: e.target.value})} className={inputClass} />
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Utfärdad Av (Processingenjör)</label>
                  <div className="relative">
                    <UserCheck size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                    <input type="text" value={metadata.issuedBy} onChange={e => setMetadata({...metadata, issuedBy: e.target.value})} className={inputClass} />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className={labelClass}>Godkänd Av (Linjeledare)</label>
                  <div className="relative">
                    <ShieldCheck size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-green-500 pointer-events-none" />
                    <input type="text" value={metadata.approvedBy} onChange={e => setMetadata({...metadata, approvedBy: e.target.value})} className={`${inputClass} border-green-500/30 focus:border-green-500`} />
                  </div>
                </div>
                <div className={`p-4 rounded-xl text-xs leading-relaxed ${theme === 'dark' ? 'bg-amber-900/20 text-amber-400' : 'bg-amber-50 text-amber-800'}`}>
                  <strong>Notera:</strong> I framtiden kommer detta fält att fyllas i automatiskt när en Linjeledare signerar digitalt. Just nu anger du namnet manuellt.
                </div>
              </div>

            </div>
          </div>

          {/* LAYOUT SETTINGS */}
          <div className={`pt-8 border-t ${theme === 'dark' ? 'border-gray-800' : 'border-gray-200'} space-y-8`}>
            <div className="space-y-4">
              <h3 className={`text-lg font-black ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} uppercase tracking-widest flex items-center gap-2 italic`}>
                <ImageIcon size={20} /> Maskinritning (Layout)
              </h3>
              <div className={`flex flex-col md:flex-row gap-8 items-center ${theme === 'dark' ? 'bg-black/40 border-gray-800' : 'bg-gray-50 border-gray-200'} p-8 rounded-[2rem] border`}>
                 <div className={`w-full md:w-56 aspect-video ${theme === 'dark' ? 'bg-gray-950 border-gray-800' : 'bg-gray-200 border-gray-300'} rounded-2xl overflow-hidden border flex items-center justify-center`}>
                    {mapUrl ? <img src={mapUrl} className="w-full h-full object-cover" /> : <ImageIcon className="opacity-10" size={48} />}
                 </div>
                 <div className="flex-1 space-y-4 w-full">
                   <input type="file" ref={fileInputRef} className="hidden" onChange={(e) => {
                     const f = e.target.files?.[0];
                     if (f) {
                       const r = new FileReader();
                       r.onload = () => setMapUrl(r.result as string);
                       r.readAsDataURL(f);
                     }
                   }} />
                   <button onClick={() => fileInputRef.current?.click()} className={`w-full py-4 ${theme === 'dark' ? 'bg-gray-800 hover:bg-gray-700 text-white border-gray-700' : 'bg-white hover:bg-gray-100 text-gray-900 border-gray-300'} rounded-2xl font-bold flex items-center justify-center gap-3 border transition-all`}>
                     <Upload size={20} /> Ladda upp ny layout-bild
                   </button>
                   {mapUrl && <button onClick={() => setMapUrl(null)} className="w-full text-xs text-red-500 font-bold uppercase tracking-widest hover:underline">Återställ till standard</button>}
                 </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className={`text-lg font-black ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} uppercase tracking-widest flex items-center gap-2 italic`}>
                <ShieldCheck size={20} className="text-blue-500" /> Företagslogotyp (för utskrift)
              </h3>
              <div className={`flex flex-col md:flex-row gap-8 items-center ${theme === 'dark' ? 'bg-black/40 border-gray-800' : 'bg-gray-50 border-gray-200'} p-8 rounded-[2rem] border`}>
                 <div className={`w-full md:w-56 h-24 ${theme === 'dark' ? 'bg-gray-950 border-gray-800' : 'bg-gray-200 border-gray-300'} rounded-2xl overflow-hidden border flex items-center justify-center p-4`}>
                    {logoUrl ? <img src={logoUrl} className="max-w-full max-h-full object-contain" /> : <Globe className="opacity-10" size={40} />}
                 </div>
                 <div className="flex-1 space-y-4 w-full">
                   <input type="file" ref={logoInputRef} className="hidden" onChange={(e) => {
                     const f = e.target.files?.[0];
                     if (f) {
                       const r = new FileReader();
                       r.onload = () => setLogoUrl(r.result as string);
                       r.readAsDataURL(f);
                     }
                   }} />
                   <button onClick={() => logoInputRef.current?.click()} className={`w-full py-4 ${theme === 'dark' ? 'bg-gray-800 hover:bg-gray-700 text-white border-gray-700' : 'bg-white hover:bg-gray-100 text-gray-900 border-gray-300'} rounded-2xl font-bold flex items-center justify-center gap-3 border transition-all`}>
                     <Upload size={20} /> Ladda upp logotyp
                   </button>
                   {logoUrl && <button onClick={() => setLogoUrl(null)} className="w-full text-xs text-red-500 font-bold uppercase tracking-widest hover:underline">Ta bort logotyp</button>}
                 </div>
              </div>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className={`p-6 md:p-8 ${theme === 'dark' ? 'bg-black/40 border-gray-800' : 'bg-gray-50 border-gray-200'} border-t grid grid-cols-2 gap-4 md:flex md:justify-end shrink-0`}>
          <button onClick={onClose} className={`w-full md:w-auto px-2 md:px-8 py-4 ${theme === 'dark' ? 'text-gray-500 hover:text-white' : 'text-gray-500 hover:text-gray-900'} font-bold transition-colors`}>Avbryt</button>
          <button onClick={handleSave} className="w-full md:w-auto px-2 md:px-16 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] md:text-sm shadow-xl shadow-blue-900/40 transition-all active:scale-95 whitespace-nowrap">
            Spara
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;