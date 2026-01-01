import { Alert, AlertType } from '../types/index.js';

interface AlertSource { name: string; fetchAlerts(): Promise<Alert[]>; }
interface StoredAlert extends Alert { createdAt: Date; expiresAt?: Date; source: string; }

export class AlertsService {
  private alerts: Map<string, StoredAlert> = new Map();
  private sources: AlertSource[] = [];
  private lastFetch: Date | null = null;
  private fetchInterval: number = 5 * 60 * 1000;

  constructor() {
    this.sources.push(new TrenitaliaAlertsSource());
    this.sources.push(new TrenordAlertsSource());
  }

  async getAlerts(options?: { region?: string; line?: string; severity?: Alert['severity']; type?: AlertType; }): Promise<Alert[]> {
    await this.refreshAlertsIfNeeded();
    let alerts = Array.from(this.alerts.values()).filter(a => !a.expiresAt || a.expiresAt > new Date());
    if (options?.severity) alerts = alerts.filter(a => a.severity === options.severity);
    if (options?.type) alerts = alerts.filter(a => a.type === options.type);
    if (options?.line) alerts = alerts.filter(a => a.affectedLines?.some(l => l.toLowerCase().includes(options.line!.toLowerCase())));
    return alerts.sort((a, b) => {
      const severityOrder: Record<string, number> = { critical: 0, warning: 1, info: 2 };
      return (severityOrder[a.severity] || 2) - (severityOrder[b.severity] || 2);
    });
  }

  async getAlertsForJourney(fromStation: string, toStation: string, lines: string[]): Promise<Alert[]> {
    const allAlerts = await this.getAlerts();
    return allAlerts.filter(alert => {
      if (alert.affectedLines?.length) {
        if (alert.affectedLines.some(al => lines.some(l => l.toLowerCase().includes(al.toLowerCase())))) return true;
      }
      if (alert.affectedStations?.length) {
        if (alert.affectedStations.some(s => s.name.toLowerCase().includes(fromStation.toLowerCase()) || s.name.toLowerCase().includes(toStation.toLowerCase()))) return true;
      }
      return false;
    });
  }

  addAlert(alert: Omit<Alert, 'id'>, expiresInHours?: number): Alert {
    const id = `manual-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const storedAlert: StoredAlert = { ...alert, id, createdAt: new Date(), expiresAt: expiresInHours ? new Date(Date.now() + expiresInHours * 3600000) : undefined, source: 'manual' };
    this.alerts.set(id, storedAlert);
    return storedAlert;
  }

  removeAlert(id: string): boolean { return this.alerts.delete(id); }

  private async refreshAlertsIfNeeded(): Promise<void> {
    const now = new Date();
    if (this.lastFetch && (now.getTime() - this.lastFetch.getTime()) < this.fetchInterval) return;
    try {
      const results = await Promise.all(this.sources.map(s => s.fetchAlerts().catch(() => [] as Alert[])));
      for (const alerts of results) for (const alert of alerts) this.alerts.set(alert.id, { ...alert, createdAt: new Date(), source: 'external' });
      this.lastFetch = now;
    } catch (e) { console.error('Failed to refresh alerts:', e); }
  }

  async getStrikes(): Promise<Alert[]> { return this.getAlerts({ type: 'strike' }); }
  async isStrikeActive(): Promise<boolean> {
    const strikes = await this.getStrikes();
    const now = new Date();
    return strikes.some(s => (!s.startTime || !s.endTime) || (now >= new Date(s.startTime) && now <= new Date(s.endTime)));
  }
}

class TrenitaliaAlertsSource implements AlertSource {
  name = 'trenitalia';
  async fetchAlerts(): Promise<Alert[]> { return []; }
}

class TrenordAlertsSource implements AlertSource {
  name = 'trenord';
  async fetchAlerts(): Promise<Alert[]> { return []; }
}

export const alertsService = new AlertsService();
