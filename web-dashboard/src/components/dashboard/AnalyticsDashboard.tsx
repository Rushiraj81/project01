import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from 'recharts';
import {
  CalendarDays,
  Users,
  AlertTriangle,
  Heart,
  Activity,
  TrendingUp,
  TrendingDown,
  Download,
  Filter,
  RefreshCw,
} from 'lucide-react';
import { usePermissions } from '../auth/RoleBasedAccess';

interface AnalyticsData {
  populationHealth: PopulationHealthData;
  emergencyAlerts: EmergencyAlertsData;
  caregiverActivity: CaregiverActivityData;
  resourceUtilization: ResourceUtilizationData;
  healthTrends: HealthTrendsData;
}

interface PopulationHealthData {
  totalSeniors: number;
  activeMonitoring: number;
  healthRiskDistribution: { risk: string; count: number; color: string }[];
  demographicBreakdown: { age: string; count: number }[];
  chronicConditions: { condition: string; prevalence: number }[];
}

interface EmergencyAlertsData {
  totalAlerts: number;
  criticalAlerts: number;
  responseTime: number;
  alertsByType: { type: string; count: number; trend: number }[];
  alertsOverTime: { date: string; alerts: number; resolved: number }[];
}

interface CaregiverActivityData {
  totalCaregivers: number;
  activeCaregivers: number;
  averageVisitsPerWeek: number;
  caregiverWorkload: { name: string; assignments: number; visits: number }[];
  visitCompletionRate: number;
}

interface ResourceUtilizationData {
  deviceUtilization: number;
  systemUptime: number;
  dataStorage: { used: number; total: number };
  apiUsage: { endpoint: string; calls: number; responseTime: number }[];
}

interface HealthTrendsData {
  weeklyTrends: { week: string; steps: number; heartRate: number; sleep: number }[];
  medicationAdherence: { month: string; adherence: number }[];
  hospitalizations: { month: string; admissions: number; readmissions: number }[];
}

const AnalyticsDashboard: React.FC = () => {
  const {
    isAdmin,
    isMunicipalStaff,
    isNGOManager,
    hasPermission,
  } = usePermissions();

  const [selectedTimeRange, setSelectedTimeRange] = useState('30d');
  const [selectedDistrict, setSelectedDistrict] = useState('all');
  const [selectedOrganization, setSelectedOrganization] = useState('all');
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState<AnalyticsData | null>(null);

  // Mock data - in real implementation, this would come from API
  const mockData: AnalyticsData = {
    populationHealth: {
      totalSeniors: 1247,
      activeMonitoring: 1089,
      healthRiskDistribution: [
        { risk: 'Low Risk', count: 623, color: '#10B981' },
        { risk: 'Medium Risk', count: 289, color: '#F59E0B' },
        { risk: 'High Risk', count: 177, color: '#EF4444' },
      ],
      demographicBreakdown: [
        { age: '60-65', count: 234 },
        { age: '66-70', count: 312 },
        { age: '71-75', count: 298 },
        { age: '76-80', count: 221 },
        { age: '81-85', count: 134 },
        { age: '85+', count: 48 },
      ],
      chronicConditions: [
        { condition: 'Hypertension', prevalence: 67 },
        { condition: 'Diabetes', prevalence: 34 },
        { condition: 'Heart Disease', prevalence: 28 },
        { condition: 'Arthritis', prevalence: 45 },
        { condition: 'COPD', prevalence: 19 },
      ],
    },
    emergencyAlerts: {
      totalAlerts: 156,
      criticalAlerts: 23,
      responseTime: 4.2,
      alertsByType: [
        { type: 'Fall Detection', count: 45, trend: -12 },
        { type: 'Medication Miss', count: 67, trend: 8 },
        { type: 'Health Anomaly', count: 32, trend: -5 },
        { type: 'Emergency Button', count: 12, trend: -18 },
      ],
      alertsOverTime: [
        { date: '2024-01-01', alerts: 23, resolved: 21 },
        { date: '2024-01-02', alerts: 18, resolved: 18 },
        { date: '2024-01-03', alerts: 29, resolved: 27 },
        { date: '2024-01-04', alerts: 15, resolved: 15 },
        { date: '2024-01-05', alerts: 31, resolved: 28 },
        { date: '2024-01-06', alerts: 22, resolved: 22 },
        { date: '2024-01-07', alerts: 18, resolved: 17 },
      ],
    },
    caregiverActivity: {
      totalCaregivers: 89,
      activeCaregivers: 76,
      averageVisitsPerWeek: 12.4,
      caregiverWorkload: [
        { name: 'Sarah Johnson', assignments: 15, visits: 42 },
        { name: 'Mike Chen', assignments: 12, visits: 38 },
        { name: 'Ana Rodriguez', assignments: 18, visits: 51 },
        { name: 'David Kim', assignments: 14, visits: 35 },
        { name: 'Lisa Thompson', assignments: 16, visits: 44 },
      ],
      visitCompletionRate: 94.2,
    },
    resourceUtilization: {
      deviceUtilization: 87.3,
      systemUptime: 99.8,
      dataStorage: { used: 2.3, total: 10 },
      apiUsage: [
        { endpoint: '/api/health-data', calls: 12500, responseTime: 45 },
        { endpoint: '/api/alerts', calls: 8900, responseTime: 32 },
        { endpoint: '/api/users', calls: 5600, responseTime: 28 },
        { endpoint: '/api/analytics', calls: 3200, responseTime: 120 },
      ],
    },
    healthTrends: {
      weeklyTrends: [
        { week: 'Week 1', steps: 5420, heartRate: 72, sleep: 7.2 },
        { week: 'Week 2', steps: 5680, heartRate: 71, sleep: 7.4 },
        { week: 'Week 3', steps: 5890, heartRate: 70, sleep: 7.1 },
        { week: 'Week 4', steps: 6120, heartRate: 69, sleep: 7.6 },
      ],
      medicationAdherence: [
        { month: 'Jan', adherence: 89 },
        { month: 'Feb', adherence: 91 },
        { month: 'Mar', adherence: 87 },
        { month: 'Apr', adherence: 93 },
        { month: 'May', adherence: 90 },
        { month: 'Jun', adherence: 92 },
      ],
      hospitalizations: [
        { month: 'Jan', admissions: 12, readmissions: 2 },
        { month: 'Feb', admissions: 8, readmissions: 1 },
        { month: 'Mar', admissions: 15, readmissions: 3 },
        { month: 'Apr', admissions: 6, readmissions: 0 },
        { month: 'May', admissions: 11, readmissions: 2 },
        { month: 'Jun', admissions: 9, readmissions: 1 },
      ],
    },
  };

  useEffect(() => {
    setData(mockData);
  }, [selectedTimeRange, selectedDistrict, selectedOrganization]);

  const handleRefresh = async () => {
    setIsLoading(true);
    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
    }, 1000);
  };

  const handleExport = () => {
    // Export functionality
    console.log('Exporting data...');
  };

  if (!data) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
          <p className="text-gray-600">
            Comprehensive health and operational analytics
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={selectedTimeRange} onValueChange={setSelectedTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="1y">Last year</SelectItem>
            </SelectContent>
          </Select>
          
          {(isAdmin || isMunicipalStaff) && (
            <Select value={selectedDistrict} onValueChange={setSelectedDistrict}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Select District" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Districts</SelectItem>
                <SelectItem value="district1">District 1</SelectItem>
                <SelectItem value="district2">District 2</SelectItem>
                <SelectItem value="district3">District 3</SelectItem>
              </SelectContent>
            </Select>
          )}

          {(isAdmin || isNGOManager) && (
            <Select value={selectedOrganization} onValueChange={setSelectedOrganization}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Select Organization" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Organizations</SelectItem>
                <SelectItem value="org1">Community Health NGO</SelectItem>
                <SelectItem value="org2">Senior Care Alliance</SelectItem>
                <SelectItem value="org3">Municipal Health Dept</SelectItem>
              </SelectContent>
            </Select>
          )}

          <Button variant="outline" onClick={handleRefresh} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Seniors</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.populationHealth.totalSeniors}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600">+12%</span> from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Monitoring</CardTitle>
            <Heart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.populationHealth.activeMonitoring}</div>
            <p className="text-xs text-muted-foreground">
              {((data.populationHealth.activeMonitoring / data.populationHealth.totalSeniors) * 100).toFixed(1)}% coverage
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.emergencyAlerts.criticalAlerts}</div>
            <p className="text-xs text-muted-foreground">
              Avg response: {data.emergencyAlerts.responseTime} min
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Caregivers</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.caregiverActivity.activeCaregivers}</div>
            <p className="text-xs text-muted-foreground">
              {data.caregiverActivity.visitCompletionRate}% visit completion
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Analytics Tabs */}
      <Tabs defaultValue="population" className="space-y-4">
        <TabsList className="grid w-full grid-cols-1 md:grid-cols-5">
          <TabsTrigger value="population">Population Health</TabsTrigger>
          <TabsTrigger value="emergency">Emergency Response</TabsTrigger>
          <TabsTrigger value="caregivers">Caregiver Activity</TabsTrigger>
          <TabsTrigger value="resources">Resource Utilization</TabsTrigger>
          <TabsTrigger value="trends">Health Trends</TabsTrigger>
        </TabsList>

        <TabsContent value="population" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Health Risk Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Health Risk Distribution</CardTitle>
                <CardDescription>
                  Current risk assessment across monitored population
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={data.populationHealth.healthRiskDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ risk, count }) => `${risk}: ${count}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                    >
                      {data.populationHealth.healthRiskDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Age Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Age Distribution</CardTitle>
                <CardDescription>
                  Demographic breakdown of monitored seniors
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={data.populationHealth.demographicBreakdown}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="age" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#3B82F6" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Chronic Conditions */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Chronic Conditions Prevalence</CardTitle>
                <CardDescription>
                  Percentage of population with chronic conditions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={data.populationHealth.chronicConditions} layout="horizontal">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="condition" type="category" />
                    <Tooltip />
                    <Bar dataKey="prevalence" fill="#10B981" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="emergency" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Alerts Over Time */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Emergency Alerts Trend</CardTitle>
                <CardDescription>
                  Daily alerts received and resolution rate
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={data.emergencyAlerts.alertsOverTime}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="alerts" stroke="#EF4444" strokeWidth={2} />
                    <Line type="monotone" dataKey="resolved" stroke="#10B981" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Alert Types */}
            <Card>
              <CardHeader>
                <CardTitle>Alert Types</CardTitle>
                <CardDescription>
                  Distribution of emergency alert types
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {data.emergencyAlerts.alertsByType.map((alert, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="font-medium">{alert.type}</div>
                        <div className="text-sm text-gray-500">({alert.count})</div>
                      </div>
                      <div className={`flex items-center gap-1 text-sm ${
                        alert.trend > 0 ? 'text-red-600' : 'text-green-600'
                      }`}>
                        {alert.trend > 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                        {Math.abs(alert.trend)}%
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Response Metrics */}
            <Card>
              <CardHeader>
                <CardTitle>Response Metrics</CardTitle>
                <CardDescription>
                  Emergency response performance indicators
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>Average Response Time</span>
                    <span className="font-bold text-blue-600">
                      {data.emergencyAlerts.responseTime} min
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Total Alerts</span>
                    <span className="font-bold">{data.emergencyAlerts.totalAlerts}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Critical Alerts</span>
                    <span className="font-bold text-red-600">
                      {data.emergencyAlerts.criticalAlerts}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Resolution Rate</span>
                    <span className="font-bold text-green-600">97.2%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="caregivers" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Caregiver Workload */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Caregiver Workload Distribution</CardTitle>
                <CardDescription>
                  Current assignments and visit completion by caregiver
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={data.caregiverActivity.caregiverWorkload}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="assignments" fill="#3B82F6" />
                    <Bar dataKey="visits" fill="#10B981" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Activity Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Activity Summary</CardTitle>
                <CardDescription>
                  Overall caregiver activity metrics
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>Total Caregivers</span>
                    <span className="font-bold">{data.caregiverActivity.totalCaregivers}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Active This Week</span>
                    <span className="font-bold text-green-600">
                      {data.caregiverActivity.activeCaregivers}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Avg Visits/Week</span>
                    <span className="font-bold">{data.caregiverActivity.averageVisitsPerWeek}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Completion Rate</span>
                    <span className="font-bold text-blue-600">
                      {data.caregiverActivity.visitCompletionRate}%
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="resources" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* System Metrics */}
            <Card>
              <CardHeader>
                <CardTitle>System Performance</CardTitle>
                <CardDescription>
                  Infrastructure and system health metrics
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>Device Utilization</span>
                    <span className="font-bold text-green-600">
                      {data.resourceUtilization.deviceUtilization}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>System Uptime</span>
                    <span className="font-bold text-green-600">
                      {data.resourceUtilization.systemUptime}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Data Storage</span>
                    <span className="font-bold">
                      {data.resourceUtilization.dataStorage.used}GB / {data.resourceUtilization.dataStorage.total}GB
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* API Usage */}
            <Card>
              <CardHeader>
                <CardTitle>API Usage</CardTitle>
                <CardDescription>
                  Most frequently used API endpoints
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data.resourceUtilization.apiUsage.map((api, index) => (
                    <div key={index} className="flex justify-between items-center text-sm">
                      <div className="font-medium">{api.endpoint}</div>
                      <div className="flex gap-4 text-gray-500">
                        <span>{api.calls} calls</span>
                        <span>{api.responseTime}ms</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Health Trends */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Weekly Health Trends</CardTitle>
                <CardDescription>
                  Average health metrics across monitored population
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={data.healthTrends.weeklyTrends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="week" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Area type="monotone" dataKey="steps" stackId="1" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.3} />
                    <Area type="monotone" dataKey="heartRate" stackId="2" stroke="#EF4444" fill="#EF4444" fillOpacity={0.3} />
                    <Area type="monotone" dataKey="sleep" stackId="3" stroke="#10B981" fill="#10B981" fillOpacity={0.3} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Medication Adherence */}
            <Card>
              <CardHeader>
                <CardTitle>Medication Adherence</CardTitle>
                <CardDescription>
                  Monthly medication compliance rates
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={data.healthTrends.medicationAdherence}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="adherence" stroke="#10B981" strokeWidth={3} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Hospitalizations */}
            <Card>
              <CardHeader>
                <CardTitle>Hospitalizations</CardTitle>
                <CardDescription>
                  Monthly admissions and readmissions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={data.healthTrends.hospitalizations}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="admissions" fill="#3B82F6" />
                    <Bar dataKey="readmissions" fill="#EF4444" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AnalyticsDashboard;