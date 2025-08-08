import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Alert,
  TextInput,
  Modal,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useAuth } from '../../contexts/AuthContext';
import { useDriver, TripStatus } from '../../contexts/DriverContext';
import { convertTimestamp, convertTimestampToTime } from '../../utils/timestampUtils';
import LocationService from '../../services/LocationService';
// import { useTheme } from '../../contexts/ThemeContext';

const { width } = Dimensions.get('window');

const DriverDashboard: React.FC = () => {
  const { userData, logout } = useAuth();
  // const { colors } = useTheme();
  const {
    driverStatus,
    wasteCollections,
    attendance,
    trips,
    currentTrip,
    updateDriverStatus,
    addWasteCollection,
    startTrip,
    completeTrip,
    updateLiveLocation,
    loading
  } = useDriver();

  const [showWasteModal, setShowWasteModal] = useState(false);
  const [wasteAmount, setWasteAmount] = useState('');
  const [wasteLocation, setWasteLocation] = useState('');
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showTripModal, setShowTripModal] = useState(false);
  const [newLocation, setNewLocation] = useState('');
  const [tripRoute, setTripRoute] = useState('');
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);
  const locationService = LocationService.getInstance();

  // Calculate real-time stats
  const totalWasteCollected = wasteCollections.reduce((sum, collection) => sum + collection.amount, 0);
  const tripsCompleted = driverStatus?.tripsCompleted || 0;
  const hoursWorked = attendance?.totalHours || 0;
  const currentStatus = driverStatus?.status || 'off-duty';

  const driverStats = [
    {
      name: 'Waste Collected',
      value: totalWasteCollected.toString(),
      unit: 'kg',
      icon: 'trash',
      status: 'good'
    },
    {
      name: 'Trips Completed',
      value: tripsCompleted.toString(),
      unit: 'trips',
      icon: 'checkmark-circle',
      status: 'good'
    },
    {
      name: 'Hours Worked',
      value: hoursWorked.toFixed(1),
      unit: 'hrs',
      icon: 'time',
      status: hoursWorked >= 9 ? 'completed' : 'good'
    },
    {
      name: 'Current Status',
      value: currentStatus.replace('-', ' ').toUpperCase(),
      unit: '',
      icon: currentStatus === 'on-duty' ? 'play' : currentStatus === 'lunch' ? 'restaurant' : 'pause',
      status: currentStatus === 'on-duty' ? 'good' : 'warning'
    },
  ];

  // Real waste collection data for today
  const todayCollections = wasteCollections.map((collection, index) => ({
    id: index + 1,
    location: collection.location,
    amount: collection.amount,
    time: convertTimestampToTime(collection.timestamp),
    status: 'completed'
  }));

  const vehicleInfo = {
    number: 'MH-12-AB-1234',
    type: 'Garbage Truck',
    capacity: '10 Tons',
    lastService: '2024-01-10',
    nextService: '2024-02-10'
  };

  const recentIssues = [
    { id: 1, issue: 'Route blocked due to construction', area: 'Sector 8', time: '11:30 AM', status: 'resolved' },
    { id: 2, issue: 'Vehicle breakdown reported', area: 'Depot', time: '09:15 AM', status: 'pending' },
  ];

  // Get current location
  const getCurrentLocation = async () => {
    setIsGettingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required for live tracking');
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const address = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      const addressString = address.length > 0
        ? `${address[0].street || ''} ${address[0].city || ''}`.trim()
        : `${location.coords.latitude.toFixed(4)}, ${location.coords.longitude.toFixed(4)}`;

      setCurrentLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        address: addressString
      });

      // Update live location in Firebase
      await updateLiveLocation(
        location.coords.latitude,
        location.coords.longitude,
        addressString
      );

      Alert.alert('Location Updated', `Current location: ${addressString}`);
    } catch (error) {
      console.error('Error getting location:', error);
      Alert.alert('Error', 'Failed to get current location');
    } finally {
      setIsGettingLocation(false);
    }
  };

  // Start location tracking
  useEffect(() => {
    let locationSubscription: any;

    const startLocationTracking = async () => {
      if (driverStatus?.status === 'on-duty') {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          locationSubscription = await Location.watchPositionAsync(
            {
              accuracy: Location.Accuracy.High,
              timeInterval: 30000, // Update every 30 seconds
              distanceInterval: 50, // Update every 50 meters
            },
            async (location) => {
              const address = await Location.reverseGeocodeAsync({
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
              });

              const addressString = address.length > 0
                ? `${address[0].street || ''} ${address[0].city || ''}`.trim()
                : `${location.coords.latitude.toFixed(4)}, ${location.coords.longitude.toFixed(4)}`;

              await updateLiveLocation(
                location.coords.latitude,
                location.coords.longitude,
                addressString
              );
            }
          );
        }
      }
    };

    startLocationTracking();

    return () => {
      if (locationSubscription) {
        locationSubscription.remove();
      }
    };
  }, [driverStatus?.status]);

  const handleStatusChange = async (newStatus: TripStatus) => {
    try {
      await updateDriverStatus(newStatus, currentLocation?.address || driverStatus?.currentLocation);
      Alert.alert(
        'Status Updated',
        `You are now ${newStatus.replace('-', ' ').toUpperCase()}`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to update status. Please try again.');
    }
  };

  const handleAddWaste = async () => {
    if (!wasteAmount || !wasteLocation) {
      Alert.alert('Error', 'Please enter both amount and location');
      return;
    }

    try {
      await addWasteCollection(parseFloat(wasteAmount), wasteLocation);
      setWasteAmount('');
      setWasteLocation('');
      setShowWasteModal(false);
      Alert.alert('Success', `Added ${wasteAmount}kg of waste collected from ${wasteLocation}`);
    } catch (error) {
      Alert.alert('Error', 'Failed to add waste collection. Please try again.');
    }
  };

  const handleStartTrip = async () => {
    if (!tripRoute.trim()) {
      Alert.alert('Error', 'Please enter a route name');
      return;
    }

    try {
      const vehicleId = userData?.vehicleId || `VEH-${userData?.uid?.slice(-6) || 'DEFAULT'}`;
      const tripId = await startTrip(tripRoute, vehicleId);
      setTripRoute('');
      setShowTripModal(false);
      Alert.alert('Success', `Trip started on route: ${tripRoute}`);
    } catch (error) {
      Alert.alert('Error', 'Failed to start trip. Please try again.');
    }
  };

  const handleCompleteTrip = async () => {
    if (!currentTrip) {
      Alert.alert('Error', 'No active trip to complete');
      return;
    }

    Alert.alert(
      'Complete Trip',
      'Are you sure you want to complete this trip?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Complete',
          onPress: async () => {
            try {
              await completeTrip(totalWasteCollected);
              Alert.alert('Success', 'Trip completed successfully!');
            } catch (error) {
              Alert.alert('Error', 'Failed to complete trip. Please try again.');
            }
          }
        }
      ]
    );
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await getCurrentLocation();
    setTimeout(() => setRefreshing(false), 1000);
  };

  const handleUpdateLocation = async () => {
    if (!newLocation.trim()) {
      Alert.alert('Error', 'Please enter a location');
      return;
    }

    try {
      await updateDriverStatus(driverStatus?.status || 'off-duty', newLocation);
      setNewLocation('');
      setShowLocationModal(false);
      Alert.alert('Success', `Location updated to: ${newLocation}`);
    } catch (error) {
      Alert.alert('Error', 'Failed to update location. Please try again.');
    }
  };

  const handleGetCurrentLocation = async () => {
    setIsGettingLocation(true);
    try {
      const location = await locationService.getCurrentLocation();
      if (location) {
        await updateDriverStatus(driverStatus?.status || 'off-duty', location.address);
        Alert.alert('Success', `Location updated to: ${location.address}`);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to get current location. Please try again.');
    } finally {
      setIsGettingLocation(false);
    }
  };

  const handleStartLocationTracking = async () => {
    if (!userData) return;

    try {
      const success = await locationService.startLocationTracking(userData.uid, (location) => {
        console.log('Location updated:', location.address);
      });

      if (success) {
        Alert.alert('Success', 'Location tracking started. Your location will be updated automatically.');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to start location tracking.');
    }
  };

  const handleStopLocationTracking = async () => {
    try {
      await locationService.stopLocationTracking();
      Alert.alert('Success', 'Location tracking stopped.');
    } catch (error) {
      Alert.alert('Error', 'Failed to stop location tracking.');
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', onPress: async () => await logout() }
      ]
    );
  };

  // const styles = createStyles(colors);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.greeting}>Welcome back,</Text>
            <Text style={styles.userName}>{userData?.name}</Text>
            <Text style={styles.userRole}>Driver - {vehicleInfo.number}</Text>
          </View>
          <View style={styles.headerActions}>
            <View style={styles.statusButtons}>
              <TouchableOpacity
                style={[
                  styles.statusButton,
                  { backgroundColor: currentStatus === 'on-duty' ? '#10B981' : '#E5E7EB' }
                ]}
                onPress={() => handleStatusChange('on-duty')}
              >
                <Ionicons
                  name="play"
                  size={14}
                  color={currentStatus === 'on-duty' ? '#FFFFFF' : '#6B7280'}
                />
                <Text style={[
                  styles.statusButtonText,
                  { color: currentStatus === 'on-duty' ? '#FFFFFF' : '#6B7280' }
                ]}>
                  On Duty
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.statusButton,
                  { backgroundColor: currentStatus === 'lunch' ? '#F59E0B' : '#E5E7EB' }
                ]}
                onPress={() => handleStatusChange('lunch')}
              >
                <Ionicons
                  name="restaurant"
                  size={14}
                  color={currentStatus === 'lunch' ? '#FFFFFF' : '#6B7280'}
                />
                <Text style={[
                  styles.statusButtonText,
                  { color: currentStatus === 'lunch' ? '#FFFFFF' : '#6B7280' }
                ]}>
                  Lunch
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.statusButton,
                  { backgroundColor: currentStatus === 'off-duty' ? '#EF4444' : '#E5E7EB' }
                ]}
                onPress={() => handleStatusChange('off-duty')}
              >
                <Ionicons
                  name="stop"
                  size={14}
                  color={currentStatus === 'off-duty' ? '#FFFFFF' : '#6B7280'}
                />
                <Text style={[
                  styles.statusButtonText,
                  { color: currentStatus === 'off-duty' ? '#FFFFFF' : '#6B7280' }
                ]}>
                  Off Duty
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
              <Ionicons name="log-out-outline" size={24} color="#EF4444" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Driver Stats */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Today's Overview</Text>
          <View style={styles.statsGrid}>
            {driverStats.map((stat, index) => (
              <View key={index} style={styles.statCard}>
                <View style={styles.statIcon}>
                  <Ionicons name={stat.icon as any} size={24} color="#3B82F6" />
                </View>
                <Text style={styles.statValue}>{stat.value}</Text>
                <Text style={styles.statName}>{stat.name}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Current Location */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Current Location</Text>
          <View style={styles.locationCard}>
            <View style={styles.locationInfo}>
              <Ionicons name="location" size={24} color="#EF4444" />
              <Text style={styles.locationText}>
                {driverStatus?.currentLocation || 'Location not set'}
              </Text>
            </View>
            <View style={styles.locationActions}>
              <TouchableOpacity
                style={[styles.locationButton, { backgroundColor: '#10B981' }]}
                onPress={handleGetCurrentLocation}
                disabled={isGettingLocation}
              >
                <Ionicons
                  name={isGettingLocation ? "refresh" : "location"}
                  size={14}
                  color="#FFFFFF"
                />
                <Text style={styles.locationButtonText}>
                  {isGettingLocation ? 'Getting...' : 'Live'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.locationButton, { backgroundColor: '#3B82F6' }]}
                onPress={() => setShowLocationModal(true)}
              >
                <Ionicons name="create" size={14} color="#FFFFFF" />
                <Text style={styles.locationButtonText}>Manual</Text>
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.mapPlaceholder}>
            <Ionicons name="map" size={48} color="#6B7280" />
            <Text style={styles.mapText}>Live GPS Tracking</Text>
          </View>
        </View>

        {/* Today's Waste Collections */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Today's Waste Collections</Text>
          {todayCollections.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="trash-outline" size={48} color="#9CA3AF" />
              <Text style={styles.emptyStateText}>No waste collected today</Text>
              <Text style={styles.emptyStateSubtext}>Start collecting waste to see data here</Text>
            </View>
          ) : (
            <View style={styles.routesContainer}>
              {todayCollections.map((collection) => (
                <View key={collection.id} style={styles.routeCard}>
                  <View style={styles.routeInfo}>
                    <Text style={styles.routeName}>Collection #{collection.id}</Text>
                    <Text style={styles.routeArea}>{collection.location}</Text>
                    <Text style={styles.routeTime}>{collection.amount}kg • {collection.time}</Text>
                  </View>
                  <View style={[styles.routeStatus, { backgroundColor: '#10B981' }]}>
                    <Text style={styles.routeStatusText}>Completed</Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Vehicle Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Vehicle Information</Text>
          <View style={styles.vehicleCard}>
            <View style={styles.vehicleHeader}>
              <Ionicons name="car" size={32} color="#3B82F6" />
              <View style={styles.vehicleBasicInfo}>
                <Text style={styles.vehicleNumber}>{vehicleInfo.number}</Text>
                <Text style={styles.vehicleType}>{vehicleInfo.type}</Text>
              </View>
            </View>
            <View style={styles.vehicleDetails}>
              <View style={styles.vehicleDetailItem}>
                <Text style={styles.vehicleDetailLabel}>Capacity</Text>
                <Text style={styles.vehicleDetailValue}>{vehicleInfo.capacity}</Text>
              </View>
              <View style={styles.vehicleDetailItem}>
                <Text style={styles.vehicleDetailLabel}>Last Service</Text>
                <Text style={styles.vehicleDetailValue}>{vehicleInfo.lastService}</Text>
              </View>
              <View style={styles.vehicleDetailItem}>
                <Text style={styles.vehicleDetailLabel}>Next Service</Text>
                <Text style={styles.vehicleDetailValue}>{vehicleInfo.nextService}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Recent Issues */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Issues</Text>
          <View style={styles.issuesContainer}>
            {recentIssues.map((issue) => (
              <View key={issue.id} style={styles.issueCard}>
                <View style={styles.issueInfo}>
                  <Text style={styles.issueTitle}>{issue.issue}</Text>
                  <Text style={styles.issueDetails}>{issue.area} • {issue.time}</Text>
                </View>
                <View style={[
                  styles.issueStatus,
                  {
                    backgroundColor: issue.status === 'resolved' ? '#10B981' : '#F59E0B'
                  }
                ]}>
                  <Text style={styles.issueStatusText}>{issue.status}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => setShowWasteModal(true)}
            >
              <Ionicons name="add-circle" size={32} color="#10B981" />
              <Text style={styles.actionText}>Add Waste Collection</Text>
            </TouchableOpacity>

            {!currentTrip ? (
              <TouchableOpacity
                style={styles.actionCard}
                onPress={() => setShowTripModal(true)}
              >
                <Ionicons name="play-circle" size={32} color="#3B82F6" />
                <Text style={styles.actionText}>Start Trip</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.actionCard, { backgroundColor: '#FEF3C7' }]}
                onPress={handleCompleteTrip}
              >
                <Ionicons name="checkmark-circle" size={32} color="#F59E0B" />
                <Text style={styles.actionText}>Complete Trip</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.actionCard}
              onPress={getCurrentLocation}
              disabled={isGettingLocation}
            >
              <Ionicons
                name={isGettingLocation ? "hourglass" : "location"}
                size={32}
                color={isGettingLocation ? "#9CA3AF" : "#8B5CF6"}
              />
              <Text style={styles.actionText}>
                {isGettingLocation ? 'Getting Location...' : 'Update Live Location'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => setShowLocationModal(true)}
            >
              <Ionicons name="map" size={32} color="#EF4444" />
              <Text style={styles.actionText}>Manual Location</Text>
            </TouchableOpacity>
          </View>

          {/* Current Trip Info */}
          {currentTrip && (
            <View style={styles.currentTripCard}>
              <View style={styles.tripHeader}>
                <Ionicons name="car" size={24} color="#3B82F6" />
                <Text style={styles.tripTitle}>Current Trip</Text>
                <View style={styles.tripStatusBadge}>
                  <Text style={styles.tripStatusText}>IN PROGRESS</Text>
                </View>
              </View>
              <Text style={styles.tripRoute}>Route: {currentTrip.route}</Text>
              <Text style={styles.tripTime}>
                Started: {convertTimestampToTime(currentTrip.startTime) || 'Just now'}
              </Text>
              <Text style={styles.tripWaste}>
                Waste Collected: {totalWasteCollected}kg
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Waste Collection Modal */}
      <Modal
        visible={showWasteModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowWasteModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Waste Collection</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Amount (kg)</Text>
              <TextInput
                style={styles.textInput}
                value={wasteAmount}
                onChangeText={setWasteAmount}
                placeholder="Enter amount in kg"
                keyboardType="numeric"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Location</Text>
              <TextInput
                style={styles.textInput}
                value={wasteLocation}
                onChangeText={setWasteLocation}
                placeholder="Enter collection location"
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowWasteModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmButton}
                onPress={handleAddWaste}
              >
                <Text style={styles.confirmButtonText}>Add Collection</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Location Update Modal */}
      <Modal
        visible={showLocationModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowLocationModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Update Location</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Current Location</Text>
              <TextInput
                style={styles.textInput}
                value={newLocation}
                onChangeText={setNewLocation}
                placeholder="Enter your current location"
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowLocationModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmButton}
                onPress={handleUpdateLocation}
              >
                <Text style={styles.confirmButtonText}>Update Location</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Trip Start Modal */}
      <Modal
        visible={showTripModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowTripModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Start New Trip</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Route Name</Text>
              <TextInput
                style={styles.textInput}
                value={tripRoute}
                onChangeText={setTripRoute}
                placeholder="Enter route name (e.g., Zone A, Sector 5)"
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowTripModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmButton}
                onPress={handleStartTrip}
              >
                <Text style={styles.confirmButtonText}>Start Trip</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  userRole: {
    fontSize: 14,
    color: '#3B82F6',
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: 8,
  },
  statusButtons: {
    flexDirection: 'row',
    gap: 4,
  },
  statusButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  statusButtonText: {
    fontSize: 10,
    fontWeight: '500',
  },
  logoutButton: {
    padding: 8,
  },
  content: {
    flex: 1,
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
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
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
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EBF4FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  statName: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  locationCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  locationText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  locationActions: {
    flexDirection: 'row',
    gap: 8,
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  locationButtonText: {
    fontSize: 11,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  mapPlaceholder: {
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
  mapText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 12,
  },
  routesContainer: {
    gap: 12,
  },
  routeCard: {
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
  routeInfo: {
    flex: 1,
  },
  routeName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  routeArea: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 2,
  },
  routeTime: {
    fontSize: 12,
    color: '#3B82F6',
  },
  routeStatus: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  routeStatusText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  vehicleCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  vehicleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  vehicleBasicInfo: {
    flex: 1,
  },
  vehicleNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  vehicleType: {
    fontSize: 14,
    color: '#6B7280',
  },
  vehicleDetails: {
    gap: 12,
  },
  vehicleDetailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  vehicleDetailLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  vehicleDetailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
  },
  issuesContainer: {
    gap: 12,
  },
  issueCard: {
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
  issueInfo: {
    flex: 1,
  },
  issueTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 4,
  },
  issueDetails: {
    fontSize: 12,
    color: '#6B7280',
  },
  issueStatus: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  issueStatusText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    width: (width - 64) / 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
    marginTop: 8,
    textAlign: 'center',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 20,
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#111827',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#6B7280',
  },
  confirmButton: {
    flex: 1,
    backgroundColor: '#3B82F6',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  currentTripCard: {
    backgroundColor: '#EBF8FF',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#3B82F6',
  },
  tripHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  tripTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E40AF',
    marginLeft: 8,
    flex: 1,
  },
  tripStatusBadge: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tripStatusText: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  tripRoute: {
    fontSize: 14,
    color: '#1E40AF',
    marginBottom: 4,
  },
  tripTime: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  tripWaste: {
    fontSize: 12,
    color: '#059669',
    fontWeight: '500',
  },
});

export default DriverDashboard;
