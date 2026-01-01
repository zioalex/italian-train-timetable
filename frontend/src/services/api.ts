import axios from 'axios';
import type { Station, SearchResponse, Train } from '../types';

// API base URL - use relative path in production, localhost in dev
const API_BASE = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Health check
export async function checkHealth(): Promise<{ 
  status: string; 
  adapters: string[] 
}> {
  const { data } = await api.get('/health');
  return data;
}

// Search stations by name
export async function searchStations(query: string): Promise<Station[]> {
  if (query.length < 2) return [];
  
  try {
    const { data } = await api.get('/stations/search', {
      params: { q: query },
    });
    return data.stations || [];
  } catch (error) {
    console.error('Station search error:', error);
    return [];
  }
}

// Get station details
export async function getStation(stationId: string): Promise<Station | null> {
  try {
    const { data } = await api.get(`/stations/${stationId}`);
    return data;
  } catch (error) {
    console.error('Get station error:', error);
    return null;
  }
}

// Search journey solutions
export async function searchJourneys(params: {
  from: string;
  to: string;
  date: string;
  time: string;
  operators?: string[];
}): Promise<SearchResponse> {
  try {
    const { data } = await api.get('/search', {
      params: {
        from: params.from,
        to: params.to,
        date: params.date,
        time: params.time,
        operators: params.operators?.join(','),
      },
    });
    return data;
  } catch (error) {
    console.error('Search journeys error:', error);
    return { solutions: [] };
  }
}

// Get train status
export async function getTrainStatus(
  trainId: string, 
  originStationId: string,
  operator?: string
): Promise<Train | null> {
  try {
    const { data } = await api.get(`/trains/${trainId}/status`, {
      params: { origin: originStationId, operator },
    });
    return data;
  } catch (error) {
    console.error('Get train status error:', error);
    return null;
  }
}

// Get departures from a station
export async function getDepartures(
  stationId: string, 
  datetime?: string
): Promise<Train[]> {
  try {
    const { data } = await api.get(`/stations/${stationId}/departures`, {
      params: { datetime },
    });
    return data.departures || [];
  } catch (error) {
    console.error('Get departures error:', error);
    return [];
  }
}

// Get arrivals at a station
export async function getArrivals(
  stationId: string, 
  datetime?: string
): Promise<Train[]> {
  try {
    const { data } = await api.get(`/stations/${stationId}/arrivals`, {
      params: { datetime },
    });
    return data.arrivals || [];
  } catch (error) {
    console.error('Get arrivals error:', error);
    return [];
  }
}

// ==================== ALERTS API ====================

import type { Alert } from '../types';

export interface AlertsResponse {
  alerts: Alert[];
  count: number;
  timestamp: string;
}

export interface StrikesResponse {
  strikes: Alert[];
  count: number;
  isStrikeActive: boolean;
  timestamp: string;
}

// Get all active alerts
export async function getAlerts(options?: {
  type?: string;
  severity?: string;
  line?: string;
}): Promise<AlertsResponse> {
  try {
    const { data } = await api.get('/alerts', { params: options });
    return data;
  } catch (error) {
    console.error('Get alerts error:', error);
    return { alerts: [], count: 0, timestamp: new Date().toISOString() };
  }
}

// Get active and upcoming strikes
export async function getStrikes(): Promise<StrikesResponse> {
  try {
    const { data } = await api.get('/alerts/strikes');
    return data;
  } catch (error) {
    console.error('Get strikes error:', error);
    return { strikes: [], count: 0, isStrikeActive: false, timestamp: new Date().toISOString() };
  }
}

// Get alerts relevant to a specific journey
export async function getJourneyAlerts(
  from: string,
  to: string,
  lines?: string[]
): Promise<AlertsResponse> {
  try {
    const { data } = await api.get('/alerts/journey', {
      params: { from, to, lines: lines?.join(',') },
    });
    return data;
  } catch (error) {
    console.error('Get journey alerts error:', error);
    return { alerts: [], count: 0, timestamp: new Date().toISOString() };
  }
}

export default api;
