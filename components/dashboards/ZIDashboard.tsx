import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Alert,
  Modal,
  TextInput,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker, Circle } from 'react-native-maps';
import * as Location from 'expo-location';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../config/firebase';
import { convertTimestamp, sanitizeFirebaseData } from '../../utils/timestampUtils';
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
  addDoc,
  getDocs,
  orderBy,
  limit
} from 'firebase/firestore';

const { width } = Dimensions.get('window');

// Indore zone coordinates
const INDORE_ZONES = [
  { id: 1, name: 'Zone 1 - Rajwada', latitude: 22.7196, longitude: 75.8577, radius: 2000 },
  { id: 2, name: 'Zone 2 - Sarafa Bazaar', latitude: 22.7251, longitude: 75.8573, radius: 1500 },
  { id: 3, name: 'Zone 3 - Palasia', latitude: 22.7279, longitude: 75.8723, radius: 2500 },
  { id: 4, name: 'Zone 4 - Vijay Nagar', latitude: 22.7532, longitude: 75.8937, radius: 3000 },
  { id: 5, name: 'Zone 5 - Bhawar Kuan', latitude: 22.6708, longitude: 75.9063, radius: 2000 },
];

const ZIDashboard: React.FC = () => {
  const { userData, logout } = useAuth();

  // State management
  const [assignedDrivers, setAssignedDrivers] = useState([]);
  const [driverStatuses, setDriverStatuses] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [requests, setRequests] = useState([]);
  const [zoneStats, setZoneStats] = useState({
    coverage: '0%',
    activeDrivers: 0,
    vehiclesInZone: 0,
    pendingRequests: 0
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [newRequest, setNewRequest] = useState({ title: '', priority: 'medium', description: '' });
  const [myLocation, setMyLocation] = useState(null);
  const [selectedDriver, setSelectedDriver] = useState(null);

  // Get current location
  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const location = await Location.getCurrentPositionAsync({});
        setMyLocation({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
      }
    } catch (error) {
      console.error('Error getting location:', error);
    }
  };

  // Real-time data fetching
  useEffect(() => {
    if (!userData) return;

    getCurrentLocation();
    const unsubscribers = [];

    // Real-time assigned drivers listener
    const assignmentsQuery = query(
      collection(db, 'driverAssignments'),
      where('ziId', '==', userData.uid),
      where('status', '==', 'active')
    );

    const unsubscribeAssignments = onSnapshot(assignmentsQuery, async (snapshot) => {
      const assignmentsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        assignedAt: doc.data().assignedAt?.toDate ? doc.data().assignedAt.toDate() : new Date()
      }));

      setAssignedDrivers(assignmentsData);
      console.log('📋 Assigned drivers updated:', assignmentsData.length);
    });
    unsubscribers.push(unsubscribeAssignments);

    // Real-time driver statuses listener (simplified - no complex queries)
    const statusQuery = collection(db, 'driverStatuses');

    const unsubscribeStatuses = onSnapshot(statusQuery, (snapshot) => {
      const statusData = snapshot.docs.map(doc => {
        const data = sanitizeFirebaseData(doc.data());
        return {
          id: doc.id,
          ...data,
          lastUpdated: new Date(data.lastUpdated || new Date()),
          shiftStartTime: data.shiftStartTime ? new Date(data.shiftStartTime) : null,
          shiftEndTime: data.shiftEndTime ? new Date(data.shiftEndTime) : null
        };
      });

      // Filter to only show assigned drivers' statuses
      const assignedDriverIds = assignedDrivers.map(a => a.driverId);
      const filteredStatuses = statusData.filter(status =>
        assignedDriverIds.includes(status.driverId)
      );

      // Sort in memory
      filteredStatuses.sort((a, b) => b.lastUpdated - a.lastUpdated);

      setDriverStatuses(filteredStatuses);
      console.log('🚗 Driver statuses updated:', filteredStatuses.length);
    }, (error) => {
      console.log('Driver statuses listener error (non-critical):', error.message);
      setDriverStatuses([]); // Set empty array on error
    });
    unsubscribers.push(unsubscribeStatuses);

    // Real-time vehicles listener
    const vehiclesQuery = query(collection(db, 'vehicles'));
    const unsubscribeVehicles = onSnapshot(vehiclesQuery, (snapshot) => {
      const vehiclesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setVehicles(vehiclesData);
    });
    unsubscribers.push(unsubscribeVehicles);

    // Real-time requests listener (simplified - no complex queries)
    const requestsQuery = collection(db, 'requests');

    const unsubscribeRequests = onSnapshot(requestsQuery, (snapshot) => {
      const requestsData = snapshot.docs.map(doc => {
        const data = sanitizeFirebaseData(doc.data());
        return {
          id: doc.id,
          ...data,
          createdAt: new Date(data.createdAt || new Date())
        };
      });
      // Sort in memory and limit to 20
      requestsData.sort((a, b) => b.createdAt - a.createdAt);
      setRequests(requestsData.slice(0, 20));
    }, (error) => {
      console.log('Requests listener error (non-critical):', error.message);
      setRequests([]); // Set empty array on error
    });
    unsubscribers.push(unsubscribeRequests);

    setLoading(false);

    return () => {
      unsubscribers.forEach(unsubscribe => unsubscribe());
    };
  }, [userData?.zoneId]);

  // Update zone stats when data changes
  useEffect(() => {
    const activeDrivers = driverStatuses.filter(d => d.status === 'on-duty').length;
    const totalAssignedDrivers = assignedDrivers.length;
    const pendingRequests = requests.filter(r => r.status === 'pending').length;

    setZoneStats({
      coverage: `${totalAssignedDrivers > 0 ? Math.min(100, (activeDrivers / totalAssignedDrivers) * 100).toFixed(0) : 0}%`,
      activeDrivers,
      vehiclesInZone: vehicles.length,
      pendingRequests
    });
  }, [assignedDrivers, driverStatuses, vehicles, requests]);

  // Distance calculation function
  const getDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Radius of the Earth in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  // Quick action functions
  const handleCreateRequest = async () => {
    if (!newRequest.title.trim()) {
      Alert.alert('Error', 'Please enter a request title');
      return;
    }

    try {
      await addDoc(collection(db, 'requests'), {
        title: newRequest.title,
        description: newRequest.description,
        priority: newRequest.priority,
        status: 'pending',
        zoneId: userData?.zoneId || 'zone1',
        createdBy: userData?.id,
        createdAt: new Date(),
      });

      Alert.alert('Success', 'Request created successfully');
      setShowRequestModal(false);
      setNewRequest({ title: '', priority: 'medium', description: '' });
    } catch (error) {
      console.error('Error creating request:', error);
      Alert.alert('Error', 'Failed to create request');
    }
  };

  const handleTrackDriver = (driver) => {
    setSelectedDriver(driver);
    setShowMap(true);
  };

  const handleUpdateDriverStatus = async (driverId, newStatus) => {
    try {
      await updateDoc(doc(db, 'users', driverId), {
        status: newStatus,
        lastUpdated: new Date()
      });
      Alert.alert('Success', `Driver status updated to ${newStatus}`);
    } catch (error) {
      console.error('Error updating driver status:', error);
      Alert.alert('Error', 'Failed to update driver status');
    }
  };

  const handleEmergencyAlert = () => {
    Alert.alert(
      'Emergency Alert',
      'Send emergency alert to all drivers in your zone?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send Alert',
          style: 'destructive',
          onPress: async () => {
            try {
              await addDoc(collection(db, 'notifications'), {
                title: 'Emergency Alert',
                message: 'Emergency situation reported in your zone. Please report your status immediately.',
                type: 'emergency',
                zoneId: userData?.zoneId || 'zone1',
                createdAt: new Date(),
                recipients: assignedDrivers.map(a => a.driverId)
              });
              Alert.alert('Success', 'Emergency alert sent to all drivers');
            } catch (error) {
              Alert.alert('Error', 'Failed to send emergency alert');
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

  const getDriverDistance = (driver) => {
    if (!myLocation || !driver.latitude || !driver.longitude) return 'N/A';

    const R = 6371; // Earth's radius in km
    const dLat = (driver.latitude - myLocation.latitude) * Math.PI / 180;
    const dLon = (driver.longitude - myLocation.longitude) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(myLocation.latitude * Math.PI / 180) * Math.cos(driver.latitude * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;

    return distance < 1 ? `${(distance * 1000).toFixed(0)}m` : `${distance.toFixed(1)}km`;
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.greeting}>Welcome back,</Text>
            <Text style={styles.userName}>{userData?.name}</Text>
            <Text style={styles.userRole}>Zone Incharge - Central District</Text>
          </View>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={24} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Zone Stats */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Zone Overview</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: '#10B981' }]}>
                <Ionicons name="map" size={24} color="#FFFFFF" />
              </View>
              <Text style={styles.statValue}>{zoneStats.coverage}</Text>
              <Text style={styles.statName}>Zone Coverage</Text>
            </View>
            <View style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: '#3B82F6' }]}>
                <Ionicons name="people" size={24} color="#FFFFFF" />
              </View>
              <Text style={styles.statValue}>{zoneStats.activeDrivers}</Text>
              <Text style={styles.statName}>Active Drivers</Text>
            </View>
            <View style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: '#8B5CF6' }]}>
                <Ionicons name="car" size={24} color="#FFFFFF" />
              </View>
              <Text style={styles.statValue}>{zoneStats.vehiclesInZone}</Text>
              <Text style={styles.statName}>Vehicles in Zone</Text>
            </View>
            <View style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: zoneStats.pendingRequests > 0 ? '#F59E0B' : '#10B981' }]}>
                <Ionicons name="time" size={24} color="#FFFFFF" />
              </View>
              <Text style={styles.statValue}>{zoneStats.pendingRequests}</Text>
              <Text style={styles.statName}>Pending Requests</Text>
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActions}>
            <TouchableOpacity style={styles.actionButton} onPress={() => setShowRequestModal(true)}>
              <Ionicons name="add-circle" size={24} color="#3B82F6" />
              <Text style={styles.actionText}>Create Request</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton} onPress={() => setShowMap(true)}>
              <Ionicons name="map" size={24} color="#10B981" />
              <Text style={styles.actionText}>View Zone Map</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton} onPress={handleEmergencyAlert}>
              <Ionicons name="warning" size={24} color="#EF4444" />
              <Text style={styles.actionText}>Emergency Alert</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton} onPress={getCurrentLocation}>
              <Ionicons name="location" size={24} color="#8B5CF6" />
              <Text style={styles.actionText}>Update Location</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Real-time Assigned Driver Status */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Assigned Drivers ({assignedDrivers.length})</Text>
          {assignedDrivers.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={48} color="#9CA3AF" />
              <Text style={styles.emptyText}>No drivers assigned to you yet</Text>
              <Text style={styles.emptyText}>Contact admin for driver assignments</Text>
            </View>
          ) : (
            assignedDrivers.map((assignment) => {
              const driverStatus = driverStatuses.find(s => s.driverId === assignment.driverId);
              const lastUpdate = driverStatus?.lastUpdated;
              const timeSinceUpdate = lastUpdate ? Math.floor((new Date() - lastUpdate) / 60000) : null;

              return (
                <View key={assignment.id} style={styles.driverCard}>
                  <View style={styles.driverInfo}>
                    <View style={styles.driverHeader}>
                      <Text style={styles.driverName}>{assignment.driverName}</Text>
                      <View style={[
                        styles.statusBadge,
                        { backgroundColor:
                          driverStatus?.status === 'on-duty' ? '#10B981' :
                          driverStatus?.status === 'lunch' ? '#F59E0B' : '#EF4444' }
                      ]}>
                        <Text style={styles.statusText}>
                          {driverStatus?.status?.toUpperCase() || 'OFFLINE'}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.driverDetails}>
                      📧 {assignment.driverEmail}
                    </Text>
                    <Text style={styles.driverDetails}>
                      🚛 Waste: {driverStatus?.wasteCollected || 0}kg | Trips: {driverStatus?.tripsCompleted || 0}
                    </Text>
                    <Text style={styles.driverDetails}>
                      📍 {driverStatus?.currentLocation || 'Location unknown'}
                    </Text>
                    <Text style={styles.driverDetails}>
                      🕒 Last Update: {timeSinceUpdate !== null ?
                        `${timeSinceUpdate} min ago` : 'Never updated'}
                    </Text>
                    {driverStatus?.latitude && driverStatus?.longitude && myLocation && (
                      <Text style={styles.driverDetails}>
                        📏 Distance: {getDistance(
                          myLocation.latitude, myLocation.longitude,
                          driverStatus.latitude, driverStatus.longitude
                        ).toFixed(1)} km
                      </Text>
                    )}
                  </View>
                  <View style={styles.driverActions}>
                    <TouchableOpacity
                      style={styles.trackButton}
                      onPress={() => handleTrackDriver(driverStatus)}
                    >
                      <Ionicons name="location" size={16} color="#FFFFFF" />
                      <Text style={styles.trackButtonText}>Track</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}
        </View>

        {/* Recent Requests */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Requests</Text>
          {requests.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="document-outline" size={48} color="#9CA3AF" />
              <Text style={styles.emptyText}>No recent requests</Text>
            </View>
          ) : (
            requests.map((request) => (
              <View key={request.id} style={styles.requestCard}>
                <View style={styles.requestInfo}>
                  <Text style={styles.requestTitle}>{request.title}</Text>
                  <Text style={styles.requestDescription}>{request.description}</Text>
                  <Text style={styles.requestTime}>
                    {request.createdAt ?
                      `${Math.floor((new Date() - request.createdAt) / 60000)} min ago` : 'Just now'}
                  </Text>
                </View>
                <View style={styles.requestBadges}>
                  <View style={[
                    styles.priorityBadge,
                    {
                      backgroundColor:
                        request.priority === 'high' ? '#EF4444' :
                        request.priority === 'medium' ? '#F59E0B' : '#10B981'
                    }
                  ]}>
                    <Text style={styles.badgeText}>{request.priority}</Text>
                  </View>
                  <View style={[
                    styles.statusBadge,
                    {
                      backgroundColor:
                        request.status === 'pending' ? '#F59E0B' :
                        request.status === 'in-progress' ? '#3B82F6' : '#10B981'
                    }
                  ]}>
                    <Text style={styles.badgeText}>{request.status}</Text>
                  </View>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Map Modal */}
      <Modal
        visible={showMap}
        animationType="slide"
        onRequestClose={() => setShowMap(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {selectedDriver ? `Tracking ${selectedDriver.name}` : 'Indore Zone Map'}
            </Text>
            <TouchableOpacity onPress={() => setShowMap(false)}>
              <Ionicons name="close" size={24} color="#374151" />
            </TouchableOpacity>
          </View>

          <MapView
            style={styles.map}
            initialRegion={{
              latitude: 22.7196,
              longitude: 75.8577,
              latitudeDelta: 0.1,
              longitudeDelta: 0.1,
            }}
          >
            {/* Indore Zone Circles */}
            {INDORE_ZONES.map((zone) => (
              <Circle
                key={zone.id}
                center={{ latitude: zone.latitude, longitude: zone.longitude }}
                radius={zone.radius}
                fillColor="rgba(59, 130, 246, 0.2)"
                strokeColor="rgba(59, 130, 246, 0.8)"
                strokeWidth={2}
              />
            ))}

            {/* Zone Markers */}
            {INDORE_ZONES.map((zone) => (
              <Marker
                key={`marker-${zone.id}`}
                coordinate={{ latitude: zone.latitude, longitude: zone.longitude }}
                title={zone.name}
                description={`Zone ${zone.id} - Indore`}
              >
                <View style={styles.zoneMarker}>
                  <Text style={styles.zoneMarkerText}>{zone.id}</Text>
                </View>
              </Marker>
            ))}

            {/* My Location */}
            {myLocation && (
              <Marker
                coordinate={myLocation}
                title="Your Location"
                description="ZI Current Position"
              >
                <View style={styles.myLocationMarker}>
                  <Ionicons name="person" size={20} color="#FFFFFF" />
                </View>
              </Marker>
            )}

            {/* Driver Locations */}
            {driverStatuses.filter(d => d.latitude && d.longitude).map((driver) => (
              <Marker
                key={`driver-${driver.driverId}`}
                coordinate={{ latitude: driver.latitude, longitude: driver.longitude }}
                title={driver.name}
                description={`Status: ${driver.status} | Vehicle: ${driver.vehicleNumber || 'N/A'}`}
              >
                <View style={[
                  styles.driverMarker,
                  { backgroundColor: driver.status === 'active' ? '#10B981' :
                                    driver.status === 'break' ? '#F59E0B' : '#EF4444' }
                ]}>
                  <Ionicons name="car" size={16} color="#FFFFFF" />
                </View>
              </Marker>
            ))}
          </MapView>
        </View>
      </Modal>

      {/* Create Request Modal */}
      <Modal
        visible={showRequestModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowRequestModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.requestModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create New Request</Text>
              <TouchableOpacity onPress={() => setShowRequestModal(false)}>
                <Ionicons name="close" size={24} color="#374151" />
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Request Title</Text>
              <TextInput
                style={styles.textInput}
                value={newRequest.title}
                onChangeText={(text) => setNewRequest({...newRequest, title: text})}
                placeholder="Enter request title"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Description</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                value={newRequest.description}
                onChangeText={(text) => setNewRequest({...newRequest, description: text})}
                placeholder="Enter request description"
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Priority</Text>
              <View style={styles.priorityButtons}>
                {['low', 'medium', 'high'].map((priority) => (
                  <TouchableOpacity
                    key={priority}
                    style={[
                      styles.priorityButton,
                      { backgroundColor: newRequest.priority === priority ? '#3B82F6' : '#F3F4F6' }
                    ]}
                    onPress={() => setNewRequest({...newRequest, priority})}
                  >
                    <Text style={[
                      styles.priorityButtonText,
                      { color: newRequest.priority === priority ? '#FFFFFF' : '#374151' }
                    ]}>
                      {priority.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowRequestModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.createButton}
                onPress={handleCreateRequest}
              >
                <Text style={styles.createButtonText}>Create Request</Text>
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
  logoutButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
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
    justifyContent: 'space-between',
  },
  statCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    width: (width - 48) / 2,
    marginBottom: 12,
    alignItems: 'center',
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
    alignItems: 'center',
    justifyContent: 'center',
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
  quickActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    width: (width - 48) / 2,
    marginBottom: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  actionText: {
    fontSize: 12,
    color: '#374151',
    marginTop: 8,
    textAlign: 'center',
  },
  emptyState: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  emptyText: {
    fontSize: 16,
    color: '#9CA3AF',
    marginTop: 12,
  },
  driverCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
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
  driverHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  driverName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  driverDetails: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  driverActions: {
    marginLeft: 12,
  },
  trackButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  trackButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  requestCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  requestInfo: {
    marginBottom: 12,
  },
  requestTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  requestDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  requestTime: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  requestBadges: {
    flexDirection: 'row',
    gap: 8,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingTop: 50,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  map: {
    flex: 1,
  },
  zoneMarker: {
    backgroundColor: '#3B82F6',
    borderRadius: 15,
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  zoneMarkerText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  myLocationMarker: {
    backgroundColor: '#EF4444',
    borderRadius: 20,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  driverMarker: {
    borderRadius: 15,
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  requestModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxWidth: 400,
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
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  priorityButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  priorityButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  priorityButtonText: {
    fontSize: 14,
    fontWeight: '600',
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
  createButton: {
    flex: 1,
    backgroundColor: '#3B82F6',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
  },
});

export default ZIDashboard;
