import { useState, useEffect } from 'react';
import { StationInput, TrainCard, TrainDetailModal, AlertsBanner, StrikeBanner } from './components';
import { searchJourneys, checkHealth, getStrikes, getJourneyAlerts } from './services/api';
import type { Station, JourneySolution, Alert } from './types';

function App() {
  // Search form state
  const [fromStation, setFromStation] = useState<Station | null>(null);
  const [toStation, setToStation] = useState<Station | null>(null);
  const [date, setDate] = useState('2025-09-01'); // Default to date within GTFS range
  const [time, setTime] = useState(() => 
    new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  );

  // Results state
  const [results, setResults] = useState<JourneySolution[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedSolution, setSelectedSolution] = useState<JourneySolution | null>(null);

  // Alerts state
  const [strikes, setStrikes] = useState<Alert[]>([]);
  const [isStrikeActive, setIsStrikeActive] = useState(false);
  const [journeyAlerts, setJourneyAlerts] = useState<Alert[]>([]);

  // API status
  const [apiStatus, setApiStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [activeAdapters, setActiveAdapters] = useState<string[]>([]);

  // Check API health and fetch strikes on mount
  useEffect(() => {
    const checkApi = async () => {
      try {
        const health = await checkHealth();
        setApiStatus('online');
        setActiveAdapters(health.adapters);
        
        // Fetch strikes
        const strikesData = await getStrikes();
        setStrikes(strikesData.strikes);
        setIsStrikeActive(strikesData.isStrikeActive);
      } catch {
        setApiStatus('offline');
      }
    };
    checkApi();
  }, []);

  // Search handler
  const handleSearch = async () => {
    if (!fromStation || !toStation) {
      setError('Seleziona stazione di partenza e arrivo');
      return;
    }

    setLoading(true);
    setError(null);
    setResults([]);
    setJourneyAlerts([]);

    try {
      // Fetch journeys
      const response = await searchJourneys({
        from: fromStation.id,
        to: toStation.id,
        date,
        time,
      });

      if (response.solutions.length === 0) {
        setError('Nessun treno trovato per questa tratta. Nota: i dati Trenord coprono solo il periodo 29 Lug - 13 Dic 2025.');
        setJourneyAlerts([]); // Clear alerts when no results
      } else {
        setResults(response.solutions);
        
        // Fetch alerts for this journey
        const lines = response.solutions
          .flatMap(s => s.legs.map(l => l.train.categoryDesc))
          .filter((v, i, a) => a.indexOf(v) === i); // unique
        
        const alertsResponse = await getJourneyAlerts(
          fromStation.name,
          toStation.name,
          lines
        );
        setJourneyAlerts(alertsResponse.alerts);
      }
    } catch (err) {
      console.error('Search error:', err);
      setError('Errore durante la ricerca. Riprova più tardi.');
    } finally {
      setLoading(false);
    }
  };

  // Swap stations
  const handleSwap = () => {
    const temp = fromStation;
    setFromStation(toStation);
    setToStation(temp);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Strike Banner - shows at top if there's an active/upcoming strike */}
      {strikes.length > 0 && (
        <StrikeBanner strikes={strikes} isStrikeActive={isStrikeActive} />
      )}

      {/* Header */}
      <header className="bg-gradient-to-r from-red-600 via-red-600 to-red-700 text-white py-6 px-4 shadow-lg">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <span className="text-4xl">🚄</span>
            Cerca Treni Italia
          </h1>
          <p className="text-red-200 mt-1">
            Trenitalia • Trenord • Italo
          </p>
          
          {/* API Status */}
          <div className="mt-3 flex items-center gap-2 text-sm">
            <span 
              className={`w-2 h-2 rounded-full ${
                apiStatus === 'online' ? 'bg-green-400' :
                apiStatus === 'offline' ? 'bg-red-400' : 'bg-yellow-400 animate-pulse'
              }`}
            />
            <span className="text-red-200">
              {apiStatus === 'online' && `API online${activeAdapters.length > 0 ? ` (${activeAdapters.join(', ')})` : ''}`}
              {apiStatus === 'offline' && 'API offline - usando dati demo'}
              {apiStatus === 'checking' && 'Connessione...'}
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-4 py-6">
        {/* Journey-specific alerts */}
        {journeyAlerts.length > 0 && (
          <div className="mb-4">
            <AlertsBanner alerts={journeyAlerts} />
          </div>
        )}

        {/* Search Form */}
        <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
          {/* Station Inputs */}
          <div className="space-y-4">
            <StationInput
              label="Da"
              value={fromStation}
              onChange={setFromStation}
              placeholder="Stazione di partenza..."
              icon={<span className="text-xl">🚉</span>}
            />

            {/* Swap Button */}
            <div className="flex justify-center -my-2 relative z-10">
              <button
                type="button"
                onClick={handleSwap}
                className="bg-white border-2 border-gray-200 hover:border-red-300 hover:bg-red-50 rounded-full p-2.5 shadow-md transition-all"
                title="Inverti stazioni"
              >
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                </svg>
              </button>
            </div>

            <StationInput
              label="A"
              value={toStation}
              onChange={setToStation}
              placeholder="Stazione di arrivo..."
              icon={<span className="text-xl">📍</span>}
            />
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-4 mt-6">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1.5">
                Data
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-4 py-3.5 border-2 border-gray-200 rounded-xl focus:border-red-500 focus:outline-none transition-colors"
              />
              <p className="text-xs text-gray-400 mt-1">Dati: 29 Lug - 13 Dic 2025</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1.5">
                Ora
              </label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full px-4 py-3.5 border-2 border-gray-200 rounded-xl focus:border-red-500 focus:outline-none transition-colors"
              />
            </div>
          </div>

          {/* Search Button */}
          <button
            onClick={handleSearch}
            disabled={loading || !fromStation || !toStation}
            className={`
              w-full mt-6 font-bold py-4 px-6 rounded-xl shadow-lg 
              transition-all duration-200 flex items-center justify-center gap-2
              ${loading || !fromStation || !toStation
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white hover:shadow-xl'
              }
            `}
          >
            {loading ? (
              <>
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Ricerca in corso...
              </>
            ) : (
              <>
                <span>🔍</span>
                Cerca Treni
              </>
            )}
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center gap-2">
            <span>⚠️</span>
            {error}
          </div>
        )}

        {/* Results */}
        {results.length > 0 && (
          <div className="mt-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-800">
                {results.length} treni trovati
              </h2>
              <span className="text-sm text-gray-500">
                {fromStation?.name.split(' ')[0]} → {toStation?.name.split(' ')[0]}
              </span>
            </div>

            <div className="space-y-4">
              {results.map((solution) => (
                <TrainCard
                  key={solution.id}
                  solution={solution}
                  onClick={() => setSelectedSolution(solution)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <footer className="mt-8 pb-6 text-center text-gray-400 text-sm">
          <p>Dati forniti da ViaggiaTreno API</p>
          <p className="mt-1">Gli orari sono indicativi e soggetti a variazioni</p>
        </footer>
      </main>

      {/* Detail Modal */}
      <TrainDetailModal
        solution={selectedSolution}
        onClose={() => setSelectedSolution(null)}
      />
    </div>
  );
}

export default App;
