import { Router, Request, Response } from 'express';
import { trainSearchService } from '../services/trainSearch.service.js';
import { alertsService } from '../services/alerts.service.js';
import { SearchParams, Operator, AlertType } from '../types/index.js';

const router = Router();

router.get('/health', async (_req: Request, res: Response) => {
  const activeAdapters = await trainSearchService.getActiveAdapters();
  res.json({ status: 'ok', timestamp: new Date().toISOString(), adapters: activeAdapters });
});

router.get('/stations/search', async (req: Request, res: Response) => {
  const query = req.query.q as string;
  if (!query || query.length < 2) return res.status(400).json({ error: 'Query must be at least 2 characters' });
  const stations = await trainSearchService.searchStations(query);
  res.json({ stations });
});

router.get('/stations/:id', async (req: Request, res: Response) => {
  const station = await trainSearchService.getStation(req.params.id);
  if (!station) return res.status(404).json({ error: 'Station not found' });
  res.json(station);
});

router.get('/search', async (req: Request, res: Response) => {
  const { from, to, date, time, operators } = req.query;
  if (!from || !to) return res.status(400).json({ error: 'Parameters from and to are required' });
  let searchDate = new Date();
  if (date) searchDate = new Date(date as string);
  if (time) { const [h, m] = (time as string).split(':').map(Number); searchDate.setHours(h, m, 0, 0); }
  const params: SearchParams = { from: from as string, to: to as string, date: searchDate, operators: operators ? (operators as string).split(',') as Operator[] : undefined };
  const result = await trainSearchService.searchJourneys(params);
  res.json(result);
});

router.get('/trains/:trainId/status', async (req: Request, res: Response) => {
  const { origin, operator } = req.query;
  if (!origin) return res.status(400).json({ error: 'Parameter origin is required' });
  const train = await trainSearchService.getTrainStatus(req.params.trainId, origin as string, operator as Operator | undefined);
  if (!train) return res.status(404).json({ error: 'Train not found' });
  res.json(train);
});

router.get('/trains/:trainId/stops', async (req: Request, res: Response) => {
  const { origin, operator } = req.query;
  if (!origin) return res.status(400).json({ error: 'Parameter origin is required' });
  const stops = await trainSearchService.getTrainStops(req.params.trainId, origin as string, operator as Operator | undefined);
  res.json({ stops });
});

router.get('/stations/:id/departures', async (req: Request, res: Response) => {
  const dateTime = req.query.datetime ? new Date(req.query.datetime as string) : undefined;
  const trains = await trainSearchService.getDepartures(req.params.id, dateTime);
  res.json({ departures: trains });
});

router.get('/stations/:id/arrivals', async (req: Request, res: Response) => {
  const dateTime = req.query.datetime ? new Date(req.query.datetime as string) : undefined;
  const trains = await trainSearchService.getArrivals(req.params.id, dateTime);
  res.json({ arrivals: trains });
});

router.get('/alerts', async (req: Request, res: Response) => {
  const { type, severity, line } = req.query;
  const alerts = await alertsService.getAlerts({ type: type as AlertType, severity: severity as any, line: line as string });
  res.json({ alerts, count: alerts.length, timestamp: new Date().toISOString() });
});

router.get('/alerts/strikes', async (_req: Request, res: Response) => {
  const strikes = await alertsService.getStrikes();
  const isActive = await alertsService.isStrikeActive();
  res.json({ strikes, count: strikes.length, isStrikeActive: isActive, timestamp: new Date().toISOString() });
});

router.get('/alerts/journey', async (req: Request, res: Response) => {
  const { from, to, lines } = req.query;
  if (!from || !to) return res.status(400).json({ error: 'Parameters from and to are required' });
  const linesList = lines ? (lines as string).split(',').map(l => l.trim()) : [];
  const alerts = await alertsService.getAlertsForJourney(from as string, to as string, linesList);
  res.json({ alerts, count: alerts.length, journey: { from, to, lines: linesList }, timestamp: new Date().toISOString() });
});

router.post('/alerts', async (req: Request, res: Response) => {
  const { type, title, description, severity, affectedLines, expiresInHours } = req.body;
  if (!type || !title || !description || !severity) return res.status(400).json({ error: 'Required: type, title, description, severity' });
  const alert = alertsService.addAlert({ type, title, description, severity, affectedLines }, expiresInHours);
  res.status(201).json({ message: 'Alert created', alert });
});

router.delete('/alerts/:id', async (req: Request, res: Response) => {
  const deleted = alertsService.removeAlert(req.params.id);
  if (!deleted) return res.status(404).json({ error: 'Alert not found' });
  res.json({ message: 'Alert deleted', id: req.params.id });
});

export default router;
