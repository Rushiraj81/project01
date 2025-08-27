import * as SQLite from 'expo-sqlite';

export interface HealthMetric {
  id: string;
  type: string;
  value: string;
  timestamp: string;
  deviceId?: string;
  synced: boolean;
}

export interface HealthAlert {
  id: string;
  type: string;
  severity: string;
  message: string;
  timestamp: string;
  acknowledged: boolean;
  responded: boolean;
  metadata?: string;
}

export interface DailyHealthSummary {
  date: string;
  steps: number;
  heartRateAvg: number;
  sleepHours: number;
  activityLevel: string;
  alerts: number;
  medicationCompliance: number;
}

export class DatabaseService {
  private db: SQLite.WebSQLDatabase;

  constructor() {
    this.db = SQLite.openDatabase('eldercare.db');
    this.initializeTables();
  }

  private initializeTables(): void {
    this.db.transaction(tx => {
      // Health metrics table
      tx.executeSql(`
        CREATE TABLE IF NOT EXISTS health_metrics (
          id TEXT PRIMARY KEY,
          type TEXT NOT NULL,
          value TEXT NOT NULL,
          timestamp TEXT NOT NULL,
          device_id TEXT,
          synced INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // Health alerts table
      tx.executeSql(`
        CREATE TABLE IF NOT EXISTS health_alerts (
          id TEXT PRIMARY KEY,
          type TEXT NOT NULL,
          severity TEXT NOT NULL,
          message TEXT NOT NULL,
          timestamp TEXT NOT NULL,
          acknowledged INTEGER DEFAULT 0,
          responded INTEGER DEFAULT 0,
          metadata TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // Daily summaries table
      tx.executeSql(`
        CREATE TABLE IF NOT EXISTS daily_summaries (
          date TEXT PRIMARY KEY,
          steps INTEGER DEFAULT 0,
          heart_rate_avg REAL DEFAULT 0,
          sleep_hours REAL DEFAULT 0,
          activity_level TEXT DEFAULT 'low',
          alerts INTEGER DEFAULT 0,
          medication_compliance REAL DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // User preferences table
      tx.executeSql(`
        CREATE TABLE IF NOT EXISTS user_preferences (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // Offline queue table for actions to sync later
      tx.executeSql(`
        CREATE TABLE IF NOT EXISTS sync_queue (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          action_type TEXT NOT NULL,
          payload TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          retry_count INTEGER DEFAULT 0
        );
      `);

      // Create indexes for better performance
      tx.executeSql(`
        CREATE INDEX IF NOT EXISTS idx_metrics_timestamp ON health_metrics(timestamp);
      `);
      
      tx.executeSql(`
        CREATE INDEX IF NOT EXISTS idx_metrics_type ON health_metrics(type);
      `);
      
      tx.executeSql(`
        CREATE INDEX IF NOT EXISTS idx_alerts_timestamp ON health_alerts(timestamp);
      `);
      
      tx.executeSql(`
        CREATE INDEX IF NOT EXISTS idx_alerts_acknowledged ON health_alerts(acknowledged);
      `);
    });
  }

  // Health Metrics Methods
  async storeMetric(metric: HealthMetric): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.transaction(tx => {
        tx.executeSql(
          `INSERT INTO health_metrics (id, type, value, timestamp, device_id, synced)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            metric.id,
            metric.type,
            JSON.stringify(metric.value),
            metric.timestamp,
            metric.deviceId || null,
            metric.synced ? 1 : 0
          ],
          () => resolve(),
          (_, error) => reject(error)
        );
      });
    });
  }

  async getRecentMetrics(days: number): Promise<HealthMetric[]> {
    return new Promise((resolve, reject) => {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      
      this.db.transaction(tx => {
        tx.executeSql(
          `SELECT * FROM health_metrics 
           WHERE timestamp >= ? 
           ORDER BY timestamp DESC 
           LIMIT 1000`,
          [cutoffDate.toISOString()],
          (_, result) => {
            const metrics: HealthMetric[] = [];
            for (let i = 0; i < result.rows.length; i++) {
              const row = result.rows.item(i);
              metrics.push({
                id: row.id,
                type: row.type,
                value: JSON.parse(row.value),
                timestamp: row.timestamp,
                deviceId: row.device_id,
                synced: row.synced === 1
              });
            }
            resolve(metrics);
          },
          (_, error) => reject(error)
        );
      });
    });
  }

  async getUnsyncedMetrics(): Promise<HealthMetric[]> {
    return new Promise((resolve, reject) => {
      this.db.transaction(tx => {
        tx.executeSql(
          `SELECT * FROM health_metrics WHERE synced = 0 ORDER BY timestamp DESC`,
          [],
          (_, result) => {
            const metrics: HealthMetric[] = [];
            for (let i = 0; i < result.rows.length; i++) {
              const row = result.rows.item(i);
              metrics.push({
                id: row.id,
                type: row.type,
                value: JSON.parse(row.value),
                timestamp: row.timestamp,
                deviceId: row.device_id,
                synced: false
              });
            }
            resolve(metrics);
          },
          (_, error) => reject(error)
        );
      });
    });
  }

  async updateMetric(metric: HealthMetric): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.transaction(tx => {
        tx.executeSql(
          `UPDATE health_metrics 
           SET value = ?, synced = ? 
           WHERE id = ?`,
          [JSON.stringify(metric.value), metric.synced ? 1 : 0, metric.id],
          () => resolve(),
          (_, error) => reject(error)
        );
      });
    });
  }

  // Health Alerts Methods
  async storeAlert(alert: HealthAlert): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.transaction(tx => {
        tx.executeSql(
          `INSERT INTO health_alerts (id, type, severity, message, timestamp, acknowledged, responded, metadata)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            alert.id,
            alert.type,
            alert.severity,
            alert.message,
            alert.timestamp,
            alert.acknowledged ? 1 : 0,
            alert.responded ? 1 : 0,
            alert.metadata ? JSON.stringify(alert.metadata) : null
          ],
          () => resolve(),
          (_, error) => reject(error)
        );
      });
    });
  }

  async getRecentAlerts(days: number): Promise<HealthAlert[]> {
    return new Promise((resolve, reject) => {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      
      this.db.transaction(tx => {
        tx.executeSql(
          `SELECT * FROM health_alerts 
           WHERE timestamp >= ? 
           ORDER BY timestamp DESC`,
          [cutoffDate.toISOString()],
          (_, result) => {
            const alerts: HealthAlert[] = [];
            for (let i = 0; i < result.rows.length; i++) {
              const row = result.rows.item(i);
              alerts.push({
                id: row.id,
                type: row.type,
                severity: row.severity,
                message: row.message,
                timestamp: row.timestamp,
                acknowledged: row.acknowledged === 1,
                responded: row.responded === 1,
                metadata: row.metadata ? JSON.parse(row.metadata) : undefined
              });
            }
            resolve(alerts);
          },
          (_, error) => reject(error)
        );
      });
    });
  }

  async getUnsyncedAlerts(): Promise<HealthAlert[]> {
    return new Promise((resolve, reject) => {
      this.db.transaction(tx => {
        tx.executeSql(
          `SELECT * FROM health_alerts 
           WHERE acknowledged = 0 OR responded = 0 
           ORDER BY timestamp DESC`,
          [],
          (_, result) => {
            const alerts: HealthAlert[] = [];
            for (let i = 0; i < result.rows.length; i++) {
              const row = result.rows.item(i);
              alerts.push({
                id: row.id,
                type: row.type,
                severity: row.severity,
                message: row.message,
                timestamp: row.timestamp,
                acknowledged: row.acknowledged === 1,
                responded: row.responded === 1,
                metadata: row.metadata ? JSON.parse(row.metadata) : undefined
              });
            }
            resolve(alerts);
          },
          (_, error) => reject(error)
        );
      });
    });
  }

  // Daily Summaries Methods
  async storeDailySummary(summary: DailyHealthSummary): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.transaction(tx => {
        tx.executeSql(
          `INSERT OR REPLACE INTO daily_summaries 
           (date, steps, heart_rate_avg, sleep_hours, activity_level, alerts, medication_compliance, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
          [
            summary.date,
            summary.steps,
            summary.heartRateAvg,
            summary.sleepHours,
            summary.activityLevel,
            summary.alerts,
            summary.medicationCompliance
          ],
          () => resolve(),
          (_, error) => reject(error)
        );
      });
    });
  }

  async getDailySummaries(days: number): Promise<DailyHealthSummary[]> {
    return new Promise((resolve, reject) => {
      this.db.transaction(tx => {
        tx.executeSql(
          `SELECT * FROM daily_summaries 
           ORDER BY date DESC 
           LIMIT ?`,
          [days],
          (_, result) => {
            const summaries: DailyHealthSummary[] = [];
            for (let i = 0; i < result.rows.length; i++) {
              const row = result.rows.item(i);
              summaries.push({
                date: row.date,
                steps: row.steps,
                heartRateAvg: row.heart_rate_avg,
                sleepHours: row.sleep_hours,
                activityLevel: row.activity_level,
                alerts: row.alerts,
                medicationCompliance: row.medication_compliance
              });
            }
            resolve(summaries);
          },
          (_, error) => reject(error)
        );
      });
    });
  }

  // Sync Methods
  async markAsSynced(metricIds: string[], alertIds: string[]): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.transaction(tx => {
        // Mark metrics as synced
        if (metricIds.length > 0) {
          const placeholders = metricIds.map(() => '?').join(',');
          tx.executeSql(
            `UPDATE health_metrics SET synced = 1 WHERE id IN (${placeholders})`,
            metricIds
          );
        }

        // Mark alerts as acknowledged (assuming sync means they were processed)
        if (alertIds.length > 0) {
          const placeholders = alertIds.map(() => '?').join(',');
          tx.executeSql(
            `UPDATE health_alerts SET acknowledged = 1 WHERE id IN (${placeholders})`,
            alertIds
          );
        }
      }, reject, resolve);
    });
  }

  async storeHealthData(data: any): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.transaction(tx => {
        // Store metrics
        if (data.metrics) {
          data.metrics.forEach((metric: HealthMetric) => {
            tx.executeSql(
              `INSERT OR REPLACE INTO health_metrics (id, type, value, timestamp, device_id, synced)
               VALUES (?, ?, ?, ?, ?, 1)`,
              [metric.id, metric.type, JSON.stringify(metric.value), metric.timestamp, metric.deviceId || null]
            );
          });
        }

        // Store alerts
        if (data.alerts) {
          data.alerts.forEach((alert: HealthAlert) => {
            tx.executeSql(
              `INSERT OR REPLACE INTO health_alerts (id, type, severity, message, timestamp, acknowledged, responded, metadata)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                alert.id, alert.type, alert.severity, alert.message, alert.timestamp,
                alert.acknowledged ? 1 : 0, alert.responded ? 1 : 0,
                alert.metadata ? JSON.stringify(alert.metadata) : null
              ]
            );
          });
        }

        // Store summaries
        if (data.summaries) {
          data.summaries.forEach((summary: DailyHealthSummary) => {
            tx.executeSql(
              `INSERT OR REPLACE INTO daily_summaries 
               (date, steps, heart_rate_avg, sleep_hours, activity_level, alerts, medication_compliance, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
              [
                summary.date, summary.steps, summary.heartRateAvg,
                summary.sleepHours, summary.activityLevel, summary.alerts,
                summary.medicationCompliance
              ]
            );
          });
        }
      }, reject, resolve);
    });
  }

  // Cleanup old data to prevent database bloat
  async cleanupOldData(daysToKeep: number = 90): Promise<void> {
    return new Promise((resolve, reject) => {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
      
      this.db.transaction(tx => {
        // Keep only synced metrics older than cutoff
        tx.executeSql(
          `DELETE FROM health_metrics 
           WHERE timestamp < ? AND synced = 1`,
          [cutoffDate.toISOString()]
        );

        // Keep only acknowledged alerts older than cutoff
        tx.executeSql(
          `DELETE FROM health_alerts 
           WHERE timestamp < ? AND acknowledged = 1`,
          [cutoffDate.toISOString()]
        );

        // Keep summaries but limit to daysToKeep
        tx.executeSql(
          `DELETE FROM daily_summaries 
           WHERE date < ?`,
          [cutoffDate.toISOString().split('T')[0]]
        );
      }, reject, resolve);
    });
  }

  // Utility methods
  async getDatabaseInfo(): Promise<any> {
    return new Promise((resolve, reject) => {
      this.db.transaction(tx => {
        const results: any = {};
        
        tx.executeSql(
          `SELECT COUNT(*) as count FROM health_metrics`,
          [],
          (_, result) => {
            results.metricsCount = result.rows.item(0).count;
          }
        );
        
        tx.executeSql(
          `SELECT COUNT(*) as count FROM health_alerts`,
          [],
          (_, result) => {
            results.alertsCount = result.rows.item(0).count;
          }
        );
        
        tx.executeSql(
          `SELECT COUNT(*) as count FROM daily_summaries`,
          [],
          (_, result) => {
            results.summariesCount = result.rows.item(0).count;
            resolve(results);
          }
        );
      }, reject);
    });
  }
}