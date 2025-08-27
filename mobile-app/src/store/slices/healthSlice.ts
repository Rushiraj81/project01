import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { healthAPI } from '../../services/api';
import { DatabaseService } from '../../services/database';

interface HealthMetric {
  id: string;
  type: 'heart_rate' | 'steps' | 'sleep' | 'activity' | 'location' | 'fall_detection';
  value: number | string | object;
  timestamp: string;
  deviceId?: string;
  synced: boolean;
}

interface HealthAlert {
  id: string;
  type: 'fall' | 'wandering' | 'medication' | 'emergency' | 'health_anomaly';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: string;
  acknowledged: boolean;
  responded: boolean;
  metadata?: any;
}

interface DailyHealthSummary {
  date: string;
  steps: number;
  heartRateAvg: number;
  sleepHours: number;
  activityLevel: 'low' | 'moderate' | 'high';
  alerts: number;
  medicationCompliance: number; // percentage
}

interface HealthState {
  metrics: HealthMetric[];
  alerts: HealthAlert[];
  dailySummaries: DailyHealthSummary[];
  isLoading: boolean;
  error: string | null;
  lastSync: string | null;
  deviceConnected: boolean;
  realTimeMonitoring: boolean;
}

const initialState: HealthState = {
  metrics: [],
  alerts: [],
  dailySummaries: [],
  isLoading: false,
  error: null,
  lastSync: null,
  deviceConnected: false,
  realTimeMonitoring: false,
};

// Async thunks
export const syncHealthData = createAsyncThunk(
  'health/syncHealthData',
  async (_, { getState, rejectWithValue }) => {
    try {
      const db = new DatabaseService();
      
      // Get unsynced data from local database
      const unsyncedMetrics = await db.getUnsyncedMetrics();
      const unsyncedAlerts = await db.getUnsyncedAlerts();
      
      if (unsyncedMetrics.length > 0 || unsyncedAlerts.length > 0) {
        // Sync with server
        await healthAPI.syncData({
          metrics: unsyncedMetrics,
          alerts: unsyncedAlerts,
        });
        
        // Mark as synced in local database
        await db.markAsSynced(unsyncedMetrics.map(m => m.id), unsyncedAlerts.map(a => a.id));
      }
      
      // Fetch latest data from server
      const latestData = await healthAPI.getLatestData();
      
      // Store in local database
      await db.storeHealthData(latestData);
      
      return latestData;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Sync failed');
    }
  }
);

export const addHealthMetric = createAsyncThunk(
  'health/addHealthMetric',
  async (metric: Omit<HealthMetric, 'id' | 'synced'>, { rejectWithValue }) => {
    try {
      const db = new DatabaseService();
      const newMetric: HealthMetric = {
        ...metric,
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        synced: false,
      };
      
      // Store locally first
      await db.storeMetric(newMetric);
      
      // Try to sync immediately if online
      try {
        await healthAPI.addMetric(newMetric);
        newMetric.synced = true;
        await db.updateMetric(newMetric);
      } catch (syncError) {
        // If sync fails, it will be retried later
        console.log('Metric stored locally, will sync later');
      }
      
      return newMetric;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to add health metric');
    }
  }
);

export const addHealthAlert = createAsyncThunk(
  'health/addHealthAlert',
  async (alert: Omit<HealthAlert, 'id'>, { rejectWithValue }) => {
    try {
      const db = new DatabaseService();
      const newAlert: HealthAlert = {
        ...alert,
        id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      };
      
      // Store locally first
      await db.storeAlert(newAlert);
      
      // Try to send alert immediately if critical
      if (alert.severity === 'critical') {
        try {
          await healthAPI.sendEmergencyAlert(newAlert);
        } catch (syncError) {
          console.log('Emergency alert stored locally, will retry');
        }
      }
      
      return newAlert;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to add health alert');
    }
  }
);

export const loadLocalHealthData = createAsyncThunk(
  'health/loadLocalHealthData',
  async (_, { rejectWithValue }) => {
    try {
      const db = new DatabaseService();
      
      const [metrics, alerts, summaries] = await Promise.all([
        db.getRecentMetrics(7), // Last 7 days
        db.getRecentAlerts(30), // Last 30 days
        db.getDailySummaries(30), // Last 30 days
      ]);
      
      return { metrics, alerts, summaries };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to load local data');
    }
  }
);

const healthSlice = createSlice({
  name: 'health',
  initialState,
  reducers: {
    setDeviceConnection: (state, action: PayloadAction<boolean>) => {
      state.deviceConnected = action.payload;
    },
    
    setRealTimeMonitoring: (state, action: PayloadAction<boolean>) => {
      state.realTimeMonitoring = action.payload;
    },
    
    acknowledgeAlert: (state, action: PayloadAction<string>) => {
      const alert = state.alerts.find(a => a.id === action.payload);
      if (alert) {
        alert.acknowledged = true;
      }
    },
    
    markAlertResponded: (state, action: PayloadAction<string>) => {
      const alert = state.alerts.find(a => a.id === action.payload);
      if (alert) {
        alert.responded = true;
      }
    },
    
    addMetricLocally: (state, action: PayloadAction<HealthMetric>) => {
      state.metrics.unshift(action.payload);
      // Keep only last 1000 metrics in memory
      if (state.metrics.length > 1000) {
        state.metrics = state.metrics.slice(0, 1000);
      }
    },
    
    addAlertLocally: (state, action: PayloadAction<HealthAlert>) => {
      state.alerts.unshift(action.payload);
      // Keep only last 100 alerts in memory
      if (state.alerts.length > 100) {
        state.alerts = state.alerts.slice(0, 100);
      }
    },
    
    clearError: (state) => {
      state.error = null;
    },
  },
  
  extraReducers: (builder) => {
    builder
      // Sync health data
      .addCase(syncHealthData.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(syncHealthData.fulfilled, (state, action) => {
        state.isLoading = false;
        state.lastSync = new Date().toISOString();
        state.error = null;
        
        // Update state with synced data
        if (action.payload.metrics) {
          state.metrics = action.payload.metrics;
        }
        if (action.payload.alerts) {
          state.alerts = action.payload.alerts;
        }
        if (action.payload.summaries) {
          state.dailySummaries = action.payload.summaries;
        }
      })
      .addCase(syncHealthData.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      
      // Add health metric
      .addCase(addHealthMetric.fulfilled, (state, action) => {
        state.metrics.unshift(action.payload);
        if (state.metrics.length > 1000) {
          state.metrics = state.metrics.slice(0, 1000);
        }
      })
      
      // Add health alert
      .addCase(addHealthAlert.fulfilled, (state, action) => {
        state.alerts.unshift(action.payload);
        if (state.alerts.length > 100) {
          state.alerts = state.alerts.slice(0, 100);
        }
      })
      
      // Load local health data
      .addCase(loadLocalHealthData.fulfilled, (state, action) => {
        state.metrics = action.payload.metrics;
        state.alerts = action.payload.alerts;
        state.dailySummaries = action.payload.summaries;
      });
  },
});

export const {
  setDeviceConnection,
  setRealTimeMonitoring,
  acknowledgeAlert,
  markAlertResponded,
  addMetricLocally,
  addAlertLocally,
  clearError,
} = healthSlice.actions;

export default healthSlice.reducer;