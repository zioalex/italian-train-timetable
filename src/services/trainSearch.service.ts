// Unified Train Search Service
// Aggregates results from all available train operators

import { 
  ITrainAdapter, 
  trenitalia, 
  trenord, 
  italo 
} from '../adapters/index.js';
import {
  Station,
  JourneySolution,
  Train,
  TrainStop,
  Alert,
  SearchParams,
  SearchResponse,
  Operator,
} from '../types/index.js';

export class TrainSearchService {
  private adapters: ITrainAdapter[] = [];
  private stationCache: Map<string, Station> = new Map();

  constructor() {
    // Register all adapters
    this.adapters = [trenitalia, trenord, italo];
  }

  /**
   * Get list of active adapters
   */
  async getActiveAdapters(): Promise<Operator[]> {
    const active: Operator[] = [];
    
    for (const adapter of this.adapters) {
      if (await adapter.isAvailable()) {
        active.push(adapter.operator);
      }
    }
    
    return active;
  }

  /**
   * Search for journeys across all available operators
   */
  async searchJourneys(params: SearchParams): Promise<SearchResponse> {
    const { operators } = params;
    
    // Filter adapters if specific operators requested
    const activeAdapters = operators 
      ? this.adapters.filter(a => operators.includes(a.operator))
      : this.adapters;

    // Query all adapters in parallel
    const results = await Promise.allSettled(
      activeAdapters
        .filter(async a => await a.isAvailable())
        .map(adapter => adapter.searchJourneys(params))
    );

    // Collect successful results
    let allSolutions: JourneySolution[] = [];
    
    for (const result of results) {
      if (result.status === 'fulfilled') {
        allSolutions = allSolutions.concat(result.value);
      } else {
        console.error('Adapter search failed:', result.reason);
      }
    }

    // Sort by departure time
    allSolutions.sort((a, b) => 
      a.departureTime.getTime() - b.departureTime.getTime()
    );

    // Get relevant alerts
    const alerts = await this.getAlertsForRoute(params.from, params.to);

    return {
      solutions: allSolutions,
      alerts,
    };
  }

  /**
   * Search stations across all operators
   */
  async searchStations(query: string): Promise<Station[]> {
    if (query.length < 2) return [];

    // Check cache first
    const cacheKey = query.toLowerCase();
    
    // Query all adapters in parallel
    const results = await Promise.allSettled(
      this.adapters.map(adapter => adapter.searchStations(query))
    );

    // Merge and deduplicate results
    const stationMap = new Map<string, Station>();
    
    for (const result of results) {
      if (result.status === 'fulfilled') {
        for (const station of result.value) {
          // Use station name as key for deduplication
          const key = station.name.toLowerCase();
          if (!stationMap.has(key)) {
            stationMap.set(key, station);
          }
        }
      }
    }

    return Array.from(stationMap.values())
      .sort((a, b) => a.name.localeCompare(b.name))
      .slice(0, 15);
  }

  /**
   * Get real-time train status
   */
  async getTrainStatus(
    trainId: string, 
    originStationId: string,
    operator?: Operator
  ): Promise<Train | null> {
    // If operator specified, use that adapter
    if (operator) {
      const adapter = this.adapters.find(a => a.operator === operator);
      if (adapter) {
        return adapter.getTrainStatus(trainId, originStationId);
      }
    }

    // Otherwise try all adapters
    for (const adapter of this.adapters) {
      const train = await adapter.getTrainStatus(trainId, originStationId);
      if (train) return train;
    }

    return null;
  }

  /**
   * Get train stops with real-time data
   */
  async getTrainStops(
    trainId: string,
    originStationId: string,
    operator?: Operator
  ): Promise<TrainStop[]> {
    if (operator) {
      const adapter = this.adapters.find(a => a.operator === operator);
      if (adapter) {
        return adapter.getTrainStops(trainId, originStationId);
      }
    }

    for (const adapter of this.adapters) {
      const stops = await adapter.getTrainStops(trainId, originStationId);
      if (stops.length > 0) return stops;
    }

    return [];
  }

  /**
   * Get departures from a station
   */
  async getDepartures(stationId: string, dateTime?: Date): Promise<Train[]> {
    const results = await Promise.allSettled(
      this.adapters.map(adapter => adapter.getDepartures(stationId, dateTime))
    );

    let allTrains: Train[] = [];
    
    for (const result of results) {
      if (result.status === 'fulfilled') {
        allTrains = allTrains.concat(result.value);
      }
    }

    return allTrains.sort((a, b) => 
      a.departureTime.getTime() - b.departureTime.getTime()
    );
  }

  /**
   * Get arrivals at a station
   */
  async getArrivals(stationId: string, dateTime?: Date): Promise<Train[]> {
    const results = await Promise.allSettled(
      this.adapters.map(adapter => adapter.getArrivals(stationId, dateTime))
    );

    let allTrains: Train[] = [];
    
    for (const result of results) {
      if (result.status === 'fulfilled') {
        allTrains = allTrains.concat(result.value);
      }
    }

    return allTrains.sort((a, b) => 
      a.arrivalTime.getTime() - b.arrivalTime.getTime()
    );
  }

  /**
   * Get alerts for a route
   */
  async getAlertsForRoute(from: string, to: string): Promise<Alert[]> {
    const results = await Promise.allSettled(
      this.adapters.map(adapter => adapter.getAlerts())
    );

    let allAlerts: Alert[] = [];
    
    for (const result of results) {
      if (result.status === 'fulfilled') {
        allAlerts = allAlerts.concat(result.value);
      }
    }

    // TODO: Filter alerts relevant to the route
    return allAlerts;
  }

  /**
   * Get station details
   */
  async getStation(stationId: string): Promise<Station | null> {
    // Check cache
    if (this.stationCache.has(stationId)) {
      return this.stationCache.get(stationId)!;
    }

    for (const adapter of this.adapters) {
      const station = await adapter.getStation(stationId);
      if (station) {
        this.stationCache.set(stationId, station);
        return station;
      }
    }

    return null;
  }
}

// Export singleton instance
export const trainSearchService = new TrainSearchService();
