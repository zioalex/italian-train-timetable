import type { JourneySolution } from '../types';
import { TRAIN_CATEGORIES, OPERATORS } from '../types';

interface TrainCardProps { solution: JourneySolution; onClick?: () => void; }

export default function TrainCard({ solution, onClick }: TrainCardProps) {
  const firstLeg = solution.legs[0];
  const mainTrain = firstLeg?.train;
  const category = mainTrain?.category || 'OTHER';
  const catStyle = TRAIN_CATEGORIES[category] || TRAIN_CATEGORIES.OTHER;
  const operator = mainTrain?.operator || 'other';
  const opStyle = OPERATORS[operator] || OPERATORS.other;

  const formatTime = (dateStr: string) => new Date(dateStr).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
  const formatDuration = (minutes: number) => { const h = Math.floor(minutes / 60); const m = minutes % 60; if (h === 0) return `${m}m`; return m === 0 ? `${h}h` : `${h}h ${m}m`; };
  const totalDelay = solution.legs.reduce((acc, leg) => acc + (leg.train.delay || 0), 0);

  return (
    <div onClick={onClick} className={`bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden cursor-pointer border border-gray-100 hover:border-red-200 ${onClick ? 'cursor-pointer' : ''}`}>
      <div className="p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`${catStyle.bgColor} ${catStyle.textColor} ${catStyle.borderColor ? `border-2 ${catStyle.borderColor}` : ''} px-4 py-2 rounded-xl font-bold text-sm min-w-20 text-center`}>{category}</div>
            <div>
              <div className="flex items-center gap-3 text-2xl font-bold text-gray-800"><span>{formatTime(solution.departureTime)}</span><span className="text-gray-300 text-lg">→</span><span>{formatTime(solution.arrivalTime)}</span></div>
              <div className="text-sm text-gray-500 mt-1">{catStyle.name} {mainTrain?.trainNumber}{solution.changes > 0 && <span className="ml-2 text-orange-500">• {solution.changes} cambio{solution.changes > 1 ? 'i' : ''}</span>}</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xl font-semibold text-gray-700">{formatDuration(solution.duration)}</div>
            {totalDelay > 0 ? <div className="text-red-500 text-sm font-medium mt-1">+{totalDelay} min ritardo</div> : <div className="text-green-500 text-sm font-medium mt-1">✓ In orario</div>}
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm"><span className={`w-2 h-2 rounded-full ${operator === 'trenitalia' ? 'bg-red-500' : operator === 'trenord' ? 'bg-green-500' : operator === 'italo' ? 'bg-purple-500' : 'bg-gray-500'}`} /><span className={opStyle.color}>{opStyle.name}</span></div>
          {solution.legs.length > 1 && <div className="text-sm text-gray-400">via {solution.legs.slice(0, -1).map(l => l.destination.name.split(' ')[0]).join(', ')}</div>}
          {solution.changes === 0 && <div className="text-sm text-gray-400">Diretto</div>}
        </div>
      </div>
    </div>
  );
}
