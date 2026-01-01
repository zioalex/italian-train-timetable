// Trenord Adapter - GTFS with calendar_dates.txt support
// Updated to handle date-based service exceptions

import { BaseAdapter } from './base.adapter.js';
import {
  Station,
  JourneySolution,
  Train,
  TrainStop,
  Alert,
  SearchParams,
  Operator,
  TrainCategory,
} from '../types/index.js';

interface GTFSStop {
  stop_id: string;
  stop_name: string;
  stop_lat: number;
  stop_lon: number;
}

interface GTFSRoute {
  route_id: string;
  route_short_name: string;
  route_long_name: string;
  route_type: number;
  route_color?: string;
}

interface GTFSTrip {
  trip_id: string;
  route_id: string;
  service_id: string;
  trip_short_name: string;
}

interface GTFSStopTime {
  trip_id: string;
  arrival_time: string;
  departure_time: string;
  stop_id: string;
  stop_sequence: number;
}

export class TrenordAdapter extends BaseAdapter {
  readonly operator: Operator = 'trenord';
  
  private stops: Map<string, GTFSStop> = new Map();
  private routes: Map<string, GTFSRoute> = new Map();
  private trips: Map<string, GTFSTrip> = new Map();
  private stopTimes: Map<string, GTFSStopTime[]> = new Map();
  private calendarDates: Map<string, Set<string>> = new Map();
  
  private isLoaded: boolean = false;

  constructor() {
    super();
  }

  async loadGTFSData(gtfsPath: string): Promise<void> {
    const fs = await import('fs/promises');
    const path = await import('path');

    try {
      const stopsData = await fs.readFile(path.join(gtfsPath, 'stops.txt'), 'utf-8');
      this.parseStops(stopsData);

      const routesData = await fs.readFile(path.join(gtfsPath, 'routes.txt'), 'utf-8');
      this.parseRoutes(routesData);

      const tripsData = await fs.readFile(path.join(gtfsPath, 'trips.txt'), 'utf-8');
      this.parseTrips(tripsData);

      const stopTimesData = await fs.readFile(path.join(gtfsPath, 'stop_times.txt'), 'utf-8');
      this.parseStopTimes(stopTimesData);

      // Load calendar_dates.txt (date-based exceptions)
      try {
        const calendarDatesData = await fs.readFile(path.join(gtfsPath, 'calendar_dates.txt'), 'utf-8');
        this.parseCalendarDates(calendarDatesData);
      } catch {
        console.warn('No calendar_dates.txt found');
      }

      this.isLoaded = true;
      console.log(`✅ Trenord GTFS loaded: ${this.stops.size} stops, ${this.routes.size} routes, ${this.trips.size} trips, ${this.calendarDates.size} services`);
    } catch (error) {
      console.error('Failed to load Trenord GTFS data:', error);
      throw error;
    }
  }

  async isAvailable(): Promise<boolean> {
    return this.isLoaded;
  }

  async searchJourneys(params: SearchParams): Promise<JourneySolution[]> {
    if (!this.isLoaded) return [];

    const fromStations = this.findStationsByName(params.from);
    const toStations = this.findStationsByName(params.to);

    if (fromStations.length === 0 || toStations.length === 0) return [];

    const fromStopIds = new Set(fromStations.map(s => s.stop_id));
    const toStopIds = new Set(toStations.map(s => s.stop_id));
    const dateStr = this.formatGTFSDate(params.date);
    
    const solutions: JourneySolution[] = [];
    const searchHour = params.date.getHours();
    const searchMinute = params.date.getMinutes();

    for (const [tripId, stopTimes] of this.stopTimes) {
      const trip = this.trips.get(tripId);
      if (!trip) continue;

      if (!this.isServiceActiveOnDate(trip.service_id, dateStr)) continue;

      let fromStop: GTFSStopTime | null = null;
      let toStop: GTFSStopTime | null = null;

      for (const st of stopTimes) {
        if (fromStopIds.has(st.stop_id) && !fromStop) fromStop = st;
        if (toStopIds.has(st.stop_id) && fromStop) { toStop = st; break; }
      }

      if (fromStop && toStop) {
        const depTime = this.parseGTFSTime(fromStop.departure_time);
        
        if (depTime.hours > searchHour || (depTime.hours === searchHour && depTime.minutes >= searchMinute)) {
          const arrTime = this.parseGTFSTime(toStop.arrival_time);
          const route = this.routes.get(trip.route_id);
          const fromStation = this.stops.get(fromStop.stop_id);
          const toStation = this.stops.get(toStop.stop_id);

          const departureDate = new Date(params.date);
          departureDate.setHours(depTime.hours % 24, depTime.minutes, 0, 0);
          if (depTime.hours >= 24) departureDate.setDate(departureDate.getDate() + 1);

          const arrivalDate = new Date(params.date);
          arrivalDate.setHours(arrTime.hours % 24, arrTime.minutes, 0, 0);
          if (arrTime.hours >= 24 || arrivalDate < departureDate) {
            arrivalDate.setDate(arrivalDate.getDate() + 1);
          }

          const category = this.getTrainCategory(route?.route_short_name || '');

          solutions.push({
            id: tripId,
            departureTime: departureDate,
            arrivalTime: arrivalDate,
            duration: this.calculateDuration(departureDate, arrivalDate),
            changes: 0,
            legs: [{
              train: {
                id: tripId,
                trainNumber: trip.trip_short_name || route?.route_short_name || tripId,
                category: category,
                categoryDesc: route?.route_long_name || route?.route_short_name || 'Regionale',
                operator: 'trenord',
                origin: { id: fromStop.stop_id, name: fromStation?.stop_name || '' },
                destination: { id: toStop.stop_id, name: toStation?.stop_name || '' },
                departureTime: departureDate,
                arrivalTime: arrivalDate,
                duration: this.calculateDuration(departureDate, arrivalDate),
              },
              origin: { id: fromStop.stop_id, name: fromStation?.stop_name || '' },
              destination: { id: toStop.stop_id, name: toStation?.stop_name || '' },
              departureTime: departureDate,
              arrivalTime: arrivalDate,
            }],
          });
        }
      }
    }

    return solutions.sort((a, b) => a.departureTime.getTime() - b.departureTime.getTime()).slice(0, 20);
  }

  async getTrainStatus(trainId: string, originStationId: string): Promise<Train | null> {
    return null;
  }

  async getTrainStops(trainId: string, originStationId: string): Promise<TrainStop[]> {
    const stopTimes = this.stopTimes.get(trainId);
    if (!stopTimes) return [];

    return stopTimes.map(st => {
      const stop = this.stops.get(st.stop_id);
      const depTime = this.parseGTFSTime(st.departure_time);
      const arrTime = this.parseGTFSTime(st.arrival_time);

      const today = new Date();
      const depDate = new Date(today); depDate.setHours(depTime.hours % 24, depTime.minutes, 0, 0);
      const arrDate = new Date(today); arrDate.setHours(arrTime.hours % 24, arrTime.minutes, 0, 0);

      return {
        station: { id: st.stop_id, name: stop?.stop_name || st.stop_id, lat: stop?.stop_lat, lon: stop?.stop_lon },
        scheduledArrival: arrDate,
        scheduledDeparture: depDate,
        status: 'scheduled' as const,
      };
    });
  }

  async searchStations(query: string): Promise<Station[]> {
    if (!this.isLoaded || query.length < 2) return [];
    return this.findStationsByName(query).map(s => ({
      id: s.stop_id, name: s.stop_name, lat: s.stop_lat, lon: s.stop_lon,
    }));
  }

  async getStation(stationId: string): Promise<Station | null> {
    const stop = this.stops.get(stationId);
    if (!stop) return null;
    return { id: stop.stop_id, name: stop.stop_name, lat: stop.stop_lat, lon: stop.stop_lon };
  }

  async getAlerts(regionId?: number): Promise<Alert[]> { return []; }

  async getDepartures(stationId: string, dateTime?: Date): Promise<Train[]> {
    if (!this.isLoaded) return [];
    
    const dt = dateTime || new Date();
    const dateStr = this.formatGTFSDate(dt);
    const searchHour = dt.getHours();
    const searchMinute = dt.getMinutes();
    
    const departures: Train[] = [];
    
    for (const [tripId, stopTimes] of this.stopTimes) {
      const trip = this.trips.get(tripId);
      if (!trip || !this.isServiceActiveOnDate(trip.service_id, dateStr)) continue;
      
      const stationStop = stopTimes.find(st => st.stop_id === stationId);
      if (!stationStop) continue;
      
      const depTime = this.parseGTFSTime(stationStop.departure_time);
      if (depTime.hours < searchHour || (depTime.hours === searchHour && depTime.minutes < searchMinute)) continue;
      
      const route = this.routes.get(trip.route_id);
      const lastStop = stopTimes[stopTimes.length - 1];
      const destination = this.stops.get(lastStop.stop_id);
      
      const departureDate = new Date(dt);
      departureDate.setHours(depTime.hours % 24, depTime.minutes, 0, 0);
      
      departures.push({
        id: tripId,
        trainNumber: trip.trip_short_name || route?.route_short_name || '',
        category: this.getTrainCategory(route?.route_short_name || ''),
        categoryDesc: route?.route_long_name || '',
        operator: 'trenord',
        origin: { id: stationId, name: this.stops.get(stationId)?.stop_name || '' },
        destination: { id: lastStop.stop_id, name: destination?.stop_name || '' },
        departureTime: departureDate,
        arrivalTime: departureDate,
        duration: 0,
      });
    }
    
    return departures.sort((a, b) => a.departureTime.getTime() - b.departureTime.getTime()).slice(0, 20);
  }

  async getArrivals(stationId: string, dateTime?: Date): Promise<Train[]> { return []; }

  // ============ Parsing Methods ============

  private parseCSV(data: string): Record<string, string>[] {
    const lines = data.trim().split('\n');
    if (lines.length < 2) return [];
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    return lines.slice(1).map(line => {
      const values = this.parseCSVLine(line);
      const record: Record<string, string> = {};
      headers.forEach((header, i) => { record[header] = values[i] || ''; });
      return record;
    });
  }

  private parseCSVLine(line: string): string[] {
    const values: string[] = [];
    let current = '';
    let inQuotes = false;
    for (const char of line) {
      if (char === '"') inQuotes = !inQuotes;
      else if (char === ',' && !inQuotes) { values.push(current.trim()); current = ''; }
      else current += char;
    }
    values.push(current.trim());
    return values;
  }

  private parseStops(data: string): void {
    for (const r of this.parseCSV(data)) {
      this.stops.set(r.stop_id, {
        stop_id: r.stop_id, stop_name: r.stop_name,
        stop_lat: parseFloat(r.stop_lat) || 0, stop_lon: parseFloat(r.stop_lon) || 0,
      });
    }
  }

  private parseRoutes(data: string): void {
    for (const r of this.parseCSV(data)) {
      this.routes.set(r.route_id, {
        route_id: r.route_id, route_short_name: r.route_short_name,
        route_long_name: r.route_long_name, route_type: parseInt(r.route_type) || 2,
        route_color: r.route_color,
      });
    }
  }

  private parseTrips(data: string): void {
    for (const r of this.parseCSV(data)) {
      this.trips.set(r.trip_id, {
        trip_id: r.trip_id, route_id: r.route_id,
        service_id: r.service_id, trip_short_name: r.trip_short_name || '',
      });
    }
  }

  private parseStopTimes(data: string): void {
    for (const r of this.parseCSV(data)) {
      if (!this.stopTimes.has(r.trip_id)) this.stopTimes.set(r.trip_id, []);
      this.stopTimes.get(r.trip_id)!.push({
        trip_id: r.trip_id, arrival_time: r.arrival_time, departure_time: r.departure_time,
        stop_id: r.stop_id, stop_sequence: parseInt(r.stop_sequence) || 0,
      });
    }
    for (const [, stops] of this.stopTimes) stops.sort((a, b) => a.stop_sequence - b.stop_sequence);
  }

  private parseCalendarDates(data: string): void {
    for (const r of this.parseCSV(data)) {
      if (parseInt(r.exception_type) === 1) {
        if (!this.calendarDates.has(r.service_id)) this.calendarDates.set(r.service_id, new Set());
        this.calendarDates.get(r.service_id)!.add(r.date);
      }
    }
  }

  private isServiceActiveOnDate(serviceId: string, dateStr: string): boolean {
    const dates = this.calendarDates.get(serviceId);
    return dates ? dates.has(dateStr) : false;
  }

  private findStationsByName(query: string): GTFSStop[] {
    const lowerQuery = query.toLowerCase();
    const results: GTFSStop[] = [];
    for (const stop of this.stops.values()) {
      if (stop.stop_name.toLowerCase().includes(lowerQuery)) results.push(stop);
    }
    return results.sort((a, b) => {
      const aName = a.stop_name.toLowerCase();
      const bName = b.stop_name.toLowerCase();
      if (aName === lowerQuery) return -1;
      if (bName === lowerQuery) return 1;
      if (aName.startsWith(lowerQuery)) return -1;
      if (bName.startsWith(lowerQuery)) return 1;
      return aName.localeCompare(bName);
    }).slice(0, 15);
  }

  private formatGTFSDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
  }

  private parseGTFSTime(timeStr: string): { hours: number; minutes: number } {
    const [h, m] = timeStr.split(':').map(Number);
    return { hours: h, minutes: m };
  }

  private getTrainCategory(routeName: string): TrainCategory {
    const upper = routeName.toUpperCase();
    if (upper.startsWith('RE')) return 'RV';
    if (upper.startsWith('R')) return 'REG';
    if (upper.startsWith('S')) return 'MET';
    if (upper.startsWith('MXP')) return 'RV';
    if (upper.startsWith('EC')) return 'EC';
    return 'REG';
  }
}

export const trenord = new TrenordAdapter();
