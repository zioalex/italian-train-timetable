// Base Adapter Interface
// All operator adapters (Trenitalia, Trenord, Italo) must implement this interface

import { 
  Station, 
  JourneySolution, 
  Train, 
  TrainStop, 
  Alert,
  SearchParams,
  Operator,
  TrainCategory
} from '../types/index.js';

export interface ITrainAdapter {
  /**
   * Operator identifier
   */
  readonly operator: Operator;

  /**
   * Check if the adapter is available/working
   */
  isAvailable(): Promise<boolean>;

  /**
   * Search for journey solutions between two stations
   */
  searchJourneys(params: SearchParams): Promise<JourneySolution[]>;

  /**
   * Get real-time status of a specific train
   */
  getTrainStatus(trainId: string, originStationId: string): Promise<Train | null>;

  /**
   * Get all stops for a train with real-time updates
   */
  getTrainStops(trainId: string, originStationId: string): Promise<TrainStop[]>;

  /**
   * Search stations by name
   */
  searchStations(query: string): Promise<Station[]>;

  /**
   * Get station details by ID
   */
  getStation(stationId: string): Promise<Station | null>;

  /**
   * Get current alerts/disruptions
   */
  getAlerts(regionId?: number): Promise<Alert[]>;

  /**
   * Get departures from a station
   */
  getDepartures(stationId: string, dateTime?: Date): Promise<Train[]>;

  /**
   * Get arrivals at a station
   */
  getArrivals(stationId: string, dateTime?: Date): Promise<Train[]>;
}

/**
 * Abstract base class with common functionality
 */
export abstract class BaseAdapter implements ITrainAdapter {
  abstract readonly operator: Operator;

  abstract isAvailable(): Promise<boolean>;
  abstract searchJourneys(params: SearchParams): Promise<JourneySolution[]>;
  abstract getTrainStatus(trainId: string, originStationId: string): Promise<Train | null>;
  abstract getTrainStops(trainId: string, originStationId: string): Promise<TrainStop[]>;
  abstract searchStations(query: string): Promise<Station[]>;
  abstract getStation(stationId: string): Promise<Station | null>;
  abstract getAlerts(regionId?: number): Promise<Alert[]>;
  abstract getDepartures(stationId: string, dateTime?: Date): Promise<Train[]>;
  abstract getArrivals(stationId: string, dateTime?: Date): Promise<Train[]>;

  /**
   * Helper to parse train category from string
   */
  protected parseCategory(categoryStr: string): TrainCategory {
    const categoryMap: Record<string, TrainCategory> = {
      'frecciarossa': 'FR',
      'frecciargento': 'FA',
      'frecciabianca': 'FB',
      'intercity': 'IC',
      'intercity notte': 'ICN',
      'eurocity': 'EC',
      'euronight': 'EN',
      'regionale': 'REG',
      'regionale veloce': 'RV',
      'metropolitano': 'MET',
    };

    const lower = categoryStr.toLowerCase();
    for (const [key, value] of Object.entries(categoryMap)) {
      if (lower.includes(key)) return value;
    }
    
    // Try to extract abbreviation
    const abbrev = categoryStr.split(' ')[0].toUpperCase() as TrainCategory;
    if (['FR', 'FA', 'FB', 'IC', 'ICN', 'EC', 'EN', 'REG', 'RV', 'MET'].includes(abbrev)) {
      return abbrev;
    }

    return 'OTHER';
  }

  /**
   * Helper to format duration from minutes
   */
  protected formatDuration(minutes: number): string {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  }

  /**
   * Helper to calculate duration between two dates in minutes
   */
  protected calculateDuration(start: Date, end: Date): number {
    return Math.round((end.getTime() - start.getTime()) / 60000);
  }
}
