// Italo Adapter - Stub for future B2B integration
// Italo doesn't have a public API, so this adapter is prepared for
// when/if a B2B partnership becomes available

import { BaseAdapter } from './base.adapter.js';
import {
  Station,
  JourneySolution,
  Train,
  TrainStop,
  Alert,
  SearchParams,
  Operator,
} from '../types/index.js';

export class ItaloAdapter extends BaseAdapter {
  readonly operator: Operator = 'italo';
  
  private apiKey?: string;
  private apiEndpoint?: string;

  constructor(config?: { apiKey?: string; endpoint?: string }) {
    super();
    this.apiKey = config?.apiKey;
    this.apiEndpoint = config?.endpoint;
  }

  /**
   * Configure API credentials (for future B2B integration)
   */
  configure(apiKey: string, endpoint: string): void {
    this.apiKey = apiKey;
    this.apiEndpoint = endpoint;
  }

  async isAvailable(): Promise<boolean> {
    // Italo B2B API not yet integrated
    return false;
  }

  async searchJourneys(params: SearchParams): Promise<JourneySolution[]> {
    if (!this.isAvailable()) {
      console.log('Italo adapter not available - B2B integration pending');
      return [];
    }

    // TODO: Implement when B2B API is available
    // Expected flow:
    // 1. Authenticate with API key
    // 2. Search journeys with from/to/date
    // 3. Parse response to JourneySolution format
    
    return [];
  }

  async getTrainStatus(trainId: string, originStationId: string): Promise<Train | null> {
    return null;
  }

  async getTrainStops(trainId: string, originStationId: string): Promise<TrainStop[]> {
    return [];
  }

  async searchStations(query: string): Promise<Station[]> {
    // Italo serves major stations only
    // These could be hardcoded or fetched from API
    const italoStations: Station[] = [
      { id: 'NPI', name: 'Napoli Centrale' },
      { id: 'NAF', name: 'Napoli Afragola' },
      { id: 'RMT', name: 'Roma Termini' },
      { id: 'RMT', name: 'Roma Tiburtina' },
      { id: 'FIR', name: 'Firenze S.M.N.' },
      { id: 'BOC', name: 'Bologna Centrale' },
      { id: 'MIC', name: 'Milano Centrale' },
      { id: 'MIR', name: 'Milano Rogoredo' },
      { id: 'TOR', name: 'Torino Porta Nuova' },
      { id: 'VEN', name: 'Venezia Mestre' },
      { id: 'VES', name: 'Venezia Santa Lucia' },
      { id: 'VER', name: 'Verona Porta Nuova' },
      { id: 'PAD', name: 'Padova' },
      { id: 'SAL', name: 'Salerno' },
      { id: 'REG', name: 'Reggio Emilia AV' },
    ];

    const lowerQuery = query.toLowerCase();
    return italoStations.filter(s => 
      s.name.toLowerCase().includes(lowerQuery)
    );
  }

  async getStation(stationId: string): Promise<Station | null> {
    const stations = await this.searchStations('');
    return stations.find(s => s.id === stationId) || null;
  }

  async getAlerts(regionId?: number): Promise<Alert[]> {
    return [];
  }

  async getDepartures(stationId: string, dateTime?: Date): Promise<Train[]> {
    return [];
  }

  async getArrivals(stationId: string, dateTime?: Date): Promise<Train[]> {
    return [];
  }
}

// Export singleton instance
export const italo = new ItaloAdapter();
