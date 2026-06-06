
import React, { useState, useEffect, useCallback } from 'react';
import { MACHINE_POINTS, DEFAULT_MACHINE_LAYOUT, DEFAULT_DEFINITIONS, DEFAULT_RECIPES } from './constants';
import { MachinePoint, MachineModule, DefinitionDetail, DocumentMetadata, PointHistoryLog, PointStatus } from './types';
import { translations } from './translations';
import MachineMap from './components/MachineMap';
import ParameterTable from './components/ParameterTable';
import PointDetail from './components/PointDetail';
import PhasingGauge from './components/PhasingGauge';
import AddPointForm from './components/AddPointForm';
import { HierarchyManagerModal } from './components/HierarchyManagerModal';
import SettingsModal from './components/SettingsModal';
import PrintModal from './components/PrintModal';
import ModuleEditor from './components/ModuleEditor';
import Guide from './components/Guide';
import CustomSelect from './components/CustomSelect';
import HistoryView from './components/HistoryView';
import { Map, List, Settings, Activity, Printer, ChevronLeft, ChevronRight, Plus, Edit3, BookOpen, Square, Crosshair, Image as ImageIcon, Sun, Moon, X, History } from 'lucide-react';
import { dbService } from './dbService';

// Factory structure data for cascading dropdowns
const FACTORY_LINES = [
  { id: 'l1', name: 'Produktionslinje 1 (Förpackning - Pilot)' },
  { id: 'l2', name: 'Produktionslinje 2 (Flaskfyllning)' },
  { id: 'l3', name: 'Produktionslinje 3 (Palettering)' }
];

const FACTORY_MACHINES: Record<string, string[]> = {
  'l1': ['Packmaskin (Tray Packer - Pilot)', 'Sleevemaskin (Sleever)', 'Fyllare 5'],
  'l2': ['Flaskfyllare 2', 'Kapsylerare', 'Etiketteringsmaskin'],
  'l3': ['Robotpaletterare 1', 'Plastfilmsemballerare']
};

const MACHINE_SECTIONS: Record<string, string[]> = {
  'Packmaskin (Tray Packer - Pilot)': [
    'Inmatning (1-2)',
    'Separator (3-4)',
    'Magasin (13)',
    'Formning (5-6)',
    'Filmlindning (9-10)',
    'Filmspole (18)',
    'Utmatning (8)'
  ],
  'Sleevemaskin (Sleever)': ['Inmatning', 'Sleeve-påträdare', 'Krymptunnel', 'Utmatning'],
  'Fyllare 5': ['Flaskinmatning', 'Sköljning', 'Fyllningsventiler', 'Utmatning'],
  'Flaskfyllare 2': ['Inmatning', 'Rengöring', 'Fyllstation', 'Utmatning'],
  'Kapsylerare': ['Kapselmagasin', 'Påsättare', 'Gängning'],
  'Etiketteringsmaskin': ['Inmatning', 'Limstation', 'Etikettvalsar'],
  'Robotpaletterare 1': ['Transportör', 'Gripklo', 'Pallmagasin'],
  'Plastfilmsemballerare': ['Inmatningsvalsar', 'Rotationsarm', 'Smidsterminal']
};

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'table' | 'phasing' | 'guide' | 'history'>('overview');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme');
      if (saved === 'light' || saved === 'dark') return saved;
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'dark';
  });
  const [isDesignMode, setIsDesignMode] = useState(false);
  
  const [isAddingPoint, setIsAddingPoint] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [editingPoint, setEditingPoint] = useState<MachinePoint | null>(null);
  const [selectedPoint, setSelectedPoint] = useState<MachinePoint | null>(null);
  const [editingModule, setEditingModule] = useState<MachineModule | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [dbStatus, setDbStatus] = useState<'idle' | 'loading' | 'connected' | 'error'>('idle');
  
  const [customMapUrl, setCustomMapUrl] = useState<string | null>(() => localStorage.getItem('centerline_map_url'));
  const [machineBackgrounds, setMachineBackgrounds] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem('centerline_machine_backgrounds');
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  });

  const [points, setPoints] = useState<MachinePoint[]>([]);
  const [layouts, setLayouts] = useState<Record<string, MachineModule[]>>({
    'Packmaskin (Tray Packer - Pilot)': DEFAULT_MACHINE_LAYOUT
  });
  const [definitions, setDefinitions] = useState<Record<string, DefinitionDetail>>(DEFAULT_DEFINITIONS);
  const [recipes, setRecipes] = useState<Record<string, string[]>>({});
  const [activeRecipe, setActiveRecipe] = useState<string>('');

  // Factory Hierarchy state
  const [lines, setLines] = useState<{ id: string; name: string }[]>(() => FACTORY_LINES);
  const [machines, setMachines] = useState<Record<string, string[]>>(() => FACTORY_MACHINES);
  const [sections, setSections] = useState<Record<string, string[]>>(() => MACHINE_SECTIONS);
  
  const [selectedLine, setSelectedLine] = useState<string>('l1');
  const [selectedMachine, setSelectedMachine] = useState<string>('Packmaskin (Tray Packer - Pilot)');
  const [selectedSection, setSelectedSection] = useState<string>('All');
  const [isHierarchyOpen, setIsHierarchyOpen] = useState(false);
  
  // Inline recipe/CL-program creation state
  const [isCreatingRecipe, setIsCreatingRecipe] = useState(false);
  const [newRecipeName, setNewRecipeName] = useState('');

  const [pointHistory, setPointHistory] = useState<PointHistoryLog[]>([]);

  // Refs to track initial load and prevent immediate re-save
  const isInitialLoad = React.useRef(true);
  const lastSyncedPoints = React.useRef<string>('');
  const lastSyncedLayout = React.useRef<string>('');
  const lastSyncedDefinitions = React.useRef<string>('');
  const lastSyncedRecipes = React.useRef<string>('');
  const lastSyncedHierarchy = React.useRef<string>('');
  const lastSyncedBackgrounds = React.useRef<string>('');
  const lastSyncedHistory = React.useRef<string>('[]');

  // Dynamically resolve active machine CL-programs/recipes
  const activeMachineRecipes = React.useMemo(() => {
    if (selectedMachine && recipes[selectedMachine]) {
      return recipes[selectedMachine];
    }
    if (selectedMachine === 'Packmaskin (Tray Packer - Pilot)') {
      return recipes['Packmaskin (Tray Packer - Pilot)'] || DEFAULT_RECIPES;
    }
    return recipes[selectedMachine] || [];
  }, [recipes, selectedMachine]);

  // Dynamically resolve active visual modules/layout
  const activeLayout = React.useMemo(() => {
    if (layouts[selectedMachine] && Array.isArray(layouts[selectedMachine])) {
      return layouts[selectedMachine];
    }
    const secs = sections[selectedMachine] || [];
    if (secs.length > 0) {
      const spacing = Math.floor(100 / secs.length);
      return secs.map((sec, idx) => ({
        id: `mod_${selectedMachine}_${idx}`,
        label: sec,
        x: idx * spacing,
        y: 15,
        width: Math.max(12, spacing - 3),
        height: 12,
        color: ['#3b82f6', '#6366f1', '#eab308', '#f97316', '#ec4899', '#f472b6', '#a855f7'][idx % 7]
      }));
    }
    return [];
  }, [layouts, selectedMachine, sections]);

  // Dynamically resolve active background image for the selected machine
  const activeMapUrl = React.useMemo(() => {
    if (machineBackgrounds[selectedMachine]) {
      return machineBackgrounds[selectedMachine];
    }
    if (selectedMachine === 'Packmaskin (Tray Packer - Pilot)') {
      return customMapUrl;
    }
    return null;
  }, [machineBackgrounds, selectedMachine, customMapUrl]);

  // Fetch initial data & handle login transition
  useEffect(() => {
    let hasInitialDataLoaded = false;

    const loadLocalBackupsOnly = () => {
      // Fallback or local storage backups if cloud fetch fails
      const getLocalBackup = (key: string, defaultVal: any) => {
        const cached = localStorage.getItem(`offline_app_state_${key}`);
        if (cached) {
          try {
            return JSON.parse(cached);
          } catch (e) {
            return defaultVal;
          }
        }
        return defaultVal;
      };

      setPoints(getLocalBackup('points', MACHINE_POINTS));
      
      const localLayouts = getLocalBackup('layout', null);
      if (localLayouts) {
        setLayouts(localLayouts);
      } else {
        setLayouts({ 'Packmaskin (Tray Packer - Pilot)': DEFAULT_MACHINE_LAYOUT });
      }

      setDefinitions(getLocalBackup('definitions', DEFAULT_DEFINITIONS));

      const localRecipes = getLocalBackup('recipes', null);
      if (localRecipes) {
        setRecipes(localRecipes);
        const currentRecs = localRecipes['Packmaskin (Tray Packer - Pilot)'] || DEFAULT_RECIPES;
        setActiveRecipe(currentRecs[0] || '');
      } else {
        const defaults: Record<string, string[]> = { 'Packmaskin (Tray Packer - Pilot)': DEFAULT_RECIPES };
        setRecipes(defaults);
        setActiveRecipe(DEFAULT_RECIPES[0]);
      }

      const localHierarchy = getLocalBackup('hierarchy', null);
      if (localHierarchy) {
        if (localHierarchy.lines) setLines(localHierarchy.lines);
        if (localHierarchy.machines) setMachines(localHierarchy.machines);
        if (localHierarchy.sections) setSections(localHierarchy.sections);
      } else {
        setLines(FACTORY_LINES);
        setMachines(FACTORY_MACHINES);
        setSections(MACHINE_SECTIONS);
      }

      const localBackgrounds = getLocalBackup('backgrounds', null);
      if (localBackgrounds) {
        setMachineBackgrounds(localBackgrounds);
      } else {
        setMachineBackgrounds({});
      }

      setPointHistory(getLocalBackup('history', []));
      
      setDbStatus('idle');
      setIsLoading(false);
      setTimeout(() => {
        isInitialLoad.current = false;
      }, 500);
    };

    const fetchCloudData = async () => {
      setDbStatus('loading');
      try {
        const cloudData = await dbService.getData();
        
        const pointsData = cloudData['points'];
        const layoutData = cloudData['layout'];
        const definitionsData = cloudData['definitions'];
        const recipesData = cloudData['recipes'];
        const hierarchyData = cloudData['hierarchy'];
        const backgroundsData = cloudData['backgrounds'];
        const historyData = cloudData['history'];
        
        if (backgroundsData) {
          setMachineBackgrounds(backgroundsData);
          lastSyncedBackgrounds.current = JSON.stringify(backgroundsData);
        }

        if (historyData) {
          setPointHistory(historyData);
          lastSyncedHistory.current = JSON.stringify(historyData);
        } else {
          setPointHistory([]);
          lastSyncedHistory.current = JSON.stringify([]);
        }
        
        if (pointsData) {
          setPoints(pointsData);
          lastSyncedPoints.current = JSON.stringify(pointsData);
        } else {
          setPoints(MACHINE_POINTS);
          lastSyncedPoints.current = JSON.stringify(MACHINE_POINTS);
        }
        
        if (layoutData) {
          if (Array.isArray(layoutData)) {
            const mig = { 'Packmaskin (Tray Packer - Pilot)': layoutData };
            setLayouts(mig);
            lastSyncedLayout.current = JSON.stringify(mig);
          } else {
            setLayouts(layoutData);
            lastSyncedLayout.current = JSON.stringify(layoutData);
          }
        } else {
          const defaults = { 'Packmaskin (Tray Packer - Pilot)': DEFAULT_MACHINE_LAYOUT };
          setLayouts(defaults);
          lastSyncedLayout.current = JSON.stringify(defaults);
        }

        if (definitionsData) {
          setDefinitions(definitionsData);
          lastSyncedDefinitions.current = JSON.stringify(definitionsData);
        } else {
          setDefinitions(DEFAULT_DEFINITIONS);
          lastSyncedDefinitions.current = JSON.stringify(DEFAULT_DEFINITIONS);
        }

        if (recipesData) {
          if (Array.isArray(recipesData)) {
            const mig: Record<string, string[]> = { 'Packmaskin (Tray Packer - Pilot)': recipesData };
            setRecipes(mig);
            lastSyncedRecipes.current = JSON.stringify(mig);
            
            const currentRecs = mig['Packmaskin (Tray Packer - Pilot)'] || DEFAULT_RECIPES;
            setActiveRecipe(currentRecs[0] || '');
          } else {
            setRecipes(recipesData);
            lastSyncedRecipes.current = JSON.stringify(recipesData);
            
            const currentRecs = recipesData['Packmaskin (Tray Packer - Pilot)'] || DEFAULT_RECIPES;
            setActiveRecipe(currentRecs[0] || '');
          }
        } else {
          const defaults: Record<string, string[]> = { 'Packmaskin (Tray Packer - Pilot)': DEFAULT_RECIPES };
          setRecipes(defaults);
          lastSyncedRecipes.current = JSON.stringify(defaults);
          setActiveRecipe(DEFAULT_RECIPES[0]);
        }

        if (hierarchyData) {
          if (hierarchyData.lines) setLines(hierarchyData.lines);
          if (hierarchyData.machines) setMachines(hierarchyData.machines);
          if (hierarchyData.sections) setSections(hierarchyData.sections);
          lastSyncedHierarchy.current = JSON.stringify(hierarchyData);
        } else {
          lastSyncedHierarchy.current = JSON.stringify({ lines: FACTORY_LINES, machines: FACTORY_MACHINES, sections: MACHINE_SECTIONS });
        }
        setDbStatus('connected');
      } catch (error) {
        console.error("Failed to fetch data from Firestore, loading local backups:", error);
        setDbStatus('error');
        loadLocalBackupsOnly();
      } finally {
        setIsLoading(false);
        setTimeout(() => {
          isInitialLoad.current = false;
        }, 500);
      }
    };

    // Keep auth in sync and control fetching
    const unsubscribeAuth = dbService.onAuthChange((user) => {
      setCurrentUser(user);
      
      const isEmailVerified = user ? (user.emailVerified || false) : false;
      const canAccessCloud = user && isEmailVerified;

      if (!hasInitialDataLoaded) {
        hasInitialDataLoaded = true;
        if (canAccessCloud) {
          fetchCloudData();
        } else {
          loadLocalBackupsOnly();
        }
      } else {
        // Auth state transitions after the initial load
        if (canAccessCloud) {
          fetchCloudData();
        }
      }
    });

    // Run initializer
    const unsubscribeInit = dbService.initialize(() => {
      // ready
    });

    return () => {
      unsubscribeAuth();
      unsubscribeInit();
    };
  }, []);

  const [logoUrl, setLogoUrl] = useState<string | null>(() => localStorage.getItem('centerline_logo_url'));
  const [publicBaseUrl, setPublicBaseUrl] = useState<string>(() => localStorage.getItem('centerline_public_url') || '');

  // ISO Document Metadata State
  const [docMetadata, setDocMetadata] = useState<DocumentMetadata>(() => {
    const saved = localStorage.getItem('centerline_doc_metadata');
    return saved ? JSON.parse(saved) : {
      id: 'CL-STD-001',
      version: '1.0',
      validFrom: new Date().toISOString().split('T')[0],
      issuedBy: '',
      approvedBy: ''
    };
  });

  useEffect(() => {
    localStorage.setItem('centerline_doc_metadata', JSON.stringify(docMetadata));
  }, [docMetadata]);

  // Generic sync function using Pluggable DB Service
  const performSync = async (key: 'points' | 'layout' | 'definitions' | 'recipes' | 'hierarchy' | 'backgrounds' | 'history', value: any) => {
    if (isInitialLoad.current) return;

    // Always back up locally in localStorage so work is never lost
    const currentJson = JSON.stringify(value);
    localStorage.setItem(`offline_app_state_${key}`, currentJson);

    // Check if data actually changed since last sync to avoid redundant calls
    if (key === 'points' && currentJson === lastSyncedPoints.current) return;
    if (key === 'layout' && currentJson === lastSyncedLayout.current) return;
    if (key === 'definitions' && currentJson === lastSyncedDefinitions.current) return;
    if (key === 'recipes' && currentJson === lastSyncedRecipes.current) return;
    if (key === 'hierarchy' && currentJson === lastSyncedHierarchy.current) return;
    if (key === 'backgrounds' && currentJson === lastSyncedBackgrounds.current) return;
    if (key === 'history' && currentJson === lastSyncedHistory.current) return;

    setSaveStatus('saving');

    // Only attempt cloud sync if authenticated and verified
    const isEmailVerified = currentUser ? (currentUser.emailVerified || false) : false;
    const canAccessCloud = currentUser && isEmailVerified;

    if (!canAccessCloud) {
      // Offline/Guest mode: skip cloud write and show success of local storage immediately
      setTimeout(() => {
        if (key === 'points') lastSyncedPoints.current = currentJson;
        if (key === 'layout') lastSyncedLayout.current = currentJson;
        if (key === 'definitions') lastSyncedDefinitions.current = currentJson;
        if (key === 'recipes') lastSyncedRecipes.current = currentJson;
        if (key === 'hierarchy') lastSyncedHierarchy.current = currentJson;
        if (key === 'backgrounds') lastSyncedBackgrounds.current = currentJson;
        if (key === 'history') lastSyncedHistory.current = currentJson;

        setSaveStatus('success');
        setHasUnsavedChanges(false);
        setTimeout(() => setSaveStatus('idle'), 2000);
      }, 300);
      return;
    }

    try {
      await dbService.saveState(key, value);
      
      // Update last synced refs
      if (key === 'points') lastSyncedPoints.current = currentJson;
      if (key === 'layout') lastSyncedLayout.current = currentJson;
      if (key === 'definitions') lastSyncedDefinitions.current = currentJson;
      if (key === 'recipes') lastSyncedRecipes.current = currentJson;
      if (key === 'hierarchy') lastSyncedHierarchy.current = currentJson;
      if (key === 'backgrounds') lastSyncedBackgrounds.current = currentJson;
      if (key === 'history') lastSyncedHistory.current = currentJson;

      setSaveStatus('success');
      setHasUnsavedChanges(false);
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error: any) {
      console.error(`Failed to sync ${key} to Database:`, error);
      setSaveStatus('error');
    }
  };

  // Debounced Effects for Saving
  useEffect(() => {
    if (isInitialLoad.current) return;
    setHasUnsavedChanges(true);
    const timer = setTimeout(() => performSync('recipes', recipes), 2000);
    return () => clearTimeout(timer);
  }, [recipes]);

  useEffect(() => {
    if (isInitialLoad.current) return;
    setHasUnsavedChanges(true);
    const timer = setTimeout(() => performSync('points', points), 2000);
    return () => clearTimeout(timer);
  }, [points]);

  useEffect(() => {
    if (isInitialLoad.current) return;
    setHasUnsavedChanges(true);
    const timer = setTimeout(() => performSync('layout', layouts), 2000);
    return () => clearTimeout(timer);
  }, [layouts]);

  useEffect(() => {
    if (isInitialLoad.current) return;
    setHasUnsavedChanges(true);
    const timer = setTimeout(() => performSync('definitions', definitions), 2000);
    return () => clearTimeout(timer);
  }, [definitions]);

  useEffect(() => {
    if (isInitialLoad.current) return;
    setHasUnsavedChanges(true);
    const timer = setTimeout(() => performSync('hierarchy', { lines, machines, sections }), 2000);
    return () => clearTimeout(timer);
  }, [lines, machines, sections]);

  useEffect(() => {
    if (isInitialLoad.current) return;
    setHasUnsavedChanges(true);
    const timer = setTimeout(() => performSync('backgrounds', machineBackgrounds), 2000);
    return () => clearTimeout(timer);
  }, [machineBackgrounds]);

  useEffect(() => {
    if (isInitialLoad.current) return;
    setHasUnsavedChanges(true);
    const timer = setTimeout(() => performSync('history', pointHistory), 2000);
    return () => clearTimeout(timer);
  }, [pointHistory]);

  const handleRegisterValue = useCallback((point: MachinePoint, value: string, status: PointStatus, comment?: string) => {
    const newLog: PointHistoryLog = {
      id: 'history-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
      lineId: selectedLine,
      lineName: lines.find(l => l.id === selectedLine)?.name || selectedLine,
      machineName: selectedMachine,
      pointId: point.id,
      pointNumber: point.number,
      pointName: point.name,
      timestamp: new Date().toISOString(),
      value: value,
      targetValue: activeRecipe && point.recipeTargets?.[activeRecipe] ? point.recipeTargets[activeRecipe].targetValue : point.targetValue,
      tolerance: activeRecipe && point.recipeTargets?.[activeRecipe] ? point.recipeTargets[activeRecipe].tolerance : point.tolerance,
      recipeName: activeRecipe || 'Standard',
      status: status,
      comment: comment || ''
    };

    setPointHistory(prev => [newLog, ...prev]);
  }, [selectedLine, lines, selectedMachine, activeRecipe]);

  const handleUpdatePointAndLog = useCallback((p: MachinePoint) => {
    const originalPoint = points.find(x => x.id === p.id);
    setPoints(points.map(x => x.id === p.id ? p : x));

    if (originalPoint && originalPoint.status !== p.status) {
      const activeTarget = activeRecipe && p.recipeTargets?.[activeRecipe] 
        ? p.recipeTargets[activeRecipe].targetValue 
        : p.targetValue;
      handleRegisterValue(p, activeTarget, p.status || PointStatus.OK, p.tagComment || 'Status ändrad via kvickknapp.');
    }
  }, [points, activeRecipe, handleRegisterValue]);

  // Local update functions (no longer direct DB calls)
  const savePoints = (newPoints: MachinePoint[]) => {
    setPoints(newPoints);
  };

  const saveActiveLayout = (newLayout: MachineModule[]) => {
    setLayouts(prev => ({ ...prev, [selectedMachine]: newLayout }));
  };

  const saveDefinitions = (newDefs: Record<string, DefinitionDetail>) => {
    setDefinitions(newDefs);
  };

  // Handle deep-linking via QR codes (?p=ID)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const pointId = params.get('p');
    if (pointId && points.length > 0) {
      const point = points.find(p => p.id === pointId);
      if (point) {
        setSelectedPoint(point);
        // Clean up URL without reloading to keep it tidy
        window.history.replaceState({}, '', window.location.pathname);
      }
    }
  }, [points]);

  // Keep selectedPoint in sync with updated list in points
  useEffect(() => {
    if (selectedPoint) {
      const upToDatePoint = points.find(p => p.id === selectedPoint.id);
      if (upToDatePoint && JSON.stringify(upToDatePoint) !== JSON.stringify(selectedPoint)) {
        setSelectedPoint(upToDatePoint);
      }
    }
  }, [points, selectedPoint]);

  useEffect(() => {
    localStorage.setItem('sidebar_collapsed', isSidebarCollapsed.toString());
    
    // Theme handling
    localStorage.setItem('theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.style.setProperty('color-scheme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.style.setProperty('color-scheme', 'light');
    }
    
    // Map URL handling
    try {
      if (customMapUrl) {
        localStorage.setItem('centerline_map_url', customMapUrl);
      } else {
        localStorage.removeItem('centerline_map_url');
      }
    } catch (e) {
      console.error("Failed to save map url to local storage:", e);
      alert("Bilden är för stor för att sparas i webbläsaren. Vänligen använd en mindre bild (under 5MB).");
      setCustomMapUrl(null);
    }
    
    // Logo URL handling
    try {
      if (logoUrl) {
        localStorage.setItem('centerline_logo_url', logoUrl);
      } else {
        localStorage.removeItem('centerline_logo_url');
      }
    } catch (e) {
      console.error("Failed to save logo url to local storage:", e);
      setLogoUrl(null);
    }
    
    localStorage.setItem('centerline_public_url', publicBaseUrl);
    try {
      localStorage.setItem('centerline_machine_backgrounds', JSON.stringify(machineBackgrounds));
    } catch (e) {
      console.error("Failed to save backgrounds to local storage:", e);
    }
  }, [isSidebarCollapsed, customMapUrl, machineBackgrounds, logoUrl, publicBaseUrl, theme]);

  const getQrCodeUrl = useCallback((pointId: string, size: number = 200) => {
    const isCloud = window.location.hostname !== 'localhost';
    const base = isCloud ? window.location.origin : (publicBaseUrl || window.location.origin);
    const targetUrl = `${base.replace(/\/$/, "")}/?p=${pointId}`;
    return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(targetUrl)}&margin=4&ecc=M&format=svg`;
  }, [publicBaseUrl]);

  const handleCreateLine = () => {
    const name = prompt("Ange namn för den nya produktionslinjen:");
    if (!name || !name.trim()) return;
    const trimmed = name.trim();
    const existing = lines.find(l => l.name.toLowerCase() === trimmed.toLowerCase());
    if (existing) {
      alert("En linje med detta namn finns redan!");
      return;
    }
    const newId = 'l' + (lines.length + 1);
    setLines(prev => [...prev, { id: newId, name: trimmed }]);
    setMachines(prev => ({ ...prev, [newId]: [] }));
    setSelectedLine(newId);
    setSelectedMachine('');
    setSelectedSection('All');
  };

  const handleRenameLine = () => {
    const currentLine = lines.find(l => l.id === selectedLine);
    if (!currentLine) return;
    const name = prompt(`Ange nytt namn för produktionslinjen "${currentLine.name}":`, currentLine.name);
    if (!name || !name.trim()) return;
    const trimmed = name.trim();
    if (trimmed === currentLine.name) return;
    
    setLines(prev => prev.map(l => l.id === selectedLine ? { ...l, name: trimmed } : l));
  };

  const handleDeleteLine = () => {
    const currentLine = lines.find(l => l.id === selectedLine);
    if (!currentLine) return;
    const machs = machines[selectedLine] || [];
    const linePoints = points.filter(p => p.lineId === selectedLine);
    
    const message = `Är du säker på att du vill ta bort produktionslinjen "${currentLine.name}"?\n` +
      `Detta kommer ta bort ${machs.length} maskiner och påverka ${linePoints.length} centerline-punkter som är kopplade till denna linje.`;
       
    if (!confirm(message)) return;
    
    setLines(prev => prev.filter(l => l.id !== selectedLine));
    setMachines(prev => {
      const copy = { ...prev };
      delete copy[selectedLine];
      return copy;
    });
    
    const updatedPoints = points.map(p => p.lineId === selectedLine ? { ...p, lineId: '' } : p);
    savePoints(updatedPoints);
    
    const remaining = lines.filter(l => l.id !== selectedLine);
    if (remaining.length > 0) {
      setSelectedLine(remaining[0].id);
      const nextMachs = machines[remaining[0].id] || [];
      setSelectedMachine(nextMachs[0] || '');
    } else {
      setSelectedLine('');
      setSelectedMachine('');
    }
    setSelectedSection('All');
  };

  const handleCreateMachine = () => {
    if (!selectedLine) {
      alert("Välj en produktionslinje först!");
      return;
    }
    const name = prompt(`Ange namn för den nya maskinen under "${lines.find(l => l.id === selectedLine)?.name}":`);
    if (!name || !name.trim()) return;
    const trimmed = name.trim();
    
    const currentMachs = machines[selectedLine] || [];
    if (currentMachs.includes(trimmed)) {
      alert("En maskin med detta namn finns redan i denna linje!");
      return;
    }
    
    setMachines(prev => ({
      ...prev,
      [selectedLine]: [...currentMachs, trimmed]
    }));
    setSections(prev => ({
      ...prev,
      [trimmed]: []
    }));
    setSelectedMachine(trimmed);
    setSelectedSection('All');
  };

  const handleRenameMachine = () => {
    if (!selectedLine || !selectedMachine) return;
    const currentMachine = selectedMachine;
    const name = prompt(`Ange nytt namn för maskinen "${currentMachine}":`, currentMachine);
    if (!name || !name.trim()) return;
    const trimmed = name.trim();
    if (trimmed === currentMachine) return;
    
    setMachines(prev => ({
      ...prev,
      [selectedLine]: (prev[selectedLine] || []).map(m => m === currentMachine ? trimmed : m)
    }));
    
    setSections(prev => {
      const copy = { ...prev };
      if (copy[currentMachine]) {
        copy[trimmed] = copy[currentMachine];
        delete copy[currentMachine];
      } else {
        copy[trimmed] = [];
      }
      return copy;
    });
    
    setLayouts(prev => {
      const copy = { ...prev };
      if (copy[currentMachine]) {
        copy[trimmed] = copy[currentMachine];
        delete copy[currentMachine];
      }
      return copy;
    });
    
    const updatedPoints = points.map(p => {
      const isMatch = p.machine === currentMachine || 
        (!p.machine && currentMachine === 'Packmaskin (Tray Packer - Pilot)');
      const isLineMatch = p.lineId === selectedLine ||
        (!p.lineId && selectedLine === 'l1');
      
      if (isMatch && isLineMatch) {
        return { ...p, machine: trimmed, lineId: selectedLine };
      }
      return p;
    });
    savePoints(updatedPoints);
    setSelectedMachine(trimmed);
  };

  const handleDeleteMachine = () => {
    if (!selectedLine || !selectedMachine) return;
    const machPoints = points.filter(p => {
      const isMatch = p.machine === selectedMachine || 
        (!p.machine && selectedMachine === 'Packmaskin (Tray Packer - Pilot)');
      const isLineMatch = p.lineId === selectedLine ||
        (!p.lineId && selectedLine === 'l1');
      return isMatch && isLineMatch;
    });
    
    const message = `Är du säker på att du vill ta bort maskinen "${selectedMachine}"?\n` +
      `Detta kommer att påverka ${machPoints.length} centerline-punkter som tillhör denna maskin.`;
       
    if (!confirm(message)) return;
    
    setMachines(prev => ({
      ...prev,
      [selectedLine]: (prev[selectedLine] || []).filter(m => m !== selectedMachine)
    }));
    
    setSections(prev => {
      const copy = { ...prev };
      delete copy[selectedMachine];
      return copy;
    });
    
    setLayouts(prev => {
      const copy = { ...prev };
      delete copy[selectedMachine];
      return copy;
    });
    
    const updatedPoints = points.map(p => {
      const isMatch = p.machine === selectedMachine || 
        (!p.machine && selectedMachine === 'Packmaskin (Tray Packer - Pilot)');
      const isLineMatch = p.lineId === selectedLine ||
        (!p.lineId && selectedLine === 'l1');
      
      if (isMatch && isLineMatch) {
         return { ...p, machine: '', lineId: '' };
      }
      return p;
    });
    savePoints(updatedPoints);
    
    const remainingList = (machines[selectedLine] || []).filter(m => m !== selectedMachine);
    setSelectedMachine(remainingList[0] || '');
    setSelectedSection('All');
  };

  const handleCreateSection = () => {
    if (!selectedMachine) {
      alert("Välj en maskin först!");
      return;
    }
    const name = prompt(`Ange namn på ny sektion under "${selectedMachine}":`);
    if (!name || !name.trim()) return;
    const trimmed = name.trim();
    
    const currentSecs = sections[selectedMachine] || [];
    if (currentSecs.includes(trimmed)) {
      alert("En sektion med det namnet finns redan på denna maskin!");
      return;
    }
    
    setSections(prev => ({
      ...prev,
      [selectedMachine]: [...currentSecs, trimmed]
    }));
    setSelectedSection(trimmed);
  };

  const handleRenameSection = () => {
    if (!selectedMachine || !selectedSection || selectedSection === 'All') return;
    const currentSec = selectedSection;
    const name = prompt(`Ange nytt namn på sektionen "${currentSec}":`, currentSec);
    if (!name || !name.trim()) return;
    const trimmed = name.trim();
    if (trimmed === currentSec) return;
    
    setSections(prev => ({
      ...prev,
      [selectedMachine]: (prev[selectedMachine] || []).map(s => s === currentSec ? trimmed : s)
    }));
    
    const machineLayout = Array.isArray(layouts[selectedMachine]) ? layouts[selectedMachine] : [];
    if (machineLayout.length > 0) {
      const updatedLayout = machineLayout.map(m => m.label === currentSec ? { ...m, label: trimmed } : m);
      setLayouts(prev => ({ ...prev, [selectedMachine]: updatedLayout }));
    }
    
    const updatedPoints = points.map(p => {
      const matchesLine = !p.lineId || p.lineId === selectedLine;
      const matchesMachine = !p.machine || p.machine === selectedMachine;
      if (matchesLine && matchesMachine && p.section === currentSec) {
        return { ...p, section: trimmed };
      }
      return p;
    });
    savePoints(updatedPoints);
    setSelectedSection(trimmed);
  };

  const handleDeleteSection = () => {
    if (!selectedMachine || !selectedSection || selectedSection === 'All') return;
    const currentSec = selectedSection;
    const secPoints = points.filter(p => p.section === currentSec && p.machine === selectedMachine && p.lineId === selectedLine);
    
    const message = `Är du säker på att du vill ta bort sektionen "${currentSec}"?\n` +
      `Detta kommer att påverka ${secPoints.length} centerline-punkter som tillhör denna sektion.`;
       
    if (!confirm(message)) return;
    
    setSections(prev => ({
      ...prev,
      [selectedMachine]: (prev[selectedMachine] || []).filter(s => s !== currentSec)
    }));
    
    const machineLayout = Array.isArray(layouts[selectedMachine]) ? layouts[selectedMachine] : [];
    if (machineLayout.length > 0) {
      const updatedLayout = machineLayout.filter(m => m.label !== currentSec);
      setLayouts(prev => ({ ...prev, [selectedMachine]: updatedLayout }));
    }
    
    const updatedPoints = points.map(p => {
      const matchesLine = !p.lineId || p.lineId === selectedLine;
      const matchesMachine = !p.machine || p.machine === selectedMachine;
      if (matchesLine && matchesMachine && p.section === currentSec) {
        return { ...p, section: '' };
      }
      return p;
    });
    savePoints(updatedPoints);
    setSelectedSection('All');
  };

  const handlePrint = () => {
    setIsPrintModalOpen(true);
  };

  const handleModuleUpdate = (updatedMod: MachineModule) => {
    saveActiveLayout(activeLayout.map(m => m.id === updatedMod.id ? updatedMod : m));
    setEditingModule(null);
  };

  const handleModuleDelete = (id: string) => {
    if (confirm("Är du säker på att du vill ta bort denna maskinenhet?")) {
      saveActiveLayout(activeLayout.filter(m => m.id !== id));
      setEditingModule(null);
    }
  };

  const handleMapClick = (x: number, y: number) => {
    if (isDesignMode && selectedPoint) {
      const updatedPoints = points.map(p => 
        p.id === selectedPoint.id ? { ...p, coordinates: { x, y } } : p
      );
      savePoints(updatedPoints);
      setSelectedPoint({ ...selectedPoint, coordinates: { x, y } });
    }
  };

  const handlePointClick = (point: MachinePoint) => {
    if (isDesignMode) {
      setSelectedPoint(point.id === selectedPoint?.id ? null : point);
    } else {
      setSelectedPoint(point);
    }
  };

  const currentPrintDate = new Date().toLocaleString('sv-SE', { dateStyle: 'long', timeStyle: 'short' });

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center w-full h-full ${theme === 'dark' ? 'bg-gray-950' : 'bg-[#F8FAFC]'}`}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-400 font-black uppercase tracking-widest text-xs">Laddar Systemdata...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-row w-full h-full ${theme === 'dark' ? 'bg-gray-950 text-gray-100' : 'bg-[#F8FAFC] text-[#0F172A]'} overflow-hidden font-sans print:overflow-visible transition-colors duration-300`}>
      
      {/* Sidebar / Mobile Nav */}
      <aside className={`
        fixed bottom-0 left-0 right-0 h-16 ${theme === 'dark' ? 'bg-black border-gray-900' : 'bg-white border-[#E2E8F0]'} border-t flex flex-row justify-around items-center z-40 print:hidden
        md:relative md:h-auto md:border-r md:border-t-0 md:flex-col md:justify-between md:items-stretch
        ${isSidebarCollapsed ? 'md:w-20' : 'md:w-64'}
        transition-[width] duration-300 shadow-2xl
      `}>
        <div className="hidden md:block">
          <div className={`h-20 flex items-center px-5 border-b ${theme === 'dark' ? 'border-gray-900' : 'border-[#E2E8F0]'} relative`}>
             <div className="flex items-center overflow-hidden">
               <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center font-black text-2xl italic shadow-lg shrink-0 text-white">C</div>
               {!isSidebarCollapsed && <span className={`ml-3 font-black text-xl italic uppercase tracking-tighter ${theme === 'dark' ? 'text-white' : 'text-[#0F172A]'}`}>Centerline</span>}
             </div>
             
             <button 
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsSidebarCollapsed(!isSidebarCollapsed);
                }} 
                className={`absolute -right-3.5 top-7 w-7 h-7 ${theme === 'dark' ? 'bg-gray-800 text-gray-400 hover:text-white border-gray-700' : 'bg-white text-gray-500 hover:text-[#0F172A] border-[#E2E8F0]'} rounded-full border shadow-lg flex items-center justify-center z-[100] transition-all hover:scale-110 active:scale-95 cursor-pointer group`}
                title={isSidebarCollapsed ? "Öppna meny" : "Stäng meny"}
              >
               <div className="transition-transform duration-300 group-hover:scale-110">
                 {isSidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
               </div>
             </button>
          </div>
          
          <nav className="p-3 space-y-2 mt-4">
            {[
              { id: 'overview', icon: Map, label: 'Karta' },
              { id: 'phasing', icon: Activity, label: 'Synk' },
              { id: 'history', icon: History, label: 'Historik' },
              { id: 'guide', icon: BookOpen, label: 'Guide' }
            ].map((tab) => (
              <button 
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)} 
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === tab.id ? 'bg-blue-600 text-white shadow-lg' : (theme === 'dark' ? 'text-gray-500 hover:bg-gray-900' : 'text-slate-500 hover:bg-slate-100')}`}
              >
                <tab.icon size={20} className="shrink-0" />
                {!isSidebarCollapsed && <span className="font-bold">{tab.label}</span>}
              </button>
            ))}
            
            <div className={`pt-4 mt-4 border-t ${theme === 'dark' ? 'border-gray-900' : 'border-[#E2E8F0]'} space-y-2`}>
              <button 
                onClick={() => { setIsDesignMode(!isDesignMode); setSelectedPoint(null); }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${isDesignMode ? 'bg-amber-600 text-black shadow-lg' : (theme === 'dark' ? 'text-gray-500 hover:bg-gray-900' : 'text-slate-500 hover:bg-slate-100')}`}
              >
                <Edit3 size={20} className="shrink-0" />
                {!isSidebarCollapsed && <span className="font-bold">{isDesignMode ? 'Lås Layout' : 'Redigera'}</span>}
              </button>
              
              <button 
                onClick={handlePrint} 
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${theme === 'dark' ? 'text-gray-500 hover:bg-gray-900 hover:text-white' : 'text-slate-500 hover:bg-slate-100 hover:text-[#0F172A]'}`}
              >
                <Printer size={20} className="shrink-0" />
                {!isSidebarCollapsed && <span className="font-bold">Skriv ut / PDF</span>}
              </button>
            </div>
          </nav>
        </div>

        {/* Mobile Navigation */}
        <nav className="flex md:hidden w-full justify-around items-center h-full px-1 overflow-x-auto no-scrollbar">
            {[
              { id: 'overview', icon: Map, label: 'Karta' },
              { id: 'phasing', icon: Activity, label: 'Synk' },
              { id: 'history', icon: History, label: 'Historik' },
              { id: 'guide', icon: BookOpen, label: 'Guide' }
            ].map((tab) => (
              <button 
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)} 
                className={`flex flex-col items-center justify-center min-w-[50px] p-1 rounded-lg transition-all ${activeTab === tab.id ? 'text-blue-500' : 'text-gray-500'}`}
              >
                <tab.icon size={20} />
                <span className="text-[9px] font-bold mt-1">{tab.label}</span>
              </button>
            ))}
             <button 
                onClick={handlePrint} 
                className="flex flex-col items-center justify-center min-w-[50px] p-1 rounded-lg text-gray-500"
              >
                <Printer size={20} />
                <span className="text-[9px] font-bold mt-1">Print</span>
             </button>
             <button 
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} 
                className="flex flex-col items-center justify-center min-w-[50px] p-1 rounded-lg text-gray-500"
                title={theme === 'dark' ? "Byt till ljust tema" : "Byt till mörkt tema"}
              >
                {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
                <span className="text-[9px] font-bold mt-1">{theme === 'dark' ? 'Ljust' : 'Mörkt'}</span>
             </button>
             <button onClick={() => setIsSettingsOpen(true)} className="flex flex-col items-center justify-center min-w-[50px] p-1 rounded-lg text-gray-500">
                <Settings size={20} />
                <span className="text-[9px] font-bold mt-1">Inställn.</span>
             </button>
        </nav>

        <div className={`hidden md:block p-3 border-t ${theme === 'dark' ? 'border-gray-800' : 'border-[#E2E8F0]'} space-y-2`}>
           {/* Firebase Autentisering & Synk-status */}
           <div className={`px-4 py-2.5 rounded-xl border ${theme === 'dark' ? 'border-gray-950 bg-gray-950/40 text-gray-400' : 'border-[#E2E8F0] bg-slate-50/50 text-slate-500'} text-xs`}>
             {!isSidebarCollapsed ? (
               <div className="space-y-2">
                 <div className="flex items-center justify-between">
                   <span className="font-semibold select-none">Synk:</span>
                   <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono leading-none font-bold ${
                     dbStatus === 'connected' ? 'bg-emerald-500/10 text-emerald-500' :
                     dbStatus === 'loading' ? 'bg-amber-500/10 text-amber-500 animate-pulse' :
                     'bg-gray-500/10 text-gray-400'
                   }`}>
                     {dbStatus === 'connected' ? 'AKTIV' : dbStatus === 'loading' ? 'LADDAR' : 'OFFLINE'}
                   </span>
                 </div>
                 {currentUser ? (
                   <div className="space-y-1.5 pt-1.5 border-t border-dashed border-gray-200 dark:border-gray-800">
                     <p className={`font-mono text-[10px] truncate ${theme === 'dark' ? 'text-gray-300' : 'text-slate-700'}`} title={currentUser.email || ''}>
                       {currentUser.displayName || currentUser.email || 'Användare'}
                     </p>
                     <button
                       onClick={() => dbService.logout()}
                       className="text-red-500 hover:text-red-600 font-bold transition-all bg-transparent border-0 p-0 text-[10px] block cursor-pointer uppercase tracking-wider"
                     >
                       Koppla från
                     </button>
                   </div>
                 ) : (
                   <button
                     onClick={() => dbService.signInWithGoogle()}
                     className={`w-full flex items-center justify-center gap-2 mt-1 py-1.5 px-3 rounded-lg font-bold text-[10px] transition-all cursor-pointer uppercase tracking-wider ${
                       theme === 'dark' 
                         ? 'bg-[#1E293B] hover:bg-[#334155] text-white border border-gray-800' 
                         : 'bg-[#F1F5F9] hover:bg-[#E2E8F0] text-slate-700 border border-slate-200 shadow-sm'
                     }`}
                   >
                     <span>Logga in</span>
                   </button>
                 )}
               </div>
             ) : (
               <div className="flex justify-center" title={currentUser ? `Inloggad: ${currentUser.email}` : "Klicka för att logga in"}>
                 {currentUser ? (
                   <div onClick={() => dbService.logout()} className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center text-[10px] text-white font-bold cursor-pointer hover:bg-red-500 transition-colors">
                     {currentUser.email ? currentUser.email[0].toUpperCase() : 'U'}
                   </div>
                 ) : (
                   <button 
                     onClick={() => dbService.signInWithGoogle()} 
                     className={`p-1.5 rounded transition-all border-0 cursor-pointer ${theme === 'dark' ? 'bg-[#1E293B] text-gray-400' : 'bg-slate-200 text-slate-600'}`}
                   >
                     <Activity size={14} />
                   </button>
                 )}
               </div>
             )}
           </div>

           <button 
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} 
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${theme === 'dark' ? 'text-gray-500 hover:text-white hover:bg-gray-900' : 'text-slate-500 hover:text-[#0F172A] hover:bg-slate-100'}`}
              title={theme === 'dark' ? "Byt till ljust tema" : "Byt till mörkt tema"}
           >
              {theme === 'dark' ? <Sun size={20} className="shrink-0" /> : <Moon size={20} className="shrink-0" />}
              {!isSidebarCollapsed && <span className="font-bold">{theme === 'dark' ? 'Ljust tema' : 'Mörkt tema'}</span>}
           </button>
           <button onClick={() => setIsSettingsOpen(true)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${theme === 'dark' ? 'text-gray-500 hover:text-white hover:bg-gray-900' : 'text-slate-500 hover:text-[#0F172A] hover:bg-slate-100'}`}>
              <Settings size={20} className="shrink-0" />
              {!isSidebarCollapsed && <span className="font-bold">Inställningar</span>}
           </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className={`flex-1 flex flex-col min-w-0 ${theme === 'dark' ? 'bg-gray-950' : 'bg-[#F8FAFC]'} overflow-y-auto relative print:overflow-visible pb-20 md:pb-0 transition-colors duration-300`}>
        
        {/* DEN FASTA RAMEN (Visas på varje sida vid utskrift) */}
        <div className="print-frame-fixed"></div>

        {/* ISO PRINT FOOTER (Visas på varje sida längst ner) */}
        <div className="hidden print:flex fixed bottom-0 left-0 right-0 h-[12mm] bg-white z-[10000] border-t-2 border-black items-center justify-between px-10 text-[10px] font-mono uppercase tracking-wider">
          <div className="flex gap-4">
            <span className="font-bold">{translations.sv.documentId}:</span> {docMetadata.id}
            <span className="text-gray-400">|</span>
            <span className="font-bold">{translations.sv.version}:</span> {docMetadata.version}
            <span className="text-gray-400">|</span>
            <span className="font-bold">{translations.sv.date}:</span> {docMetadata.validFrom}
          </div>
          <div className="flex gap-4">
            <span className="font-bold">{translations.sv.issued}:</span> {docMetadata.issuedBy || '___________'}
            <span className="text-gray-400">|</span>
            <span className="font-bold">{translations.sv.approved}:</span> {docMetadata.approvedBy || '___________'}
          </div>
        </div>

        <div className="max-w-6xl mx-auto w-full p-6 lg:p-10 space-y-8 print:max-w-none print:p-0 print:block">
          
          {/* NY PRINT-HEADER (Endast sida 1, fungerar som "topp-kant" för ramen) */}
          <div className="hidden print:flex bg-[#0070C0] text-white p-8 justify-between items-center mb-6 rounded-none -mx-[12mm]">
            <div className="flex flex-col">
              <span className="text-4xl font-black uppercase italic tracking-tighter print-header-text">{translations.sv.printHeaderTitle}</span>
              <span className="text-xs font-black uppercase tracking-[0.3em] opacity-80 print-header-text">{translations.sv.printHeaderSubtitle}</span>
            </div>
            {logoUrl && (
              <div className="h-16 w-56 flex items-center justify-end">
                <img src={logoUrl} className="max-h-full max-w-full object-contain" alt="Logo" />
              </div>
            )}
          </div>

          <header className={`flex justify-between items-end border-b ${theme === 'dark' ? 'border-gray-800' : 'border-[#E2E8F0]'} pb-6 print:hidden`}>
            <div>
              <h1 className={`text-3xl font-black uppercase italic tracking-tighter ${theme === 'dark' ? 'text-white' : 'text-[#0F172A]'} print:text-4xl`}>{translations.sv.headerTitle}</h1>
              <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.3em] mt-1 italic">{translations.sv.headerSubtitle}</p>
            </div>

            {/* Mobile Layout Edit Switch */}
            <div className="md:hidden self-center">
              <button
                onClick={() => { setIsDesignMode(!isDesignMode); setSelectedPoint(null); }}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[10px] font-slate uppercase font-black tracking-wider transition-all shadow-md cursor-pointer ${
                  isDesignMode
                    ? 'bg-amber-600 hover:bg-amber-500 text-black font-sans'
                    : (theme === 'dark' ? 'bg-[#1E293B] hover:bg-[#334155] text-gray-350 border border-gray-800' : 'bg-[#F1F5F9] hover:bg-[#E2E8F0] text-slate-755 border border-slate-200')
                }`}
                title={isDesignMode ? "Lås layout" : "Redigera layout (Flytta punkter)"}
              >
                <Edit3 size={12} />
                <span>{isDesignMode ? 'LÅS' : 'REDIGERA'}</span>
              </button>
            </div>
            
            <div className="hidden print:block text-right">
              <p className="text-sm font-black uppercase tracking-widest">{currentPrintDate}</p>
            </div>

            {/* Save Status Indicator */}
            {!isLoading && (saveStatus !== 'idle' || hasUnsavedChanges) && (
              <div className="fixed top-6 right-6 z-[100] animate-in fade-in slide-in-from-top-4 duration-300">
                <div className={`px-4 py-2 rounded-full shadow-2xl border flex items-center gap-3 ${
                  saveStatus === 'saving' ? 'bg-blue-600 border-blue-500 text-white' :
                  saveStatus === 'success' ? 'bg-emerald-600 border-emerald-500 text-white' :
                  saveStatus === 'error' ? 'bg-red-600 border-red-500 text-white' :
                  'bg-amber-600 border-amber-500 text-white'
                }`}>
                  {saveStatus === 'saving' && <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                  {saveStatus === 'success' && <div className="w-2 h-2 bg-white rounded-full animate-pulse" />}
                  {hasUnsavedChanges && saveStatus === 'idle' && <div className="w-2 h-2 bg-white rounded-full animate-bounce" />}
                  <span className="text-[10px] font-black uppercase tracking-widest">
                    {saveStatus === 'saving' ? translations.sv.saving : 
                     saveStatus === 'success' ? (currentUser && currentUser.emailVerified ? translations.sv.saved : 'Sparat lokalt!') : 
                     saveStatus === 'error' ? translations.sv.saveError : 
                     'Väntar på att spara...'}
                  </span>
                </div>
              </div>
            )}
          </header>

          <div className="space-y-12 print:space-y-10">
            {/* FABRIKSHIERARKI OCH CL-PROGRAM NAVIGERING */}
            <div className={`p-6 ${theme === 'dark' ? 'bg-gray-900 border-gray-800' : 'bg-slate-50 border-slate-200'} rounded-[2rem] border transition-all duration-300 print:hidden`}>
              <div className="flex flex-col gap-6">
                <div className="flex justify-between items-center flex-wrap gap-4">
                  <div>
                    <h3 className={`text-sm font-black uppercase tracking-wider ${theme === 'dark' ? 'text-gray-200' : 'text-slate-800'}`}>
                      Fabrikshierarki & Centerline-program
                    </h3>
                    <p className={`text-[11px] ${theme === 'dark' ? 'text-gray-400' : 'text-slate-500'} mt-1`}>
                      Välj Linje, Maskin och Sektion i fabriksstrukturen. Aktivt CL-program styr automatiskt alla centerline-börvärden för operatörer och tekniker.
                    </p>
                  </div>
                  {isDesignMode && (
                    <button
                      onClick={() => setIsHierarchyOpen(true)}
                      className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-lg active:scale-95 transition-all cursor-pointer shrink-0"
                    >
                      <Plus size={14} /> Hantera Fabriksstruktur & Program
                    </button>
                  )}
                </div>

                {/* Hierarkiska Dropdowns */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {/* 1. Produktionslinje (Parent) */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between items-center h-[18px]">
                      <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-gray-400">1. Produktionslinje</label>
                    </div>
                    <CustomSelect
                      value={selectedLine}
                      onChange={(val) => {
                        setSelectedLine(val);
                        const machlist = machines[val] || [];
                        const firstMachine = machlist[0] || '';
                        setSelectedMachine(firstMachine);
                        setSelectedSection('All');
                        const currentRecs = recipes[firstMachine] || (firstMachine === 'Packmaskin (Tray Packer - Pilot)' ? DEFAULT_RECIPES : []);
                        setActiveRecipe(currentRecs[0] || '');
                      }}
                      options={lines.map(line => ({ value: line.id, label: line.name }))}
                      placeholder="Välj linje..."
                      variant="filter"
                      className="w-full"
                    />
                  </div>

                  {/* 2. Maskin (Child till Linje) */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between items-center h-[18px]">
                      <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-gray-400">2. Maskinenhet</label>
                    </div>
                    <CustomSelect
                      value={selectedMachine}
                      onChange={(val) => {
                        setSelectedMachine(val);
                        setSelectedSection('All');
                        const currentRecs = recipes[val] || (val === 'Packmaskin (Tray Packer - Pilot)' ? DEFAULT_RECIPES : []);
                        setActiveRecipe(currentRecs[0] || '');
                      }}
                      options={(machines[selectedLine] || []).map(mach => ({ value: mach, label: mach }))}
                      placeholder="Välj maskin..."
                      variant="filter"
                      className="w-full"
                    />
                  </div>

                  {/* 3. Sektion (Child till Maskin) */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between items-center h-[18px]">
                      <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-gray-400">3. Maskinsektion</label>
                    </div>
                    <CustomSelect
                      value={selectedSection}
                      onChange={(val) => setSelectedSection(val)}
                      options={[
                        { value: 'All', label: 'Alla sektioner' },
                        ...(sections[selectedMachine] || []).map(sec => ({ value: sec, label: sec }))
                      ]}
                      placeholder="Välj sektion..."
                      variant="filter"
                      className="w-full"
                    />
                  </div>

                  {/* 4. CL-program (Recept/Format under Hierarki) */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between items-center h-[18px]">
                      <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-gray-400">4. CL-program (Format)</label>
                    </div>
                    <CustomSelect
                      value={activeRecipe}
                      onChange={(val) => setActiveRecipe(val)}
                      options={activeMachineRecipes.map(r => ({ value: r, label: r }))}
                      placeholder="Välj CL-program..."
                      variant="filter"
                      className="w-full"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* MASKINSKISS / KARTA */}
            <section className={`${activeTab === 'overview' ? 'block' : 'print:block hidden'} print:break-inside-avoid print:mb-10`}>
              {isDesignMode && selectedMachine && (
                <div className="flex flex-wrap gap-3 mb-4 animate-in slide-in-from-top duration-300">
                  <button 
                    onClick={() => {
                      const newId = `m${Date.now()}`;
                      const newModule: MachineModule = {
                        id: newId,
                        label: 'NY ENHET',
                        x: 40,
                        y: 20,
                        width: 15,
                        height: 10,
                        color: '#3b82f6',
                        hasFill: false,
                        fontSize: 2,
                        wrapText: false
                      };
                      saveActiveLayout([...activeLayout, newModule]);
                      setEditingModule(newModule);
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg transition-all"
                  >
                    <Square size={14} /> {translations.sv.addMachinePart}
                  </button>
                  <button 
                    onClick={() => setIsAddingPoint(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg transition-all"
                  >
                    <Crosshair size={14} /> {translations.sv.addPoint}
                  </button>
                  <button 
                    onClick={() => setIsSettingsOpen(true)}
                    className={`flex items-center gap-2 px-4 py-2 ${theme === 'dark' ? 'bg-gray-800 hover:bg-gray-700 text-gray-300 border-gray-700' : 'bg-white hover:bg-slate-50 text-slate-600 border-[#E2E8F0]'} rounded-xl font-black text-[10px] uppercase tracking-widest border transition-all`}
                  >
                    <ImageIcon size={14} /> {translations.sv.changeBackground}
                  </button>
                </div>
              )}

              {/* INTEGRERAD DYNAMISK MASKINKARTA */}
              <div className={`${theme === 'dark' ? 'bg-gray-900 border-gray-800' : 'bg-white border-[#E2E8F0]'} rounded-[2.5rem] p-2 border shadow-2xl relative overflow-hidden transition-colors duration-300`}>
                <MachineMap 
                  points={(() => {
                    const disp = points.filter(p => {
                      const matchesLine = !p.lineId || p.lineId === selectedLine;
                      const matchesMachine = !p.machine || p.machine === selectedMachine || 
                        (selectedMachine === 'Packmaskin (Tray Packer - Pilot)' && !p.machine);
                      const matchesSection = selectedSection === 'All' || p.section === selectedSection;
                      return matchesLine && matchesMachine && matchesSection;
                    });
                    return disp;
                  })()} 
                  layout={activeLayout}
                  onPointClick={handlePointClick}
                  onModuleClick={isDesignMode ? setEditingModule : undefined}
                  onMapClick={isDesignMode ? handleMapClick : undefined}
                  onLayoutChange={saveActiveLayout}
                  selectedPointId={selectedPoint?.id}
                  customMapUrl={activeMapUrl}
                  editMode={isDesignMode}
                  theme={theme}
                />
              </div>
            </section>
                
            {/* UNIFIERAD PARAMETERTABELL */}
            <section className={`${activeTab === 'overview' ? 'block' : 'print:block hidden'} print:mt-10`}>
              <ParameterTable 
                points={(() => {
                  const disp = points.filter(p => {
                    const matchesLine = !p.lineId || p.lineId === selectedLine;
                    const matchesMachine = !p.machine || p.machine === selectedMachine || 
                      (selectedMachine === 'Packmaskin (Tray Packer - Pilot)' && !p.machine);
                    const matchesSection = selectedSection === 'All' || p.section === selectedSection;
                    return matchesLine && matchesMachine && matchesSection;
                  });
                  return [...disp].sort((a, b) => a.number - b.number);
                })()} 
                sections={sections[selectedMachine] || []}
                activeRecipe={activeRecipe}
                sectionFilter={selectedSection}
                onSectionFilterChange={setSelectedSection}
                onPointSelect={setSelectedPoint} 
                onUpdatePoint={handleUpdatePointAndLog}
                getQrUrl={getQrCodeUrl} 
                theme={theme}
              />
            </section>

            {/* Skärm-specifika flikar */}
            <div className="print:hidden">
              {activeTab === 'phasing' && <PhasingGauge currentDegree={0} points={points} theme={theme} />}
              {activeTab === 'history' && (
                <HistoryView 
                  points={points.filter(p => {
                    const matchesLine = !p.lineId || p.lineId === selectedLine;
                    const matchesMachine = !p.machine || p.machine === selectedMachine || 
                      (selectedMachine === 'Packmaskin (Tray Packer - Pilot)' && !p.machine);
                    return matchesLine && matchesMachine;
                  })}
                  pointHistory={pointHistory}
                  sections={sections[selectedMachine] || []}
                  theme={theme}
                  selectedLineName={lines.find(l => l.id === selectedLine)?.name || selectedLine}
                  selectedMachineName={selectedMachine}
                />
              )}
              {activeTab === 'guide' && (
                <Guide 
                  theme={theme} 
                  definitions={definitions} 
                  onUpdateDefinition={(type, updated) => {
                    const newDefs = { ...definitions, [type]: updated };
                    saveDefinitions(newDefs);
                  }}
                  isDesignMode={isDesignMode}
                />
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Modaler & Overlays */}
      {isAddingPoint && (
        <AddPointForm 
          existingPoints={points} 
          layout={activeLayout} 
          recipes={activeMachineRecipes}
          lines={lines}
          machines={machines}
          sections={sections}
          defaultLineId={selectedLine}
          defaultMachine={selectedMachine}
          defaultSection={selectedSection}
          onSave={(p) => { 
            savePoints([...points, p]); 
            if (p.lineId) setSelectedLine(p.lineId);
            if (p.machine) setSelectedMachine(p.machine);
            if (p.section) setSelectedSection(p.section);
            setIsAddingPoint(false); 
          }} 
          onCancel={() => setIsAddingPoint(false)} 
          theme={theme}
        />
      )}
      {editingPoint && (
        <AddPointForm 
          existingPoints={points} 
          layout={activeLayout} 
          recipes={activeMachineRecipes}
          initialData={editingPoint} 
          lines={lines}
          machines={machines}
          sections={sections}
          defaultLineId={selectedLine}
          defaultMachine={selectedMachine}
          defaultSection={selectedSection}
          onSave={(p) => { 
            savePoints(points.map(x => x.id === editingPoint.id ? p : x)); 
            if (p.lineId) setSelectedLine(p.lineId);
            if (p.machine) setSelectedMachine(p.machine);
            if (p.section) setSelectedSection(p.section || 'All');
            setEditingPoint(null); 
            setSelectedPoint(p); 
          }} 
          onCancel={() => { setEditingPoint(null); setSelectedPoint(editingPoint); }} 
          theme={theme}
        />
      )}
      {editingModule && (
        <ModuleEditor 
          module={editingModule}
          onSave={handleModuleUpdate}
          onDelete={handleModuleDelete}
          onClose={() => setEditingModule(null)}
          theme={theme}
        />
      )}
      {isPrintModalOpen && (
        <PrintModal
          metadata={docMetadata}
          onPrint={(updatedMetadata) => {
            setDocMetadata(updatedMetadata);
            setIsPrintModalOpen(false);
            // Wait for state update and modal close before printing
            setTimeout(() => window.print(), 100);
          }}
          onClose={() => setIsPrintModalOpen(false)}
          theme={theme}
        />
      )}
       {isSettingsOpen && (
        <SettingsModal 
          currentMapUrl={activeMapUrl} 
          currentLogoUrl={logoUrl}
          currentPublicUrl={publicBaseUrl}
          currentMetadata={docMetadata}
          isDesignMode={isDesignMode}
          onToggleDesignMode={() => {
            setIsDesignMode(!isDesignMode);
            setSelectedPoint(null);
          }}
          currentUser={currentUser}
          onSignInWithGoogle={() => dbService.signInWithGoogle()}
          onLogout={() => dbService.logout()}
          dbStatus={dbStatus}
          onSave={(s) => { 
            // Save machine-specific background
            setMachineBackgrounds(prev => {
              const u = { ...prev, [selectedMachine]: s.mapUrl || '' };
              try {
                localStorage.setItem('centerline_machine_backgrounds', JSON.stringify(u));
              } catch (e) {
                console.error("Failed to save centerline_machine_backgrounds to local storage:", e);
              }
              return u;
            });
            // Legacy/Pilot backward compatibility fallback
            if (selectedMachine === 'Packmaskin (Tray Packer - Pilot)') {
              setCustomMapUrl(s.mapUrl);
              try {
                localStorage.setItem('centerline_map_url', s.mapUrl || '');
              } catch (e) {
                console.error("Failed to save centerline_map_url to local storage:", e);
              }
            }
            setLogoUrl(s.logoUrl);
            setPublicBaseUrl(s.publicUrl); 
            setDocMetadata(s.metadata);
            try {
              localStorage.setItem('centerline_logo_url', s.logoUrl || '');
              localStorage.setItem('centerline_public_url', s.publicUrl || '');
            } catch (e) {
              console.error("Failed to save settings to local storage:", e);
            }
          }} 
          onClose={() => setIsSettingsOpen(false)} 
          theme={theme}
        />
      )}
      {isHierarchyOpen && (
        <HierarchyManagerModal
          theme={theme}
          lines={lines}
          machines={machines}
          sections={sections}
          recipes={recipes}
          layouts={layouts}
          activeRecipe={activeRecipe}
          points={points}
          onUpdateLines={setLines}
          onUpdateMachines={setMachines}
          onUpdateSections={setSections}
          onUpdateRecipes={setRecipes}
          onUpdateLayouts={setLayouts}
          onUpdatePoints={savePoints}
          onSelectLine={setSelectedLine}
          onSelectMachine={setSelectedMachine}
          onSelectSection={setSelectedSection}
          onSelectRecipe={setActiveRecipe}
          selectedLine={selectedLine}
          selectedMachine={selectedMachine}
          selectedSection={selectedSection}
          onClose={() => setIsHierarchyOpen(false)}
        />
      )}
      {selectedPoint && !editingPoint && !isDesignMode && (
        <PointDetail 
          point={selectedPoint} 
          activeRecipe={activeRecipe}
          pointHistory={pointHistory}
          onRegisterValue={handleRegisterValue}
          onUpdate={(p) => {
            savePoints(points.map(x => x.id === p.id ? p : x));
            setSelectedPoint(p);
          }} 
          onEdit={() => { setEditingPoint(selectedPoint); setSelectedPoint(null); }} 
          onClose={() => setSelectedPoint(null)} 
          theme={theme}
        />
      )}
    </div>
  );
};

export default App;
