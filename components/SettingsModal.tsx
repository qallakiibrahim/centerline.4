import React, { useState, useRef, useEffect } from 'react';
import { X, Upload, Save, Image as ImageIcon, Link, Globe, CheckCircle2, Copy, Wifi, Info, Cloud, ShieldCheck, FileText, UserCheck, Calendar, Edit3, LogIn, LogOut, Key, Trash2, Lock } from 'lucide-react';
import { DocumentMetadata } from '../types';

interface SettingsModalProps {
  currentMapUrl: string | null;
  currentLogoUrl: string | null;
  currentPublicUrl: string;
  currentMetadata: DocumentMetadata;
  onSave: (settings: { mapUrl: string | null; logoUrl: string | null; publicUrl: string; metadata: DocumentMetadata }) => void;
  onClose: () => void;
  theme?: 'dark' | 'light';
  isDesignMode?: boolean;
  onToggleDesignMode?: () => void;
  currentUser?: any;
  onSignInWithGoogle?: () => void;
  onLogout?: () => void;
  dbStatus?: 'idle' | 'loading' | 'connected' | 'error';
  userRoles: Record<string, string>;
  onUpdateUserRoles: (newRoles: Record<string, string>) => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ 
  currentMapUrl, 
  currentLogoUrl, 
  currentPublicUrl, 
  currentMetadata, 
  onSave, 
  onClose, 
  theme = 'dark',
  isDesignMode = false,
  onToggleDesignMode,
  currentUser,
  onSignInWithGoogle,
  onLogout,
  dbStatus = 'idle',
  userRoles,
  onUpdateUserRoles
}) => {
  const [mapUrl, setMapUrl] = useState<string | null>(currentMapUrl);
  const [logoUrl, setLogoUrl] = useState<string | null>(currentLogoUrl);
  const [publicUrl, setPublicUrl] = useState<string>(currentPublicUrl);
  const [metadata, setMetadata] = useState<DocumentMetadata>(currentMetadata);
  const [urlPreview, setUrlPreview] = useState('');
  const [copyFeedback, setCopyFeedback] = useState(false);
  
  // Tab Selector
  const [activeSettingsTab, setActiveSettingsTab] = useState<'general' | 'roles'>('general');
  
  // Custom Role Management Form State
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<string>('operator');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

  // Determine user login and current role
  const currentUserEmail = currentUser?.email?.toLowerCase().trim() || '';
  const isHardcodedAdmin = currentUserEmail === 'qallakiibrahim@gmail.com';
  const currentUserRole = isHardcodedAdmin 
    ? 'super_admin' 
    : (userRoles[currentUserEmail] || 'operator');

  const hasAdminPrivilege = currentUserRole === 'super_admin';

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

  const handleAddUserRole = () => {
    if (!newEmail.trim()) return;
    const emailKey = newEmail.toLowerCase().trim();
    if (emailKey === 'qallakiibrahim@gmail.com') {
      alert("Huvudadministratören kan inte ändras.");
      return;
    }
    const updated = { ...userRoles, [emailKey]: newRole };
    onUpdateUserRoles(updated);
    setNewEmail('');
  };

  const handleRemoveUserRole = (emailToRemove: string) => {
    if (emailToRemove === 'qallakiibrahim@gmail.com') {
      alert("Huvudadministratören kan inte tas bort.");
      return;
    }
    const updated = { ...userRoles };
    delete updated[emailToRemove];
    onUpdateUserRoles(updated);
  };

  const inputClass = `w-full ${theme === 'dark' ? 'bg-black border-gray-800 text-white' : 'bg-white border-gray-300 text-gray-900'} border-2 rounded-xl px-4 py-3 focus:border-blue-600 outline-none font-mono text-sm transition-all`;
  const labelClass = `text-[10px] font-black ${theme === 'dark' ? 'text-gray-500' : 'text-gray-600'} uppercase tracking-widest mb-1 block`;

  const getRoleSwedishName = (role: string) => {
    switch (role) {
      case 'super_admin': return 'Super Admin';
      case 'line_leader': return 'Line Leader (Godkännare)';
      case 'process_engineer': return 'Processingenjör (PE)';
      case 'ltl': return 'Line Technical Lead (LTL)';
      case 'team_leader': return 'Teamledare (TL)';
      case 'operator': return 'Operatör';
      default: return role;
    }
  };

  const getRoleBadgeStyle = (role: string) => {
    switch (role) {
      case 'super_admin': return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
      case 'line_leader': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
      case 'process_engineer': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'ltl': return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
      case 'team_leader': return 'bg-slate-500/10 text-slate-500 border-slate-500/20';
      default: return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 backdrop-blur-lg p-4">
      <div className={`${theme === 'dark' ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'} w-full max-w-4xl rounded-[2.5rem] border shadow-2xl flex flex-col overflow-hidden animate-in zoom-in duration-300 transition-colors max-h-[90vh]`}>
        
        {/* Header */}
        <div className={`flex justify-between items-center p-8 pb-4 shrink-0`}>
          <div>
            <h2 className={`text-3xl font-black ${theme === 'dark' ? 'text-white' : 'text-gray-900'} flex items-center gap-3 italic tracking-tighter uppercase`}>
              <Globe className="text-blue-500 w-8 h-8" /> Systeminställningar
            </h2>
            <p className={`${theme === 'dark' ? 'text-gray-500' : 'text-gray-650'} text-sm mt-1`}>Konfigurera din industriella SOP-portal</p>
          </div>
          <button onClick={onClose} className={`p-3 ${theme === 'dark' ? 'bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-900'} rounded-full transition-all`}>
            <X size={24} />
          </button>
        </div>

        {/* Tab Selection Row */}
        <div className={`flex px-8 border-b ${theme === 'dark' ? 'bg-black/20 border-gray-800' : 'bg-gray-50 border-gray-200'} shrink-0 gap-6`}>
          <button 
            onClick={() => setActiveSettingsTab('general')}
            className={`py-4 font-black text-xs uppercase tracking-widest border-b-2 transition-all cursor-pointer ${
              activeSettingsTab === 'general' 
                ? 'border-blue-500 text-blue-500' 
                : 'border-transparent text-gray-400 hover:text-gray-300 dark:text-gray-500 dark:hover:text-gray-400'
            }`}
          >
            Allmänt & ISO-Standard
          </button>
          <button 
            onClick={() => setActiveSettingsTab('roles')}
            className={`py-4 font-black text-xs uppercase tracking-widest border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
              activeSettingsTab === 'roles' 
                ? 'border-blue-500 text-blue-500' 
                : 'border-transparent text-gray-400 hover:text-gray-300 dark:text-gray-500 dark:hover:text-gray-400'
            }`}
          >
            <UserCheck size={14} />
            Roller & Behörigheter
          </button>
        </div>

        {/* Content Scroll Area */}
        <div className="p-8 space-y-10 overflow-y-auto flex-1">
          
          {activeSettingsTab === 'general' ? (
            /* TAB 1: GENERAL SYSTEM & ISO SETTINGS */
            <div className="space-y-10">
              
              {/* STEP 1: NETWORK STATUS */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
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
                        <Wifi size={14} /> Datorns IP (för lokalt Vi-Fi)
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
                   <span className="text-[10px] uppercase font-bold bg-amber-500/20 text-amber-500 px-2 py-1 rounded">ISO 9001 Standard</span>
                </div>
                
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
                      <strong>ISO-godkännande:</strong> Linjeledaren har rätt att granska, ändra samt signera standarden direkt i systemet.
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
          ) : (
            /* TAB 2: ROLES & PERMISSIONS MANAGEMENT */
            <div className="space-y-8 animate-in fade-in duration-200">
              
              {/* STATUS & REDIGERINGS-TOGGLE */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pb-8 border-b border-gray-200 dark:border-gray-800">
                {/* GOOGLE GOOGLE AUTENTISERINGSPANEL */}
                <div className={`p-6 rounded-3xl border ${theme === 'dark' ? 'bg-black/40 border-gray-800' : 'bg-slate-50 border-slate-200'} space-y-4`}>
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-blue-500/10 text-blue-500 rounded-2xl">
                      <Key size={20} />
                    </div>
                    <div>
                      <h3 className={`text-sm font-black uppercase tracking-wider ${theme === 'dark' ? 'text-white' : 'text-slate-950'}`}>
                        Google Autentisering
                      </h3>
                      <span className="text-[10px] text-slate-400 dark:text-gray-500 font-mono font-bold uppercase tracking-wider block">
                        Molndatabas-synk
                      </span>
                    </div>
                  </div>

                  <div className="space-y-3 pt-1 text-xs">
                    {currentUser ? (
                      <div className="space-y-4">
                        <div className={`p-4 rounded-2xl border ${theme === 'dark' ? 'bg-emerald-500/[0.04] border-emerald-950/20 text-emerald-400' : 'bg-green-50 border-green-200 text-green-800'}`}>
                          <div className="flex items-center gap-2 mb-1">
                            <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                            <span className="font-extrabold uppercase tracking-wide text-[10px]">Inloggad som:</span>
                          </div>
                          <p className="font-mono font-bold break-all text-xs">{currentUser.displayName || currentUser.email}</p>
                          <div className="mt-2 pt-1 border-t border-emerald-900/20 flex justify-between items-center text-[10px]">
                            <span>Din roll i systemet:</span>
                            <span className="font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400">
                              {getRoleSwedishName(currentUserRole)}
                            </span>
                          </div>
                        </div>

                        <button
                          onClick={onLogout}
                          className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl font-bold font-mono uppercase tracking-wider text-xs transition-all active:scale-95 cursor-pointer border border-red-500/20"
                        >
                          <LogOut size={14} />
                          Logga ut från Google
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-slate-650'} leading-relaxed text-[11px]`}>
                          Inloggning med Google krävs för att kunna ställa in och synka mätvärden, sektioner, instruktionsmaterial och användarroller för hela arbetslaget.
                        </p>

                        <button
                          onClick={onSignInWithGoogle}
                          className="w-full flex items-center justify-center gap-2 py-3.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl font-black uppercase tracking-wider text-xs shadow-lg active:scale-95 transition-all cursor-pointer"
                        >
                          <LogIn size={14} />
                          Logga in med Google
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* REDIGERINGS-TOGGLE MODUL (PE ELLER HÖGRE) */}
                <div className={`p-6 rounded-3xl border ${theme === 'dark' ? 'bg-black/40 border-gray-800' : 'bg-slate-50 border-slate-200'} space-y-4 flex flex-col justify-between`}>
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-amber-500/10 text-amber-500 rounded-2xl">
                        <Edit3 size={20} />
                      </div>
                      <div>
                        <h3 className={`text-sm font-black uppercase tracking-wider ${theme === 'dark' ? 'text-white' : 'text-slate-950'}`}>
                          Redigeringsläge (Layout)
                        </h3>
                        <span className="text-[10px] text-slate-400 dark:text-gray-500 font-mono font-bold uppercase tracking-wider block">
                          Konfigurera mätpunkter på ritningen
                        </span>
                      </div>
                    </div>

                    <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-slate-650'} leading-relaxed text-[11px]`}>
                      Redigeringsläget låter dig flytta mätpunkter, hantera sektionsstorlekar och skapa receptspecifika mätvärden. Detta kräver minst <strong>Processingenjör-behörighet</strong>.
                    </p>
                  </div>

                  <div className="pt-2">
                    {currentUserRole === 'operator' || currentUserRole === 'team_leader' || currentUserRole === 'ltl' ? (
                      <div className="text-center p-3 text-[10px] uppercase font-mono tracking-wider font-bold bg-red-500/10 text-red-400 rounded-xl border border-red-500/20 flex items-center justify-center gap-1.5">
                        <Lock size={12} />
                        Låst: Kräver Processingenjör
                      </div>
                    ) : (
                      <button
                        onClick={onToggleDesignMode}
                        className={`w-full flex items-center justify-center gap-2.5 py-3.5 px-4 rounded-xl font-black uppercase tracking-wider text-xs transition-all active:scale-[0.98] cursor-pointer shadow-md ${
                          isDesignMode
                            ? 'bg-amber-600 hover:bg-amber-500 text-black'
                            : (theme === 'dark' ? 'bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700' : 'bg-white hover:bg-gray-100 text-slate-700 border border-slate-200')
                        }`}
                      >
                        <Edit3 size={15} />
                        <span>{isDesignMode ? 'Aktivt (Klicka för att låsa)' : 'Aktivera Redigeringsläge'}</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* BEHÖRIGHETSMATRIS */}
              <div className="space-y-3">
                <h4 className={`text-xs font-black uppercase tracking-widest ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  Behörighetsmatris
                </h4>
                
                <div className="overflow-x-auto rounded-[2rem] border border-gray-200 dark:border-gray-850">
                  <table className="w-full text-left border-collapse text-xs min-w-[600px]">
                    <thead>
                      <tr className={`${theme === 'dark' ? 'bg-black/60 border-gray-800' : 'bg-slate-50 border-slate-200'} border-b font-mono font-bold uppercase`}>
                        <th className="p-4 tracking-wider text-slate-400 text-[10px]">Funktion / Rättighet</th>
                        <th className="p-4 text-center text-slate-400 text-[10px]">Operatör/TL</th>
                        <th className="p-4 text-center text-slate-400 text-[10px]">LTL</th>
                        <th className="p-4 text-center text-slate-400 text-[10px]">Processt. (PE)</th>
                        <th className="p-4 text-center text-slate-400 text-[10px]">Line Leader</th>
                        <th className="p-4 text-center text-blue-500 text-[10px]">Super Admin</th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y ${theme === 'dark' ? 'divide-gray-850' : 'divide-gray-150'}`}>
                      <tr>
                        <td className="p-4 font-bold">Registrera mätvärden & fota taggar avvikelser</td>
                        <td className="p-4 text-center text-green-500 font-extrabold text-sm">✓</td>
                        <td className="p-4 text-center text-green-500 font-extrabold text-sm">✓</td>
                        <td className="p-4 text-center text-green-500 font-extrabold text-sm">✓</td>
                        <td className="p-4 text-center text-green-500 font-extrabold text-sm">✓</td>
                        <td className="p-4 text-center text-green-500 font-extrabold text-sm">✓</td>
                      </tr>
                      <tr>
                        <td className="p-4 font-bold">Flytta punkter & ändra sektioner på ritning</td>
                        <td className="p-4 text-center text-red-500 font-bold text-sm">✕</td>
                        <td className="p-4 text-center text-red-500 font-bold text-sm">✕</td>
                        <td className="p-4 text-center text-green-500 font-extrabold text-sm">✓</td>
                        <td className="p-4 text-center text-green-500 font-extrabold text-sm">✓</td>
                        <td className="p-4 text-center text-green-500 font-extrabold text-sm">✓</td>
                      </tr>
                      <tr>
                        <td className="p-4 font-bold">Skapa, ändra & ta bort mätområden, maskiner & CL-program</td>
                        <td className="p-4 text-center text-red-500 font-bold text-sm">✕</td>
                        <td className="p-4 text-center text-red-500 font-bold text-sm">✕</td>
                        <td className="p-4 text-center text-green-500 font-extrabold text-sm">✓</td>
                        <td className="p-4 text-center text-green-500 font-extrabold text-sm">✓</td>
                        <td className="p-4 text-center text-green-500 font-extrabold text-sm">✓</td>
                      </tr>
                      <tr>
                        <td className="p-4 font-bold">Signera och godkänna ISO-standarder (ISO-metadata)</td>
                        <td className="p-4 text-center text-red-500 font-bold text-sm">✕</td>
                        <td className="p-4 text-center text-red-500 font-bold text-sm">✕</td>
                        <td className="p-4 text-center text-red-500 font-bold text-sm">✕</td>
                        <td className="p-4 text-center text-green-500 font-extrabold text-sm">✓</td>
                        <td className="p-4 text-center text-green-500 font-extrabold text-sm">✓</td>
                      </tr>
                      <tr>
                        <td className="p-4 font-bold text-blue-400">Administrera roller, lägga till/ändra användare</td>
                        <td className="p-4 text-center text-red-500 font-bold text-sm">✕</td>
                        <td className="p-4 text-center text-red-500 font-bold text-sm">✕</td>
                        <td className="p-4 text-center text-red-500 font-bold text-sm">✕</td>
                        <td className="p-4 text-center text-red-500 font-bold text-sm">✕</td>
                        <td className="p-4 text-center text-green-500 font-extrabold text-sm">✓</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* ANVÄNDARLISTA & TILLDELNING */}
              <div className="space-y-4 pt-4">
                <div className="flex justify-between items-center pb-2 border-b border-gray-200 dark:border-gray-800">
                  <h4 className={`text-xs font-black uppercase tracking-widest ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    Användartilldelning & Aktivt Arbetslag
                  </h4>
                  <span className="text-[10px] uppercase font-mono font-bold text-gray-500">
                    {Object.keys(userRoles).length + 1} tilldelade
                  </span>
                </div>

                {/* Lägg till ny användarekontroll (Endast Super Admin) */}
                {hasAdminPrivilege ? (
                  <div className={`p-5 rounded-2xl border ${theme === 'dark' ? 'bg-black/60 border-gray-800' : 'bg-slate-55 border-slate-200'} space-y-4`}>
                    <p className={`text-[10px] uppercase font-black tracking-wider text-blue-500`}>
                      Registrera ny mätansvarig i driften
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-gray-500 tracking-wider uppercase">Google E-postadress</label>
                        <input 
                          type="email" 
                          placeholder="namn@foretag.com"
                          value={newEmail}
                          onChange={e => setNewEmail(e.target.value)}
                          className={`w-full text-xs rounded-xl px-4 py-2.5 ${theme === 'dark' ? 'bg-gray-950 border-gray-850 text-white' : 'bg-white border-gray-300 text-gray-900'} border outline-none font-mono focus:border-blue-500`}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-gray-500 tracking-wider uppercase">Arbetsrolls-ansvar</label>
                        <select
                          value={newRole}
                          onChange={e => setNewRole(e.target.value)}
                          className={`w-full text-xs rounded-xl px-4 py-2.5 ${theme === 'dark' ? 'bg-gray-950 border-gray-850 text-white' : 'bg-white border-gray-300 text-gray-900'} border outline-none font-sans font-bold focus:border-blue-500`}
                        >
                          <option value="operator">{getRoleSwedishName('operator')}</option>
                          <option value="team_leader">{getRoleSwedishName('team_leader')}</option>
                          <option value="ltl">{getRoleSwedishName('ltl')}</option>
                          <option value="process_engineer">{getRoleSwedishName('process_engineer')}</option>
                          <option value="line_leader">{getRoleSwedishName('line_leader')}</option>
                          <option value="super_admin">{getRoleSwedishName('super_admin')}</option>
                        </select>
                      </div>
                      <div>
                        <button 
                          onClick={handleAddUserRole}
                          className="w-full bg-blue-600 hover:bg-blue-500 text-white py-2.5 px-4 rounded-xl font-bold uppercase tracking-wider text-[10px] transition-all cursor-pointer active:scale-95"
                        >
                          Spara Behörighet
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className={`p-4 rounded-xl border ${theme === 'dark' ? 'bg-black/20 border-gray-800' : 'bg-slate-50 border-slate-200'} text-[11px] leading-relaxed flex items-center gap-2 text-amber-500`}>
                    <Lock size={14} />
                    <span>Inloggad användare saknar Super Admin-behörighet. Du kan se aktiva behörigheter nedan men inte lägga till eller ta bort medlemmar.</span>
                  </div>
                )}

                {/* List of Users table */}
                <div className="overflow-hidden rounded-2xl border border-gray-150 dark:border-gray-850">
                  <div className={`grid grid-cols-12 gap-2 p-3 font-mono font-extrabold uppercase text-[10px] ${theme === 'dark' ? 'bg-black/40 text-gray-500 border-gray-800' : 'bg-slate-50 text-slate-500 border-slate-200'} border-b`}>
                    <div className="col-span-6 md:col-span-7">E-postadress</div>
                    <div className="col-span-4 md:col-span-4">Tilldelad Roll</div>
                    <div className="col-span-2 md:col-span-1 text-center">Ta Bort</div>
                  </div>
                  
                  <div className="divide-y divide-gray-150 dark:divide-gray-850 max-h-[220px] overflow-y-auto">
                    {/* HARDCODED CHIEF ADMIN ROW (Always shown and locked) */}
                    <div className="grid grid-cols-12 gap-2 p-3 text-xs items-center bg-purple-500/[0.02]">
                      <div className="col-span-6 md:col-span-7 font-mono font-bold truncate text-purple-400">
                        qallakiibrahim@gmail.com
                      </div>
                      <div className="col-span-4 md:col-span-4">
                        <span className={`px-2 py-0.5 rounded-full border text-[9px] font-black uppercase tracking-wider ${getRoleBadgeStyle('super_admin')}`}>
                          {getRoleSwedishName('super_admin')}
                        </span>
                      </div>
                      <div className="col-span-2 md:col-span-1 text-center font-mono opacity-50 text-[10px]">-</div>
                    </div>

                    {/* DYNAMIC LIST */}
                    {Object.entries(userRoles)
                      .filter(([email]) => email !== 'qallakiibrahim@gmail.com')
                      .map(([email, role]) => {
                        const roleStr = role as string;
                        return (
                          <div key={email} className="grid grid-cols-12 gap-2 p-3 text-xs items-center hover:bg-slate-50 dark:hover:bg-black/20 transition-colors">
                            <div className="col-span-6 md:col-span-7 font-mono truncate">
                              {email}
                            </div>
                            <div className="col-span-4 md:col-span-4">
                              <span className={`px-2 py-0.5 rounded-full border text-[9px] font-black uppercase tracking-wider ${getRoleBadgeStyle(roleStr)}`}>
                                {getRoleSwedishName(roleStr)}
                              </span>
                            </div>
                            <div className="col-span-2 md:col-span-1 text-center">
                              {hasAdminPrivilege ? (
                                <button 
                                  onClick={() => handleRemoveUserRole(email)}
                                  className="p-1.5 text-red-500 rounded hover:bg-red-500/10 transition-colors cursor-pointer inline-flex"
                                  title="Ta bort behörighet"
                                >
                                  <Trash2 size={13} />
                                </button>
                              ) : (
                                <span className="opacity-40">-</span>
                              )}
                            </div>
                          </div>
                        );
                      })}

                    {Object.keys(userRoles).filter(e => e !== 'qallakiibrahim@gmail.com').length === 0 && (
                      <div className="p-6 text-center text-xs text-gray-500 italic">
                        Inga övriga mätansvariga tilldelade ännu. Använd fältet ovan för att registrera roller baserat på Google-kontons e-post.
                      </div>
                    )}
                  </div>
                </div>

              </div>

            </div>
          )}

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
