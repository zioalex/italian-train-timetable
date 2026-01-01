import type { JourneySolution } from '../types';
import { TRAIN_CATEGORIES, OPERATORS } from '../types';

interface TrainDetailModalProps {
  solution: JourneySolution | null;
  onClose: () => void;
}

export default function TrainDetailModal({ solution, onClose }: TrainDetailModalProps) {
  if (!solution) return null;

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('it-IT', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('it-IT', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
  };

  const formatDuration = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h === 0) return `${m} min`;
    return m === 0 ? `${h} ore` : `${h}h ${m}m`;
  };

  const firstLeg = solution.legs[0];
  const mainCategory = firstLeg?.train.category || 'OTHER';
  const catStyle = TRAIN_CATEGORIES[mainCategory] || TRAIN_CATEGORIES.OTHER;

  const totalDelay = solution.legs.reduce((acc, leg) => acc + (leg.train.delay || 0), 0);

  return (
    <div 
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-t-3xl sm:rounded-3xl w-full sm:max-w-lg max-h-[90vh] overflow-hidden shadow-2xl flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`${catStyle.bgColor} ${catStyle.textColor} p-6 shrink-0`}>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm opacity-80">
                {formatDate(solution.departureTime)}
              </div>
              <div className="text-2xl font-bold mt-1">
                Dettagli Viaggio
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {/* Summary */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="text-3xl font-bold text-gray-800">
                {formatTime(solution.departureTime)}
              </div>
              <div className="text-gray-500">{firstLeg?.origin.name}</div>
            </div>
            <div className="flex-1 mx-4 flex flex-col items-center">
              <div className="text-sm text-gray-400 mb-1">
                {formatDuration(solution.duration)}
              </div>
              <div className="w-full border-t-2 border-dashed border-gray-200 relative">
                {solution.changes > 0 && (
                  <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-2 text-xs text-orange-500">
                    {solution.changes} cambio{solution.changes > 1 ? 'i' : ''}
                  </span>
                )}
              </div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-gray-800">
                {formatTime(solution.arrivalTime)}
              </div>
              <div className="text-gray-500">
                {solution.legs[solution.legs.length - 1]?.destination.name}
              </div>
            </div>
          </div>

          {/* Status */}
          <div className={`rounded-xl p-4 mb-6 ${totalDelay > 0 ? 'bg-red-50' : 'bg-green-50'}`}>
            <div className="flex items-center gap-3">
              <span className="text-2xl">{totalDelay > 0 ? '⚠️' : '✅'}</span>
              <div>
                <div className={`font-semibold ${totalDelay > 0 ? 'text-red-700' : 'text-green-700'}`}>
                  {totalDelay > 0 ? `Ritardo totale: ${totalDelay} minuti` : 'Viaggio in orario'}
                </div>
                <div className="text-sm text-gray-500">
                  Ultimo aggiornamento: adesso
                </div>
              </div>
            </div>
          </div>

          {/* Journey Legs */}
          <div className="space-y-4">
            <h4 className="font-semibold text-gray-700">Dettaglio tratte</h4>
            
            {solution.legs.map((leg, idx) => {
              const legCat = TRAIN_CATEGORIES[leg.train.category] || TRAIN_CATEGORIES.OTHER;
              const legOp = OPERATORS[leg.train.operator] || OPERATORS.other;
              
              return (
                <div key={idx} className="bg-gray-50 rounded-xl p-4">
                  {/* Train info */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`${legCat.bgColor} ${legCat.textColor} px-3 py-1 rounded-lg text-sm font-bold`}>
                      {leg.train.category}
                    </div>
                    <div>
                      <span className="font-medium text-gray-800">
                        {legCat.name} {leg.train.trainNumber}
                      </span>
                      <span className={`ml-2 text-sm ${legOp.color}`}>
                        {legOp.name}
                      </span>
                    </div>
                    {leg.train.delay && leg.train.delay > 0 && (
                      <span className="ml-auto text-red-500 text-sm font-medium">
                        +{leg.train.delay} min
                      </span>
                    )}
                  </div>

                  {/* Stations */}
                  <div className="space-y-3">
                    {/* Departure */}
                    <div className="flex items-start gap-3">
                      <div className="flex flex-col items-center">
                        <div className="w-3 h-3 rounded-full bg-green-500 border-2 border-white shadow"></div>
                        <div className="w-0.5 h-8 bg-gray-300"></div>
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-medium text-gray-800">{leg.origin.name}</div>
                            <div className="text-sm text-gray-500">Partenza</div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-gray-800">{formatTime(leg.departureTime)}</div>
                            {leg.platform && (
                              <div className="text-sm text-gray-500">Bin. {leg.platform}</div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Arrival */}
                    <div className="flex items-start gap-3">
                      <div className="flex flex-col items-center">
                        <div className="w-3 h-3 rounded-full bg-red-500 border-2 border-white shadow"></div>
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-medium text-gray-800">{leg.destination.name}</div>
                            <div className="text-sm text-gray-500">Arrivo</div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-gray-800">{formatTime(leg.arrivalTime)}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Connection warning */}
            {solution.legs.length > 1 && (
              <div className="bg-orange-50 rounded-xl p-4 text-sm">
                <div className="flex items-start gap-2">
                  <span className="text-orange-500">⚠️</span>
                  <div className="text-orange-700">
                    <strong>Attenzione:</strong> questo viaggio prevede {solution.changes} cambio{solution.changes > 1 ? 'i' : ''}. 
                    Assicurati di avere tempo sufficiente per le coincidenze.
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 shrink-0">
          <button
            onClick={onClose}
            className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3 px-4 rounded-xl transition-colors"
          >
            Chiudi
          </button>
        </div>
      </div>
    </div>
  );
}
