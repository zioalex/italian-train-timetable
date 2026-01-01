import { Alert, AlertType } from '../types/index.js';

interface AlertSource { name: string; fetchAlerts(): Promise&lt;Alert[]&gt;; }
interface StoredAlert extends Alert { createdAt: Date; expiresAt?: Date; source: string; }

export class AlertsService {
  private alerts: Map&lt;string, StoredAlert&gt; = new Map();
  private sources: AlertSource[] = [];
  private lastFetch: Date | null = null;
  private fetchInterval: number = 5 * 60 * 1000;

  constructor() {
    this.sources.push(new TrenitaliaAlertsSource());
    this.sources.push(new TrenordAlertsSource());
  }

  async getAlerts(options?: { region?: string; line?: string; severity?: Alert['severity']; type?: AlertType }): Promise&lt;Alert[]&gt; {
    await this.refreshAlertsIfNeeded();
    let alerts = Array.from(this.alerts.values()).filter(a =&gt; !a.expiresAt || a.expiresAt &gt; new Date());
    if (options?.severity) alerts = alerts.filter(a =&gt; a.severity === options.severity);
    if (options?.type) alerts = alerts.filter(a =&gt; a.type === options.type);
    if (options?.line) alerts = alerts.filter(a =&gt; a.affectedLines?.some(l =&gt; l.toLowerCase().includes(options.line!.toLowerCase())));
    return alerts.sort((a, b) =&gt; {
      const severityOrder = { critical: 0, warning: 1, info: 2 };
      const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
      if (severityDiff !== 0) return severityDiff;
      return (b as StoredAlert).createdAt.getTime() - (a as StoredAlert).createdAt.getTime();
    });
  }

  async getAlertsForJourney(fromStation: string, toStation: string, lines: string[]): Promise&lt;Alert[]&gt; {
    const allAlerts = await this.getAlerts();
    return allAlerts.filter(alert =&gt; {
      if (alert.affectedLines?.length) {
        const hasMatchingLine = alert.affectedLines.some(affectedLine =&gt; 
          lines.some(line =&gt; line.toLowerCase().includes(affectedLine.toLowerCase()) || affectedLine.toLowerCase().includes(line.toLowerCase()))
        );
        if (hasMatchingLine) return true;
      }
      if (alert.affectedStations?.length) {
        const hasMatchingStation = alert.affectedStations.some(station =&gt; 
          station.name.toLowerCase().includes(fromStation.toLowerCase()) || station.name.toLowerCase().includes(toStation.toLowerCase()) ||
          fromStation.toLowerCase().includes(station.name.toLowerCase()) || toStation.toLowerCase().includes(station.name.toLowerCase())
        );
        if (hasMatchingStation) return true;
      }
      return false;
    });
  }

  addAlert(alert: Omit&lt;Alert, 'id'&gt;, expiresInHours?: number): Alert {
    const id = `manual-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const storedAlert: StoredAlert = { ...alert, id, createdAt: new Date(), expiresAt: expiresInHours ? new Date(Date.now() + expiresInHours * 60 * 60 * 1000) : undefined, source: 'manual' };
    this.alerts.set(id, storedAlert);
    return storedAlert;
  }

  removeAlert(id: string): boolean { return this.alerts.delete(id); }

  private async refreshAlertsIfNeeded(): Promise&lt;void&gt; {
    const now = new Date();
    if (this.lastFetch &amp;&amp; (now.getTime() - this.lastFetch.getTime()) &lt; this.fetchInterval) return;
    try {
      const fetchPromises = this.sources.map(source =&gt; source.fetchAlerts().catch(() =&gt; [] as Alert[]));
      const results = await Promise.all(fetchPromises);
      for (const alerts of results) for (const alert of alerts) this.alerts.set(alert.id, { ...alert, createdAt: new Date(), source: 'external' });
      this.lastFetch = now;
    } catch (error) { console.error('Failed to refresh alerts:', error); }
  }

  async getStrikes(): Promise&lt;Alert[]&gt; { return this.getAlerts({ type: 'strike' }); }
  
  async isStrikeActive(): Promise&lt;boolean&gt; {
    const strikes = await this.getStrikes();
    const now = new Date();
    return strikes.some(strike =&gt; { 
      if (!strike.startTime || !strike.endTime) return true; 
      return now &gt;= new Date(strike.startTime) &amp;&amp; now &lt;= new Date(strike.endTime); 
    });
  }
}

class TrenitaliaAlertsSource implements AlertSource {
  name = 'trenitalia';
  async fetchAlerts(): Promise&lt;Alert[]&gt; { return []; }
}

class TrenordAlertsSource implements AlertSource {
  name = 'trenord';
  async fetchAlerts(): Promise&lt;Alert[]&gt; { return []; }
}

export const alertsService = new AlertsService();
