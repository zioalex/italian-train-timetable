import { useState } from 'react';
import type { Alert } from '../types';

interface StrikeBannerProps { strikes: Alert[]; isStrikeActive: boolean; }

export default function StrikeBanner({ strikes, isStrikeActive }: StrikeBannerProps) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed || strikes.length === 0) return null;
  const nextStrike = strikes[0];
  const formatDate = (date: Date | string | undefined) => { if (!date) return ''; return new Date(date).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' }); };

  return (
    <div className={`${isStrikeActive ? 'bg-red-600' : 'bg-orange-500'} text-white px-4 py-3 relative`}>
      <div className="max-w-2xl mx-auto flex items-center gap-3">
        <div className={`text-2xl ${isStrikeActive ? 'animate-pulse' : ''}`}>{isStrikeActive ? '🚫' : '⚠️'}</div>
        <div className="flex-1">
          <div className="font-bold flex items-center gap-2">{isStrikeActive ? 'SCIOPERO IN CORSO' : 'SCIOPERO PROGRAMMATO'}{isStrikeActive && <span className="bg-white/20 text-xs px-2 py-0.5 rounded-full animate-pulse">ATTIVO</span>}</div>
          <div className="text-sm text-white/90">{nextStrike.title}{nextStrike.startTime && !isStrikeActive && <span> - {formatDate(nextStrike.startTime)}</span>}</div>
        </div>
        <a href="https://scioperi.mit.gov.it/" target="_blank" rel="noopener noreferrer" className="bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors">Info scioperi</a>
        <button onClick={() => setDismissed(true)} className="p-1 hover:bg-white/20 rounded-lg transition-colors"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
      </div>
    </div>
  );
}
