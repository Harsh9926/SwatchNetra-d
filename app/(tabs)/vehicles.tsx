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
import { collection, getDocs, addDoc, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../../config/firebase';
import AppHeader from '../../components/ui/AppHeader';

const { width } = Dimensions.get('window');

interface Vehicle {
  id: string;
  number: string;
  type: string;
  driver: string;
  driverId?: string;
  status: 'active' | 'maintenance' | 'inactive';
  location: string;
  fuel: number;
  maintenance: string;
  lastService?: string;
  nextService?: string;
  mileage?: number;
  gpsLocation?: {
    lat: number;
    lng: number;
  };
  speed?: number;
  route?: string;
}

const VehiclesScreen: React.FC = () => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadVehicles = () => {
    try {
      // Set up real-time listener for vehicles collection
      const vehiclesQuery = query(
        collection(db, 'vehicles'),
        orderBy('number', 'asc')
      );

      const unsubscribe = onSnapshot(vehiclesQuery, (snapshot) => {
        const vehiclesData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Vehicle[];

        console.log('🚗 Vehicles updated:', vehiclesData.length);
        setVehicles(vehiclesData);
        setLoading(false);
      }, (error) => {
        console.error('Error loading vehicles:', error);
        initializeSampleVehicles();
        setLoading(false);
      });

      return unsubscribe;
    } catch (error) {
      console.error('Error setting up vehicles listener:', error);
      initializeSampleVehicles();
      setLoading(false);
      return () => {};
    }
  };

  const initializeSampleVehicles = async () => {
    const sampleVehicles = [
      {
        number: 'PMC-001',
        type: 'Garbage Truck',
        driver: 'Rajesh Kumar',
        driverId: 'driver1',
        status: 'active',
        location: 'Zone A - Sector 12',
        fuel: 75,
        maintenance: 'Good',
        lastService: '2024-01-15',
        nextService: '2024-04-15',
        mileage: 45230,
        gpsLocation: { lat: 18.5204, lng: 73.8567 },
        speed: 25,
        route: 'Route A1'
      },
      {
        number: 'PMC-002',
        type: 'Compactor Truck',
        driver: 'Priya Sharma',
        driverId: 'driver2',
        status: 'active',
        location: 'Zone B - Market Area',
        fuel: 60,
        maintenance: 'Good',
        lastService: '2024-02-01',
        nextService: '2024-05-01',
        mileage: 38750,
        gpsLocation: { lat: 18.5314, lng: 73.8446 },
        speed: 15,
        route: 'Route B2'
      },
      {
        number: 'PMC-003',
        type: 'Street Sweeper',
        driver: 'Amit Patel',
        driverId: 'driver3',
        status: 'maintenance',
        location: 'Workshop',
        fuel: 45,
        maintenance: 'Service Due',
        lastService: '2023-12-20',
        nextService: '2024-03-20',
        mileage: 52100,
        speed: 0,
        route: 'Maintenance'
      },
      {
        number: 'PMC-004',
        type: 'Garbage Truck',
        driver: 'Sunita Devi',
        driverId: 'driver4',
        status: 'active',
        location: 'Zone C - Residential',
        fuel: 85,
        maintenance: 'Excellent',
        lastService: '2024-02-10',
        nextService: '2024-05-10',
        mileage: 32450,
        gpsLocation: { lat: 18.5074, lng: 73.8077 },
        speed: 30,
        route: 'Route C1'
      }
    ];

    try {
      for (const vehicle of sampleVehicles) {
        await addDoc(collection(db, 'vehicles'), vehicle);
      }
      console.log('✅ Sample vehicles initialized');
    } catch (error) {
      console.error('Error initializing sample vehicles:', error);
      setVehicles(sampleVehicles.map((vehicle, index) => ({ ...vehicle, id: index.toString() })) as Vehicle[]);
    }
  };

  useEffect(() => {
    const unsubscribe = loadVehicles();
    return unsubscribe;
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadVehicles();
    setRefreshing(false);
  };

  const handleTrackVehicle = (vehicle: Vehicle) => {
    Alert.alert(
      'Track Vehicle',
      `Tracking ${vehicle.number}\n\nCurrent Location: ${vehicle.location}\nSpeed: ${vehicle.speed || 0} km/h\nDriver: ${vehicle.driver}`,
      [
        { text: 'Close', style: 'cancel' },
        { text: 'View on Map', onPress: () => {
          // Here you would open a map view
          Alert.alert('Map View', 'Opening map view for live tracking...');
        }}
      ]
    );
  };

  const handleManageVehicle = (vehicle: Vehicle) => {
    Alert.alert(
      'Manage Vehicle',
      `Manage ${vehicle.number}`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Schedule Maintenance', onPress: () => {
          Alert.alert('Success', 'Maintenance scheduled for ' + vehicle.number);
        }},
        { text: 'Assign Driver', onPress: () => {
          Alert.alert('Driver Assignment', 'Driver assignment feature coming soon...');
        }},
        { text: 'Update Status', onPress: () => {
          Alert.alert('Status Update', 'Status update feature coming soon...');
        }}
      ]
    );
  };

  const addSampleVehicle = async () => {
    try {
      const newVehicle = {
        number: `PMC-${String(vehicles.length + 1).padStart(3, '0')}`,
        type: 'Garbage Truck',
        driver: 'Sample Driver',
        status: 'active',
        location: 'Zone A',
        fuel: Math.floor(Math.random() * 100),
        maintenance: 'Good'
      };
      
      await addDoc(collection(db, 'vehicles'), newVehicle);
      Alert.alert('Success', 'Vehicle added successfully');
      loadVehicles();
    } catch (error) {
      console.error('Error adding vehicle:', error);
      Alert.alert('Error', 'Failed to add vehicle');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return { backgroundColor: '#D1FAE5', color: '#065F46' };
      case 'maintenance': return { backgroundColor: '#FEF3C7', color: '#92400E' };
      case 'inactive': return { backgroundColor: '#FEE2E2', color: '#991B1B' };
      default: return { backgroundColor: '#F3F4F6', color: '#374151' };
    }
  };

  const getFuelColor = (fuel: number) => {
    if (fuel > 70) return '#10B981'; // Green
    if (fuel > 30) return '#F59E0B'; // Yellow
    return '#EF4444'; // Red
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading vehicles...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AppHeader title="Vehicle Management" />
      <ScrollView
        style={styles.scrollContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Fleet Overview</Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={addSampleVehicle}
            >
              <Ionicons name="add" size={20} color="white" />
              <Text style={styles.addButtonText}>Add Vehicle</Text>
            </TouchableOpacity>
          </View>

        {/* Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Ionicons name="car" size={32} color="#3B82F6" />
            <Text style={[styles.statNumber, { color: '#3B82F6' }]}>
              {vehicles.filter(v => v.status === 'active').length}
            </Text>
            <Text style={styles.statLabel}>Active Vehicles</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="construct" size={32} color="#F59E0B" />
            <Text style={[styles.statNumber, { color: '#F59E0B' }]}>
              {vehicles.filter(v => v.status === 'maintenance').length}
            </Text>
            <Text style={styles.statLabel}>In Maintenance</Text>
          </View>
        </View>

        {/* Vehicles List */}
        <View style={styles.vehiclesList}>
          {vehicles.map((vehicle) => (
            <View key={vehicle.id} style={styles.vehicleCard}>
              <View style={styles.vehicleHeader}>
                <View style={styles.vehicleInfo}>
                  <Text style={styles.vehicleNumber}>{vehicle.number}</Text>
                  <Text style={styles.vehicleType}>{vehicle.type}</Text>
                  {vehicle.route && (
                    <Text style={styles.vehicleRoute}>Route: {vehicle.route}</Text>
                  )}
                </View>
                <View style={[styles.statusBadge, getStatusColor(vehicle.status)]}>
                  <Text style={[styles.statusText, { color: getStatusColor(vehicle.status).color }]}>
                    {vehicle.status.toUpperCase()}
                  </Text>
                </View>
              </View>

              <View style={styles.vehicleDetails}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Driver</Text>
                  <Text style={styles.detailValue}>{vehicle.driver}</Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Location</Text>
                  <Text style={styles.detailValue}>{vehicle.location}</Text>
                </View>

                {vehicle.speed !== undefined && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Speed</Text>
                    <Text style={styles.detailValue}>{vehicle.speed} km/h</Text>
                  </View>
                )}

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Fuel Level</Text>
                  <Text style={[styles.detailValue, { color: getFuelColor(vehicle.fuel) }]}>
                    {vehicle.fuel}%
                  </Text>
                </View>

                {/* Fuel Progress Bar */}
                <View style={styles.fuelBarContainer}>
                  <View style={styles.fuelBarBackground}>
                    <View
                      style={[
                        styles.fuelBarFill,
                        {
                          width: `${vehicle.fuel}%`,
                          backgroundColor: getFuelColor(vehicle.fuel)
                        }
                      ]}
                    />
                  </View>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Maintenance</Text>
                  <Text style={[
                    styles.detailValue,
                    { color: vehicle.maintenance === 'Good' || vehicle.maintenance === 'Excellent' ? '#10B981' : '#F59E0B' }
                  ]}>
                    {vehicle.maintenance}
                  </Text>
                </View>

                {vehicle.mileage && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Mileage</Text>
                    <Text style={styles.detailValue}>{vehicle.mileage.toLocaleString()} km</Text>
                  </View>
                )}
              </View>

              <View style={styles.vehicleActions}>
                <TouchableOpacity
                  style={styles.trackButton}
                  onPress={() => handleTrackVehicle(vehicle)}
                >
                  <Ionicons name="location" size={16} color="#6B7280" />
                  <Text style={styles.trackButtonText}>Track</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.manageButton}
                  onPress={() => handleManageVehicle(vehicle)}
                >
                  <Ionicons name="settings" size={16} color="white" />
                  <Text style={styles.manageButtonText}>Manage</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>

        {/* Summary Stats */}
        <View style={styles.summaryContainer}>
          <Text style={styles.summaryTitle}>Fleet Summary</Text>
          <View style={styles.summaryStats}>
            <View style={styles.summaryStatItem}>
              <Text style={[styles.summaryStatNumber, { color: '#10B981' }]}>
                {vehicles.length > 0 ? Math.round(vehicles.reduce((sum, v) => sum + v.fuel, 0) / vehicles.length) : 0}%
              </Text>
              <Text style={styles.summaryStatLabel}>Avg Fuel</Text>
            </View>
            <View style={styles.summaryStatItem}>
              <Text style={[styles.summaryStatNumber, { color: '#8B5CF6' }]}>{vehicles.length}</Text>
              <Text style={styles.summaryStatLabel}>Total Fleet</Text>
            </View>
            <View style={styles.summaryStatItem}>
              <Text style={[styles.summaryStatNumber, { color: '#3B82F6' }]}>
                {vehicles.length > 0 ? Math.round((vehicles.filter(v => v.status === 'active').length / vehicles.length) * 100) : 0}%
              </Text>
              <Text style={styles.summaryStatLabel}>Operational</Text>
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
    backgroundColor: '#F8FAFC',
  },
  scrollContainer: {
    flex: 1,
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
  content: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  addButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  addButtonText: {
    color: 'white',
    fontWeight: '500',
    marginLeft: 8,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  vehiclesList: {
    gap: 16,
    marginBottom: 24,
  },
  vehicleCard: {
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
  vehicleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  vehicleInfo: {
    flex: 1,
  },
  vehicleNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  vehicleType: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 2,
  },
  vehicleRoute: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  vehicleDetails: {
    gap: 12,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
  },
  fuelBarContainer: {
    marginVertical: 8,
  },
  fuelBarBackground: {
    width: '100%',
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
  },
  fuelBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  vehicleActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
  },
  trackButton: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    paddingVertical: 8,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  trackButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  manageButton: {
    flex: 1,
    backgroundColor: '#3B82F6',
    paddingVertical: 8,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  manageButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: 'white',
  },
  summaryContainer: {
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
  summaryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  summaryStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryStatItem: {
    alignItems: 'center',
  },
  summaryStatNumber: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  summaryStatLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
});

export default VehiclesScreen;
