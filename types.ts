
export enum Criticality {
  P1 = 'P1: Kritisk (Haveri & Kvalitet)',
  P2 = 'P2: Viktig (Produktivitet & Slitage)',
  P3 = 'P3: Standard (Processoptimering)'
}

export enum PointStatus {
  OK = 'OK',
  TAGGED_RED = 'Röd Tagg (P1)',
  TAGGED_YELLOW = 'Gul Tagg (P2)',
  OUT_OF_SPEC = 'Utanför Standard'
}

export interface MachineModule {
  id: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  hasFill?: boolean;
  fontSize?: number;
  wrapText?: boolean;
}

export interface MachinePoint {
  id: string;
  number: number;
  name: string;
  section: string;
  description: string;
  targetValue: string;
  tolerance: string;
  measureMethod: string;
  criticality: Criticality;
  imagePlaceholder: string;
  imagePlaceholder2?: string;
  videoUrl?: string;
  coordinates: { x: number; y: number };
  visibleOnMap: boolean;
  phaseAngle?: number;
  lastChecked?: string;
  status?: PointStatus;
  tagComment?: string;
  recipeTargets?: Record<string, { targetValue: string; tolerance: string }>;
  lineId?: string;
  machine?: string;
  sectionCoordinates?: { x: number; y: number };
}

export interface DefinitionDetail {
  type: string;
  label: string;
  desc: string;
  color: string;
  visual: string;
  whatIsIt: string;
  responsibility: string;
}

export interface GenerationRequest {
  pointName: string;
  currentValue: string;
  riskContext: string;
}

export interface DocumentMetadata {
  id: string;
  version: string;
  validFrom: string;
  issuedBy: string;
  approvedBy: string;
}

export interface PointHistoryLog {
  id: string;
  lineId: string;
  lineName: string;
  machineName: string;
  pointId: string;
  pointNumber: number;
  pointName: string;
  timestamp: string;
  value: string;
  targetValue: string;
  tolerance: string;
  recipeName: string;
  status: PointStatus;
  comment?: string;
}
