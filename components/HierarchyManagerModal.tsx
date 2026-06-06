import React, { useState } from 'react';
import { X, Plus, Edit2, Trash2, Check, AlertTriangle, ChevronRight, Layers, Cpu, Compass, Settings } from 'lucide-react';
import { MachinePoint, MachineModule } from '../types';
import { DEFAULT_RECIPES } from '../constants';

interface HierarchyManagerModalProps {
  theme?: 'dark' | 'light';
  lines: { id: string; name: string }[];
  machines: Record<string, string[]>;
  sections: Record<string, string[]>;
  recipes: Record<string, string[]>;
  layouts: Record<string, MachineModule[]>;
  activeRecipe: string;
  points: MachinePoint[];
  
  onUpdateLines: (lines: { id: string; name: string }[]) => void;
  onUpdateMachines: (machines: Record<string, string[]>) => void;
  onUpdateSections: (sections: Record<string, string[]>) => void;
  onUpdateRecipes: (recipes: Record<string, string[]>) => void;
  onUpdateLayouts: (layouts: Record<string, MachineModule[]>) => void;
  onUpdatePoints: (points: MachinePoint[]) => void;
  
  onSelectLine: (lineId: string) => void;
  onSelectMachine: (machineName: string) => void;
  onSelectSection: (sectionName: string) => void;
  onSelectRecipe: (recipe: string) => void;
  
  selectedLine: string;
  selectedMachine: string;
  selectedSection: string;

  onClose: () => void;
}

export const HierarchyManagerModal: React.FC<HierarchyManagerModalProps> = ({
  theme = 'dark',
  lines,
  machines,
  sections,
  recipes,
  layouts,
  activeRecipe,
  points,
  onUpdateLines,
  onUpdateMachines,
  onUpdateSections,
  onUpdateRecipes,
  onUpdateLayouts,
  onUpdatePoints,
  onSelectLine,
  onSelectMachine,
  onSelectSection,
  onSelectRecipe,
  selectedLine,
  selectedMachine,
  selectedSection,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<'recipes' | 'lines' | 'machines' | 'sections'>('lines');
  
  // Local temporary creation & renaming states to avoid native prompt()
  const [newInputName, setNewInputName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  
  // Confirmation state
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const currentMachineRecipes = React.useMemo(() => {
    if (!selectedMachine) return [];
    if (recipes[selectedMachine]) {
      return recipes[selectedMachine];
    }
    if (selectedMachine === 'Packmaskin (Tray Packer - Pilot)') {
      return DEFAULT_RECIPES;
    }
    return [];
  }, [recipes, selectedMachine]);

  const resetLocalState = () => {
    setNewInputName('');
    setEditingId(null);
    setEditingValue('');
    setErrorMessage('');
    setConfirmDeleteId(null);
  };

  const handleTabChange = (tab: any) => {
    setActiveTab(tab);
    resetLocalState();
  };

  // Recipe Operations
  const handleAddRecipe = (e?: React.FormEvent | React.MouseEvent) => {
    if (e) e.preventDefault();
    if (!selectedMachine) {
      setErrorMessage('Välj först en maskinenhet att knyta CL-programmet till!');
      return;
    }
    const pruned = newInputName.trim();
    if (!pruned) return;
    
    const machineList = recipes[selectedMachine] || (selectedMachine === 'Packmaskin (Tray Packer - Pilot)' ? [...DEFAULT_RECIPES] : []);
    if (machineList.includes(pruned)) {
      setErrorMessage('Detta CL-program finns redan för denna maskin!');
      return;
    }
    
    const updatedRecipes = {
      ...recipes,
      [selectedMachine]: [...machineList, pruned]
    };
    onUpdateRecipes(updatedRecipes);
    onSelectRecipe(pruned);
    resetLocalState();
  };

  const handleStartRenameRecipe = (recipe: string) => {
    setEditingId(recipe);
    setEditingValue(recipe);
    setErrorMessage('');
  };

  const handleSaveRenameRecipe = (oldName: string) => {
    if (!selectedMachine) return;
    const pruned = editingValue.trim();
    if (!pruned || pruned === oldName) {
      setEditingId(null);
      return;
    }
    
    const machineList = recipes[selectedMachine] || (selectedMachine === 'Packmaskin (Tray Packer - Pilot)' ? [...DEFAULT_RECIPES] : []);
    if (machineList.includes(pruned)) {
      setErrorMessage('Detta CL-programnamn används redan för denna maskin!');
      return;
    }

    const updatedList = machineList.map(r => r === oldName ? pruned : r);
    const updatedRecipes = {
      ...recipes,
      [selectedMachine]: updatedList
    };
    onUpdateRecipes(updatedRecipes);
    
    // Update points targets
    const updatedPoints = points.map(p => {
      const isMatch = p.machine === selectedMachine && p.lineId === selectedLine;
      if (isMatch && p.recipeTargets && p.recipeTargets[oldName]) {
        const targetsCopy = { ...p.recipeTargets };
        targetsCopy[pruned] = targetsCopy[oldName];
        delete targetsCopy[oldName];
        return { ...p, recipeTargets: targetsCopy };
      }
      return p;
    });
    onUpdatePoints(updatedPoints);
    
    if (activeRecipe === oldName) {
      onSelectRecipe(pruned);
    }
    setEditingId(null);
  };

  const handleDeleteRecipe = (recipe: string) => {
    if (!selectedMachine) return;
    const machineList = recipes[selectedMachine] || (selectedMachine === 'Packmaskin (Tray Packer - Pilot)' ? [...DEFAULT_RECIPES] : []);
    if (machineList.length <= 1) {
      setErrorMessage('Du kan inte rensa bort det sista CL-programmet för denna maskin!');
      return;
    }
    const updatedList = machineList.filter(r => r !== recipe);
    const updatedRecipes = {
      ...recipes,
      [selectedMachine]: updatedList
    };
    onUpdateRecipes(updatedRecipes);
    
    // Check if we deleted active
    if (activeRecipe === recipe) {
      onSelectRecipe(updatedList[0] || '');
    }
    resetLocalState();
  };

  // Lines Operations
  const handleAddLine = (e?: React.FormEvent | React.MouseEvent) => {
    if (e) e.preventDefault();
    const pruned = newInputName.trim();
    if (!pruned) return;
    const sameName = (lines || []).some(l => l.name.toLowerCase() === pruned.toLowerCase());
    if (sameName) {
      setErrorMessage('Denna produktionslinje finns redan!');
      return;
    }
    const newId = 'l' + ((lines || []).length + 1) + '_' + Date.now();
    const updated = [...(lines || []), { id: newId, name: pruned }];
    onUpdateLines(updated);
    onSelectLine(newId);
    resetLocalState();
  };

  const handleStartRenameLine = (id: string, currentName: string) => {
    setEditingId(id);
    setEditingValue(currentName);
    setErrorMessage('');
  };

  const handleSaveRenameLine = (id: string) => {
    const pruned = editingValue.trim();
    if (!pruned) {
      setEditingId(null);
      return;
    }
    const updated = lines.map(l => l.id === id ? { ...l, name: pruned } : l);
    onUpdateLines(updated);
    setEditingId(null);
  };

  const handleDeleteLine = (id: string) => {
    const lineObj = lines.find(l => l.id === id);
    if (!lineObj) return;

    // Filter points
    const relatedPoints = points.filter(p => p.lineId === id);
    // Filter lines
    const updatedLines = lines.filter(l => l.id !== id);
    onUpdateLines(updatedLines);
    
    // Clean up machines for that line
    const machList = machines[id] || [];
    const copyMachines = { ...machines };
    delete copyMachines[id];
    onUpdateMachines(copyMachines);

    // Clean up points that belonged to that line
    const remainingPoints = points.map(p => p.lineId === id ? { ...p, lineId: '' } : p);
    onUpdatePoints(remainingPoints);

    // Switch selection if active deleted
    if (selectedLine === id) {
      const nextLine = updatedLines[0]?.id || '';
      onSelectLine(nextLine);
      const nextMach = nextLine ? (copyMachines[nextLine]?.[0] || '') : '';
      onSelectMachine(nextMach);
    }
    resetLocalState();
  };

  // Machine Operations
  const handleAddMachine = (e?: React.FormEvent | React.MouseEvent) => {
    if (e) e.preventDefault();
    if (!selectedLine) {
      setErrorMessage('Välj först en produktionslinje att knyta maskinen till!');
      return;
    }
    const pruned = newInputName.trim();
    if (!pruned) return;
    const currentList = machines[selectedLine] || [];
    if (currentList.some(m => m.toLowerCase() === pruned.toLowerCase())) {
      setErrorMessage('Denna maskin finns redan på den valda linjen!');
      return;
    }
    const updated = {
      ...machines,
      [selectedLine]: [...currentList, pruned]
    };
    onUpdateMachines(updated);
    onSelectMachine(pruned);
    resetLocalState();
  };

  const handleStartRenameMachine = (mach: string) => {
    setEditingId(mach);
    setEditingValue(mach);
    setErrorMessage('');
  };

  const handleSaveRenameMachine = (oldName: string) => {
    const pruned = editingValue.trim();
    if (!pruned || pruned === oldName) {
      setEditingId(null);
      return;
    }
    const currentList = machines[selectedLine] || [];
    if (currentList.some(m => m !== oldName && m.toLowerCase() === pruned.toLowerCase())) {
      setErrorMessage('En annan maskin med samma namn finns redan under denna linje!');
      return;
    }

    const updatedList = currentList.map(m => m === oldName ? pruned : m);
    const updatedMachines = {
      ...machines,
      [selectedLine]: updatedList
    };
    onUpdateMachines(updatedMachines);

    // Update sections associated with oldName unit
    const copySections = { ...sections };
    if (copySections[oldName]) {
      copySections[pruned] = copySections[oldName];
      delete copySections[oldName];
      onUpdateSections(copySections);
    }

    // Rename on recipes dictionary too!
    const copyRecipes = { ...recipes };
    if (copyRecipes[oldName]) {
      copyRecipes[pruned] = copyRecipes[oldName];
      delete copyRecipes[oldName];
      onUpdateRecipes(copyRecipes);
    }

    // Rename on points
    const updatedPoints = points.map(p => {
      const isMatch = p.machine === oldName && p.lineId === selectedLine;
      if (isMatch) {
        return { ...p, machine: pruned };
      }
      return p;
    });
    onUpdatePoints(updatedPoints);

    if (selectedMachine === oldName) {
      onSelectMachine(pruned);
    }
    setEditingId(null);
  };

  const handleDeleteMachine = (mach: string) => {
    const currentList = machines[selectedLine] || [];
    const updatedList = currentList.filter(m => m !== mach);
    const updatedMachines = {
      ...machines,
      [selectedLine]: updatedList
    };
    onUpdateMachines(updatedMachines);

    // Filter out points with that machine
    const remainingPoints = points.map(p => p.machine === mach && p.lineId === selectedLine ? { ...p, machine: '', lineId: '' } : p);
    onUpdatePoints(remainingPoints);

    // Handle sections
    const copySections = { ...sections };
    delete copySections[mach];
    onUpdateSections(copySections);

    // Delete from recipes dictionary too
    const copyRecipes = { ...recipes };
    delete copyRecipes[mach];
    onUpdateRecipes(copyRecipes);

    if (selectedMachine === mach) {
      onSelectMachine(updatedList[0] || '');
    }
    resetLocalState();
  };

  // Section Operations
  const handleAddSection = (e?: React.FormEvent | React.MouseEvent) => {
    if (e) e.preventDefault();
    if (!selectedMachine) {
      setErrorMessage('Välj först en maskin under produktionslinjesidan!');
      return;
    }
    const pruned = newInputName.trim();
    if (!pruned) return;
    const currentList = sections[selectedMachine] || [];
    if (currentList.some(s => s.toLowerCase() === pruned.toLowerCase())) {
      setErrorMessage('Denna sektion finns redan under maskinen!');
      return;
    }
    const updated = {
      ...sections,
      [selectedMachine]: [...currentList, pruned]
    };
    onUpdateSections(updated);

    // Sync creation with physical layouts/rutorna mapping
    const currentLayout = layouts[selectedMachine] || [];
    const newModule: MachineModule = {
      id: `mod_${selectedMachine}_${currentList.length}_` + Date.now(),
      label: pruned, 
      x: 10 + (currentList.length * 15) % 80,
      y: 20 + Math.floor((currentList.length * 15) / 80) * 12,
      width: 14,
      height: 10,
      color: ['#3b82f6', '#6366f1', '#eab308', '#f97316', '#ec4899', '#f472b6', '#a855f7'][currentList.length % 7],
      hasFill: true,
      fontSize: 2.2,
      wrapText: false
    };
    onUpdateLayouts({
      ...layouts,
      [selectedMachine]: [...currentLayout, newModule]
    });

    onSelectSection(pruned);
    resetLocalState();
  };

  const handleStartRenameSection = (sec: string) => {
    setEditingId(sec);
    setEditingValue(sec);
    setErrorMessage('');
  };

  const handleSaveRenameSection = (oldName: string) => {
    const pruned = editingValue.trim();
    if (!pruned || pruned === oldName) {
      setEditingId(null);
      return;
    }
    const currentList = sections[selectedMachine] || [];
    if (currentList.some(s => s !== oldName && s.toLowerCase() === pruned.toLowerCase())) {
      setErrorMessage('En annan sektion med samma namn finns redan under denna maskin!');
      return;
    }

    const updatedList = currentList.map(s => s === oldName ? pruned : s);
    const updatedSections = {
      ...sections,
      [selectedMachine]: updatedList
    };
    onUpdateSections(updatedSections);

    // Sync rename with layout coordinate blocks/modules
    const currentLayout = layouts[selectedMachine] || [];
    const updatedLayout = currentLayout.map(mod => mod.label === oldName ? { ...mod, label: pruned } : mod);
    onUpdateLayouts({
      ...layouts,
      [selectedMachine]: updatedLayout
    });

    // Update related points
    const updatedPoints = points.map(p => {
      const isMatch = p.section === oldName && p.machine === selectedMachine && p.lineId === selectedLine;
      if (isMatch) {
        return { ...p, section: pruned };
      }
      return p;
    });
    onUpdatePoints(updatedPoints);

    if (selectedSection === oldName) {
      onSelectSection(pruned);
    }
    setEditingId(null);
  };

  const handleDeleteSection = (sec: string) => {
    const currentList = sections[selectedMachine] || [];
    const updatedList = currentList.filter(s => s !== sec);
    const updatedSections = {
      ...sections,
      [selectedMachine]: updatedList
    };
    onUpdateSections(updatedSections);

    // Sync delete with layouts/rutorna modules
    const currentLayout = layouts[selectedMachine] || [];
    const updatedLayout = currentLayout.filter(mod => mod.label !== sec);
    onUpdateLayouts({
      ...layouts,
      [selectedMachine]: updatedLayout
    });

    // Reset section on matching points
    const updatedPoints = points.map(p => {
      const isMatch = p.section === sec && p.machine === selectedMachine && p.lineId === selectedLine;
      if (isMatch) {
        return { ...p, section: 'All' };
      }
      return p;
    });
    onUpdatePoints(updatedPoints);

    if (selectedSection === sec) {
      onSelectSection('All');
    }
    resetLocalState();
  };

  // Get current state references for labels and scopes
  const currentLineName = lines.find(l => l.id === selectedLine)?.name || 'Ej vald';
  const pointsWithNoSettingsStr = "Centerline-punkter knutna till detta objekt kommer att påverkas.";

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className={`w-full max-w-4xl max-h-[90vh] rounded-[2rem] border shadow-2xl flex flex-col overflow-hidden transition-all duration-300 ${
        theme === 'dark' ? 'bg-gray-900 border-gray-800 text-gray-100' : 'bg-white border-slate-200 text-[#0F172A]'
      }`}>
        
        {/* Header */}
        <div className={`flex justify-between items-center px-8 py-6 border-b shrink-0 ${
          theme === 'dark' ? 'border-gray-800 bg-gray-950/50' : 'border-slate-100 bg-slate-50/50'
        }`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/10 border border-blue-500/20 text-blue-500 flex items-center justify-center shadow-inner">
              <Settings className="w-5 h-5 animate-spin-slow" />
            </div>
            <div>
              <h2 className="text-xl font-black uppercase tracking-tight italic">Struktur & CL-Program</h2>
              <p className={`text-[10px] uppercase font-bold tracking-widest ${theme === 'dark' ? 'text-gray-400' : 'text-slate-400'}`}>
                Säker och tillförlitlig hantering av maskiner, sektioner och formatspecifikationer
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className={`w-9 h-9 rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-all ${
              theme === 'dark' ? 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700' : 'bg-slate-100 text-slate-500 hover:text-[#0F172A] hover:bg-slate-200'
            }`}
          >
            <X size={18} />
          </button>
        </div>

        {/* Workspace Body */}
        <div className="flex-1 min-h-0 flex flex-col md:flex-row overflow-hidden">
          
          {/* Inner Sidebar tabs */}
          <div className={`w-full md:w-56 shrink-0 p-4 border-b md:border-b-0 md:border-r flex flex-row md:flex-col gap-1 overflow-x-auto min-h-0 ${
            theme === 'dark' ? 'border-gray-800 bg-gray-950/20' : 'border-slate-100 bg-slate-50/10'
          }`}>
            <button
              onClick={() => handleTabChange('lines')}
              className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === 'lines' 
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/15' 
                  : theme === 'dark' ? 'text-gray-400 hover:bg-gray-800/60' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <span className="flex items-center gap-2.5">
                <Compass className="w-4 h-4" />
                Huvudlinjer
              </span>
              <span className="text-[10px] bg-black/20 px-2 py-0.5 rounded-full font-black">{lines.length}</span>
            </button>

            <button
              onClick={() => handleTabChange('machines')}
              className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === 'machines' 
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/15' 
                  : theme === 'dark' ? 'text-gray-400 hover:bg-gray-800/60' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <span className="flex items-center gap-2.5">
                <Cpu className="w-4 h-4" />
                Maskinenheter
              </span>
              <span className="text-[10px] bg-black/20 px-2 py-0.5 rounded-full font-black">
                {(Object.values(machines) as string[][]).reduce((sum, list) => sum + (list?.length || 0), 0)}
              </span>
            </button>

            <button
              onClick={() => handleTabChange('sections')}
              className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === 'sections' 
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/15' 
                  : theme === 'dark' ? 'text-gray-400 hover:bg-gray-800/60' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <span className="flex items-center gap-2.5">
                <Layers className="w-4 h-4" />
                Maskinsektioner
              </span>
              <span className="text-[10px] bg-black/20 px-2 py-0.5 rounded-full font-black">
                {(Object.values(sections) as string[][]).reduce((sum, list) => sum + (list?.length || 0), 0)}
              </span>
            </button>

            <button
              onClick={() => handleTabChange('recipes')}
              className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === 'recipes' 
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/15' 
                  : theme === 'dark' ? 'text-gray-400 hover:bg-gray-800/60' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <span className="flex items-center gap-2.5">
                <Layers className="w-4 h-4" />
                CL-Program (Format)
              </span>
              <span className="text-[10px] bg-black/20 px-2 py-0.5 rounded-full font-black">{currentMachineRecipes.length}</span>
            </button>
          </div>

          {/* Tab Work Panel */}
          <div className="flex-1 min-h-0 flex flex-col p-6 overflow-y-auto">
            
            {/* Quick Context Scope Info */}
            <div className={`p-4 rounded-2xl mb-6 flex flex-wrap gap-4 items-center justify-between text-xs font-semibold ${
              theme === 'dark' ? 'bg-gray-950/60 text-gray-300' : 'bg-slate-50 text-slate-600'
            }`}>
              <div className="flex items-center gap-4">
                <div>
                  <span className="block text-[9px] uppercase font-black text-gray-500">Vald Produktionslinje</span>
                  <span className="text-blue-500 font-bold">{currentLineName}</span>
                </div>
                {selectedMachine && (
                  <div className="border-l pl-4 border-gray-700/50">
                    <span className="block text-[9px] uppercase font-black text-gray-500">Vald Maskin</span>
                    <span className="text-amber-500 font-bold">{selectedMachine}</span>
                  </div>
                )}
                {activeRecipe && (
                  <div className="border-l pl-4 border-gray-700/50">
                    <span className="block text-[9px] uppercase font-black text-gray-500">Aktivt CL-Program (Format)</span>
                    <span className="text-emerald-500 font-bold">{activeRecipe}</span>
                  </div>
                )}
              </div>
              <span className="text-[10px] uppercase font-black tracking-widest text-[#6366F1]">Kontext Filter</span>
            </div>

            {/* Error Message Screen Alert */}
            {errorMessage && (
              <div className="p-3 mb-4 rounded-xl font-bold bg-red-600/15 border border-red-500/35 text-red-400 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* 1. CL-program Tab Content */}
            {activeTab === 'recipes' && (
              <div className="space-y-6 flex-1">
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wider">Målstyrda CL CL-program</h3>
                  <p className={`text-[11px] mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-slate-500'}`}>
                    Lägg till eller redigera CL-program (Format). Alla börvärden och tillåtna toleranser anpassas automatiskt när en operatör byter till önskat format.
                  </p>
                </div>

                <form onSubmit={(e) => { e.preventDefault(); handleAddRecipe(e); }} className="flex gap-2">
                  <input
                    type="text"
                    value={newInputName}
                    onChange={(e) => setNewInputName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddRecipe(e);
                      }
                    }}
                    placeholder="Skriv in nytt CL-programnamn (t.ex. Maxi 32-Pack)..."
                    className={`flex-1 px-4 py-2.5 rounded-xl border font-bold text-xs transition-colors outline-none focus:border-blue-500 ${
                      theme === 'dark' ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-slate-200'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={(e) => { e.preventDefault(); handleAddRecipe(e); }}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white rounded-xl text-xs font-black uppercase flex items-center gap-1.5 transition-all shadow-md shrink-0 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" /> Skapa Program
                  </button>
                </form>

                <div className="space-y-2">
                  <span className="block text-[10px] font-black uppercase tracking-wider text-gray-500 dark:text-gray-400">Existerande Program</span>
                  <div className={`border rounded-2xl divide-y overflow-hidden ${
                    theme === 'dark' ? 'border-gray-800 divide-gray-800' : 'border-slate-200 divide-slate-100'
                  }`}>
                    {currentMachineRecipes.map(recipe => (
                      <div key={recipe} className={`flex items-center justify-between p-3 transition-colors ${
                        activeRecipe === recipe 
                          ? (theme === 'dark' ? 'bg-emerald-500/10' : 'bg-emerald-500/5') 
                          : ''
                      }`}>
                        <div className="flex-1 min-w-0 pr-4">
                          {editingId === recipe ? (
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                value={editingValue}
                                onChange={(e) => setEditingValue(e.target.value)}
                                className={`px-2 py-1 bg-gray-800 border border-blue-500 text-white rounded text-xs font-bold`}
                                autoFocus
                              />
                              <button onClick={() => handleSaveRenameRecipe(recipe)} className="p-1 text-emerald-500 hover:scale-110">
                                <Check size={16} />
                              </button>
                              <button onClick={() => setEditingId(null)} className="p-1 text-red-500 hover:scale-110">
                                <X size={16} />
                              </button>
                            </div>
                          ) : (
                            <span className="font-bold text-xs truncate flex items-center gap-2">
                              {recipe}
                              {activeRecipe === recipe && (
                                <span className="bg-emerald-500/20 text-emerald-400 text-[8px] font-black uppercase px-2 py-0.5 rounded border border-emerald-500/20">Aktivt</span>
                              )}
                            </span>
                          )}
                        </div>

                        {confirmDeleteId === recipe ? (
                          <div className="flex items-center gap-1.5 animate-in fade-in zoom-in-95 duration-150">
                            <span className="text-[10px] font-black uppercase text-red-400 mr-2">Radera?</span>
                            <button
                              onClick={() => handleDeleteRecipe(recipe)}
                              className="px-2.5 py-1 bg-red-600 text-white rounded-lg text-[9px] font-black uppercase"
                            >
                              Ja
                            </button>
                            <button
                              onClick={resetLocalState}
                              className="px-2.5 py-1 bg-gray-600 text-white rounded-lg text-[9px] font-black uppercase"
                            >
                              Nej
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => handleStartRenameRecipe(recipe)}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-amber-500 hover:bg-amber-500/10 transition-colors"
                              title="Byt namn"
                            >
                              <Edit2 size={13} />
                            </button>
                            <button
                              onClick={() => setConfirmDeleteId(recipe)}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-500/10 transition-colors"
                              title="Radera"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 2. Huvudlinjer Tab Content */}
            {activeTab === 'lines' && (
              <div className="space-y-6 flex-1">
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wider">Huvudlinjer & Fabrikslokaler</h3>
                  <p className={`text-[11px] mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-slate-500'}`}>
                    Lägg till eller ändra produktionslinjer i systemet. Detta bygger den översta nivån för filtrering av mätpunkter.
                  </p>
                </div>

                <form onSubmit={(e) => { e.preventDefault(); handleAddLine(e); }} className="flex gap-2">
                  <input
                    type="text"
                    value={newInputName}
                    onChange={(e) => setNewInputName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddLine(e);
                      }
                    }}
                    placeholder="Skriv in nytt produktionslinjenamn..."
                    className={`flex-1 px-4 py-2.5 rounded-xl border font-bold text-xs transition-colors outline-none focus:border-blue-500 ${
                      theme === 'dark' ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-slate-200'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={(e) => { e.preventDefault(); handleAddLine(e); }}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white rounded-xl text-xs font-black uppercase flex items-center gap-1.5 transition-all shadow-md shrink-0 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" /> Knyt Linje
                  </button>
                </form>

                <div className="space-y-2">
                  <span className="block text-[10px] font-black uppercase tracking-wider text-gray-500 dark:text-gray-400">Existerande Produktionslinjer</span>
                  <div className={`border rounded-2xl divide-y overflow-hidden ${
                    theme === 'dark' ? 'border-gray-800 divide-gray-800' : 'border-slate-200 divide-slate-100'
                  }`}>
                    {lines.map(line => (
                      <div key={line.id} className={`flex items-center justify-between p-3 transition-colors ${
                        selectedLine === line.id 
                          ? (theme === 'dark' ? 'bg-[#3b82f6]/10' : 'bg-[#3b82f6]/5') 
                          : ''
                      }`}>
                        <div className="flex-1 min-w-0 pr-4">
                          {editingId === line.id ? (
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                value={editingValue}
                                onChange={(e) => setEditingValue(e.target.value)}
                                className="px-2 py-1 bg-gray-800 border border-blue-500 text-white rounded text-xs font-bold"
                                autoFocus
                              />
                              <button onClick={() => handleSaveRenameLine(line.id)} className="p-1 text-emerald-500 hover:scale-110">
                                <Check size={16} />
                              </button>
                              <button onClick={() => setEditingId(null)} className="p-1 text-red-500 hover:scale-110">
                                <X size={16} />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => onSelectLine(line.id)}
                              className="font-bold text-xs truncate flex items-center gap-2 w-full text-left"
                            >
                              {line.name}
                              {selectedLine === line.id && (
                                <span className="bg-blue-500/20 text-blue-400 text-[8px] font-black uppercase px-2 py-0.5 rounded border border-blue-400/20">Vald</span>
                              )}
                            </button>
                          )}
                        </div>

                        {confirmDeleteId === line.id ? (
                          <div className="flex items-center gap-1.5 animate-in fade-in zoom-in-95 duration-150">
                            <span className="text-[9px] font-bold text-red-400 max-w-[150px] leading-tight mr-2">{pointsWithNoSettingsStr} Ta bort?</span>
                            <button
                              onClick={() => handleDeleteLine(line.id)}
                              className="px-2.5 py-1 bg-red-600 text-white rounded-lg text-[9px] font-black uppercase"
                            >
                              Ja
                            </button>
                            <button
                              onClick={resetLocalState}
                              className="px-2.5 py-1 bg-gray-600 text-white rounded-lg text-[9px] font-black uppercase"
                            >
                              Nej
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => handleStartRenameLine(line.id, line.name)}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-amber-500 hover:bg-amber-500/10 transition-colors"
                              title="Byt namn"
                            >
                              <Edit2 size={13} />
                            </button>
                            <button
                              onClick={() => setConfirmDeleteId(line.id)}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-500/10 transition-colors"
                              title="Radera"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 3. Maskiner Tab Content */}
            {activeTab === 'machines' && (
              <div className="space-y-6 flex-1">
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wider">Maskinenheter</h3>
                  <p className={`text-[11px] mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-slate-500'}`}>
                    Lägg till eller ändra maskiner för den aktiva linjen: <span className="text-blue-500 font-bold">"{currentLineName}"</span>.
                  </p>
                </div>

                <form onSubmit={(e) => { e.preventDefault(); handleAddMachine(e); }} className="flex gap-2">
                  <input
                    type="text"
                    value={newInputName}
                    onChange={(e) => setNewInputName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddMachine(e);
                      }
                    }}
                    placeholder="Skriv in nytt maskinenhetsnamn (t.ex. Kapsylerare under linjen)..."
                    className={`flex-1 px-4 py-2.5 rounded-xl border font-bold text-xs transition-colors outline-none focus:border-blue-500 ${
                      theme === 'dark' ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-slate-200'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={(e) => { e.preventDefault(); handleAddMachine(e); }}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white rounded-xl text-xs font-black uppercase flex items-center gap-1.5 transition-all shadow-md shrink-0 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" /> Knyt Maskin
                  </button>
                </form>

                <div className="space-y-2">
                  <span className="block text-[10px] font-black uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Maskiner tillhörande linjen "{currentLineName}"
                  </span>
                  <div className={`border rounded-2xl divide-y overflow-hidden ${
                    theme === 'dark' ? 'border-gray-800 divide-gray-800' : 'border-slate-200 divide-slate-100'
                  }`}>
                    {(machines[selectedLine] || []).length === 0 ? (
                      <div className="p-4 text-center text-xs text-gray-500">Inga maskiner inlagda än. Skapa en ovan!</div>
                    ) : (
                      (machines[selectedLine] || []).map(mach => (
                        <div key={mach} className={`flex items-center justify-between p-3 transition-colors ${
                          selectedMachine === mach 
                            ? (theme === 'dark' ? 'bg-amber-500/10' : 'bg-amber-500/5') 
                            : ''
                        }`}>
                          <div className="flex-1 min-w-0 pr-4">
                            {editingId === mach ? (
                              <div className="flex items-center gap-2">
                                <input
                                  type="text"
                                  value={editingValue}
                                  onChange={(e) => setEditingValue(e.target.value)}
                                  className="px-2 py-1 bg-gray-800 border border-blue-500 text-white rounded text-xs font-bold"
                                  autoFocus
                                />
                                <button onClick={() => handleSaveRenameMachine(mach)} className="p-1 text-emerald-500 hover:scale-110">
                                  <Check size={16} />
                                </button>
                                <button onClick={() => setEditingId(null)} className="p-1 text-red-500 hover:scale-110">
                                  <X size={16} />
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => onSelectMachine(mach)}
                                className="font-bold text-xs truncate flex items-center gap-2 w-full text-left"
                              >
                                {mach}
                                {selectedMachine === mach && (
                                  <span className="bg-amber-500/20 text-amber-500 text-[8px] font-black uppercase px-2 py-0.5 rounded border border-amber-500/30">Vald</span>
                                )}
                              </button>
                            )}
                          </div>

                          {confirmDeleteId === mach ? (
                            <div className="flex items-center gap-1.5 animate-in fade-in zoom-in-95 duration-150">
                              <span className="text-[9px] font-bold text-red-400 max-w-[150px] leading-tight mr-2">{pointsWithNoSettingsStr} Ta bort?</span>
                              <button
                                onClick={() => handleDeleteMachine(mach)}
                                className="px-2.5 py-1 bg-red-600 text-white rounded-lg text-[9px] font-black uppercase"
                              >
                                Ja
                              </button>
                              <button
                                onClick={resetLocalState}
                                className="px-2.5 py-1 bg-gray-600 text-white rounded-lg text-[9px] font-black uppercase"
                              >
                                Nej
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => handleStartRenameMachine(mach)}
                                className="p-1.5 rounded-lg text-gray-400 hover:text-amber-500 hover:bg-amber-500/10 transition-colors"
                                title="Byt namn"
                              >
                                <Edit2 size={13} />
                              </button>
                              <button
                                onClick={() => setConfirmDeleteId(mach)}
                                className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-500/10 transition-colors"
                                title="Radera"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* 4. Sektioner Tab Content */}
            {activeTab === 'sections' && (
              <div className="space-y-6 flex-1">
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wider">Maskinsektioner & Zoner</h3>
                  <p className={`text-[11px] mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-slate-500'}`}>
                    Lägg till eller ändra raderingsbara sektioner för den valda maskinen: <span className="text-amber-500 font-bold">"{selectedMachine || 'Ej vald'}"</span>.
                  </p>
                </div>

                <form onSubmit={(e) => { e.preventDefault(); handleAddSection(e); }} className="flex gap-2">
                  <input
                    type="text"
                    value={newInputName}
                    onChange={(e) => setNewInputName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddSection(e);
                      }
                    }}
                    placeholder="Skriv in nytt sektionsnamn (t.ex. Inmatning, Krymptunnel)..."
                    className={`flex-1 px-4 py-2.5 rounded-xl border font-bold text-xs transition-colors outline-none focus:border-blue-500 ${
                      theme === 'dark' ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-slate-200'
                    }`}
                    disabled={!selectedMachine}
                  />
                  <button
                    type="button"
                    onClick={(e) => { e.preventDefault(); handleAddSection(e); }}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white rounded-xl text-xs font-black uppercase flex items-center gap-1.5 transition-all shadow-md shrink-0 cursor-pointer"
                    disabled={!selectedMachine}
                  >
                    <Plus className="w-4 h-4" /> Knyt Sektion
                  </button>
                </form>

                <div className="space-y-2">
                  <span className="block text-[10px] font-black uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Sektioner tillhörande maskinen "{selectedMachine || 'Ej vald'}"
                  </span>
                  <div className={`border rounded-2xl divide-y overflow-hidden ${
                    theme === 'dark' ? 'border-gray-800 divide-gray-800' : 'border-slate-200 divide-slate-100'
                  }`}>
                    {!selectedMachine ? (
                      <div className="p-4 text-center text-xs text-gray-500">Välj först en maskin på fliken brevid!</div>
                    ) : (sections[selectedMachine] || []).length === 0 ? (
                      <div className="p-4 text-center text-xs text-gray-500">Inga sektioner inlagda än. Skapa en ovan!</div>
                    ) : (
                      (sections[selectedMachine] || []).map(sec => (
                        <div key={sec} className={`flex items-center justify-between p-3 transition-colors ${
                          selectedSection === sec 
                            ? (theme === 'dark' ? 'bg-[#a855f7]/10' : 'bg-[#a855f7]/5') 
                            : ''
                        }`}>
                          <div className="flex-1 min-w-0 pr-4">
                            {editingId === sec ? (
                              <div className="flex items-center gap-2">
                                <input
                                  type="text"
                                  value={editingValue}
                                  onChange={(e) => setEditingValue(e.target.value)}
                                  className="px-2 py-1 bg-gray-800 border border-blue-500 text-white rounded text-xs font-bold"
                                  autoFocus
                                />
                                <button onClick={() => handleSaveRenameSection(sec)} className="p-1 text-emerald-500 hover:scale-110">
                                  <Check size={16} />
                                </button>
                                <button onClick={() => setEditingId(null)} className="p-1 text-red-500 hover:scale-110">
                                  <X size={16} />
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => onSelectSection(sec)}
                                className="font-bold text-xs truncate flex items-center gap-2 w-full text-left"
                              >
                                {sec}
                                {selectedSection === sec && (
                                  <span className="bg-[#a855f7]/20 text-[#a855f7] text-[8px] font-black uppercase px-2 py-0.5 rounded border border-[#a855f7]/30">Vald</span>
                                )}
                              </button>
                            )}
                          </div>

                          {confirmDeleteId === sec ? (
                            <div className="flex items-center gap-1.5 animate-in fade-in zoom-in-95 duration-150">
                              <span className="text-[9px] font-bold text-red-400 max-w-[150px] leading-tight mr-2">Nollställs på punkter. Ta bort?</span>
                              <button
                                onClick={() => handleDeleteSection(sec)}
                                className="px-2.5 py-1 bg-red-600 text-white rounded-lg text-[9px] font-black uppercase"
                              >
                                Ja
                              </button>
                              <button
                                onClick={resetLocalState}
                                className="px-2.5 py-1 bg-gray-600 text-white rounded-lg text-[9px] font-black uppercase"
                              >
                                Nej
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => handleStartRenameSection(sec)}
                                className="p-1.5 rounded-lg text-gray-400 hover:text-amber-500 hover:bg-amber-500/10 transition-colors"
                                title="Byt namn"
                              >
                                <Edit2 size={13} />
                              </button>
                              <button
                                onClick={() => setConfirmDeleteId(sec)}
                                className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-500/10 transition-colors"
                                title="Radera"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer info/save bar */}
        <div className={`px-8 py-4 border-t text-[10px] shrink-0 font-bold tracking-widest uppercase text-center ${
          theme === 'dark' ? 'border-gray-800 bg-gray-950/40 text-gray-500' : 'border-slate-100 bg-slate-50/40 text-slate-400'
        }`}>
          Ändringarna lagras säkert i systemet och speglas på instrumentpanelen direkt
        </div>
      </div>
    </div>
  );
};
