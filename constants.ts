
import { MachinePoint, Criticality, MachineModule, DefinitionDetail } from './types';

export const DEFAULT_RECIPES: string[] = [
  'Standard 24-Pack',
  'Slim 12-Pack',
  'Promo 4-Pack'
];

export const DEFAULT_DEFINITIONS: Record<string, DefinitionDetail> = {
  'CL': {
    type: 'CL',
    label: 'Centerline (CL)',
    desc: 'Justerbara processparametrar som övervakas och styrs mot standardvärden för att kontrollera utdatat.',
    color: 'text-blue-600 dark:text-blue-300',
    visual: 'https://images.unsplash.com/photo-1581092160562-40aa08e78837?auto=format&fit=crop&q=80&w=400',
    whatIsIt: 'En centerline är en inställning som operatören enkelt kan läsa av, övervaka och justera under skiftet. Varje CL har ett bestämt börvärde (target) samt övre och undre tillåtna gränser (t.ex. tryck, temperatur eller hastighet).',
    responsibility: 'Att styra rätt värde på skärmen/mätaren och hålla dem inom målområdet. Genom proaktiv kontroll (att ligga stabilt på målvärdet) stoppar vi fel och variation innan produkten påverkas.',
  },
  'CPE': {
    type: 'CPE',
    label: 'CPE (Critical Physical Element)',
    desc: 'Fysiska eller kemiska referenspunkter i utrustningen som definierar maskinens sanna tillstånd.',
    color: 'text-orange-600 dark:text-orange-300',
    visual: 'https://images.unsplash.com/photo-1537462715879-360eeb61a0ad?auto=format&fit=crop&q=80&w=400',
    whatIsIt: 'Det sanna fysiska värdet inuti maskinen som utför omvandlingsarbetet. Det representerar det verkliga, millimeterprecision-avståndet mellan t.ex. två valsar eller knivar.',
    responsibility: 'Att mäta och verifiera verkliga fysiska mått. Om ditt HMI (skärmen) visar rätt men det fysiska avståndet inuti maskinen är felaktigt, är styrsystemet ur kalibrering och måste justeras.',
  },
  'Static': {
    type: 'Static',
    label: 'Static CL',
    desc: 'Mekaniska inställningar som utförs och låses vid stillastående eller formatbyten (SKU changeover).',
    color: 'text-gray-600 dark:text-gray-300',
    visual: 'https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?auto=format&fit=crop&q=80&w=400',
    whatIsIt: 'Mekaniska justeringar (t.ex. linjaler, spännverktyg, mekaniska anhåll) som ställs in under ett stopp eller i samband med ett storleksbyte.',
    responsibility: 'Att under stopp ställa in fysiska skalor, linjaler och räkneverk (t.ex. Seiko-räkneverk) enligt produktstandarden, samt låsa dem ordentligt så att de inte förskjuts under drift.',
  },
  'Dynamic': {
    type: 'Dynamic',
    label: 'Dynamic CL',
    desc: 'Processvärden som ständigt ändrar sig och övervakas kontinuerligt eller i fasta intervall medan linjen producerar.',
    color: 'text-cyan-600 dark:text-cyan-300',
    visual: 'https://images.unsplash.com/photo-1551288049-bbbda546697a?auto=format&fit=crop&q=80&w=400',
    whatIsIt: 'Variabla processvärden (t.ex. lufttryck, limflöde, temperaturer, vakuumnivåer) som ständigt förändras under drift och mäts regelbundet under skiftet.',
    responsibility: 'Övervaka processens flöde genom att läsa av mätare kontinuerligt och justera vid upptäckt av avvikelse, för att agera proaktivt innan toleransgränsen nås.',
  },
  'Setpoint': {
    type: 'Setpoint',
    label: 'Setpoint',
    desc: 'Receptstyrda digitala värden sparade direkt i styrsystemet (HMI/PLC).',
    color: 'text-purple-600 dark:text-purple-300',
    visual: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&q=80&w=400',
    whatIsIt: 'De mjukvarustyrda värden i styrsystemet som sparas under ett specifikt recept och laddas in automatiskt i HMI/PLC vid en produktomställning.',
    responsibility: 'Verifiera att de inlästa PLC-värdena stämmer överens mot fastställd standard. Kritiska setpoints får under inga omständigheter ändras utan formell riskbedömning och godkännande (TDP).',
  },
  'Condition': {
    type: 'Condition',
    label: 'Condition (CIL)',
    desc: 'Maskinens grundkondition (BSC - Basic Standard Conditions) som säkras genom CIL-rutiner.',
    color: 'text-green-600 dark:text-green-300',
    visual: 'https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?auto=format&fit=crop&q=80&w=400',
    whatIsIt: 'Maskinens grundskick som bevaras genom CIL (Clean, Inspect, Lubricate). Rent maskintillstånd möjliggör upptäckt av slitage och förhindrar oväntade friktioner eller glapp.',
    responsibility: 'Utföra förebyggande och schemalagda CIL-instruktioner. Kom ihåg: utan ett stabilt grundskick (BSC) kommer det aldrig att spela någon roll hur noga vi ställer in våra Centerlines - CIL är grundförutsättningen.',
  }
};

export const DEFAULT_MACHINE_LAYOUT: MachineModule[] = [
  { id: 'm1', label: 'Inmatning (1-2)', x: 0, y: 15, width: 20, height: 12, color: '#3b82f6', hasFill: false },
  { id: 'm2', label: 'Separator (3-4)', x: 20, y: 15, width: 15, height: 12, color: '#6366f1', hasFill: false },
  { id: 'm3', label: 'Magasin (13)', x: 35, y: 32, width: 12, height: 15, color: '#eab308', hasFill: false },
  { id: 'm4', label: 'Formning (5-6)', x: 37, y: 5, width: 25, height: 22, color: '#f97316', hasFill: false },
  { id: 'm5', label: 'Filmlindning (9-10)', x: 62, y: 8, width: 18, height: 18, color: '#ec4899', hasFill: false },
  { id: 'm7', label: 'Filmspole (18)', x: 64, y: 30, width: 14, height: 12, color: '#f472b6', hasFill: false },
  { id: 'm6', label: 'Utmatning (8)', x: 80, y: 15, width: 20, height: 12, color: '#a855f7', hasFill: false }
];

export const MACHINE_POINTS: MachinePoint[] = [
  {
    id: 'LSK-B1',
    number: 1,
    name: 'Skiljeskenor (Vev B)',
    section: 'Inmatning (1-2)',
    description: 'Breddinställning för produktens kanalisering. Justeras med vev B. Se manual fig 7.2.2.',
    targetValue: 'Visare B1 = 142',
    tolerance: '+/- 0.5',
    measureMethod: 'Mekanisk mätare B1',
    criticality: Criticality.P2,
    imagePlaceholder: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&q=80&w=400',
    coordinates: { x: 10, y: 21 },
    phaseAngle: 45,
    visibleOnMap: true,
    recipeTargets: {
      'Standard 24-Pack': { targetValue: 'Visare B1 = 142', tolerance: '+/- 0.5' },
      'Slim 12-Pack': { targetValue: 'Visare B1 = 120', tolerance: '+/- 0.3' },
      'Promo 4-Pack': { targetValue: 'Visare B1 = 95', tolerance: '+/- 0.2' }
    }
  },
  {
    id: 'LSK-I1',
    number: 12,
    name: 'Kartongmatning Höjd (Vev I)',
    section: 'Magasin (13)',
    description: 'Höjdjustering för kartonginmatningen. Justeras med vev I. Se manual fig 7.2.6.',
    targetValue: 'Visare I1 = 45.5',
    tolerance: '+/- 0.2',
    measureMethod: 'Siko-mätare I1',
    criticality: Criticality.P1,
    imagePlaceholder: 'https://images.unsplash.com/photo-1565608411386-35f922754972?auto=format&fit=crop&q=80&w=400',
    coordinates: { x: 38, y: 40 },
    phaseAngle: 90,
    visibleOnMap: true,
    recipeTargets: {
      'Standard 24-Pack': { targetValue: 'Visare I1 = 45.5', tolerance: '+/- 0.2' },
      'Slim 12-Pack': { targetValue: 'Visare I1 = 38.0', tolerance: '+/- 0.1' },
      'Promo 4-Pack': { targetValue: 'Visare I1 = 30.5', tolerance: '+/- 0.1' }
    }
  },
  {
    id: 'LSK-L1',
    number: 13,
    name: 'Kartongmatning Bredd (Vev L)',
    section: 'Magasin (13)',
    description: 'Breddjustering för kartongmagasinets inmatning. Se manual fig 7.2.6.',
    targetValue: 'Visare L1 = 80.0',
    tolerance: '+/- 0.5',
    measureMethod: 'Siko-mätare L1',
    criticality: Criticality.P2,
    imagePlaceholder: 'https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?auto=format&fit=crop&q=80&w=400',
    coordinates: { x: 44, y: 40 },
    phaseAngle: 120,
    visibleOnMap: true,
    recipeTargets: {
      'Standard 24-Pack': { targetValue: 'Visare L1 = 80.0', tolerance: '+/- 0.5' },
      'Slim 12-Pack': { targetValue: 'Visare L1 = 65.0', tolerance: '+/- 0.3' }
    }
  },
  {
    id: 'LSK-M1',
    number: 20,
    name: 'Formverktyg Brickdon (Vev M)',
    section: 'Formning (5-6)',
    description: 'Breddinställning för brickformningsenheten. Se manual fig 7.2.8.',
    targetValue: 'Mätare M1 = 312',
    tolerance: '+/- 0.5',
    measureMethod: 'Mekanisk mätare M1',
    criticality: Criticality.P1,
    imagePlaceholder: 'https://images.unsplash.com/photo-1537462715879-360eeb61a0ad?auto=format&fit=crop&q=80&w=400',
    coordinates: { x: 50, y: 16 },
    phaseAngle: 180,
    visibleOnMap: true
  },
  {
    id: 'LSK-SOL-CC',
    number: 25,
    name: 'Solenoidspel (Spole CC)',
    section: 'Formning (5-6)',
    description: 'Kritiskt mekaniskt spel för manöverorganet (CC). Se manual kap 8.2.',
    targetValue: 'X: 1.5mm / Y: 0.5mm',
    tolerance: '+/- 0.05',
    measureMethod: 'Bladmått',
    criticality: Criticality.P1,
    imagePlaceholder: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&q=80&w=400',
    coordinates: { x: 55, y: 12 },
    visibleOnMap: true
  },
  {
    id: 'LSK-SOL-CA',
    number: 26,
    name: 'Solenoidspel (Spole CA)',
    section: 'Formning (5-6)',
    description: 'Kritiskt mekaniskt spel för manöverorganet (CA). Se manual kap 8.2.',
    targetValue: 'X: 1.8mm / Y: 0.2mm',
    tolerance: '+/- 0.05',
    measureMethod: 'Bladmått',
    criticality: Criticality.P1,
    imagePlaceholder: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&q=80&w=400',
    coordinates: { x: 55, y: 20 },
    visibleOnMap: true
  },
  {
    id: 'LSK-F1',
    number: 4,
    name: 'Filmspole Position',
    section: 'Filmspole (18)',
    description: 'Sidledsjustering av filmspolen på spindeln (placerad under maskinen). Se manual fig 7.2.4.',
    targetValue: 'Mätare F1 = 215',
    tolerance: '+/- 1.0',
    measureMethod: 'Siko-mätare F1',
    criticality: Criticality.P2,
    imagePlaceholder: 'https://images.unsplash.com/photo-1590247813693-5541d1c609fd?auto=format&fit=crop&q=80&w=400',
    coordinates: { x: 71, y: 36 },
    visibleOnMap: true
  },
  {
    id: 'LSK-CB2',
    number: 40,
    name: 'Knivstoppläge CB-2',
    section: 'Filmlindning (9-10)',
    description: 'Minsta tillåtna regleringsgrad för styrlagrets stoppläge i lindningsenheten. Se manual kap 8.4.',
    targetValue: '2.8°',
    tolerance: '+/- 0.1°',
    measureMethod: 'Encoder-position',
    criticality: Criticality.P1,
    imagePlaceholder: 'https://images.unsplash.com/photo-1581092160562-40aa08e78837?auto=format&fit=crop&q=80&w=400',
    coordinates: { x: 71, y: 15 },
    phaseAngle: 2.8,
    visibleOnMap: true
  },
  {
    id: 'LSK-P4',
    number: 55,
    name: 'Filmspänning (Regulator 4)',
    section: 'Filmspole (18)',
    description: 'Tryckinställning för filmbroms/spänning vid spolen under maskinen. Punkt 4 i fig 8.7.2.',
    targetValue: '2.5 Bar',
    tolerance: '+/- 0.2',
    measureMethod: 'Manometer punkt 4',
    criticality: Criticality.P1,
    imagePlaceholder: 'https://images.unsplash.com/photo-1530315592271-bfc71333ef34?auto=format&fit=crop&q=80&w=400',
    coordinates: { x: 73, y: 34 },
    visibleOnMap: true
  }
];

export const CRITICALITY_COLORS = {
  [Criticality.P1]: 'bg-red-600 animate-pulse',
  [Criticality.P2]: 'bg-orange-600',
  [Criticality.P3]: 'bg-blue-600',
};
