// Trenord Adapter - GTFS with calendar_dates.txt support
import { BaseAdapter } from './base.adapter.js';
import { Station, JourneySolution, Train, TrainStop, Alert, SearchParams, Operator, TrainCategory } from '../types/index.js';

interface GTFSStop { stop_id: string; stop_name: string; stop_lat: number; stop_lon: number; }
interface GTFSRoute { route_id: string; route_short_name: string; route_long_name: string; route_type: number; route_color?: string; }
interface GTFSTrip { trip_id: string; route_id: string; service_id: string; trip_short_name: string; }
interface GTFSStopTime { trip_id: string; arrival_time: string; departure_time: string; stop_id: string; stop_sequence: number; }

export class TrenordAdapter extends BaseAdapter {
  readonly operator: Operator = 'trenord';
  private stops: Map<string, GTFSStop> = new Map();
  private routes: Map<string, GTFSRoute> = new Map();
  private trips: Map<string, GTFSTrip> = new Map();
  private stopTimes: Map<string, GTFSStopTime[]> = new Map();
  private calendarDates: Map<string, Set<string>> = new Map();
  private isLoaded: boolean = false;

  async loadGTFSData(gtfsPath: string): Promise<void> {
    const fs = await import('fs/promises');
    const path = await import('path');
    try {
      this.parseStops(await fs.readFile(path.join(gtfsPath, 'stops.txt'), 'utf-8'));
      this.parseRoutes(await fs.readFile(path.join(gtfsPath, 'routes.txt'), 'utf-8'));
      this.parseTrips(await fs.readFile(path.join(gtfsPath, 'trips.txt'), 'utf-8'));
      this.parseStopTimes(await fs.readFile(path.join(gtfsPath, 'stop_times.txt'), 'utf-8'));
      try { this.parseCalendarDates(await fs.readFile(path.join(gtfsPath, 'calendar_dates.txt'), 'utf-8')); } catch { console.warn('No calendar_dates.txt'); }
      this.isLoaded = true;
      console.log(`Trenord GTFS loaded: ${this.stops.size} stops, ${this.routes.size} routes, ${this.trips.size} trips`);
    } catch (error) { console.error('Failed to load GTFS:', error); throw error; }
  }

  async isAvailable(): Promise<boolean> { return this.isLoaded; }

  async searchJourneys(params: SearchParams): Promise<JourneySolution[]> {
    if (!this.isLoaded) return [];
    const fromStations = this.findStationsByName(params.from);
    const toStations = this.findStationsByName(params.to);
    if (fromStations.length === 0 || toStations.length === 0) return [];
    const fromStopIds = new Set(fromStations.map(s => s.stop_id));
    const toStopIds = new Set(toStations.map(s => s.stop_id));
    const dateStr = this.formatGTFSDate(params.date);
    const solutions: JourneySolution[] = [];
    const searchHour = params.date.getHours(), searchMinute = params.date.getMinutes();
    for (const [tripId, stopTimes] of this.stopTimes) {
      const trip = this.trips.get(tripId);
      if (!trip || !this.isServiceActiveOnDate(trip.service_id, dateStr)) continue;
      let fromStop: GTFSStopTime | null = null, toStop: GTFSStopTime | null = null;
      for (const st of stopTimes) {
        if (fromStopIds.has(st.stop_id) && !fromStop) fromStop = st;
        if (toStopIds.has(st.stop_id) && fromStop) { toStop = st; break; }
      }
      if (fromStop && toStop) {
        const depTime = this.parseGTFSTime(fromStop.departure_time);
        if (depTime.hours > searchHour || (depTime.hours === searchHour && depTime.minutes >= searchMinute)) {
          const arrTime = this.parseGTFSTime(toStop.arrival_time);
          const route = this.routes.get(trip.route_id);
          const fromStation = this.stops.get(fromStop.stop_id), toStation = this.stops.get(toStop.stop_id);
          const departureDate = new Date(params.date); departureDate.setHours(depTime.hours % 24, depTime.minutes, 0, 0);
          const arrivalDate = new Date(params.date); arrivalDate.setHours(arrTime.hours % 24, arrTime.minutes, 0, 0);
          if (arrTime.hours >= 24 || arrivalDate < departureDate) arrivalDate.setDate(arrivalDate.getDate() + 1);
          solutions.push({
            id: tripId, departureTime: departureDate, arrivalTime: arrivalDate,
            duration: this.calculateDuration(departureDate, arrivalDate), changes: 0,
            legs: [{ train: { id: tripId, trainNumber: trip.trip_short_name || route?.route_short_name || tripId,
              category: this.getTrainCategory(route?.route_short_name || ''),
              categoryDesc: route?.route_long_name || 'Regionale', operator: 'trenord',
              origin: { id: fromStop.stop_id, name: fromStation?.stop_name || '' },
              destination: { id: toStop.stop_id, name: toStation?.stop_name || '' },
              departureTime: departureDate, arrivalTime: arrivalDate, duration: this.calculateDuration(departureDate, arrivalDate) },
              origin: { id: fromStop.stop_id, name: fromStation?.stop_name || '' },
              destination: { id: toStop.stop_id, name: toStation?.stop_name || '' },
              departureTime: departureDate, arrivalTime: arrivalDate }]
          });
        }
      }
    }
    return solutions.sort((a, b) => a.departureTime.getTime() - b.departureTime.getTime()).slice(0, 20);
  }

  async getTrainStatus(): Promise<Train | null> { return null; }
  async getTrainStops(): Promise<TrainStop[]> { return []; }
  async searchStations(query: string): Promise<Station[]> {
    if (!this.isLoaded || query.length < 2) return [];
    return this.findStationsByName(query).map(s => ({ id: s.stop_id, name: s.stop_name, lat: s.stop_lat, lon: s.stop_lon }));
  }
  async getStation(stationId: string): Promise<Station | null> {
    const stop = this.stops.get(stationId);
    return stop ? { id: stop.stop_id, name: stop.stop_name, lat: stop.stop_lat, lon: stop.stop_lon } : null;
  }
  async getAlerts(): Promise<Alert[]> { return []; }
  async getDepartures(): Promise<Train[]> { return []; }
  async getArrivals(): Promise<Train[]> { return []; }

  private parseCSV(data: string): Record<string, string>[] {
    const lines = data.trim().split('\n'); if (lines.length < 2) return [];
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    return lines.slice(1).map(line => {
      const values = this.parseCSVLine(line);
      const record: Record<string, string> = {};
      headers.forEach((h, i) => { record[h] = values[i] || ''; });
      return record;
    });
  }
  private parseCSVLine(line: string): string[] {
    const values: string[] = []; let current = '', inQuotes = false;
    for (const char of line) {
      if (char === '"') inQuotes = !inQuotes;
      else if (char === ',' && !inQuotes) { values.push(current.trim()); current = ''; }
      else current += char;
    }
    values.push(current.trim()); return values;
  }
  private parseStops(data: string): void { for (const r of this.parseCSV(data)) this.stops.set(r.stop_id, { stop_id: r.stop_id, stop_name: r.stop_name, stop_lat: parseFloat(r.stop_lat) || 0, stop_lon: parseFloat(r.stop_lon) || 0 }); }
  private parseRoutes(data: string): void { for (const r of this.parseCSV(data)) this.routes.set(r.route_id, { route_id: r.route_id, route_short_name: r.route_short_name, route_long_name: r.route_long_name, route_type: parseInt(r.route_type) || 2 }); }
  private parseTrips(data: string): void { for (const r of this.parseCSV(data)) this.trips.set(r.trip_id, { trip_id: r.trip_id, route_id: r.route_id, service_id: r.service_id, trip_short_name: r.trip_short_name || '' }); }
  private parseStopTimes(data: string): void {
    for (const r of this.parseCSV(data)) {
      if (!this.stopTimes.has(r.trip_id)) this.stopTimes.set(r.trip_id, []);
      this.stopTimes.get(r.trip_id)!.push({ trip_id: r.trip_id, arrival_time: r.arrival_time, departure_time: r.departure_time, stop_id: r.stop_id, stop_sequence: parseInt(r.stop_sequence) || 0 });
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
  private isServiceActiveOnDate(serviceId: string, dateStr: string): boolean { return this.calendarDates.get(serviceId)?.has(dateStr) || false; }
  private findStationsByName(query: string): GTFSStop[] {
    const lowerQuery = query.toLowerCase(), results: GTFSStop[] = [];
    for (const stop of this.stops.values()) if (stop.stop_name.toLowerCase().includes(lowerQuery)) results.push(stop);
    return results.sort((a, b) => a.stop_name.toLowerCase().startsWith(lowerQuery) ? -1 : b.stop_name.toLowerCase().startsWith(lowerQuery) ? 1 : 0).slice(0, 15);
  }
  private formatGTFSDate(date: Date): string { return `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`; }
  private parseGTFSTime(timeStr: string): { hours: number; minutes: number } { const [h, m] = timeStr.split(':').map(Number); return { hours: h, minutes: m }; }
  private getTrainCategory(routeName: string): TrainCategory {
    const upper = routeName.toUpperCase();
    if (upper.startsWith('RE')) return 'RV'; if (upper.startsWith('R')) return 'REG';
    if (upper.startsWith('S')) return 'MET'; if (upper.startsWith('MXP')) return 'RV';
    return 'REG';
  }
}

export const trenord = new TrenordAdapter();
