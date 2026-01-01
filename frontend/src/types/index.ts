export interface Station { id: string; name: string; region?: number; lat?: number; lon?: number; }

export interface Train {
  id: string; trainNumber: string; category: TrainCategory; categoryDesc: string;
  operator: Operator; origin: Station; destination: Station;
  departureTime: string; arrivalTime: string; duration: number; delay?: number; status?: TrainStatus;
}

export interface JourneyLeg { train: Train; origin: Station; destination: Station; departureTime: string; arrivalTime: string; platform?: string; }
export interface JourneySolution { id: string; departureTime: string; arrivalTime: string; duration: number; changes: number; legs: JourneyLeg[]; }
export interface Alert { id: string; type: AlertType; title: string; description: string; severity: 'info' | 'warning' | 'critical'; affectedLines?: string[]; affectedStations?: Station[]; startTime?: string; endTime?: string; }
export interface SearchResponse { solutions: JourneySolution[]; alerts?: Alert[]; }

export type TrainCategory = 'FR' | 'FA' | 'FB' | 'IC' | 'ICN' | 'EC' | 'EN' | 'REG' | 'RV' | 'MET' | 'OTHER';
export type Operator = 'trenitalia' | 'trenord' | 'italo' | 'other';
export type TrainStatus = 'scheduled' | 'running' | 'arrived' | 'cancelled' | 'delayed' | 'partially_cancelled';
export type AlertType = 'strike' | 'disruption' | 'engineering_works' | 'delay' | 'cancellation' | 'other';

export const TRAIN_CATEGORIES: Record<string, { name: string; bgColor: string; textColor: string; borderColor?: string }> = {
  FR: { name: 'Frecciarossa', bgColor: 'bg-red-600', textColor: 'text-white' },
  FA: { name: 'Frecciargento', bgColor: 'bg-gray-500', textColor: 'text-white' },
  FB: { name: 'Frecciabianca', bgColor: 'bg-white', textColor: 'text-red-600', borderColor: 'border-red-600' },
  IC: { name: 'Intercity', bgColor: 'bg-blue-600', textColor: 'text-white' },
  ICN: { name: 'Intercity Notte', bgColor: 'bg-blue-800', textColor: 'text-white' },
  EC: { name: 'EuroCity', bgColor: 'bg-purple-600', textColor: 'text-white' },
  EN: { name: 'EuroNight', bgColor: 'bg-purple-800', textColor: 'text-white' },
  REG: { name: 'Regionale', bgColor: 'bg-green-600', textColor: 'text-white' },
  RV: { name: 'Regionale Veloce', bgColor: 'bg-green-500', textColor: 'text-white' },
  MET: { name: 'Metropolitano', bgColor: 'bg-yellow-500', textColor: 'text-black' },
  OTHER: { name: 'Altro', bgColor: 'bg-gray-400', textColor: 'text-white' },
};

export const OPERATORS: Record<string, { name: string; color: string }> = {
  trenitalia: { name: 'Trenitalia', color: 'text-red-600' },
  trenord: { name: 'Trenord', color: 'text-green-600' },
  italo: { name: 'Italo', color: 'text-purple-600' },
  other: { name: 'Altro', color: 'text-gray-600' },
};
