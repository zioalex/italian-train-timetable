// Alerts Service - Strike notifications, disruptions, and engineering works

import { Alert, AlertType, Station } from '../types/index.js';

interface AlertSource {
  name: string;
  fetchAlerts(): Promise<Alert[]>;
}

// In-memory storage for custom/manual alerts
interface StoredAlert extends Alert {
  createdAt: Date;
  expiresAt?: Date;
  source: string;
}

export class AlertsService {
  private alerts: Map<string, StoredAlert> = new Map();
  private sources: AlertSource[] = [];
  private lastFetch: Date | null = null;
  private fetchInterval: number = 5 * 60 * 1000; // 5 minutes

  constructor() {
    // Initialize with some known alert sources
    this.sources.push(new TrenitaliaAlertsSource());
    this.sources.push(new TrenordAlertsSource());
  }

  /**
   * Get all active alerts, optionally filtered by region or line
   */
  async getAlerts(options?: {
    region?: string;
    line?: string;
    severity?: Alert['severity'];
    type?: AlertType;
  }): Promise<Alert[]> {
    // Refresh alerts if needed
    await this.refreshAlertsIfNeeded();

    let alerts = Array.from(this.alerts.values())
      .filter(a => !a.expiresAt || a.expiresAt > new Date());

    // Apply filters
    if (options?.severity) {
      alerts = alerts.filter(a => a.severity === options.severity);
    }
    if (options?.type) {
      alerts = alerts.filter(a => a.type === options.type);
    }
    if (options?.line) {
      alerts = alerts.filter(a => 
        a.affectedLines?.some(l => l.toLowerCase().includes(options.line!.toLowerCase()))
      );
    }

    // Sort by severity (critical first) then by date
    return alerts.sort((a, b) => {
      const severityOrder = { critical: 0, warning: 1, info: 2 };
      const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
      if (severityDiff !== 0) return severityDiff;
      return (b as StoredAlert).createdAt.getTime() - (a as StoredAlert).createdAt.getTime();
    });
  }

  /**
   * Get alerts relevant to a specific journey
   */
  async getAlertsForJourney(
    fromStation: string,
    toStation: string,
    lines: string[]
  ): Promise<Alert[]> {
    const allAlerts = await this.getAlerts();
    
    return allAlerts.filter(alert => {
      // Check if any affected line matches
      if (alert.affectedLines?.length) {
        const hasMatchingLine = alert.affectedLines.some(affectedLine =>
          lines.some(line => 
            line.toLowerCase().includes(affectedLine.toLowerCase()) ||
            affectedLine.toLowerCase().includes(line.toLowerCase())
          )
        );
        if (hasMatchingLine) return true;
      }

      // Check if any affected station matches
      if (alert.affectedStations?.length) {
        const hasMatchingStation = alert.affectedStations.some(station =>
          station.name.toLowerCase().includes(fromStation.toLowerCase()) ||
          station.name.toLowerCase().includes(toStation.toLowerCase()) ||
          fromStation.toLowerCase().includes(station.name.toLowerCase()) ||
          toStation.toLowerCase().includes(station.name.toLowerCase())
        );
        if (hasMatchingStation) return true;
      }

      return false;
    });
  }

  /**
   * Add a manual alert (for testing or admin purposes)
   */
  addAlert(alert: Omit<Alert, 'id'>, expiresInHours?: number): Alert {
    const id = `manual-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const storedAlert: StoredAlert = {
      ...alert,
      id,
      createdAt: new Date(),
      expiresAt: expiresInHours 
        ? new Date(Date.now() + expiresInHours * 60 * 60 * 1000)
        : undefined,
      source: 'manual',
    };

    this.alerts.set(id, storedAlert);
    return storedAlert;
  }

  /**
   * Remove an alert by ID
   */
  removeAlert(id: string): boolean {
    return this.alerts.delete(id);
  }

  /**
   * Refresh alerts from all sources
   */
  private async refreshAlertsIfNeeded(): Promise<void> {
    const now = new Date();
    if (this.lastFetch && (now.getTime() - this.lastFetch.getTime()) < this.fetchInterval) {
      return; // Skip if recently fetched
    }

    try {
      const fetchPromises = this.sources.map(source => 
        source.fetchAlerts().catch(err => {
          console.error(`Failed to fetch alerts from ${source.name}:`, err);
          return [] as Alert[];
        })
      );

      const results = await Promise.all(fetchPromises);
      
      // Add fetched alerts to storage
      for (const alerts of results) {
        for (const alert of alerts) {
          const storedAlert: StoredAlert = {
            ...alert,
            createdAt: new Date(),
            source: 'external',
          };
          this.alerts.set(alert.id, storedAlert);
        }
      }

      this.lastFetch = now;
    } catch (error) {
      console.error('Failed to refresh alerts:', error);
    }
  }

  /**
   * Get upcoming strikes
   */
  async getStrikes(): Promise<Alert[]> {
    return this.getAlerts({ type: 'strike' });
  }

  /**
   * Check if there's currently a strike affecting services
   */
  async isStrikeActive(): Promise<boolean> {
    const strikes = await this.getStrikes();
    const now = new Date();
    
    return strikes.some(strike => {
      if (!strike.startTime || !strike.endTime) return true; // Assume active if no times
      return now >= strike.startTime && now <= strike.endTime;
    });
  }
}

/**
 * Trenitalia Alerts Source
 * Note: In production, this would scrape/fetch from Trenitalia's actual alerts page
 */
class TrenitaliaAlertsSource implements AlertSource {
  name = 'trenitalia';

  async fetchAlerts(): Promise<Alert[]> {
    // In a real implementation, this would fetch from:
    // https://www.trenitalia.com/it/informazioni/infomobilita.html
    // or an API endpoint if available
    
    // Return empty array - no demo data
    // Real alerts would come from scraping the Trenitalia website
    return [];
  }
}

/**
 * Trenord Alerts Source
 */
class TrenordAlertsSource implements AlertSource {
  name = 'trenord';

  async fetchAlerts(): Promise<Alert[]> {
    // In a real implementation, this would fetch from:
    // https://www.trenord.it/circolazione-e-traffico/
    // or their API
    
    // Return empty array - no demo data
    return [];
  }
}

// Singleton instance
export const alertsService = new AlertsService();
