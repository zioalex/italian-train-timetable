# 🚄 Italian Train Search

Search Italian trains across multiple operators: **Trenitalia**, **Trenord**, and **Italo**.

## Features

- 🔍 Station autocomplete search
- 🚂 Real-time train schedules (Trenitalia via ViaggiaTreno API)
- 📊 GTFS static data (Trenord)
- 🚨 Service alerts (strikes, disruptions, engineering works)
- 📱 Mobile-friendly responsive design

## Live Demo

Deployed on Railway: [your-app-url.railway.app]

## Tech Stack

- **Frontend**: React + TypeScript + Vite + Tailwind CSS
- **Backend**: Node.js + Express + TypeScript
- **Data**: ViaggiaTreno API + GTFS

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/health` | Health check |
| `GET /api/stations/search?q=` | Search stations |
| `GET /api/search?from=&to=&date=&time=` | Search journeys |
| `GET /api/alerts` | Get service alerts |
| `GET /api/alerts/strikes` | Get strike info |

## Deployment

This app is configured for Railway deployment:

1. Push to GitHub
2. Connect repo to Railway
3. Deploy automatically

## Local Development

```bash
# Install dependencies
npm install
cd frontend && npm install && cd ..

# Run development
npm run dev
```

## License

MIT
