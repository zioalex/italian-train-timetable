import { useState, useEffect, useCallback, useRef } from 'react';
import { searchStations } from '../services/api';
import type { Station } from '../types';

interface StationInputProps { label: string; value: Station | null; onChange: (station: Station | null) => void; placeholder?: string; icon?: React.ReactNode; }

export default function StationInput({ label, value, onChange, placeholder = 'Cerca stazione...', icon }: StationInputProps) {
  const [query, setQuery] = useState(value?.name || '');
  const [suggestions, setSuggestions] = useState<Station[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const searchDebounced = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < 2) { setSuggestions([]); return; }
    setIsLoading(true);
    try { const results = await searchStations(searchQuery); setSuggestions(results); }
    catch (error) { console.error('Search error:', error); setSuggestions([]); }
    finally { setIsLoading(false); }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => { if (query && query !== value?.name) searchDebounced(query); }, 300);
    return () => clearTimeout(timer);
  }, [query, searchDebounced, value?.name]);

  useEffect(() => { if (value?.name && value.name !== query) setQuery(value.name); }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node) && !inputRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (station: Station) => { setQuery(station.name); onChange(station); setSuggestions([]); setIsOpen(false); };
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => { const newQuery = e.target.value; setQuery(newQuery); setIsOpen(true); if (!newQuery) onChange(null); };
  const handleFocus = () => { setIsFocused(true); setIsOpen(true); };
  const handleBlur = () => { setIsFocused(false); setTimeout(() => setIsOpen(false), 200); };

  return (
    <div className="relative">
      <label className="block text-sm font-medium text-gray-600 mb-1.5">{label}</label>
      <div className={`relative rounded-xl border-2 transition-all duration-200 ${isFocused ? 'border-red-500 shadow-lg shadow-red-100' : 'border-gray-200 hover:border-gray-300'}`}>
        {icon && <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">{icon}</span>}
        <input ref={inputRef} type="text" value={query} onChange={handleInputChange} onFocus={handleFocus} onBlur={handleBlur} placeholder={placeholder} className={`w-full py-3.5 rounded-xl bg-transparent focus:outline-none text-gray-800 placeholder-gray-400 ${icon ? 'pl-12 pr-10' : 'px-4'}`} />
        {isLoading && <span className="absolute right-4 top-1/2 -translate-y-1/2"><svg className="animate-spin h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg></span>}
        {value && !isLoading && <button type="button" onClick={() => { setQuery(''); onChange(null); inputRef.current?.focus(); }} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>}
      </div>
      {isOpen && suggestions.length > 0 && (
        <div ref={dropdownRef} className="absolute z-50 w-full mt-2 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden max-h-72 overflow-y-auto">
          {suggestions.map((station) => (
            <button key={station.id} type="button" className="w-full px-4 py-3.5 text-left hover:bg-red-50 transition-colors flex items-center gap-3 border-b border-gray-50 last:border-0" onMouseDown={(e) => e.preventDefault()} onClick={() => handleSelect(station)}>
              <span className="text-red-500 text-lg">📍</span>
              <div className="flex-1 min-w-0"><div className="font-medium text-gray-800 truncate">{station.name}</div><div className="text-xs text-gray-400">Codice: {station.id}</div></div>
            </button>
          ))}
        </div>
      )}
      {isOpen && query.length >= 2 && suggestions.length === 0 && !isLoading && <div className="absolute z-50 w-full mt-2 bg-white rounded-xl shadow-lg border border-gray-100 p-4 text-center text-gray-500">Nessuna stazione trovata</div>}
    </div>
  );
}
