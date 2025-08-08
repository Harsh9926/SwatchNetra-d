import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { 
  collection, 
  getDocs, 
  addDoc, 
  updateDoc, 
  doc, 
  onSnapshot,
  query,
  orderBy 
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import AppHeader from '../../components/ui/AppHeader';

const { width } = Dimensions.get('window');

interface ZoneData {
  id: string;
  name: string;
  performance: number;
  status: 'excellent' | 'good' | 'average' | 'poor' | 'critical';
  totalWorkers: number;
  activeWorkers: number;
  vehiclesAssigned: number;
  vehiclesActive: number;
  wasteCollected: number; // in tons
  targetWaste: number; // in tons
  complaints: number;
  resolvedComplaints: number;
  lastUpdated: string;
  supervisor: string;
  area: string; // in sq km
  population: number;
  escalationCount: number;
}

const ZonesScreen: React.FC = () => {
  const [zones, setZones] = useState<ZoneData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedZone, setSelectedZone] = useState<string>('all');

  const loadZones = () => {
    try {
      // Set up real-time listener for zones collection
      const zonesQuery = query(
        collection(db, 'zones'),
        orderBy('name', 'asc')
      );
      
      const unsubscribe = onSnapshot(zonesQuery, (snapshot) => {
        const zonesData = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            // Convert Firebase timestamps to strings
            lastUpdated: data.lastUpdated?.toDate ? data.lastUpdated.toDate().toISOString() : data.lastUpdated,
            createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt,
            updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : data.updatedAt
          };
        }) as ZoneData[];

        console.log('🗺️ Zones updated:', zonesData.length);
        setZones(zonesData);
        setLoading(false);
      }, (error) => {
        console.error('Error loading zones:', error);
        initializeSampleZones();
        setLoading(false);
      });

      return unsubscribe;
    } catch (error) {
      console.error('Error setting up zones listener:', error);
      initializeSampleZones();
      setLoading(false);
      return () => {};
    }
  };

  const initializeSampleZones = async () => {
    const sampleZones = [
      {
        name: 'Zone A - Central',
        performance: 92,
        status: 'excellent',
        totalWorkers: 45,
        activeWorkers: 42,
        vehiclesAssigned: 8,
        vehiclesActive: 7,
        wasteCollected: 12.5,
        targetWaste: 15.0,
        complaints: 3,
        resolvedComplaints: 2,
        lastUpdated: new Date().toISOString(),
        supervisor: 'Dr. Rajesh Sharma',
        area: '25.5',
        population: 125000,
        escalationCount: 0
      },
      {
        name: 'Zone B - North',
        performance: 78,
        status: 'good',
        totalWorkers: 38,
        activeWorkers: 35,
        vehiclesAssigned: 6,
        vehiclesActive: 5,
        wasteCollected: 9.8,
        targetWaste: 12.0,
        complaints: 7,
        resolvedComplaints: 5,
        lastUpdated: new Date().toISOString(),
        supervisor: 'Ms. Priya Patel',
        area: '18.2',
        population: 98000,
        escalationCount: 1
      },
      {
        name: 'Zone C - South',
        performance: 65,
        status: 'average',
        totalWorkers: 32,
        activeWorkers: 28,
        vehiclesAssigned: 5,
        vehiclesActive: 4,
        wasteCollected: 7.2,
        targetWaste: 10.5,
        complaints: 12,
        resolvedComplaints: 8,
        lastUpdated: new Date().toISOString(),
        supervisor: 'Mr. Vikram Singh',
        area: '22.1',
        population: 87000,
        escalationCount: 2
      },
      {
        name: 'Zone D - East',
        performance: 45,
        status: 'poor',
        totalWorkers: 28,
        activeWorkers: 22,
        vehiclesAssigned: 4,
        vehiclesActive: 2,
        wasteCollected: 4.1,
        targetWaste: 8.5,
        complaints: 18,
        resolvedComplaints: 9,
        lastUpdated: new Date().toISOString(),
        supervisor: 'Mr. Amit Kumar',
        area: '15.8',
        population: 65000,
        escalationCount: 4
      }
    ];

    try {
      for (const zone of sampleZones) {
        await addDoc(collection(db, 'zones'), zone);
      }
      console.log('✅ Sample zones initialized');
    } catch (error) {
      console.error('Error initializing sample zones:', error);
      setZones(sampleZones.map((zone, index) => ({ ...zone, id: index.toString() })) as ZoneData[]);
    }
  };

  useEffect(() => {
    console.log('🗺️ Zones component mounted, loading zones...');
    const unsubscribe = loadZones();
    return unsubscribe;
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  const escalateZone = async (zoneId: string, zoneName: string) => {
    Alert.alert(
      'Escalate Zone Issue',
      `Escalate issues in ${zoneName} to higher authorities?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Escalate',
          style: 'destructive',
          onPress: async () => {
            try {
              const currentZone = zones.find(z => z.id === zoneId);
              await updateDoc(doc(db, 'zones', zoneId), {
                escalationCount: (currentZone?.escalationCount || 0) + 1,
                lastUpdated: new Date().toISOString()
              });
              
              // Create escalation record
              await addDoc(collection(db, 'escalations'), {
                zoneId,
                zoneName,
                reason: 'Performance issues',
                escalatedBy: 'Admin',
                escalatedAt: new Date().toISOString(),
                status: 'pending'
              });
              
              Alert.alert('Success', `Issues in ${zoneName} have been escalated to higher authorities.`);
            } catch (error) {
              console.error('Error escalating zone:', error);
              Alert.alert('Error', 'Failed to escalate zone issues');
            }
          }
        }
      ]
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'excellent': return { backgroundColor: '#D1FAE5', color: '#065F46', border: '#10B981' };
      case 'good': return { backgroundColor: '#DBEAFE', color: '#1E40AF', border: '#3B82F6' };
      case 'average': return { backgroundColor: '#FEF3C7', color: '#92400E', border: '#F59E0B' };
      case 'poor': return { backgroundColor: '#FED7AA', color: '#9A3412', border: '#EA580C' };
      case 'critical': return { backgroundColor: '#FEE2E2', color: '#991B1B', border: '#EF4444' };
      default: return { backgroundColor: '#F3F4F6', color: '#374151', border: '#9CA3AF' };
    }
  };

  const getPerformanceColor = (performance: number) => {
    if (performance >= 90) return '#10B981';
    if (performance >= 75) return '#3B82F6';
    if (performance >= 60) return '#F59E0B';
    if (performance >= 40) return '#EA580C';
    return '#EF4444';
  };

  const filteredZones = selectedZone === 'all' 
    ? zones 
    : zones.filter(zone => zone.status === selectedZone);

  const statusOptions = ['all', 'excellent', 'good', 'average', 'poor', 'critical'];

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading zones...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AppHeader title="Zone Monitoring" showBackButton={false} />
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.content}>
          {/* Stats Header */}
          <View style={styles.statsHeader}>
            <Text style={styles.statsTitle}>Zone Performance Overview</Text>
            <View style={styles.headerStats}>
              <Text style={styles.headerStatsText}>
                {filteredZones.length} zones monitored
              </Text>
            </View>
          </View>

          {/* Status Filter */}
          <View style={styles.filterSection}>
            <Text style={styles.filterLabel}>Filter by Status:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.filterTabs}>
                {statusOptions.map((status) => (
                  <TouchableOpacity
                    key={status}
                    style={[
                      styles.filterTab,
                      selectedZone === status ? styles.filterTabActive : styles.filterTabInactive
                    ]}
                    onPress={() => setSelectedZone(status)}
                  >
                    <Text style={[
                      styles.filterTabText,
                      selectedZone === status ? styles.filterTabTextActive : styles.filterTabTextInactive
                    ]}>
                      {status === 'all' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1)}
                      {status !== 'all' && (
                        <Text style={styles.filterTabCount}>
                          {' '}({zones.filter(z => z.status === status).length})
                        </Text>
                      )}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>

          {/* Zones List */}
          <View style={styles.zonesList}>
            {filteredZones.map((zone) => (
              <View key={zone.id} style={styles.zoneCard}>
                {/* Zone Header */}
                <View style={styles.zoneHeader}>
                  <View style={styles.zoneInfo}>
                    <Text style={styles.zoneName}>{zone.name}</Text>
                    <Text style={styles.zoneSupervisor}>Supervisor: {zone.supervisor}</Text>
                    <Text style={styles.zoneArea}>Area: {zone.area} sq km • Population: {zone.population?.toLocaleString() || 'N/A'}</Text>
                  </View>
                  <View style={styles.zoneActions}>
                    <TouchableOpacity
                      style={[styles.escalateButton, zone.escalationCount > 0 && styles.escalateButtonActive]}
                      onPress={() => escalateZone(zone.id, zone.name)}
                    >
                      <Ionicons
                        name="alert-circle"
                        size={16}
                        color={zone.escalationCount > 0 ? "#EF4444" : "#6B7280"}
                      />
                      <Text style={[
                        styles.escalateButtonText,
                        zone.escalationCount > 0 && styles.escalateButtonTextActive
                      ]}>
                        Escalate {zone.escalationCount > 0 && `(${zone.escalationCount})`}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Performance Chart */}
                <View style={styles.performanceSection}>
                  <View style={styles.performanceHeader}>
                    <Text style={styles.performanceTitle}>Performance</Text>
                    <View style={[styles.statusBadge, getStatusColor(zone.status)]}>
                      <Text style={[styles.statusBadgeText, { color: getStatusColor(zone.status).color }]}>
                        {zone.status.charAt(0).toUpperCase() + zone.status.slice(1)}
                      </Text>
                    </View>
                  </View>

                  {/* Performance Bar */}
                  <View style={styles.performanceBarContainer}>
                    <View style={styles.performanceBarBackground}>
                      <View
                        style={[
                          styles.performanceBarFill,
                          {
                            width: `${zone.performance}%`,
                            backgroundColor: getPerformanceColor(zone.performance)
                          }
                        ]}
                      />
                    </View>
                    <Text style={styles.performancePercentage}>{zone.performance}%</Text>
                  </View>
                </View>

                {/* Metrics Grid */}
                <View style={styles.metricsGrid}>
                  <View style={styles.metricCard}>
                    <View style={styles.metricHeader}>
                      <Ionicons name="people" size={16} color="#3B82F6" />
                      <Text style={styles.metricTitle}>Workers</Text>
                    </View>
                    <Text style={styles.metricValue}>{zone.activeWorkers}/{zone.totalWorkers}</Text>
                    <Text style={styles.metricLabel}>Active/Total</Text>
                  </View>

                  <View style={styles.metricCard}>
                    <View style={styles.metricHeader}>
                      <Ionicons name="car" size={16} color="#10B981" />
                      <Text style={styles.metricTitle}>Vehicles</Text>
                    </View>
                    <Text style={styles.metricValue}>{zone.vehiclesActive}/{zone.vehiclesAssigned}</Text>
                    <Text style={styles.metricLabel}>Active/Assigned</Text>
                  </View>

                  <View style={styles.metricCard}>
                    <View style={styles.metricHeader}>
                      <Ionicons name="trash" size={16} color="#F59E0B" />
                      <Text style={styles.metricTitle}>Waste</Text>
                    </View>
                    <Text style={styles.metricValue}>{zone.wasteCollected}t/{zone.targetWaste}t</Text>
                    <Text style={styles.metricLabel}>Collected/Target</Text>
                  </View>

                  <View style={styles.metricCard}>
                    <View style={styles.metricHeader}>
                      <Ionicons name="warning" size={16} color="#EF4444" />
                      <Text style={styles.metricTitle}>Complaints</Text>
                    </View>
                    <Text style={styles.metricValue}>{zone.resolvedComplaints}/{zone.complaints}</Text>
                    <Text style={styles.metricLabel}>Resolved/Total</Text>
                  </View>
                </View>

                {/* Last Updated */}
                <View style={styles.zoneFooter}>
                  <Text style={styles.lastUpdated}>
                    Last updated: {zone.lastUpdated ?
                      (typeof zone.lastUpdated === 'string' ?
                        new Date(zone.lastUpdated).toLocaleString() :
                        (zone.lastUpdated.toDate ?
                          zone.lastUpdated.toDate().toLocaleString() :
                          new Date(zone.lastUpdated).toLocaleString())) : 'N/A'}
                  </Text>
                </View>
              </View>
            ))}
          </View>

          {/* Overall Statistics */}
          <View style={styles.overallStats}>
            <Text style={styles.statsTitle}>Overall Performance</Text>
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>
                  {Math.round(zones.reduce((acc, zone) => acc + zone.performance, 0) / zones.length)}%
                </Text>
                <Text style={styles.statLabel}>Avg Performance</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>
                  {zones.reduce((acc, zone) => acc + zone.activeWorkers, 0)}
                </Text>
                <Text style={styles.statLabel}>Active Workers</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>
                  {zones.reduce((acc, zone) => acc + zone.vehiclesActive, 0)}
                </Text>
                <Text style={styles.statLabel}>Active Vehicles</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>
                  {zones.reduce((acc, zone) => acc + zone.wasteCollected, 0).toFixed(1)}t
                </Text>
                <Text style={styles.statLabel}>Waste Collected</Text>
              </View>
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
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  loadingText: {
    color: '#6B7280',
    fontSize: 16,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  statsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  headerStats: {
    backgroundColor: '#E5E7EB',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  headerStatsText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  filterSection: {
    marginBottom: 24,
  },
  filterLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  filterTabs: {
    flexDirection: 'row',
    gap: 8,
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterTabActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  filterTabInactive: {
    backgroundColor: 'white',
    borderColor: '#D1D5DB',
  },
  filterTabText: {
    fontSize: 14,
    fontWeight: '500',
  },
  filterTabTextActive: {
    color: 'white',
  },
  filterTabTextInactive: {
    color: '#6B7280',
  },
  filterTabCount: {
    fontSize: 12,
    opacity: 0.8,
  },
  zonesList: {
    gap: 16,
    marginBottom: 24,
  },
  zoneCard: {
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
  zoneHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  zoneInfo: {
    flex: 1,
  },
  zoneName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  zoneSupervisor: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 2,
  },
  zoneArea: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  zoneActions: {
    marginLeft: 12,
  },
  escalateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  escalateButtonActive: {
    backgroundColor: '#FEE2E2',
    borderColor: '#FECACA',
  },
  escalateButtonText: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 4,
    fontWeight: '500',
  },
  escalateButtonTextActive: {
    color: '#EF4444',
  },
  performanceSection: {
    marginBottom: 16,
  },
  performanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  performanceTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  performanceBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  performanceBarBackground: {
    flex: 1,
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
  },
  performanceBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  performancePercentage: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#374151',
    minWidth: 40,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  metricCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 12,
    flex: 1,
    minWidth: (width - 64) / 2 - 4,
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  metricTitle: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 6,
    fontWeight: '500',
  },
  metricValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 2,
  },
  metricLabel: {
    fontSize: 10,
    color: '#9CA3AF',
  },
  zoneFooter: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 12,
  },
  lastUpdated: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  overallStats: {
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
  overviewTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 16,
    textAlign: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    flex: 1,
    minWidth: (width - 80) / 2 - 6,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#3B82F6',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
});

export default ZonesScreen;
