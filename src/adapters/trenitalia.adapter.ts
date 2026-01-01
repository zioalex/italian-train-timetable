// Trenitalia Adapter using ViaggiaTreno API
// API Documentation: https://github.com/sabas/trenitalia

import axios, { AxiosInstance } from 'axios';
import { BaseAdapter } from './base.adapter.js';
import {
  Station,
  JourneySolution,
  JourneyLeg,
  Train,
  TrainStop,
  Alert,
  SearchParams,
  Operator,
  TrainCategory,
} from '../types/index.js';

const VIAGGIATRENO_BASE = 'http://www.viaggiatreno.it/infomobilita/resteasy/viaggiatreno';

export class TrenitaliaAdapter extends BaseAdapter {
  readonly operator: Operator = 'trenitalia';
  private client: AxiosInstance;

  constructor() {
    super();
    this.client = axios.create({
      baseURL: VIAGGIATRENO_BASE,
      timeout: 15000,
      headers: {
        'Accept': 'application/json, text/plain, */*',
        'User-Agent': 'TrainSearch/1.0',
      },
    });
  }

  async isAvailable(): Promise<boolean> {
    try {
      const response = await this.client.get('/autocompletaStazione/ROMA');
      return response.status === 200;
    } catch {
      return false;
    }
  }

  /**
   * Search for journey solutions
   * Endpoint: /soluzioniViaggioNew/{codOrigine}/{codDestinazione}/{data}
   */
  async searchJourneys(params: SearchParams): Promise<JourneySolution[]> {
    try {
      // Get station codes if needed
      const fromStation = await this.resolveStation(params.from);
      const toStation = await this.resolveStation(params.to);

      if (!fromStation || !toStation) {
        throw new Error('Could not resolve station codes');
      }

      // Format: remove 'S' prefix for this endpoint
      const fromCode = fromStation.id.replace(/^S/, '');
      const toCode = toStation.id.replace(/^S/, '');

      // Format date: YYYY-MM-DDTHH:mm:ss
      const dateStr = this.formatDateTime(params.date);

      const response = await this.client.get(
        `/soluzioniViaggioNew/${fromCode}/${toCode}/${dateStr}`
      );

      if (!response.data?.soluzioni) {
        return [];
      }

      return this.parseSolutions(response.data.soluzioni, fromStation, toStation);
    } catch (error) {
      console.error('Trenitalia searchJourneys error:', error);
      return [];
    }
  }

  /**
   * Get real-time train status
   * Endpoint: /andamentoTreno/{codOrigine}/{numeroTreno}/{dataPartenza}
   */
  async getTrainStatus(trainId: string, originStationId: string): Promise<Train | null> {
    try {
      const today = new Date();
      const dateTs = today.getTime();

      const response = await this.client.get(
        `/andamentoTreno/${originStationId}/${trainId}/${dateTs}`
      );

      if (!response.data) return null;

      return this.parseTrainStatus(response.data);
    } catch (error) {
      console.error('Trenitalia getTrainStatus error:', error);
      return null;
    }
  }

  /**
   * Get train stops with real-time data
   * Endpoint: /tratteCanvas/{codOrigine}/{numeroTreno}/{dataPartenza}
   */
  async getTrainStops(trainId: string, originStationId: string): Promise<TrainStop[]> {
    try {
      const today = new Date();
      const dateTs = today.getTime();

      const response = await this.client.get(
        `/tratteCanvas/${originStationId}/${trainId}/${dateTs}`
      );

      if (!response.data || !Array.isArray(response.data)) {
        return [];
      }

      return this.parseTrainStops(response.data);
    } catch (error) {
      console.error('Trenitalia getTrainStops error:', error);
      return [];
    }
  }

  /**
   * Search stations by name
   * Endpoint: /autocompletaStazione/{text}
   * Returns: "STATION NAME|CODE\n..."
   */
  async searchStations(query: string): Promise<Station[]> {
    try {
      if (query.length < 2) return [];

      const response = await this.client.get(
        `/autocompletaStazione/${encodeURIComponent(query)}`
      );

      if (!response.data || typeof response.data !== 'string') {
        return [];
      }

      return this.parseStationAutocomplete(response.data);
    } catch (error) {
      console.error('Trenitalia searchStations error:', error);
      return [];
    }
  }

  /**
   * Get station details
   * Endpoint: /dettaglioStazione/{codStazione}/{regione}
   */
  async getStation(stationId: string): Promise<Station | null> {
    try {
      // First get region
      const regionResponse = await this.client.get(`/regione/${stationId}`);
      const region = regionResponse.data;

      if (!region) return null;

      const response = await this.client.get(
        `/dettaglioStazione/${stationId}/${region}`
      );

      if (!response.data) return null;

      return {
        id: stationId,
        name: response.data.localita?.nomeLungo || response.data.nomeLungo || stationId,
        region: region,
        lat: response.data.lat,
        lon: response.data.lon,
      };
    } catch (error) {
      console.error('Trenitalia getStation error:', error);
      return null;
    }
  }

  /**
   * Get alerts - not directly available, returns empty for now
   */
  async getAlerts(regionId?: number): Promise<Alert[]> {
    // ViaggiaTreno doesn't have a direct alerts endpoint
    // This would need to be scraped from the website
    return [];
  }

  /**
   * Get departures from a station
   * Endpoint: /partenze/{codStazione}/{orario}
   */
  async getDepartures(stationId: string, dateTime?: Date): Promise<Train[]> {
    try {
      const dt = dateTime || new Date();
      const timeStr = this.formatDateTimeForDepartures(dt);

      const response = await this.client.get(
        `/partenze/${stationId}/${timeStr}`
      );

      if (!response.data || !Array.isArray(response.data)) {
        return [];
      }

      return this.parseDepartures(response.data, stationId);
    } catch (error) {
      console.error('Trenitalia getDepartures error:', error);
      return [];
    }
  }

  /**
   * Get arrivals at a station
   * Endpoint: /arrivi/{codStazione}/{orario}
   */
  async getArrivals(stationId: string, dateTime?: Date): Promise<Train[]> {
    try {
      const dt = dateTime || new Date();
      const timeStr = this.formatDateTimeForDepartures(dt);

      const response = await this.client.get(
        `/arrivi/${stationId}/${timeStr}`
      );

      if (!response.data || !Array.isArray(response.data)) {
        return [];
      }

      return this.parseArrivals(response.data, stationId);
    } catch (error) {
      console.error('Trenitalia getArrivals error:', error);
      return [];
    }
  }

  // ============ Private Helper Methods ============

  private async resolveStation(stationQuery: string): Promise<Station | null> {
    // If it looks like a station code, return it directly
    if (/^S?\d+$/.test(stationQuery)) {
      const code = stationQuery.startsWith('S') ? stationQuery : `S${stationQuery}`;
      return { id: code, name: stationQuery };
    }

    // Otherwise search by name
    const stations = await this.searchStations(stationQuery);
    return stations.length > 0 ? stations[0] : null;
  }

  private formatDateTime(date: Date): string {
    return date.toISOString().replace(/\.\d{3}Z$/, '');
  }

  private formatDateTimeForDepartures(date: Date): string {
    // Format: "Sat Dec 27 2024 20:30:00 GMT+0000"
    return date.toString();
  }

  private parseStationAutocomplete(data: string): Station[] {
    return data
      .split('\n')
      .filter(line => line.trim())
      .map(line => {
        const [name, code] = line.split('|');
        return {
          id: code?.trim() || '',
          name: name?.trim() || '',
        };
      })
      .filter(s => s.id && s.name);
  }

  private parseSolutions(solutions: any[], fromStation: Station, toStation: Station): JourneySolution[] {
    return solutions.map((sol, idx) => {
      const vehicles = sol.vehicles || [];
      const legs: JourneyLeg[] = vehicles.map((v: any) => ({
        train: {
          id: `${v.numeroTreno}`,
          trainNumber: v.numeroTreno?.toString() || '',
          category: this.parseCategory(v.categoriaDescrizione || '') as TrainCategory,
          categoryDesc: v.categoriaDescrizione || '',
          operator: 'trenitalia' as Operator,
          origin: { id: '', name: v.origine || '' },
          destination: { id: '', name: v.destinazione || '' },
          departureTime: new Date(v.orarioPartenza),
          arrivalTime: new Date(v.orarioArrivo),
          duration: this.calculateDuration(new Date(v.orarioPartenza), new Date(v.orarioArrivo)),
        },
        origin: { id: '', name: v.origine || '' },
        destination: { id: '', name: v.destinazione || '' },
        departureTime: new Date(v.orarioPartenza),
        arrivalTime: new Date(v.orarioArrivo),
      }));

      const firstLeg = legs[0];
      const lastLeg = legs[legs.length - 1];

      return {
        id: `sol-${idx}`,
        departureTime: firstLeg?.departureTime || new Date(),
        arrivalTime: lastLeg?.arrivalTime || new Date(),
        duration: sol.durata || 0,
        changes: Math.max(0, legs.length - 1),
        legs,
      };
    });
  }

  private parseTrainStatus(data: any): Train {
    return {
      id: data.numeroTreno?.toString() || '',
      trainNumber: data.numeroTreno?.toString() || '',
      category: this.parseCategory(data.categoria || data.categoriaDescrizione || '') as TrainCategory,
      categoryDesc: data.categoriaDescrizione || data.categoria || '',
      operator: 'trenitalia',
      origin: {
        id: data.idOrigine || '',
        name: data.origine || '',
      },
      destination: {
        id: data.idDestinazione || '',
        name: data.destinazione || '',
      },
      departureTime: new Date(data.orarioPartenza),
      arrivalTime: new Date(data.orarioArrivo),
      duration: this.calculateDuration(new Date(data.orarioPartenza), new Date(data.orarioArrivo)),
      delay: data.ritardo || 0,
      status: this.mapTrainStatus(data.tipoTreno, data.provpiedimenento),
    };
  }

  private parseTrainStops(stops: any[]): TrainStop[] {
    return stops.map(stop => ({
      station: {
        id: stop.id || '',
        name: stop.stazione || '',
      },
      scheduledArrival: stop.arrivo_teorico ? new Date(stop.arrivo_teorico) : undefined,
      scheduledDeparture: stop.partenza_teorica ? new Date(stop.partenza_teorica) : undefined,
      actualArrival: stop.arrivoReale ? new Date(stop.arrivoReale) : undefined,
      actualDeparture: stop.partenzaReale ? new Date(stop.partenzaReale) : undefined,
      platform: stop.binarioProgrammatoPartenzaDescrizione || stop.binarioProgrammatoArrivoDescrizione,
      actualPlatform: stop.binarioEffettivoPartenzaDescrizione || stop.binarioEffettivoArrivoDescrizione,
      delay: stop.ritardo || 0,
      status: this.mapStopStatus(stop),
    }));
  }

  private parseDepartures(departures: any[], stationId: string): Train[] {
    return departures.map(dep => ({
      id: dep.numeroTreno?.toString() || '',
      trainNumber: dep.numeroTreno?.toString() || '',
      category: this.parseCategory(dep.categoria || '') as TrainCategory,
      categoryDesc: dep.categoriaDescrizione || dep.categoria || '',
      operator: 'trenitalia' as Operator,
      origin: {
        id: stationId,
        name: dep.origine || '',
      },
      destination: {
        id: '',
        name: dep.destinazione || '',
      },
      departureTime: new Date(dep.orarioPartenza),
      arrivalTime: new Date(dep.orarioArrivo || dep.orarioPartenza),
      duration: 0,
      delay: dep.ritardo || 0,
      status: dep.circolante ? 'running' : 'scheduled',
    }));
  }

  private parseArrivals(arrivals: any[], stationId: string): Train[] {
    return arrivals.map(arr => ({
      id: arr.numeroTreno?.toString() || '',
      trainNumber: arr.numeroTreno?.toString() || '',
      category: this.parseCategory(arr.categoria || '') as TrainCategory,
      categoryDesc: arr.categoriaDescrizione || arr.categoria || '',
      operator: 'trenitalia' as Operator,
      origin: {
        id: '',
        name: arr.origine || '',
      },
      destination: {
        id: stationId,
        name: arr.destinazione || '',
      },
      departureTime: new Date(arr.orarioPartenza || arr.orarioArrivo),
      arrivalTime: new Date(arr.orarioArrivo),
      duration: 0,
      delay: arr.ritardo || 0,
      status: arr.circolante ? 'running' : 'scheduled',
    }));
  }

  private mapTrainStatus(tipoTreno: string, provvedimento: string): Train['status'] {
    if (provvedimento === 'SOPPRESSO') return 'cancelled';
    if (provvedimento === 'PARZIALMENTE SOPPRESSO') return 'partially_cancelled';
    return 'running';
  }

  private mapStopStatus(stop: any): TrainStop['status'] {
    if (stop.actualFermataType === 2) return 'departed';
    if (stop.actualFermataType === 1) return 'arrived';
    if (stop.actualFermataType === 0) return 'scheduled';
    return 'scheduled';
  }
}

// Export singleton instance
export const trenitalia = new TrenitaliaAdapter();
