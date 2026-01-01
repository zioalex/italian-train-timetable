import axios from 'axios';
import type { Station, SearchResponse, Alert } from '../types';

const API_BASE = import.meta.env.VITE_API_URL || '/api';
const api = axios.create({ baseURL: API_BASE, timeout: 15000, headers: { 'Content-Type': 'application/json' } });

export async function checkHealth(): Promise<{ status: string; adapters: string[] }> {
  const { data } = await api.get('/health');
  return data;
}

export async function searchStations(query: string): Promise<Station[]> {
  if (query.length < 2) return [];
  try { const { data } = await api.get('/stations/search', { params: { q: query } }); return data.stations || []; }
  catch (error) { console.error('Station search error:', error); return []; }
}

export async function searchJourneys(params: { from: string; to: string; date: string; time: string; operators?: string[] }): Promise<SearchResponse> {
  try {
    const { data } = await api.get('/search', { params: { from: params.from, to: params.to, date: params.date, time: params.time, operators: params.operators?.join(',') } });
    return data;
  } catch (error) { console.error('Search journeys error:', error); return { solutions: [] }; }
}

export interface AlertsResponse { alerts: Alert[]; count: number; timestamp: string; }
export interface StrikesResponse { strikes: Alert[]; count: number; isStrikeActive: boolean; timestamp: string; }

export async function getAlerts(options?: { type?: string; severity?: string; line?: string }): Promise<AlertsResponse> {
  try { const { data } = await api.get('/alerts', { params: options }); return data; }
  catch (error) { console.error('Get alerts error:', error); return { alerts: [], count: 0, timestamp: new Date().toISOString() }; }
}

export async function getStrikes(): Promise<StrikesResponse> {
  try { const { data } = await api.get('/alerts/strikes'); return data; }
  catch (error) { console.error('Get strikes error:', error); return { strikes: [], count: 0, isStrikeActive: false, timestamp: new Date().toISOString() }; }
}

export async function getJourneyAlerts(from: string, to: string, lines?: string[]): Promise<AlertsResponse> {
  try { const { data } = await api.get('/alerts/journey', { params: { from, to, lines: lines?.join(',') } }); return data; }
  catch (error) { console.error('Get journey alerts error:', error); return { alerts: [], count: 0, timestamp: new Date().toISOString() }; }
}

export default api;
