import React, { useEffect, useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  RefreshControl,
  Alert,
} from 'react-native';
import {
  Card,
  Title,
  Paragraph,
  Button,
  Chip,
  FAB,
  Portal,
  Modal,
  Text,
  Surface,
  ProgressBar,
  IconButton,
} from 'react-native-paper';
import { LineChart, BarChart } from 'react-native-chart-kit';
import { Dimensions } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../store';
import {
  syncHealthData,
  acknowledgeAlert,
  markAlertResponded,
  loadLocalHealthData,
} from '../store/slices/healthSlice';

const screenWidth = Dimensions.get('window').width;

interface HealthDashboardProps {
  userRole: 'senior' | 'family_caregiver' | 'professional_caregiver';
}

const HealthDashboard: React.FC<HealthDashboardProps> = ({ userRole }) => {
  const dispatch = useDispatch<AppDispatch>();
  const {
    metrics,
    alerts,
    dailySummaries,
    isLoading,
    error,
    lastSync,
    deviceConnected,
    realTimeMonitoring,
  } = useSelector((state: RootState) => state.health);
  
  const [refreshing, setRefreshing] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState<any>(null);
  const [showAlertModal, setShowAlertModal] = useState(false);

  useEffect(() => {
    // Load local data on component mount
    dispatch(loadLocalHealthData());
  }, [dispatch]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await dispatch(syncHealthData()).unwrap();
    } catch (error) {
      console.error('Sync failed:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleAlertPress = (alert: any) => {
    setSelectedAlert(alert);
    setShowAlertModal(true);
  };

  const handleAcknowledgeAlert = async (alertId: string) => {
    dispatch(acknowledgeAlert(alertId));
    setShowAlertModal(false);
  };

  const handleRespondToAlert = async (alertId: string) => {
    dispatch(markAlertResponded(alertId));
    setShowAlertModal(false);
    
    // Show response options based on alert type
    Alert.alert(
      'Alert Response',
      'What action would you like to take?',
      [
        { text: 'Call Emergency Services', onPress: () => {/* Handle emergency call */} },
        { text: 'Contact Family', onPress: () => {/* Contact family */} },
        { text: 'Schedule Check-in', onPress: () => {/* Schedule visit */} },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const getStepsData = () => {
    const last7Days = dailySummaries.slice(0, 7).reverse();
    return {
      labels: last7Days.map(day => 
        new Date(day.date).toLocaleDateString('en', { weekday: 'short' })
      ),
      datasets: [{
        data: last7Days.map(day => day.steps),
        color: (opacity = 1) => `rgba(134, 65, 244, ${opacity})`,
        strokeWidth: 2,
      }],
    };
  };

  const getHeartRateData = () => {
    const last24Hours = metrics
      .filter(m => m.type === 'heart_rate')
      .slice(0, 24)
      .reverse();
    
    return {
      labels: last24Hours.map((_, index) => 
        index % 4 === 0 ? `${24 - index}h` : ''
      ),
      datasets: [{
        data: last24Hours.map(m => Number(m.value)),
        color: (opacity = 1) => `rgba(255, 99, 132, ${opacity})`,
        strokeWidth: 2,
      }],
    };
  };

  const getAlertSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return '#ff4444';
      case 'high': return '#ff8800';
      case 'medium': return '#ffbb33';
      case 'low': return '#00C851';
      default: return '#33b5e5';
    }
  };

  const renderDeviceStatus = () => (
    <Card style={styles.card}>
      <Card.Content>
        <View style={styles.deviceStatusRow}>
          <Title>Device Status</Title>
          <Chip
            icon={deviceConnected ? 'bluetooth-connect' : 'bluetooth-off'}
            mode="outlined"
            style={{ 
              backgroundColor: deviceConnected ? '#e8f5e8' : '#ffeaea'
            }}
          >
            {deviceConnected ? 'Connected' : 'Disconnected'}
          </Chip>
        </View>
        
        <View style={styles.statusGrid}>
          <Surface style={styles.statusItem}>
            <IconButton icon="heart-pulse" size={24} />
            <Text>Real-time</Text>
            <Chip size="small">
              {realTimeMonitoring ? 'ON' : 'OFF'}
            </Chip>
          </Surface>
          
          <Surface style={styles.statusItem}>
            <IconButton icon="sync" size={24} />
            <Text>Last Sync</Text>
            <Text style={styles.syncTime}>
              {lastSync ? new Date(lastSync).toLocaleTimeString() : 'Never'}
            </Text>
          </Surface>
        </View>
      </Card.Content>
    </Card>
  );

  const renderActiveAlerts = () => {
    const activeAlerts = alerts.filter(alert => !alert.acknowledged);
    
    if (activeAlerts.length === 0) {
      return (
        <Card style={styles.card}>
          <Card.Content>
            <Title>Alerts</Title>
            <Paragraph>No active alerts</Paragraph>
          </Card.Content>
        </Card>
      );
    }

    return (
      <Card style={styles.card}>
        <Card.Content>
          <Title>Active Alerts ({activeAlerts.length})</Title>
          {activeAlerts.slice(0, 3).map((alert) => (
            <Surface
              key={alert.id}
              style={[
                styles.alertItem,
                { borderLeftColor: getAlertSeverityColor(alert.severity) }
              ]}
            >
              <View style={styles.alertContent}>
                <Text style={styles.alertMessage}>{alert.message}</Text>
                <Text style={styles.alertTime}>
                  {new Date(alert.timestamp).toLocaleTimeString()}
                </Text>
              </View>
              <Button
                mode="outlined"
                onPress={() => handleAlertPress(alert)}
                compact
              >
                View
              </Button>
            </Surface>
          ))}
          {activeAlerts.length > 3 && (
            <Button mode="text" onPress={() => {/* Navigate to all alerts */}}>
              View All ({activeAlerts.length})
            </Button>
          )}
        </Card.Content>
      </Card>
    );
  };

  const renderHealthMetrics = () => (
    <View>
      <Card style={styles.card}>
        <Card.Content>
          <Title>Daily Steps</Title>
          {dailySummaries.length > 0 ? (
            <LineChart
              data={getStepsData()}
              width={screenWidth - 60}
              height={220}
              chartConfig={{
                backgroundColor: '#ffffff',
                backgroundGradientFrom: '#ffffff',
                backgroundGradientTo: '#ffffff',
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(134, 65, 244, ${opacity})`,
                labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                style: { borderRadius: 16 },
                propsForDots: {
                  r: '6',
                  strokeWidth: '2',
                  stroke: '#8641f4'
                }
              }}
              bezier
              style={styles.chart}
            />
          ) : (
            <Paragraph>No step data available</Paragraph>
          )}
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <Title>Heart Rate Trend</Title>
          {metrics.filter(m => m.type === 'heart_rate').length > 0 ? (
            <LineChart
              data={getHeartRateData()}
              width={screenWidth - 60}
              height={220}
              chartConfig={{
                backgroundColor: '#ffffff',
                backgroundGradientFrom: '#ffffff',
                backgroundGradientTo: '#ffffff',
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(255, 99, 132, ${opacity})`,
                labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                style: { borderRadius: 16 },
              }}
              bezier
              style={styles.chart}
            />
          ) : (
            <Paragraph>No heart rate data available</Paragraph>
          )}
        </Card.Content>
      </Card>
    </View>
  );

  const renderTodaysSummary = () => {
    const today = dailySummaries[0];
    if (!today) return null;

    return (
      <Card style={styles.card}>
        <Card.Content>
          <Title>Today's Summary</Title>
          <View style={styles.summaryGrid}>
            <View style={styles.summaryItem}>
              <IconButton icon="walk" size={32} />
              <Text style={styles.summaryValue}>{today.steps}</Text>
              <Text style={styles.summaryLabel}>Steps</Text>
            </View>
            
            <View style={styles.summaryItem}>
              <IconButton icon="heart" size={32} />
              <Text style={styles.summaryValue}>{today.heartRateAvg}</Text>
              <Text style={styles.summaryLabel}>Avg BPM</Text>
            </View>
            
            <View style={styles.summaryItem}>
              <IconButton icon="sleep" size={32} />
              <Text style={styles.summaryValue}>{today.sleepHours}h</Text>
              <Text style={styles.summaryLabel}>Sleep</Text>
            </View>
            
            <View style={styles.summaryItem}>
              <IconButton icon="pill" size={32} />
              <Text style={styles.summaryValue}>{today.medicationCompliance}%</Text>
              <Text style={styles.summaryLabel}>Medication</Text>
            </View>
          </View>
        </Card.Content>
      </Card>
    );
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {renderDeviceStatus()}
      {renderActiveAlerts()}
      {renderTodaysSummary()}
      {renderHealthMetrics()}

      {/* Alert Detail Modal */}
      <Portal>
        <Modal
          visible={showAlertModal}
          onDismiss={() => setShowAlertModal(false)}
          contentContainerStyle={styles.modal}
        >
          {selectedAlert && (
            <View>
              <Title>Alert Details</Title>
              <Paragraph style={styles.alertMessage}>
                {selectedAlert.message}
              </Paragraph>
              <Paragraph>
                Time: {new Date(selectedAlert.timestamp).toLocaleString()}
              </Paragraph>
              <Paragraph>
                Severity: {selectedAlert.severity.toUpperCase()}
              </Paragraph>
              
              <View style={styles.modalButtons}>
                <Button
                  mode="outlined"
                  onPress={() => handleAcknowledgeAlert(selectedAlert.id)}
                  style={styles.modalButton}
                >
                  Acknowledge
                </Button>
                <Button
                  mode="contained"
                  onPress={() => handleRespondToAlert(selectedAlert.id)}
                  style={styles.modalButton}
                >
                  Respond
                </Button>
              </View>
            </View>
          )}
        </Modal>
      </Portal>

      {/* Emergency FAB for quick actions */}
      <FAB
        style={styles.fab}
        icon="phone"
        label="Emergency"
        onPress={() => {
          Alert.alert(
            'Emergency Contact',
            'Who would you like to contact?',
            [
              { text: 'Emergency Services', onPress: () => {/* Call 911 */} },
              { text: 'Primary Caregiver', onPress: () => {/* Call primary caregiver */} },
              { text: 'Family Member', onPress: () => {/* Call family */} },
              { text: 'Cancel', style: 'cancel' },
            ]
          );
        }}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  card: {
    margin: 16,
    elevation: 4,
  },
  deviceStatusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  statusGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statusItem: {
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    elevation: 1,
  },
  syncTime: {
    fontSize: 12,
    color: '#666',
  },
  alertItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginVertical: 4,
    borderRadius: 8,
    borderLeftWidth: 4,
    elevation: 1,
  },
  alertContent: {
    flex: 1,
  },
  alertMessage: {
    fontSize: 16,
    fontWeight: '500',
  },
  alertTime: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  summaryItem: {
    alignItems: 'center',
    width: '48%',
    marginVertical: 8,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#666',
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  modal: {
    backgroundColor: 'white',
    padding: 20,
    margin: 20,
    borderRadius: 12,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 20,
  },
  modalButton: {
    minWidth: 120,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#ff4444',
  },
});

export default HealthDashboard;