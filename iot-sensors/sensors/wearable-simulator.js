#!/usr/bin/env node

/**
 * ElderCare Connect Wearable Device Simulator
 * 
 * This simulator mimics a wearable device worn by senior citizens,
 * generating realistic health and activity data for testing and development.
 * 
 * Features:
 * - Realistic biometric data generation
 * - Activity pattern simulation
 * - Fall detection scenarios
 * - Battery level simulation
 * - Bluetooth Low Energy (BLE) communication simulation
 */

const mqtt = require('mqtt');
const EventEmitter = require('events');

class WearableDeviceSimulator extends EventEmitter {
  constructor(config = {}) {
    super();
    
    this.config = {
      deviceId: config.deviceId || `wearable-${Math.random().toString(36).substr(2, 9)}`,
      seniorProfile: config.seniorProfile || this.generateSeniorProfile(),
      mqttBroker: config.mqttBroker || 'mqtt://localhost:1883',
      transmissionInterval: config.transmissionInterval || 30000, // 30 seconds
      batteryCapacity: config.batteryCapacity || 100,
      ...config
    };

    this.state = {
      batteryLevel: 100,
      isCharging: false,
      isActive: true,
      currentActivity: 'resting',
      heartRate: 70,
      steps: 0,
      location: { lat: 40.7128, lng: -74.0060 }, // Default to NYC
      lastFallTime: null,
      sleepState: 'awake',
    };

    this.mqttClient = null;
    this.dataGenerationInterval = null;
    this.batteryDrainInterval = null;
    
    this.initializeDevice();
  }

  generateSeniorProfile() {
    const profiles = [
      {
        name: 'Margaret Thompson',
        age: 72,
        conditions: ['hypertension', 'arthritis'],
        restingHeartRate: 68,
        maxHeartRate: 148,
        averageStepsPerDay: 3500,
        sleepHours: 7.5,
        activityLevel: 'moderate',
        fallRisk: 'low',
      },
      {
        name: 'Robert Chen',
        age: 78,
        conditions: ['diabetes', 'heart_disease'],
        restingHeartRate: 72,
        maxHeartRate: 142,
        averageStepsPerDay: 2800,
        sleepHours: 6.8,
        activityLevel: 'low',
        fallRisk: 'medium',
      },
      {
        name: 'Elena Rodriguez',
        age: 69,
        conditions: ['osteoporosis'],
        restingHeartRate: 65,
        maxHeartRate: 151,
        averageStepsPerDay: 4200,
        sleepHours: 8.2,
        activityLevel: 'high',
        fallRisk: 'medium',
      },
    ];

    return profiles[Math.floor(Math.random() * profiles.length)];
  }

  async initializeDevice() {
    try {
      // Connect to MQTT broker
      await this.connectMQTT();
      
      // Start data generation
      this.startDataGeneration();
      
      // Start battery simulation
      this.startBatterySimulation();
      
      // Simulate daily activity patterns
      this.simulateDailyPatterns();
      
      console.log(`Wearable device ${this.config.deviceId} initialized for ${this.config.seniorProfile.name}`);
      this.emit('initialized');
      
    } catch (error) {
      console.error('Failed to initialize wearable device:', error);
      this.emit('error', error);
    }
  }

  async connectMQTT() {
    return new Promise((resolve, reject) => {
      this.mqttClient = mqtt.connect(this.config.mqttBroker, {
        clientId: this.config.deviceId,
        clean: true,
      });

      this.mqttClient.on('connect', () => {
        console.log(`Wearable ${this.config.deviceId} connected to MQTT broker`);
        resolve();
      });

      this.mqttClient.on('error', (error) => {
        console.error('MQTT connection error:', error);
        reject(error);
      });

      this.mqttClient.on('close', () => {
        console.log(`Wearable ${this.config.deviceId} disconnected from MQTT broker`);
      });
    });
  }

  startDataGeneration() {
    this.dataGenerationInterval = setInterval(() => {
      if (this.state.isActive && this.state.batteryLevel > 0) {
        this.generateAndTransmitData();
      }
    }, this.config.transmissionInterval);
  }

  generateAndTransmitData() {
    // Generate heart rate data
    const heartRateData = this.generateHeartRateData();
    this.transmitData('heartrate', heartRateData);

    // Generate step data every minute
    if (Date.now() % 60000 < this.config.transmissionInterval) {
      const stepsData = this.generateStepsData();
      this.transmitData('steps', stepsData);
    }

    // Generate location data every 5 minutes
    if (Date.now() % 300000 < this.config.transmissionInterval) {
      const locationData = this.generateLocationData();
      this.transmitData('location', locationData);
    }

    // Generate accelerometer data (for fall detection)
    const accelerometerData = this.generateAccelerometerData();
    this.transmitData('accelerometer', accelerometerData);

    // Generate sleep data during sleep hours
    if (this.isInSleepPeriod()) {
      const sleepData = this.generateSleepData();
      this.transmitData('sleep', sleepData);
    }

    // Occasionally simulate emergency scenarios
    if (Math.random() < 0.001) { // 0.1% chance
      this.simulateEmergencyScenario();
    }
  }

  generateHeartRateData() {
    const profile = this.config.seniorProfile;
    let baseHeartRate = profile.restingHeartRate;

    // Adjust based on activity
    switch (this.state.currentActivity) {
      case 'walking':
        baseHeartRate += 20;
        break;
      case 'climbing_stairs':
        baseHeartRate += 35;
        break;
      case 'exercising':
        baseHeartRate += 45;
        break;
      case 'sleeping':
        baseHeartRate -= 10;
        break;
    }

    // Add some natural variation
    const variation = (Math.random() - 0.5) * 10;
    this.state.heartRate = Math.max(50, Math.min(profile.maxHeartRate, baseHeartRate + variation));

    // Simulate conditions-based variations
    if (profile.conditions.includes('heart_disease') && Math.random() < 0.1) {
      this.state.heartRate += Math.random() * 20; // Occasional irregular heartbeat
    }

    return {
      value: Math.round(this.state.heartRate),
      timestamp: new Date().toISOString(),
      metadata: {
        activity: this.state.currentActivity,
        confidence: 0.95,
        sensor: 'optical_heart_rate',
      }
    };
  }

  generateStepsData() {
    const profile = this.config.seniorProfile;
    let stepsIncrement = 0;

    // Steps based on current activity
    switch (this.state.currentActivity) {
      case 'walking':
        stepsIncrement = Math.floor(Math.random() * 120) + 80; // 80-200 steps per minute
        break;
      case 'climbing_stairs':
        stepsIncrement = Math.floor(Math.random() * 60) + 40; // 40-100 steps per minute
        break;
      case 'exercising':
        stepsIncrement = Math.floor(Math.random() * 100) + 60; // 60-160 steps per minute
        break;
      case 'household_chores':
        stepsIncrement = Math.floor(Math.random() * 40) + 20; // 20-60 steps per minute
        break;
      default:
        stepsIncrement = Math.floor(Math.random() * 10); // 0-10 steps per minute when resting
    }

    this.state.steps += stepsIncrement;

    return {
      value: this.state.steps,
      increment: stepsIncrement,
      timestamp: new Date().toISOString(),
      metadata: {
        activity: this.state.currentActivity,
        dailyGoal: profile.averageStepsPerDay,
        progress: (this.state.steps / profile.averageStepsPerDay) * 100,
      }
    };
  }

  generateLocationData() {
    // Simulate realistic movement patterns
    const moveDistance = this.state.currentActivity === 'walking' ? 0.001 : 0.0001;
    
    // Add small random movement
    this.state.location.lat += (Math.random() - 0.5) * moveDistance;
    this.state.location.lng += (Math.random() - 0.5) * moveDistance;

    return {
      value: {
        latitude: this.state.location.lat,
        longitude: this.state.location.lng,
        accuracy: Math.random() * 10 + 5, // 5-15 meters accuracy
        altitude: Math.random() * 50 + 100, // 100-150 meters
      },
      timestamp: new Date().toISOString(),
      metadata: {
        source: 'gps',
        batteryOptimized: true,
      }
    };
  }

  generateAccelerometerData() {
    let x, y, z;

    // Base acceleration values based on activity
    switch (this.state.currentActivity) {
      case 'resting':
        x = (Math.random() - 0.5) * 0.2;
        y = (Math.random() - 0.5) * 0.2;
        z = 9.8 + (Math.random() - 0.5) * 0.2; // Gravity + small variation
        break;
      case 'walking':
        x = (Math.random() - 0.5) * 2;
        y = (Math.random() - 0.5) * 1;
        z = 9.8 + (Math.random() - 0.5) * 3;
        break;
      case 'climbing_stairs':
        x = (Math.random() - 0.5) * 3;
        y = (Math.random() - 0.5) * 4;
        z = 9.8 + (Math.random() - 0.5) * 4;
        break;
      default:
        x = (Math.random() - 0.5) * 1;
        y = (Math.random() - 0.5) * 1;
        z = 9.8 + (Math.random() - 0.5) * 1;
    }

    // Simulate potential fall scenario
    if (this.shouldSimulateFall()) {
      // High acceleration followed by impact
      x = (Math.random() - 0.5) * 20;
      y = (Math.random() - 0.5) * 20;
      z = Math.random() * 30 + 10;
      this.state.lastFallTime = Date.now();
      console.log(`⚠️  Simulating fall for ${this.config.deviceId}`);
    }

    return {
      value: { x, y, z },
      timestamp: new Date().toISOString(),
      metadata: {
        sampleRate: 50, // 50 Hz
        sensitivity: 'high',
      }
    };
  }

  generateSleepData() {
    const sleepQuality = Math.random() * 100; // 0-100%
    const sleepStage = this.determineSleepStage();

    return {
      value: {
        stage: sleepStage,
        quality: sleepQuality,
        movementLevel: sleepStage === 'deep' ? 'minimal' : 'moderate',
        heartRateVariability: this.calculateSleepHRV(sleepStage),
      },
      timestamp: new Date().toISOString(),
      metadata: {
        sleepSession: this.getCurrentSleepSessionId(),
        totalSleepTime: this.calculateTotalSleepTime(),
      }
    };
  }

  determineSleepStage() {
    const hour = new Date().getHours();
    const sleepStages = ['light', 'deep', 'rem', 'awake'];
    
    // Simulate natural sleep cycles
    if (hour >= 23 || hour <= 2) {
      return sleepStages[Math.floor(Math.random() * 3)]; // More deep sleep early
    } else if (hour >= 3 && hour <= 5) {
      return Math.random() < 0.7 ? 'rem' : 'light'; // More REM sleep later
    } else {
      return 'light';
    }
  }

  calculateSleepHRV(sleepStage) {
    // Heart rate variability during sleep
    switch (sleepStage) {
      case 'deep': return Math.random() * 20 + 40; // 40-60ms
      case 'rem': return Math.random() * 15 + 30; // 30-45ms
      case 'light': return Math.random() * 10 + 35; // 35-45ms
      default: return Math.random() * 25 + 25; // 25-50ms
    }
  }

  shouldSimulateFall() {
    const profile = this.config.seniorProfile;
    const timeSinceLastFall = this.state.lastFallTime ? Date.now() - this.state.lastFallTime : Infinity;
    
    // Don't simulate falls too frequently
    if (timeSinceLastFall < 3600000) return false; // 1 hour minimum between falls

    // Risk-based fall probability
    const riskMultiplier = {
      'low': 0.001,
      'medium': 0.002,
      'high': 0.004,
    }[profile.fallRisk] || 0.001;

    return Math.random() < riskMultiplier;
  }

  simulateEmergencyScenario() {
    const scenarios = [
      'emergency_button_pressed',
      'medication_missed',
      'wandering_detected',
      'panic_alert',
    ];

    const scenario = scenarios[Math.floor(Math.random() * scenarios.length)];
    
    console.log(`🚨 Simulating emergency scenario: ${scenario} for ${this.config.deviceId}`);

    this.transmitData('emergency', {
      value: {
        type: scenario,
        severity: Math.random() < 0.3 ? 'critical' : 'warning',
        userInitiated: scenario === 'emergency_button_pressed',
        location: this.state.location,
      },
      timestamp: new Date().toISOString(),
      metadata: {
        confidence: 0.9,
        requiresImmedateResponse: true,
      }
    });
  }

  transmitData(dataType, data) {
    const topic = `sensors/${this.config.deviceId}/${dataType}`;
    const message = JSON.stringify(data);

    if (this.mqttClient && this.mqttClient.connected) {
      this.mqttClient.publish(topic, message, { qos: 1 }, (error) => {
        if (error) {
          console.error(`Failed to transmit ${dataType} data:`, error);
        }
      });

      // Drain battery slightly for each transmission
      this.drainBattery(0.01);
    }
  }

  simulateDailyPatterns() {
    // Update activity patterns based on time of day
    setInterval(() => {
      this.updateActivityBasedOnTime();
    }, 60000); // Check every minute

    // Reset daily steps at midnight
    setInterval(() => {
      const now = new Date();
      if (now.getHours() === 0 && now.getMinutes() === 0) {
        this.state.steps = 0;
        console.log(`Daily step count reset for ${this.config.deviceId}`);
      }
    }, 60000);
  }

  updateActivityBasedOnTime() {
    const hour = new Date().getHours();
    const minute = new Date().getMinutes();

    // Determine activity based on time of day
    if (this.isInSleepPeriod()) {
      this.state.currentActivity = 'sleeping';
      this.state.sleepState = 'sleeping';
    } else {
      // Daytime activities
      const activities = ['resting', 'walking', 'household_chores'];
      const weights = this.getActivityWeights(hour);
      
      this.state.currentActivity = this.weightedRandomChoice(activities, weights);
      this.state.sleepState = 'awake';
    }
  }

  isInSleepPeriod() {
    const hour = new Date().getHours();
    const profile = this.config.seniorProfile;
    
    // Assuming sleep from 10 PM to 6 AM (adjustable based on profile)
    const sleepStart = 22;
    const sleepEnd = 6;
    
    return hour >= sleepStart || hour < sleepEnd;
  }

  getActivityWeights(hour) {
    // Activity probability weights based on hour
    if (hour >= 6 && hour < 9) {
      return [0.3, 0.5, 0.2]; // Morning - more walking (getting ready)
    } else if (hour >= 9 && hour < 12) {
      return [0.2, 0.6, 0.2]; // Late morning - most active
    } else if (hour >= 12 && hour < 14) {
      return [0.5, 0.3, 0.2]; // Lunch - more resting
    } else if (hour >= 14 && hour < 17) {
      return [0.3, 0.4, 0.3]; // Afternoon - moderate activity
    } else if (hour >= 17 && hour < 20) {
      return [0.4, 0.3, 0.3]; // Evening - less walking
    } else {
      return [0.7, 0.2, 0.1]; // Night - mostly resting
    }
  }

  weightedRandomChoice(choices, weights) {
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
    let random = Math.random() * totalWeight;
    
    for (let i = 0; i < choices.length; i++) {
      if (random < weights[i]) {
        return choices[i];
      }
      random -= weights[i];
    }
    
    return choices[choices.length - 1];
  }

  startBatterySimulation() {
    this.batteryDrainInterval = setInterval(() => {
      if (!this.state.isCharging) {
        // Normal battery drain
        this.drainBattery(0.1); // 0.1% per minute
        
        // Faster drain during active periods
        if (this.state.currentActivity !== 'resting' && this.state.currentActivity !== 'sleeping') {
          this.drainBattery(0.05);
        }
        
        // Check if device should auto-charge (simulate charging at night)
        if (this.state.batteryLevel < 20 && this.isInSleepPeriod()) {
          this.startCharging();
        }
      } else {
        // Charging
        this.state.batteryLevel = Math.min(100, this.state.batteryLevel + 2); // 2% per minute
        
        if (this.state.batteryLevel >= 100) {
          this.stopCharging();
        }
      }
    }, 60000); // Check every minute
  }

  drainBattery(amount) {
    this.state.batteryLevel = Math.max(0, this.state.batteryLevel - amount);
    
    if (this.state.batteryLevel <= 0) {
      this.state.isActive = false;
      console.log(`⚠️  Device ${this.config.deviceId} battery depleted - device inactive`);
    } else if (this.state.batteryLevel <= 15) {
      this.transmitData('battery', {
        value: {
          level: this.state.batteryLevel,
          isCharging: this.state.isCharging,
          estimatedTimeRemaining: this.state.batteryLevel * 10, // Rough estimate in minutes
        },
        timestamp: new Date().toISOString(),
        metadata: {
          alert: 'low_battery',
          severity: this.state.batteryLevel <= 5 ? 'critical' : 'warning',
        }
      });
    }
  }

  startCharging() {
    this.state.isCharging = true;
    this.state.isActive = true; // Reactivate if was inactive due to battery
    console.log(`🔋 Device ${this.config.deviceId} started charging`);
  }

  stopCharging() {
    this.state.isCharging = false;
    console.log(`🔋 Device ${this.config.deviceId} fully charged`);
  }

  getCurrentSleepSessionId() {
    const date = new Date();
    return `sleep-${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
  }

  calculateTotalSleepTime() {
    // Simplified calculation - in real implementation, this would track actual sleep duration
    const profile = this.config.seniorProfile;
    return profile.sleepHours + (Math.random() - 0.5) * 2; // ±1 hour variation
  }

  // Public methods for external control
  getDeviceStatus() {
    return {
      deviceId: this.config.deviceId,
      seniorProfile: this.config.seniorProfile,
      currentState: this.state,
      batteryLevel: this.state.batteryLevel,
      isActive: this.state.isActive,
      isCharging: this.state.isCharging,
      connected: this.mqttClient?.connected || false,
    };
  }

  simulateManualEmergency() {
    this.transmitData('emergency', {
      value: {
        type: 'emergency_button_pressed',
        severity: 'critical',
        userInitiated: true,
        location: this.state.location,
      },
      timestamp: new Date().toISOString(),
      metadata: {
        confidence: 1.0,
        requiresImmedateResponse: true,
      }
    });
  }

  shutdown() {
    if (this.dataGenerationInterval) {
      clearInterval(this.dataGenerationInterval);
    }
    if (this.batteryDrainInterval) {
      clearInterval(this.batteryDrainInterval);
    }
    if (this.mqttClient) {
      this.mqttClient.end();
    }
    console.log(`Wearable device ${this.config.deviceId} shut down`);
  }
}

// Export the simulator class
module.exports = WearableDeviceSimulator;

// If run directly, start a simulator instance
if (require.main === module) {
  const simulator = new WearableDeviceSimulator({
    deviceId: process.argv[2] || `wearable-${Math.random().toString(36).substr(2, 9)}`,
    mqttBroker: process.env.MQTT_BROKER || 'mqtt://localhost:1883',
  });

  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('Shutting down wearable simulator...');
    simulator.shutdown();
    process.exit(0);
  });

  // Log device status every 5 minutes
  setInterval(() => {
    const status = simulator.getDeviceStatus();
    console.log(`📊 Device Status: Battery ${status.batteryLevel}%, Activity: ${status.currentState.currentActivity}, Steps: ${status.currentState.steps}`);
  }, 300000);
}