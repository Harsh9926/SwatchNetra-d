import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { useDriver } from '../../contexts/DriverContext';
import DataService, { WasteCollectionStats, DriverPerformanceStats } from '../../services/DataService';
// import { useTheme } from '../../contexts/ThemeContext';

const { width } = Dimensions.get('window');

const PowerBIDashboard: React.FC = () => {
  const { userData } = useAuth();
  const { allDriverStatuses } = useDriver();
  // const { colors } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const [wasteStats, setWasteStats] = useState<WasteCollectionStats | null>(null);
  const [driverStats, setDriverStats] = useState<DriverPerformanceStats | null>(null);
  const [loading, setLoading] = useState(true);
  const dataService = DataService.getInstance();

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [wasteData, driverData] = await Promise.all([
        dataService.getWasteCollectionStats(30),
        dataService.getDriverPerformanceStats()
      ]);

      setWasteStats(wasteData);
      setDriverStats(driverData);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  }, []);

  // Calculate real-time KPIs using both live data and historical stats
  const activeDrivers = allDriverStatuses.filter(driver => driver.status === 'on-duty').length;
  const totalDrivers = allDriverStatuses.length;
  const liveWasteCollected = allDriverStatuses.reduce((sum, driver) => sum + driver.wasteCollected, 0);
  const totalTripsCompleted = allDriverStatuses.reduce((sum, driver) => sum + driver.tripsCompleted, 0);

  // Use historical data when available, fallback to live data
  const totalWasteCollected = wasteStats?.totalWaste || liveWasteCollected;
  const dailyAverage = wasteStats?.dailyAverage || 0;
  const efficiency = totalDrivers > 0 ? (activeDrivers / totalDrivers) * 100 : 0;

  const kpis = [
    {
      title: 'Total Waste Collected',
      value: totalWasteCollected.toFixed(0),
      unit: 'kg',
      change: dailyAverage > 0 ? `${dailyAverage.toFixed(1)} kg/day` : 'No data',
      trend: 'up',
      icon: 'trash',
      color: '#10B981'
    },
    {
      title: 'Active Drivers',
      value: activeDrivers.toString(),
      unit: `of ${totalDrivers}`,
      change: `${efficiency.toFixed(1)}% active`,
      trend: efficiency > 50 ? 'up' : 'down',
      icon: 'car',
      color: '#3B82F6'
    },
    {
      title: 'Trips Completed',
      value: totalTripsCompleted.toString(),
      unit: 'trips',
      change: totalDrivers > 0 ? `${(totalTripsCompleted / totalDrivers).toFixed(1)} avg/driver` : 'No data',
      trend: 'up',
      icon: 'checkmark-circle',
      color: '#8B5CF6'
    },
    {
      title: 'System Efficiency',
      value: efficiency.toFixed(1),
      unit: '%',
      change: activeDrivers > 0 ? 'Operational' : 'Standby',
      trend: efficiency > 70 ? 'up' : efficiency > 30 ? 'neutral' : 'down',
      icon: 'speedometer',
      color: efficiency > 70 ? '#10B981' : efficiency > 30 ? '#F59E0B' : '#EF4444'
    },
  ];

  // Chart placeholders
  const charts = [
    {
      title: 'Waste Collection Trends',
      type: 'Line Chart',
      description: 'Monthly waste collection data',
      icon: 'trending-up',
      color: '#10B981'
    },
    {
      title: 'Zone Performance',
      type: 'Bar Chart',
      description: 'Performance by zone',
      icon: 'bar-chart',
      color: '#3B82F6'
    },
    {
      title: 'Vehicle Utilization',
      type: 'Pie Chart',
      description: 'Fleet utilization rates',
      icon: 'pie-chart',
      color: '#8B5CF6'
    },
    {
      title: 'Cost Analysis',
      type: 'Area Chart',
      description: 'Operational cost breakdown',
      icon: 'analytics',
      color: '#F59E0B'
    },
  ];

  // Real-time driver activities
  const activities = allDriverStatuses
    .filter(driver => driver.isActive)
    .map(driver => {
      const lastUpdatedTime = driver.lastUpdated?.toDate ? driver.lastUpdated.toDate() : new Date(driver.lastUpdated);
      const timeDiff = new Date().getTime() - lastUpdatedTime.getTime();
      const minutesAgo = Math.floor(timeDiff / (1000 * 60));
      const timeText = minutesAgo < 1 ? 'Just now' :
                     minutesAgo < 60 ? `${minutesAgo} min ago` :
                     `${Math.floor(minutesAgo / 60)} hr ago`;

      return {
        action: `${driver.driverName} is ${driver.status.replace('-', ' ')} ${driver.currentLocation ? `at ${driver.currentLocation}` : ''}`,
        time: timeText,
        type: driver.status === 'on-duty' ? 'success' :
              driver.status === 'lunch' ? 'warning' : 'info'
      };
    })
    .slice(0, 5); // Show only latest 5 activities

  // const styles = createStyles(colors);

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Welcome back,</Text>
          <Text style={styles.userName}>{userData?.name || 'User'}</Text>
          <Text style={styles.subtitle}>Swach Netra Analytics Dashboard</Text>
        </View>
        <View style={styles.headerIcon}>
          <Ionicons name="analytics" size={32} color="#3B82F6" />
        </View>
      </View>

      {/* KPI Cards */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Key Performance Indicators</Text>
        <View style={styles.kpiGrid}>
          {kpis.map((kpi, index) => (
            <View key={index} style={styles.kpiCard}>
              <View style={styles.kpiHeader}>
                <View style={[styles.kpiIcon, { backgroundColor: kpi.color }]}>
                  <Ionicons name={kpi.icon as any} size={20} color="#FFFFFF" />
                </View>
                <View style={styles.kpiTrend}>
                  <Ionicons 
                    name={kpi.trend === 'up' ? 'trending-up' : 'trending-down'} 
                    size={16} 
                    color={kpi.trend === 'up' ? '#10B981' : '#EF4444'} 
                  />
                  <Text style={[
                    styles.kpiChange,
                    { color: kpi.trend === 'up' ? '#10B981' : '#EF4444' }
                  ]}>
                    {kpi.change}
                  </Text>
                </View>
              </View>
              <Text style={styles.kpiValue}>{kpi.value}</Text>
              <Text style={styles.kpiUnit}>{kpi.unit}</Text>
              <Text style={styles.kpiTitle}>{kpi.title}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Charts Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Analytics & Reports</Text>
        <View style={styles.chartsGrid}>
          {charts.map((chart, index) => (
            <TouchableOpacity key={index} style={styles.chartCard}>
              <View style={[styles.chartIcon, { backgroundColor: chart.color }]}>
                <Ionicons name={chart.icon as any} size={24} color="#FFFFFF" />
              </View>
              <Text style={styles.chartTitle}>{chart.title}</Text>
              <Text style={styles.chartType}>{chart.type}</Text>
              <Text style={styles.chartDescription}>{chart.description}</Text>
              <View style={styles.chartPlaceholder}>
                <Ionicons name="bar-chart-outline" size={40} color="#9CA3AF" />
                <Text style={styles.chartPlaceholderText}>Power BI Chart</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Driver Status Overview */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Driver Status Overview</Text>
        <View style={styles.driversContainer}>
          {allDriverStatuses.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="car-outline" size={48} color="#9CA3AF" />
              <Text style={styles.emptyStateText}>No drivers registered</Text>
              <Text style={styles.emptyStateSubtext}>Drivers will appear here once they register</Text>
            </View>
          ) : (
            allDriverStatuses.map((driver) => (
              <View key={driver.id} style={styles.driverCard}>
                <View style={styles.driverInfo}>
                  <Text style={styles.driverName}>{driver.driverName}</Text>
                  <Text style={styles.driverLocation}>
                    {driver.currentLocation || 'Location not set'}
                  </Text>
                  <Text style={styles.driverStats}>
                    {driver.wasteCollected}kg collected • {driver.tripsCompleted} trips
                  </Text>
                </View>
                <View style={styles.driverStatusContainer}>
                  <View style={[
                    styles.driverStatusBadge,
                    {
                      backgroundColor:
                        driver.status === 'on-duty' ? '#10B981' :
                        driver.status === 'lunch' ? '#F59E0B' :
                        driver.status === 'break' ? '#3B82F6' : '#6B7280'
                    }
                  ]}>
                    <Text style={styles.driverStatusText}>
                      {driver.status.replace('-', ' ').toUpperCase()}
                    </Text>
                  </View>
                  <Text style={styles.driverLastUpdate}>
                    {(() => {
                      const lastUpdatedTime = driver.lastUpdated?.toDate ? driver.lastUpdated.toDate() : new Date(driver.lastUpdated);
                      const timeDiff = new Date().getTime() - lastUpdatedTime.getTime();
                      return timeDiff < 60000 ? 'Just now' : `${Math.floor(timeDiff / 60000)} min ago`;
                    })()}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>
      </View>

      {/* Real-time Activities */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Driver Activities</Text>
        <View style={styles.activitiesContainer}>
          {activities.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="time-outline" size={48} color="#9CA3AF" />
              <Text style={styles.emptyStateText}>No recent activities</Text>
              <Text style={styles.emptyStateSubtext}>Driver activities will appear here</Text>
            </View>
          ) : (
            activities.map((activity, index) => (
              <View key={index} style={styles.activityItem}>
                <View style={[
                  styles.activityDot,
                  {
                    backgroundColor:
                      activity.type === 'success' ? '#10B981' :
                      activity.type === 'warning' ? '#F59E0B' : '#3B82F6'
                  }
                ]} />
                <View style={styles.activityContent}>
                  <Text style={styles.activityAction}>{activity.action}</Text>
                  <Text style={styles.activityTime}>{activity.time}</Text>
                </View>
              </View>
            ))
          )}
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickActionsGrid}>
          <TouchableOpacity style={styles.quickActionCard}>
            <Ionicons name="refresh" size={24} color="#3B82F6" />
            <Text style={styles.quickActionText}>Refresh Data</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickActionCard}>
            <Ionicons name="download" size={24} color="#10B981" />
            <Text style={styles.quickActionText}>Export Report</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickActionCard}>
            <Ionicons name="settings" size={24} color="#8B5CF6" />
            <Text style={styles.quickActionText}>Configure</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickActionCard}>
            <Ionicons name="share" size={24} color="#F59E0B" />
            <Text style={styles.quickActionText}>Share</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    paddingTop: 60,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  greeting: {
    fontSize: 14,
    color: '#6B7280',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginTop: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#3B82F6',
    marginTop: 2,
    fontWeight: '500',
  },
  headerIcon: {
    width: 60,
    height: 60,
    backgroundColor: '#EBF4FF',
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  kpiCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    width: (width - 64) / 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  kpiHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  kpiIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  kpiTrend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  kpiChange: {
    fontSize: 12,
    fontWeight: '500',
  },
  kpiValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 2,
  },
  kpiUnit: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  kpiTitle: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '500',
  },
  chartsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  chartCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    width: (width - 64) / 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  chartIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  chartTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  chartType: {
    fontSize: 12,
    color: '#3B82F6',
    marginBottom: 4,
  },
  chartDescription: {
    fontSize: 11,
    color: '#6B7280',
    marginBottom: 12,
  },
  chartPlaceholder: {
    height: 80,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chartPlaceholderText: {
    fontSize: 10,
    color: '#9CA3AF',
    marginTop: 4,
  },
  activitiesContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  activityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityAction: {
    fontSize: 14,
    color: '#111827',
    marginBottom: 2,
  },
  activityTime: {
    fontSize: 12,
    color: '#6B7280',
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  quickActionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    width: (width - 64) / 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  quickActionText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#111827',
    marginTop: 8,
    textAlign: 'center',
  },
  driversContainer: {
    gap: 12,
  },
  driverCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  driverInfo: {
    flex: 1,
  },
  driverName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  driverLocation: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 2,
  },
  driverStats: {
    fontSize: 12,
    color: '#3B82F6',
  },
  driverStatusContainer: {
    alignItems: 'flex-end',
  },
  driverStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 4,
  },
  driverStatusText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  driverLastUpdate: {
    fontSize: 10,
    color: '#9CA3AF',
  },
  emptyState: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
    marginTop: 12,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
    textAlign: 'center',
  },
});

export default PowerBIDashboard;
