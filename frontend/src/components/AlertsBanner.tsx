import { useState } from 'react';
import type { Alert } from '../types';

interface AlertsBannerProps {
  alerts: Alert[];
  onDismiss?: (alertId: string) => void;
}

export default function AlertsBanner({ alerts, onDismiss }: AlertsBannerProps) {
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<string | null>(null);

  const visibleAlerts = alerts.filter(a => !dismissedIds.has(a.id));
  
  if (visibleAlerts.length === 0) return null;

  const handleDismiss = (id: string) => {
    setDismissedIds(prev => new Set([...prev, id]));
    onDismiss?.(id);
  };

  const getSeverityStyles = (severity: Alert['severity']) => {
    switch (severity) {
      case 'critical':
        return {
          bg: 'bg-red-50 border-red-200',
          icon: '🚨',
          iconBg: 'bg-red-100',
          title: 'text-red-800',
          text: 'text-red-700',
          badge: 'bg-red-600 text-white',
        };
      case 'warning':
        return {
          bg: 'bg-amber-50 border-amber-200',
          icon: '⚠️',
          iconBg: 'bg-amber-100',
          title: 'text-amber-800',
          text: 'text-amber-700',
          badge: 'bg-amber-500 text-white',
        };
      case 'info':
      default:
        return {
          bg: 'bg-blue-50 border-blue-200',
          icon: 'ℹ️',
          iconBg: 'bg-blue-100',
          title: 'text-blue-800',
          text: 'text-blue-700',
          badge: 'bg-blue-500 text-white',
        };
    }
  };

  const getTypeLabel = (type: Alert['type']) => {
    const labels: Record<string, string> = {
      strike: 'Sciopero',
      disruption: 'Disservizio',
      engineering_works: 'Lavori',
      delay: 'Ritardi',
      cancellation: 'Cancellazione',
      other: 'Avviso',
    };
    return labels[type] || 'Avviso';
  };

  return (
    <div className="space-y-3">
      {visibleAlerts.map((alert) => {
        const styles = getSeverityStyles(alert.severity);
        const isExpanded = expanded === alert.id;

        return (
          <div
            key={alert.id}
            className={`${styles.bg} border rounded-xl overflow-hidden transition-all duration-200`}
          >
            <div className="p-4">
              <div className="flex items-start gap-3">
                {/* Icon */}
                <div className={`${styles.iconBg} w-10 h-10 rounded-lg flex items-center justify-center shrink-0`}>
                  <span className="text-xl">{styles.icon}</span>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Type badge */}
                    <span className={`${styles.badge} text-xs font-bold px-2 py-0.5 rounded`}>
                      {getTypeLabel(alert.type)}
                    </span>
                    
                    {/* Affected lines */}
                    {alert.affectedLines && alert.affectedLines.length > 0 && (
                      <div className="flex items-center gap-1">
                        {alert.affectedLines.slice(0, 3).map((line, i) => (
                          <span
                            key={i}
                            className="bg-gray-200 text-gray-700 text-xs px-1.5 py-0.5 rounded"
                          >
                            {line}
                          </span>
                        ))}
                        {alert.affectedLines.length > 3 && (
                          <span className="text-xs text-gray-500">
                            +{alert.affectedLines.length - 3}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Title */}
                  <h4 className={`${styles.title} font-semibold mt-1`}>
                    {alert.title}
                  </h4>

                  {/* Description - truncated or full */}
                  <p className={`${styles.text} text-sm mt-1 ${isExpanded ? '' : 'line-clamp-2'}`}>
                    {alert.description}
                  </p>

                  {/* Dates if available */}
                  {(alert.startTime || alert.endTime) && (
                    <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                      <span>📅</span>
                      {alert.startTime && (
                        <span>
                          Dal {new Date(alert.startTime).toLocaleDateString('it-IT', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      )}
                      {alert.endTime && (
                        <span>
                          al {new Date(alert.endTime).toLocaleDateString('it-IT', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Expand/Collapse */}
                  {alert.description.length > 100 && (
                    <button
                      onClick={() => setExpanded(isExpanded ? null : alert.id)}
                      className={`${styles.text} text-sm font-medium mt-2 hover:underline`}
                    >
                      {isExpanded ? 'Mostra meno' : 'Mostra tutto'}
                    </button>
                  )}
                </div>

                {/* Dismiss button */}
                <button
                  onClick={() => handleDismiss(alert.id)}
                  className="p-1 hover:bg-white/50 rounded-lg transition-colors shrink-0"
                  title="Nascondi avviso"
                >
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
