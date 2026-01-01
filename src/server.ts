// Italian Train Search API Server
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import apiRoutes from './routes/api.routes.js';
import { trenord } from './adapters/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// API Routes
app.use('/api', apiRoutes);

// Serve static frontend in production
const frontendPath = path.join(__dirname, '../frontend/dist');
app.use(express.static(frontendPath));

// SPA fallback - serve index.html for all non-API routes
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(frontendPath, 'index.html'));
  }
});

// Initialize and start server
async function start() {
  // Load Trenord GTFS data if available
  const gtfsPath = process.env.GTFS_PATH || path.join(__dirname, '../data/trenord_gtfs');
  
  try {
    await trenord.loadGTFSData(gtfsPath);
    console.log('✅ Trenord GTFS data loaded');
  } catch (error) {
    console.log('⚠️  Trenord GTFS data not available - Trenord search disabled');
  }

  app.listen(PORT, () => {
    console.log(`
🚂 Italian Train Search API
━━━━━━━━━━━━━━━━━━━━━━━━━━━
Server running on port ${PORT}

Endpoints:
  GET /api/health
  GET /api/stations/search?q=
  GET /api/search?from=&to=&date=&time=
  GET /api/alerts

Frontend: Served from /frontend/dist
━━━━━━━━━━━━━━━━━━━━━━━━━━━
    `);
  });
}

start().catch(console.error);
