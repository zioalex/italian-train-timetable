// API Routes for Train Search
import { Router, Request, Response } from 'express';
import { trainSearchService } from '../services/trainSearch.service.js';
import { alertsService } from '../services/alerts.service.js';
import { SearchParams, Operator, AlertType } from '../types/index.js';

const router = Router();

/**
 * GET /api/health
 * Health check endpoint
 */
router.get('/health', async (req: Request, res: Response) => {
  try {
    const activeAdapters = await trainSearchService.getActiveAdapters();
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      adapters: activeAdapters,
    });
  } catch (error) {
    res.status(500).json({ error: 'Health check failed' });
  }
});

/**
 * GET /api/stations/search
 * Search stations by name
 * Query params: q (search query)
 */
router.get('/stations/search', async (req: Request, res: Response) => {
  try {
    const query = req.query.q as string;
    
    if (!query || query.length < 2) {
      return res.status(400).json({ 
        error: 'Query parameter "q" must be at least 2 characters' 
      });
    }

    const stations = await trainSearchService.searchStations(query);
    res.json({ stations });
  } catch (error) {
    console.error('Station search error:', error);
    res.status(500).json({ error: 'Failed to search stations' });
  }
});

/**
 * GET /api/stations/:id
 * Get station details by ID
 */
router.get('/stations/:id', async (req: Request, res: Response) => {
  try {
    const station = await trainSearchService.getStation(req.params.id);
    
    if (!station) {
      return res.status(404).json({ error: 'Station not found' });
    }

    res.json(station);
  } catch (error) {
    console.error('Station lookup error:', error);
    res.status(500).json({ error: 'Failed to get station' });
  }
});

/**
 * GET /api/search
 * Search for journey solutions
 * Query params: from, to, date, time, operators (comma-separated)
 */
router.get('/search', async (req: Request, res: Response) => {
  try {
    const { from, to, date, time, operators } = req.query;

    if (!from || !to) {
      return res.status(400).json({ 
        error: 'Parameters "from" and "to" are required' 
      });
    }

    // Build search date
    let searchDate = new Date();
    if (date) {
      searchDate = new Date(date as string);
    }
    if (time) {
      const [hours, minutes] = (time as string).split(':').map(Number);
      searchDate.setHours(hours, minutes, 0, 0);
    }

    // Parse operators filter
    const operatorFilter = operators 
      ? (operators as string).split(',') as Operator[]
      : undefined;

    const params: SearchParams = {
      from: from as string,
      to: to as string,
      date: searchDate,
      operators: operatorFilter,
    };

    const result = await trainSearchService.searchJourneys(params);
    res.json(result);
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Failed to search journeys' });
  }
});

/**
 * GET /api/trains/:trainId/status
 * Get real-time train status
 * Query params: origin (station ID), operator
 */
router.get('/trains/:trainId/status', async (req: Request, res: Response) => {
  try {
    const { trainId } = req.params;
    const { origin, operator } = req.query;

    if (!origin) {
      return res.status(400).json({ 
        error: 'Parameter "origin" (station ID) is required' 
      });
    }

    const train = await trainSearchService.getTrainStatus(
      trainId,
      origin as string,
      operator as Operator | undefined
    );

    if (!train) {
      return res.status(404).json({ error: 'Train not found' });
    }

    res.json(train);
  } catch (error) {
    console.error('Train status error:', error);
    res.status(500).json({ error: 'Failed to get train status' });
  }
});

/**
 * GET /api/trains/:trainId/stops
 * Get train stops with real-time data
 * Query params: origin (station ID), operator
 */
router.get('/trains/:trainId/stops', async (req: Request, res: Response) => {
  try {
    const { trainId } = req.params;
    const { origin, operator } = req.query;

    if (!origin) {
      return res.status(400).json({ 
        error: 'Parameter "origin" (station ID) is required' 
      });
    }

    const stops = await trainSearchService.getTrainStops(
      trainId,
      origin as string,
      operator as Operator | undefined
    );

    res.json({ stops });
  } catch (error) {
    console.error('Train stops error:', error);
    res.status(500).json({ error: 'Failed to get train stops' });
  }
});

/**
 * GET /api/stations/:id/departures
 * Get departures from a station
 * Query params: datetime (ISO string)
 */
router.get('/stations/:id/departures', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { datetime } = req.query;

    const dateTime = datetime ? new Date(datetime as string) : undefined;
    const trains = await trainSearchService.getDepartures(id, dateTime);

    res.json({ departures: trains });
  } catch (error) {
    console.error('Departures error:', error);
    res.status(500).json({ error: 'Failed to get departures' });
  }
});

/**
 * GET /api/stations/:id/arrivals
 * Get arrivals at a station
 * Query params: datetime (ISO string)
 */
router.get('/stations/:id/arrivals', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { datetime } = req.query;

    const dateTime = datetime ? new Date(datetime as string) : undefined;
    const trains = await trainSearchService.getArrivals(id, dateTime);

    res.json({ arrivals: trains });
  } catch (error) {
    console.error('Arrivals error:', error);
    res.status(500).json({ error: 'Failed to get arrivals' });
  }
});

// ==================== ALERTS ENDPOINTS ====================

/**
 * GET /api/alerts
 * Get all active alerts
 * Query params: type, severity, line, region
 */
router.get('/alerts', async (req: Request, res: Response) => {
  try {
    const { type, severity, line, region } = req.query;

    const alerts = await alertsService.getAlerts({
      type: type as AlertType | undefined,
      severity: severity as 'info' | 'warning' | 'critical' | undefined,
      line: line as string | undefined,
      region: region as string | undefined,
    });

    res.json({ 
      alerts,
      count: alerts.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Alerts error:', error);
    res.status(500).json({ error: 'Failed to get alerts' });
  }
});

/**
 * GET /api/alerts/strikes
 * Get active and upcoming strikes
 */
router.get('/alerts/strikes', async (req: Request, res: Response) => {
  try {
    const strikes = await alertsService.getStrikes();
    const isActive = await alertsService.isStrikeActive();

    res.json({
      strikes,
      count: strikes.length,
      isStrikeActive: isActive,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Strikes error:', error);
    res.status(500).json({ error: 'Failed to get strikes' });
  }
});

/**
 * GET /api/alerts/journey
 * Get alerts relevant to a specific journey
 * Query params: from, to, lines (comma-separated)
 */
router.get('/alerts/journey', async (req: Request, res: Response) => {
  try {
    const { from, to, lines } = req.query;

    if (!from || !to) {
      return res.status(400).json({
        error: 'Parameters "from" and "to" are required',
      });
    }

    const linesList = lines 
      ? (lines as string).split(',').map(l => l.trim())
      : [];

    const alerts = await alertsService.getAlertsForJourney(
      from as string,
      to as string,
      linesList
    );

    res.json({
      alerts,
      count: alerts.length,
      journey: { from, to, lines: linesList },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Journey alerts error:', error);
    res.status(500).json({ error: 'Failed to get journey alerts' });
  }
});

/**
 * POST /api/alerts
 * Add a new alert (admin/manual)
 * Body: { type, title, description, severity, affectedLines?, affectedStations?, expiresInHours? }
 */
router.post('/alerts', async (req: Request, res: Response) => {
  try {
    const { type, title, description, severity, affectedLines, affectedStations, expiresInHours } = req.body;

    if (!type || !title || !description || !severity) {
      return res.status(400).json({
        error: 'Required fields: type, title, description, severity',
      });
    }

    const alert = alertsService.addAlert(
      {
        type,
        title,
        description,
        severity,
        affectedLines,
        affectedStations,
      },
      expiresInHours
    );

    res.status(201).json({
      message: 'Alert created successfully',
      alert,
    });
  } catch (error) {
    console.error('Create alert error:', error);
    res.status(500).json({ error: 'Failed to create alert' });
  }
});

/**
 * DELETE /api/alerts/:id
 * Remove an alert by ID
 */
router.delete('/alerts/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const deleted = alertsService.removeAlert(id);

    if (!deleted) {
      return res.status(404).json({ error: 'Alert not found' });
    }

    res.json({ message: 'Alert deleted successfully', id });
  } catch (error) {
    console.error('Delete alert error:', error);
    res.status(500).json({ error: 'Failed to delete alert' });
  }
});

export default router;
