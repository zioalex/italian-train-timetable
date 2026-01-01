import { ITrainAdapter, trenitalia, trenord, italo } from '../adapters/index.js';
import { Station, JourneySolution, Train, TrainStop, Alert, SearchParams, SearchResponse, Operator } from '../types/index.js';

export class TrainSearchService {
  private adapters: ITrainAdapter[] = [];
  private stationCache: Map&lt;string, Station&gt; = new Map();
  constructor() { this.adapters = [trenitalia, trenord, italo]; }

  async getActiveAdapters(): Promise&lt;Operator[]&gt; {
    const active: Operator[] = [];
    for (const adapter of this.adapters) { if (await adapter.isAvailable()) active.push(adapter.operator); }
    return active;
  }

  async searchJourneys(params: SearchParams): Promise&lt;SearchResponse&gt; {
    const activeAdapters = params.operators ? this.adapters.filter(a =&gt; params.operators!.includes(a.operator)) : this.adapters;
    const results = await Promise.allSettled(activeAdapters.map(adapter =&gt; adapter.searchJourneys(params)));
    let allSolutions: JourneySolution[] = [];
    for (const result of results) { if (result.status === 'fulfilled') allSolutions = allSolutions.concat(result.value); }
    allSolutions.sort((a, b) =&gt; a.departureTime.getTime() - b.departureTime.getTime());
    return { solutions: allSolutions };
  }

  async searchStations(query: string): Promise&lt;Station[]&gt; {
    if (query.length &lt; 2) return [];
    const results = await Promise.allSettled(this.adapters.map(adapter =&gt; adapter.searchStations(query)));
    const stationMap = new Map&lt;string, Station&gt;();
    for (const result of results) { if (result.status === 'fulfilled') for (const station of result.value) { const key = station.name.toLowerCase(); if (!stationMap.has(key)) stationMap.set(key, station); } }
    return Array.from(stationMap.values()).sort((a, b) =&gt; a.name.localeCompare(b.name)).slice(0, 15);
  }

  async getTrainStatus(trainId: string, originStationId: string, operator?: Operator): Promise&lt;Train | null&gt; {
    if (operator) { const adapter = this.adapters.find(a =&gt; a.operator === operator); if (adapter) return adapter.getTrainStatus(trainId, originStationId); }
    for (const adapter of this.adapters) { const train = await adapter.getTrainStatus(trainId, originStationId); if (train) return train; }
    return null;
  }

  async getTrainStops(trainId: string, originStationId: string, operator?: Operator): Promise&lt;TrainStop[]&gt; {
    if (operator) { const adapter = this.adapters.find(a =&gt; a.operator === operator); if (adapter) return adapter.getTrainStops(trainId, originStationId); }
    for (const adapter of this.adapters) { const stops = await adapter.getTrainStops(trainId, originStationId); if (stops.length &gt; 0) return stops; }
    return [];
  }

  async getDepartures(stationId: string, dateTime?: Date): Promise&lt;Train[]&gt; {
    const results = await Promise.allSettled(this.adapters.map(adapter =&gt; adapter.getDepartures(stationId, dateTime)));
    let allTrains: Train[] = [];
    for (const result of results) { if (result.status === 'fulfilled') allTrains = allTrains.concat(result.value); }
    return allTrains.sort((a, b) =&gt; a.departureTime.getTime() - b.departureTime.getTime());
  }

  async getArrivals(stationId: string, dateTime?: Date): Promise&lt;Train[]&gt; {
    const results = await Promise.allSettled(this.adapters.map(adapter =&gt; adapter.getArrivals(stationId, dateTime)));
    let allTrains: Train[] = [];
    for (const result of results) { if (result.status === 'fulfilled') allTrains = allTrains.concat(result.value); }
    return allTrains.sort((a, b) =&gt; a.arrivalTime.getTime() - b.arrivalTime.getTime());
  }

  async getStation(stationId: string): Promise&lt;Station | null&gt; {
    if (this.stationCache.has(stationId)) return this.stationCache.get(stationId)!;
    for (const adapter of this.adapters) { const station = await adapter.getStation(stationId); if (station) { this.stationCache.set(stationId, station); return station; } }
    return null;
  }
}

export const trainSearchService = new TrainSearchService();
