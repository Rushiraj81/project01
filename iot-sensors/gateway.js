#!/usr/bin/env node

/**
 * ElderCare Connect IoT Gateway
 * 
 * This gateway serves as the central hub for collecting data from various IoT sensors,
 * performing edge processing for privacy and real-time alerts, and securely
 * transmitting data to the cloud platform.
 * 
 * Features:
 * - Multi-protocol sensor support (BLE, WiFi, ZigBee)
 * - Edge-based anomaly detection
 * - Privacy-preserving data processing
 * - Offline operation capability
 * - Secure cloud synchronization
 */

const mqtt = require('mqtt');
const WebSocket = require('ws');
const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');
const EventEmitter = require('events');

class ElderCareIoTGateway extends EventEmitter {
  constructor(config) {
    super();
    this.config = {
      deviceId: process.env.DEVICE_ID || crypto.randomUUID(),
      cloudEndpoint: process.env.CLOUD_ENDPOINT || 'wss://api.eldercare-connect.org',
      mqttBroker: process.env.MQTT_BROKER || 'mqtt://localhost:1883',
      dataPath: process.env.DATA_PATH || './data',
      encryptionKey: process.env.ENCRYPTION_KEY || this.generateEncryptionKey(),
      sensors: {
        heartRate: { enabled: true, interval: 30000 }, // 30 seconds
        steps: { enabled: true, interval: 60000 }, // 1 minute
        location: { enabled: true, interval: 300000 }, // 5 minutes
        sleep: { enabled: true, interval: 600000 }, // 10 minutes
        fallDetection: { enabled: true, threshold: 2.5 }, // G-force threshold
        ambientSensors: { enabled: true, interval: 120000 }, // 2 minutes
      },
      privacy: {
        localProcessingOnly: true,
        dataRetentionDays: 7,
        anonymizeLocation: true,
        consentRequired: true,
      },
      ...config
    };

    this.sensors = new Map();
    this.dataBuffer = [];
    this.isOnline = false;
    this.mqttClient = null;
    this.wsClient = null;
    this.alertHandlers = new Map();
    
    this.initializeGateway();
  }

  generateEncryptionKey() {
    return crypto.randomBytes(32).toString('hex');
  }

  async initializeGateway() {
    try {
      // Ensure data directory exists
      await fs.mkdir(this.config.dataPath, { recursive: true });
      
      // Initialize MQTT client for local sensor communication
      await this.initializeMQTT();
      
      // Initialize WebSocket connection to cloud
      await this.initializeCloudConnection();
      
      // Load persisted data
      await this.loadPersistedData();
      
      // Start sensor discovery
      this.startSensorDiscovery();
      
      // Initialize anomaly detection models
      this.initializeAnomalyDetection();
      
      // Start data processing loop
      this.startDataProcessing();
      
      console.log(`ElderCare IoT Gateway ${this.config.deviceId} initialized`);
      this.emit('initialized');
      
    } catch (error) {
      console.error('Failed to initialize gateway:', error);
      this.emit('error', error);
    }
  }

  async initializeMQTT() {
    this.mqttClient = mqtt.connect(this.config.mqttBroker, {
      clientId: `gateway-${this.config.deviceId}`,
      clean: true,
      reconnectPeriod: 5000,
    });

    this.mqttClient.on('connect', () => {
      console.log('Connected to MQTT broker');
      
      // Subscribe to sensor topics
      const topics = [
        'sensors/+/heartrate',
        'sensors/+/steps',
        'sensors/+/location',
        'sensors/+/sleep',
        'sensors/+/accelerometer',
        'sensors/+/ambient',
        'sensors/+/emergency',
      ];
      
      topics.forEach(topic => {
        this.mqttClient.subscribe(topic, (err) => {
          if (err) {
            console.error(`Failed to subscribe to ${topic}:`, err);
          } else {
            console.log(`Subscribed to ${topic}`);
          }
        });
      });
    });

    this.mqttClient.on('message', (topic, message) => {
      this.handleSensorData(topic, message);
    });

    this.mqttClient.on('error', (error) => {
      console.error('MQTT error:', error);
    });
  }

  async initializeCloudConnection() {
    const connectToCloud = () => {
      this.wsClient = new WebSocket(this.config.cloudEndpoint, {
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'X-Device-ID': this.config.deviceId,
        }
      });

      this.wsClient.on('open', () => {
        console.log('Connected to cloud platform');
        this.isOnline = true;
        this.syncPendingData();
      });

      this.wsClient.on('message', (data) => {
        this.handleCloudMessage(JSON.parse(data));
      });

      this.wsClient.on('close', () => {
        console.log('Disconnected from cloud platform');
        this.isOnline = false;
        // Attempt reconnection after 30 seconds
        setTimeout(connectToCloud, 30000);
      });

      this.wsClient.on('error', (error) => {
        console.error('WebSocket error:', error);
        this.isOnline = false;
      });
    };

    connectToCloud();
  }

  startSensorDiscovery() {
    // Bluetooth Low Energy (BLE) discovery for wearables
    this.discoverBLEDevices();
    
    // WiFi device discovery for ambient sensors
    this.discoverWiFiDevices();
    
    // ZigBee device discovery for home automation sensors
    this.discoverZigBeeDevices();
  }

  async discoverBLEDevices() {
    // Mock BLE discovery - in real implementation, use noble or similar
    const mockBLEDevices = [
      {
        id: 'ble-001',
        name: 'ElderWatch Pro',
        type: 'wearable',
        services: ['heart_rate', 'steps', 'location', 'fall_detection'],
        batteryLevel: 85,
      },
      {
        id: 'ble-002',
        name: 'HealthBand Senior',
        type: 'wearable',
        services: ['heart_rate', 'sleep', 'activity'],
        batteryLevel: 92,
      }
    ];

    mockBLEDevices.forEach(device => {
      this.registerSensor(device);
    });
  }

  async discoverWiFiDevices() {
    // Mock WiFi discovery - in real implementation, use network scanning
    const mockWiFiDevices = [
      {
        id: 'wifi-001',
        name: 'Bedroom Motion Sensor',
        type: 'ambient',
        services: ['motion', 'temperature', 'humidity'],
        location: 'bedroom',
      },
      {
        id: 'wifi-002',
        name: 'Kitchen Door Sensor',
        type: 'ambient',
        services: ['door_open', 'activity'],
        location: 'kitchen',
      }
    ];

    mockWiFiDevices.forEach(device => {
      this.registerSensor(device);
    });
  }

  async discoverZigBeeDevices() {
    // Mock ZigBee discovery
    const mockZigBeeDevices = [
      {
        id: 'zigbee-001',
        name: 'Smart Bed Sensor',
        type: 'ambient',
        services: ['sleep_tracking', 'movement'],
        location: 'bedroom',
      }
    ];

    mockZigBeeDevices.forEach(device => {
      this.registerSensor(device);
    });
  }

  registerSensor(device) {
    this.sensors.set(device.id, {
      ...device,
      lastSeen: new Date(),
      status: 'active',
      dataHistory: [],
    });

    console.log(`Registered sensor: ${device.name} (${device.id})`);
    this.emit('sensorRegistered', device);
  }

  handleSensorData(topic, message) {
    try {
      const data = JSON.parse(message.toString());
      const [, sensorId, dataType] = topic.split('/');
      
      const sensor = this.sensors.get(sensorId);
      if (!sensor) {
        console.warn(`Received data from unknown sensor: ${sensorId}`);
        return;
      }

      // Update sensor last seen
      sensor.lastSeen = new Date();

      // Create standardized data point
      const dataPoint = {
        id: crypto.randomUUID(),
        sensorId,
        type: dataType,
        value: data.value,
        timestamp: data.timestamp || new Date().toISOString(),
        metadata: data.metadata || {},
        processed: false,
      };

      // Encrypt sensitive data
      if (this.isSensitiveData(dataType)) {
        dataPoint.value = this.encryptData(dataPoint.value);
        dataPoint.encrypted = true;
      }

      // Store in buffer for processing
      this.dataBuffer.push(dataPoint);
      
      // Update sensor history (keep last 100 points)
      sensor.dataHistory.push(dataPoint);
      if (sensor.dataHistory.length > 100) {
        sensor.dataHistory = sensor.dataHistory.slice(-100);
      }

      // Immediate anomaly detection for critical data types
      if (this.isCriticalData(dataType)) {
        this.performImmediateAnalysis(dataPoint, sensor);
      }

      this.emit('dataReceived', dataPoint);
      
    } catch (error) {
      console.error('Error handling sensor data:', error);
    }
  }

  isSensitiveData(dataType) {
    const sensitiveTypes = ['location', 'heartrate', 'sleep'];
    return sensitiveTypes.includes(dataType);
  }

  isCriticalData(dataType) {
    const criticalTypes = ['accelerometer', 'heartrate', 'emergency'];
    return criticalTypes.includes(dataType);
  }

  encryptData(data) {
    const cipher = crypto.createCipher('aes-256-cbc', this.config.encryptionKey);
    let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
  }

  decryptData(encryptedData) {
    const decipher = crypto.createDecipher('aes-256-cbc', this.config.encryptionKey);
    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return JSON.parse(decrypted);
  }

  performImmediateAnalysis(dataPoint, sensor) {
    switch (dataPoint.type) {
      case 'accelerometer':
        this.detectFall(dataPoint, sensor);
        break;
      case 'heartrate':
        this.detectHeartRateAnomaly(dataPoint, sensor);
        break;
      case 'emergency':
        this.handleEmergencyAlert(dataPoint, sensor);
        break;
    }
  }

  detectFall(dataPoint, sensor) {
    const accelerometerData = dataPoint.encrypted ? 
      this.decryptData(dataPoint.value) : dataPoint.value;
    
    // Calculate magnitude of acceleration
    const magnitude = Math.sqrt(
      Math.pow(accelerometerData.x, 2) +
      Math.pow(accelerometerData.y, 2) +
      Math.pow(accelerometerData.z, 2)
    );

    // Simple fall detection algorithm
    if (magnitude > this.config.sensors.fallDetection.threshold) {
      // Check for subsequent low activity (impact followed by stillness)
      setTimeout(() => {
        const recentData = sensor.dataHistory
          .filter(d => d.type === 'accelerometer')
          .slice(-5);
        
        const avgMagnitude = recentData.reduce((sum, d) => {
          const data = d.encrypted ? this.decryptData(d.value) : d.value;
          const mag = Math.sqrt(
            Math.pow(data.x, 2) + Math.pow(data.y, 2) + Math.pow(data.z, 2)
          );
          return sum + mag;
        }, 0) / recentData.length;

        if (avgMagnitude < 0.5) { // Very low activity after impact
          this.triggerAlert('fall_detected', {
            sensorId: sensor.id,
            timestamp: dataPoint.timestamp,
            magnitude,
            confidence: 0.85,
          });
        }
      }, 5000); // Wait 5 seconds to check for stillness
    }
  }

  detectHeartRateAnomaly(dataPoint, sensor) {
    const heartRate = dataPoint.encrypted ? 
      this.decryptData(dataPoint.value) : dataPoint.value;

    // Get recent heart rate history
    const recentHeartRates = sensor.dataHistory
      .filter(d => d.type === 'heartrate')
      .slice(-10)
      .map(d => d.encrypted ? this.decryptData(d.value) : d.value);

    if (recentHeartRates.length < 5) return; // Need sufficient history

    const avgHeartRate = recentHeartRates.reduce((sum, hr) => sum + hr, 0) / recentHeartRates.length;

    // Check for dangerous heart rate levels
    if (heartRate > 120 || heartRate < 50) {
      this.triggerAlert('heart_rate_anomaly', {
        sensorId: sensor.id,
        timestamp: dataPoint.timestamp,
        currentRate: heartRate,
        averageRate: avgHeartRate,
        severity: heartRate > 150 || heartRate < 40 ? 'critical' : 'warning',
      });
    }

    // Check for sudden changes
    const rateDifference = Math.abs(heartRate - avgHeartRate);
    if (rateDifference > 30) {
      this.triggerAlert('heart_rate_change', {
        sensorId: sensor.id,
        timestamp: dataPoint.timestamp,
        currentRate: heartRate,
        averageRate: avgHeartRate,
        difference: rateDifference,
        severity: 'warning',
      });
    }
  }

  handleEmergencyAlert(dataPoint, sensor) {
    const emergencyData = dataPoint.encrypted ? 
      this.decryptData(dataPoint.value) : dataPoint.value;

    this.triggerAlert('emergency_button', {
      sensorId: sensor.id,
      timestamp: dataPoint.timestamp,
      location: emergencyData.location,
      severity: 'critical',
    });
  }

  triggerAlert(alertType, alertData) {
    const alert = {
      id: crypto.randomUUID(),
      type: alertType,
      timestamp: new Date().toISOString(),
      deviceId: this.config.deviceId,
      ...alertData,
    };

    console.log(`ALERT TRIGGERED: ${alertType}`, alert);

    // Store alert locally
    this.storeAlert(alert);

    // Send immediate notification if online
    if (this.isOnline) {
      this.sendCloudAlert(alert);
    }

    // Execute local alert handlers
    if (this.alertHandlers.has(alertType)) {
      this.alertHandlers.get(alertType)(alert);
    }

    this.emit('alertTriggered', alert);
  }

  async storeAlert(alert) {
    try {
      const alertsFile = path.join(this.config.dataPath, 'alerts.json');
      let alerts = [];
      
      try {
        const alertsData = await fs.readFile(alertsFile, 'utf8');
        alerts = JSON.parse(alertsData);
      } catch (error) {
        // File doesn't exist yet, start with empty array
      }

      alerts.push(alert);
      
      // Keep only last 1000 alerts
      if (alerts.length > 1000) {
        alerts = alerts.slice(-1000);
      }

      await fs.writeFile(alertsFile, JSON.stringify(alerts, null, 2));
    } catch (error) {
      console.error('Failed to store alert:', error);
    }
  }

  sendCloudAlert(alert) {
    if (this.wsClient && this.wsClient.readyState === WebSocket.OPEN) {
      this.wsClient.send(JSON.stringify({
        type: 'alert',
        data: alert,
      }));
    }
  }

  initializeAnomalyDetection() {
    // Initialize simple statistical models for anomaly detection
    this.anomalyModels = {
      heartRate: new StatisticalAnomalyDetector('heartRate'),
      steps: new StatisticalAnomalyDetector('steps'),
      sleep: new StatisticalAnomalyDetector('sleep'),
    };
  }

  startDataProcessing() {
    // Process data buffer every 30 seconds
    setInterval(() => {
      this.processDataBuffer();
    }, 30000);

    // Sync with cloud every 5 minutes
    setInterval(() => {
      if (this.isOnline) {
        this.syncPendingData();
      }
    }, 300000);

    // Cleanup old data daily
    setInterval(() => {
      this.cleanupOldData();
    }, 86400000); // 24 hours
  }

  async processDataBuffer() {
    if (this.dataBuffer.length === 0) return;

    const batch = this.dataBuffer.splice(0, 100); // Process in batches of 100
    
    for (const dataPoint of batch) {
      if (!dataPoint.processed) {
        // Run anomaly detection
        if (this.anomalyModels[dataPoint.type]) {
          const isAnomalous = this.anomalyModels[dataPoint.type].detect(dataPoint);
          if (isAnomalous) {
            this.triggerAlert(`${dataPoint.type}_anomaly`, {
              sensorId: dataPoint.sensorId,
              timestamp: dataPoint.timestamp,
              value: dataPoint.value,
              severity: 'warning',
            });
          }
        }

        dataPoint.processed = true;
      }
    }

    // Store processed data
    await this.storeProcessedData(batch);
  }

  async storeProcessedData(dataPoints) {
    try {
      const dataFile = path.join(this.config.dataPath, 'sensor_data.json');
      let existingData = [];
      
      try {
        const data = await fs.readFile(dataFile, 'utf8');
        existingData = JSON.parse(data);
      } catch (error) {
        // File doesn't exist yet
      }

      existingData.push(...dataPoints);
      
      // Keep only data from last retention period
      const retentionMs = this.config.privacy.dataRetentionDays * 24 * 60 * 60 * 1000;
      const cutoffTime = new Date(Date.now() - retentionMs);
      
      existingData = existingData.filter(d => 
        new Date(d.timestamp) > cutoffTime
      );

      await fs.writeFile(dataFile, JSON.stringify(existingData, null, 2));
    } catch (error) {
      console.error('Failed to store processed data:', error);
    }
  }

  async syncPendingData() {
    if (!this.isOnline) return;

    try {
      // Load pending data
      const dataFile = path.join(this.config.dataPath, 'sensor_data.json');
      const alertsFile = path.join(this.config.dataPath, 'alerts.json');

      const [sensorData, alerts] = await Promise.all([
        this.loadJSONFile(dataFile),
        this.loadJSONFile(alertsFile),
      ]);

      // Filter unsynced data
      const unsyncedData = sensorData.filter(d => !d.synced);
      const unsyncedAlerts = alerts.filter(a => !a.synced);

      if (unsyncedData.length > 0 || unsyncedAlerts.length > 0) {
        // Send to cloud
        const syncPayload = {
          type: 'data_sync',
          deviceId: this.config.deviceId,
          data: {
            sensorData: unsyncedData,
            alerts: unsyncedAlerts,
          },
        };

        if (this.wsClient && this.wsClient.readyState === WebSocket.OPEN) {
          this.wsClient.send(JSON.stringify(syncPayload));
        }
      }
    } catch (error) {
      console.error('Failed to sync data:', error);
    }
  }

  async loadJSONFile(filePath) {
    try {
      const data = await fs.readFile(filePath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      return [];
    }
  }

  async loadPersistedData() {
    // Load any configuration or state that needs to persist across restarts
    const configFile = path.join(this.config.dataPath, 'gateway_config.json');
    try {
      const data = await fs.readFile(configFile, 'utf8');
      const persistedConfig = JSON.parse(data);
      this.config = { ...this.config, ...persistedConfig };
    } catch (error) {
      // No persisted config, use defaults
    }
  }

  async cleanupOldData() {
    const retentionMs = this.config.privacy.dataRetentionDays * 24 * 60 * 60 * 1000;
    const cutoffTime = new Date(Date.now() - retentionMs);

    // Clean up sensor data
    const dataFile = path.join(this.config.dataPath, 'sensor_data.json');
    const data = await this.loadJSONFile(dataFile);
    const filteredData = data.filter(d => new Date(d.timestamp) > cutoffTime);
    await fs.writeFile(dataFile, JSON.stringify(filteredData, null, 2));

    // Clean up alerts
    const alertsFile = path.join(this.config.dataPath, 'alerts.json');
    const alerts = await this.loadJSONFile(alertsFile);
    const filteredAlerts = alerts.filter(a => new Date(a.timestamp) > cutoffTime);
    await fs.writeFile(alertsFile, JSON.stringify(filteredAlerts, null, 2));

    console.log(`Cleaned up data older than ${this.config.privacy.dataRetentionDays} days`);
  }

  handleCloudMessage(message) {
    switch (message.type) {
      case 'config_update':
        this.updateConfiguration(message.data);
        break;
      case 'sync_acknowledgment':
        this.handleSyncAcknowledgment(message.data);
        break;
      case 'alert_response':
        this.handleAlertResponse(message.data);
        break;
      default:
        console.log('Unknown cloud message type:', message.type);
    }
  }

  updateConfiguration(newConfig) {
    this.config = { ...this.config, ...newConfig };
    console.log('Configuration updated from cloud');
    this.emit('configUpdated', this.config);
  }

  handleSyncAcknowledgment(ackData) {
    // Mark synced data as acknowledged
    console.log('Data sync acknowledged:', ackData);
  }

  handleAlertResponse(response) {
    console.log('Alert response received:', response);
    this.emit('alertResponse', response);
  }

  // Public methods for external control
  addAlertHandler(alertType, handler) {
    this.alertHandlers.set(alertType, handler);
  }

  removeAlertHandler(alertType) {
    this.alertHandlers.delete(alertType);
  }

  getSensorStatus() {
    return Array.from(this.sensors.values()).map(sensor => ({
      id: sensor.id,
      name: sensor.name,
      type: sensor.type,
      status: sensor.status,
      lastSeen: sensor.lastSeen,
      batteryLevel: sensor.batteryLevel,
    }));
  }

  getSystemStatus() {
    return {
      deviceId: this.config.deviceId,
      isOnline: this.isOnline,
      sensorsCount: this.sensors.size,
      dataBufferSize: this.dataBuffer.length,
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
    };
  }
}

// Simple statistical anomaly detector
class StatisticalAnomalyDetector {
  constructor(dataType) {
    this.dataType = dataType;
    this.history = [];
    this.windowSize = 50; // Keep last 50 data points for calculation
  }

  detect(dataPoint) {
    const value = dataPoint.encrypted ? 
      JSON.parse(this.decryptData(dataPoint.value)) : dataPoint.value;
    
    this.history.push(value);
    if (this.history.length > this.windowSize) {
      this.history.shift();
    }

    if (this.history.length < 10) {
      return false; // Need sufficient history
    }

    const mean = this.history.reduce((sum, v) => sum + v, 0) / this.history.length;
    const variance = this.history.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / this.history.length;
    const stdDev = Math.sqrt(variance);

    // Value is anomalous if it's more than 2 standard deviations from mean
    const zScore = Math.abs(value - mean) / stdDev;
    return zScore > 2;
  }
}

// Export the gateway class
module.exports = ElderCareIoTGateway;

// If run directly, start the gateway
if (require.main === module) {
  const config = {
    apiKey: process.env.API_KEY,
    cloudEndpoint: process.env.CLOUD_ENDPOINT,
  };

  const gateway = new ElderCareIoTGateway(config);

  // Add some example alert handlers
  gateway.addAlertHandler('fall_detected', (alert) => {
    console.log('🚨 FALL DETECTED - Initiating emergency protocol');
    // In real implementation, this would trigger immediate emergency response
  });

  gateway.addAlertHandler('emergency_button', (alert) => {
    console.log('🚨 EMERGENCY BUTTON PRESSED - Contacting emergency services');
    // In real implementation, this would contact emergency services
  });

  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('Shutting down gateway...');
    gateway.mqttClient?.end();
    gateway.wsClient?.close();
    process.exit(0);
  });
}