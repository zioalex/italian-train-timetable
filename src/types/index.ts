// Shared types for Italian Train Search

export interface Station {
  id: string;           // Station code (e.g., "S01700" for Milano Centrale)
  name: string;         // Station name
  region?: number;      // Region ID
  lat?: number;
  lon?: number;
}

export interface TrainStop {
  station: Station;
  scheduledArrival?: Date;
  scheduledDeparture?: Date;
  actualArrival?: Date;
  actualDeparture?: Date;
  platform?: string;
  actualPlatform?: string;
  delay?: number;       // in minutes
  status: 'scheduled' | 'arrived' | 'departed' | 'cancelled';
}

export interface Train {
  id: string;
  trainNumber: string;
  category: TrainCategory;
  categoryDesc: string;
  operator: Operator;
  origin: Station;
  destination: Station;
  departureTime: Date;
  arrivalTime: Date;
  duration: number;     // in minutes
  delay?: number;       // in minutes
  stops?: TrainStop[];
  status?: TrainStatus;
}

export interface JourneySolution {
  id: string;
  departureTime: Date;
  arrivalTime: Date;
  duration: number;     // in minutes
  changes: number;
  legs: JourneyLeg[];
  price?: PriceInfo;
}

export interface JourneyLeg {
  train: Train;
  origin: Station;
  destination: Station;
  departureTime: Date;
  arrivalTime: Date;
  platform?: string;
}

export interface PriceInfo {
  amount: number;
  currency: string;
  class: string;
}

export interface Alert {
  id: string;
  type: AlertType;
  title: string;
  description: string;
  affectedLines?: string[];
  affectedStations?: Station[];
  startTime?: Date;
  endTime?: Date;
  severity: 'info' | 'warning' | 'critical';
}

export type TrainCategory = 
  | 'FR'    // Frecciarossa
  | 'FA'    // Frecciargento
  | 'FB'    // Frecciabianca
  | 'IC'    // Intercity
  | 'ICN'   // Intercity Notte
  | 'EC'    // EuroCity
  | 'EN'    // EuroNight
  | 'REG'   // Regionale
  | 'RV'    // Regionale Veloce
  | 'MET'   // Metropolitano
  | 'SFM'   // Servizio Ferroviario Metropolitano
  | 'OTHER';

export type Operator = 'trenitalia' | 'trenord' | 'italo' | 'other';

export type TrainStatus = 
  | 'scheduled'
  | 'running'
  | 'arrived'
  | 'cancelled'
  | 'delayed'
  | 'partially_cancelled';

export type AlertType = 
  | 'strike'
  | 'disruption'
  | 'engineering_works'
  | 'delay'
  | 'cancellation'
  | 'other';

// Search parameters
export interface SearchParams {
  from: string;         // Station ID or name
  to: string;           // Station ID or name
  date: Date;
  timeType?: 'departure' | 'arrival';
  operators?: Operator[];
}

// API Response types
export interface SearchResponse {
  solutions: JourneySolution[];
  alerts?: Alert[];
}

export interface StationSearchResponse {
  stations: Station[];
}

export interface TrainStatusResponse {
  train: Train;
  stops: TrainStop[];
  lastUpdate: Date;
}
