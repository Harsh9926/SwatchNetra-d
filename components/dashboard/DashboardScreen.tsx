import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, getDocs, onSnapshot } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { initializeFirestoreData } from '../../services/dataInitializer';
import AppHeader from '../ui/AppHeader';
import { useRouter } from 'expo-router';
import Colors from '../../constants/Colors';

const { width } = Dimensions.get('window');

interface StatCardProps {
  title: string;
  value: number;
  icon: keyof typeof Ionicons.glyphMap;
  change: number;
  changeType: 'increase' | 'decrease';
  color: string;
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon,
  change,
  changeType,
  color
}) => {
  const getColorStyle = (colorClass: string) => {
    switch (colorClass) {
      case 'bg-blue-500': return { backgroundColor: Colors.primary[500] };
      case 'bg-green-500': return { backgroundColor: Colors.success[500] };
      case 'bg-yellow-500': return { backgroundColor: Colors.warning[500] };
      case 'bg-purple-500': return { backgroundColor: '#8B5CF6' };
      case 'bg-orange-500': return { backgroundColor: '#F97316' };
      default: return { backgroundColor: Colors.neutral[500] };
    }
  };

  return (
    <View style={styles.statCard}>
      <View style={styles.statCardContent}>
        <View style={[styles.statIcon, getColorStyle(color)]}>
          <Ionicons name={icon} size={24} color="white" />
        </View>
        <View style={styles.statInfo}>
          <Text style={styles.statTitle}>{title}</Text>
          <Text style={styles.statValue}>{value.toLocaleString()}</Text>
          <View style={styles.statChange}>
            <Ionicons
              name={changeType === 'increase' ? 'trending-up' : 'trending-down'}
              size={16}
              color={changeType === 'increase' ? '#10B981' : '#EF4444'}
            />
            <Text style={[
              styles.statChangeText,
              { color: changeType === 'increase' ? '#10B981' : '#EF4444' }
            ]}>
              {Math.abs(change)}% from last month
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const getActionColor = (colorClass: string) => {
  switch (colorClass) {
    case 'bg-blue-500': return Colors.primary[500];
    case 'bg-green-500': return Colors.success[500];
    case 'bg-yellow-500': return Colors.warning[500];
    case 'bg-purple-500': return '#8B5CF6';
    case 'bg-orange-500': return '#F97316';
    default: return Colors.neutral[500];
  }
};

const DashboardScreen: React.FC = () => {
  const router = useRouter();
  const [stats, setStats] = useState({
    totalWorkers: 0,
    totalVehicles: 0,
    totalDrivers: 0,
    activeZones: 0
  });

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      // Initialize data if needed
      await initializeFirestoreData();

      // Get real data from Firestore - using 'users' collection instead of separate collections
      const [usersSnap, vehiclesSnap, zonesSnap] = await Promise.all([
        getDocs(collection(db, 'users')),
        getDocs(collection(db, 'vehicles')),
        getDocs(collection(db, 'zones'))
      ]);

      const users = usersSnap.docs.map(doc => doc.data());
      const workers = users.filter(user => user.role === 'Worker');
      const drivers = users.filter(user => user.role === 'Driver');

      setStats({
        totalWorkers: workers.length,
        totalVehicles: vehiclesSnap.size,
        totalDrivers: drivers.length,
        activeZones: zonesSnap.docs.filter(doc => doc.data().status === 'excellent' || doc.data().status === 'good').length
      });
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      // Fallback to sample data if Firebase fails
      setStats({
        totalWorkers: 45,
        totalVehicles: 12,
        totalDrivers: 8,
        activeZones: 4
      });
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const quickActions = [
    { title: 'Add User', icon: 'person-add' as keyof typeof Ionicons.glyphMap, color: 'bg-blue-500', route: '/(tabs)/users' },
    { title: 'View Requests', icon: 'document-text' as keyof typeof Ionicons.glyphMap, color: 'bg-green-500', route: '/(tabs)/requests' },
    { title: 'Monitor Zones', icon: 'map' as keyof typeof Ionicons.glyphMap, color: 'bg-purple-500', route: '/(tabs)/zones' },
    { title: 'Check Attendance', icon: 'calendar' as keyof typeof Ionicons.glyphMap, color: 'bg-orange-500', route: '/(tabs)/attendance' },
  ];

  const handleQuickAction = (route: string) => {
    try {
      router.push(route as any);
    } catch (error) {
      console.error('Navigation error:', error);
    }
  };

  const recentActivities = [
    { action: 'New worker registered', time: '2 minutes ago', type: 'success' },
    { action: 'Vehicle maintenance scheduled', time: '15 minutes ago', type: 'warning' },
    { action: 'Zone coverage updated', time: '1 hour ago', type: 'info' },
    { action: 'Attendance report generated', time: '2 hours ago', type: 'success' },
  ];

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AppHeader title="Dashboard" />
      <ScrollView
        style={styles.scrollContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.content}>
          {/* Welcome Section */}
          <View style={styles.welcomeSection}>
            <View style={styles.welcomeContent}>
              <Ionicons name="shield-checkmark" size={32} color={Colors.primary[500]} />
              <Text style={styles.welcomeText}>Welcome to PMC Admin Portal</Text>
              <Text style={styles.welcomeSubtext}>Manage your municipal operations efficiently</Text>
            </View>
            <Text style={styles.lastUpdated}>
              Last updated: {new Date().toLocaleString()}
            </Text>
          </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <StatCard
            title="Total Workers"
            value={stats.totalWorkers}
            icon="people"
            change={8.2}
            changeType="increase"
            color="bg-blue-500"
          />
          <StatCard
            title="Total Vehicles"
            value={stats.totalVehicles}
            icon="car"
            change={3.1}
            changeType="increase"
            color="bg-green-500"
          />
          <StatCard
            title="Total Drivers"
            value={stats.totalDrivers}
            icon="person"
            change={2.4}
            changeType="decrease"
            color="bg-yellow-500"
          />
          <StatCard
            title="Active Zones"
            value={stats.activeZones}
            icon="location"
            change={5.7}
            changeType="increase"
            color="bg-purple-500"
          />
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActionsContainer}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActionsGrid}>
            {quickActions.map((action, index) => (
              <TouchableOpacity
                key={index}
                style={styles.quickActionItem}
                onPress={() => handleQuickAction(action.route)}
              >
                <View style={styles.quickActionContent}>
                  <View style={[styles.quickActionIcon, { backgroundColor: getActionColor(action.color) }]}>
                    <Ionicons name={action.icon} size={24} color="white" />
                  </View>
                  <Text style={styles.quickActionText}>
                    {action.title}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Recent Activities */}
        <View style={styles.recentActivitiesContainer}>
          <Text style={styles.sectionTitle}>Recent Activities</Text>
          <View style={styles.activitiesList}>
            {recentActivities.map((activity, index) => (
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
            ))}
          </View>
        </View>
      </View>
    </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },
  scrollContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background.secondary,
  },
  loadingText: {
    color: Colors.text.tertiary,
    fontSize: 16,
  },
  content: {
    padding: 16,
  },
  welcomeSection: {
    backgroundColor: Colors.primary[50],
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: Colors.shadow.medium,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: Colors.primary[100],
  },
  welcomeContent: {
    alignItems: 'center',
    marginBottom: 12,
  },
  welcomeText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text.primary,
    marginTop: 8,
    marginBottom: 4,
    textAlign: 'center',
  },
  welcomeSubtext: {
    fontSize: 14,
    color: Colors.text.secondary,
    textAlign: 'center',
  },
  lastUpdated: {
    fontSize: 12,
    color: Colors.text.tertiary,
    textAlign: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -8,
    marginBottom: 24,
  },
  statCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    margin: 8,
    flex: 1,
    minWidth: (width - 48) / 2 - 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  statCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statIcon: {
    padding: 12,
    borderRadius: 8,
  },
  statInfo: {
    marginLeft: 16,
    flex: 1,
  },
  statTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginTop: 4,
  },
  statChange: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  statChangeText: {
    fontSize: 12,
    marginLeft: 4,
  },
  quickActionsContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  quickActionItem: {
    width: '50%',
    padding: 8,
  },
  quickActionContent: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  quickActionIcon: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
    textAlign: 'center',
  },
  recentActivitiesContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  activitiesList: {
    gap: 12,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
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
  },
  activityTime: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
});

export default DashboardScreen;
