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
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, where, getDocs, doc, updateDoc, deleteDoc, onSnapshot, orderBy, limit, addDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { UserData, UserRole, UserStatus, useAuth } from '../../contexts/AuthContext';
import { Picker } from '@react-native-picker/picker';
import { convertTimestamp, sanitizeFirebaseData } from '../../utils/timestampUtils';

const { width } = Dimensions.get('window');

const AdminDashboard: React.FC = () => {
  const { userData, logout } = useAuth();
  const [pendingUsers, setPendingUsers] = useState<UserData[]>([]);
  const [allUsers, setAllUsers] = useState<UserData[]>([]);
  const [roleRequests, setRoleRequests] = useState<any[]>([]);
  const [wasteCollections, setWasteCollections] = useState<any[]>([]);
  const [driverStatuses, setDriverStatuses] = useState<any[]>([]);
  const [driverAssignments, setDriverAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [editRole, setEditRole] = useState<UserRole>('zi');
  const [assignModalVisible, setAssignModalVisible] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState<UserData | null>(null);
  const [availableZIs, setAvailableZIs] = useState<UserData[]>([]);
  const [selectedZI, setSelectedZI] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'requests' | 'users' | 'assignments'>('requests');

  const stats = [
    { name: 'Total Users', value: allUsers.length.toString(), icon: 'people', change: '+8.2%', changeType: 'increase' },
    { name: 'Pending Requests', value: roleRequests.filter(r => r.status === 'pending').length.toString(), icon: 'time', change: '+3.1%', changeType: 'increase' },
    { name: 'Approved Users', value: allUsers.filter(u => u.status === 'approved').length.toString(), icon: 'checkmark-circle', change: '+5.7%', changeType: 'increase' },
    { name: 'Driver Assignments', value: driverAssignments.filter(a => a.status === 'active').length.toString(), icon: 'car', change: '+2.1%', changeType: 'increase' },
  ];

  // Real-time data listeners
  useEffect(() => {
    const unsubscribers: (() => void)[] = [];

    // Real-time users listener
    const usersQuery = query(collection(db, 'users'));
    const unsubscribeUsers = onSnapshot(usersQuery, (snapshot) => {
      const usersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate ? doc.data().createdAt.toDate() : new Date()
      })) as UserData[];

      setAllUsers(usersData);
      setPendingUsers(usersData.filter(user => user.status === 'pending'));
      setAvailableZIs(usersData.filter(user => user.role === 'zi' && user.status === 'approved'));
      console.log('📊 Users updated:', usersData.length);
    });
    unsubscribers.push(unsubscribeUsers);

    // Real-time role requests listener (simplified - no complex queries)
    const roleRequestsQuery = collection(db, 'roleRequests');
    const unsubscribeRoleRequests = onSnapshot(roleRequestsQuery, (snapshot) => {
      const requestsData = snapshot.docs.map(doc => {
        const data = sanitizeFirebaseData(doc.data());
        return {
          id: doc.id,
          ...data,
          requestedAt: new Date(data.requestedAt || new Date())
        };
      });
      // Sort in memory instead of using orderBy
      requestsData.sort((a, b) => b.requestedAt - a.requestedAt);
      setRoleRequests(requestsData);
      console.log('📋 Role requests updated:', requestsData.length);
    }, (error) => {
      console.log('Role requests listener error (non-critical):', error.message);
      setRoleRequests([]); // Set empty array on error
    });
    unsubscribers.push(unsubscribeRoleRequests);

    // Real-time waste collections listener (simplified - no complex queries)
    const wasteQuery = collection(db, 'wasteCollections');
    const unsubscribeWaste = onSnapshot(wasteQuery, (snapshot) => {
      const wasteData = snapshot.docs.map(doc => {
        const data = sanitizeFirebaseData(doc.data());
        return {
          id: doc.id,
          ...data,
          timestamp: new Date(data.timestamp || new Date())
        };
      });
      // Sort in memory and limit to 50
      wasteData.sort((a, b) => b.timestamp - a.timestamp);
      setWasteCollections(wasteData.slice(0, 50));
    }, (error) => {
      console.log('Waste collections listener error (non-critical):', error.message);
      setWasteCollections([]); // Set empty array on error
    });
    unsubscribers.push(unsubscribeWaste);

    // Real-time driver statuses listener (simplified - no complex queries)
    const statusQuery = collection(db, 'driverStatuses');
    const unsubscribeStatus = onSnapshot(statusQuery, (snapshot) => {
      const statusData = snapshot.docs.map(doc => {
        const data = sanitizeFirebaseData(doc.data());
        return {
          id: doc.id,
          ...data,
          lastUpdated: new Date(data.lastUpdated || new Date())
        };
      });
      // Sort in memory
      statusData.sort((a, b) => b.lastUpdated - a.lastUpdated);
      setDriverStatuses(statusData);
    }, (error) => {
      console.log('Driver statuses listener error (non-critical):', error.message);
      setDriverStatuses([]); // Set empty array on error
    });
    unsubscribers.push(unsubscribeStatus);

    // Real-time driver assignments listener
    const assignmentsQuery = query(collection(db, 'driverAssignments'));
    const unsubscribeAssignments = onSnapshot(assignmentsQuery, (snapshot) => {
      const assignmentsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        assignedAt: doc.data().assignedAt?.toDate ? doc.data().assignedAt.toDate() : new Date()
      }));
      setDriverAssignments(assignmentsData);
    });
    unsubscribers.push(unsubscribeAssignments);

    setLoading(false);

    return () => {
      unsubscribers.forEach(unsubscribe => unsubscribe());
    };
  }, []);

  // Fetch users function
  const fetchUsers = async () => {
    // This function is handled by the real-time listener in useEffect
    // No additional action needed as data is automatically updated
  };

  // Approve role request
  const approveRoleRequest = async (request: any) => {
    try {
      // Update user status and role
      await updateDoc(doc(db, 'users', request.userId), {
        status: 'approved',
        role: request.requestedRole,
        approvedAt: new Date(),
        approvedBy: userData?.email
      });

      // Update role request status
      await updateDoc(doc(db, 'roleRequests', request.id), {
        status: 'approved',
        approvedAt: new Date(),
        approvedBy: userData?.email
      });

      Alert.alert('Success', `${request.userName} has been approved as ${request.requestedRole}`);
    } catch (error) {
      console.error('Error approving role request:', error);
      Alert.alert('Error', 'Failed to approve role request');
    }
  };

  // Reject role request
  const rejectRoleRequest = async (request: any) => {
    try {
      // Update user status
      await updateDoc(doc(db, 'users', request.userId), {
        status: 'rejected',
        rejectedAt: new Date(),
        rejectedBy: userData?.email
      });

      // Update role request status
      await updateDoc(doc(db, 'roleRequests', request.id), {
        status: 'rejected',
        rejectedAt: new Date(),
        rejectedBy: userData?.email
      });

      Alert.alert('Success', `${request.userName}'s request has been rejected`);
    } catch (error) {
      console.error('Error rejecting role request:', error);
      Alert.alert('Error', 'Failed to reject role request');
    }
  };

  // Assign driver to ZI
  const assignDriverToZI = async (driverId: string, ziId: string) => {
    try {
      const driver = allUsers.find(u => u.uid === driverId);
      const zi = allUsers.find(u => u.uid === ziId);

      if (!driver || !zi) {
        Alert.alert('Error', 'Driver or ZI not found');
        return;
      }

      // Create driver assignment
      await addDoc(collection(db, 'driverAssignments'), {
        driverId: driverId,
        driverName: driver.name,
        driverEmail: driver.email,
        ziId: ziId,
        ziName: zi.name,
        ziEmail: zi.email,
        assignedAt: new Date(),
        assignedBy: userData?.email,
        status: 'active'
      });

      Alert.alert('Success', `${driver.name} has been assigned to ZI ${zi.name}`);
      setAssignModalVisible(false);
      setSelectedDriver(null);
    } catch (error) {
      console.error('Error assigning driver:', error);
      Alert.alert('Error', 'Failed to assign driver to ZI');
    }
  };

  // Remove driver assignment
  const removeDriverAssignment = async (assignmentId: string) => {
    try {
      await updateDoc(doc(db, 'driverAssignments', assignmentId), {
        status: 'inactive',
        removedAt: new Date(),
        removedBy: userData?.email
      });

      Alert.alert('Success', 'Driver assignment removed');
    } catch (error) {
      console.error('Error removing assignment:', error);
      Alert.alert('Error', 'Failed to remove assignment');
    }
  };

  const rejectUser = async (user: UserData) => {
    Alert.alert(
      'Reject User',
      `Are you sure you want to reject ${user.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            try {
              await updateDoc(doc(db, 'users', user.uid), {
                status: 'rejected'
              });
              Alert.alert('Success', `User ${user.name} has been rejected`);
              fetchUsers();
            } catch (error) {
              console.error('Error rejecting user:', error);
              Alert.alert('Error', 'Failed to reject user');
            }
          }
        }
      ]
    );
  };

  const updateUserRole = async (user: UserData, newRole: UserRole) => {
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        role: newRole
      });

      Alert.alert('Success', `User ${user.name}'s role has been updated to ${newRole}`);
      fetchUsers();
      setModalVisible(false);
    } catch (error) {
      console.error('Error updating user role:', error);
      Alert.alert('Error', 'Failed to update user role');
    }
  };

  const openEditModal = (user: UserData) => {
    setSelectedUser(user);
    setEditRole(user.role);
    setModalVisible(true);
  };

  const quickActions = [
    { name: 'Role Requests', icon: 'time', color: '#F59E0B', onPress: () => setActiveTab('requests') },
    { name: 'All Users', icon: 'people', color: '#3B82F6', onPress: () => setActiveTab('users') },
    { name: 'Driver Assignments', icon: 'car', color: '#10B981', onPress: () => setActiveTab('assignments') },
    { name: 'Zone Management', icon: 'map', color: '#8B5CF6', onPress: () => Alert.alert('Zone Management', 'Zone management feature') },
    { name: 'HR Reports', icon: 'document-text', color: '#EC4899', onPress: () => Alert.alert('HR Reports', 'HR reporting feature') },
    { name: 'Analytics', icon: 'bar-chart', color: '#F97316', onPress: () => Alert.alert('Analytics', 'System analytics feature') },
  ];

  const recentActivities = [
    { action: 'New driver registered', time: '2 minutes ago', type: 'success' },
    { action: 'Vehicle maintenance scheduled', time: '15 minutes ago', type: 'warning' },
    { action: 'Zone coverage updated', time: '1 hour ago', type: 'info' },
    { action: 'System backup completed', time: '2 hours ago', type: 'success' },
  ];

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

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.greeting}>Welcome back,</Text>
            <Text style={styles.userName}>{userData?.name}</Text>
            <Text style={styles.userRole}>System Administrator</Text>
          </View>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={24} color="#EF4444" />
          </TouchableOpacity>
        </View>
        <Text style={styles.lastUpdated}>
          Last updated: {new Date().toLocaleString()}
        </Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>

      {/* Stats Grid */}
      <View style={styles.statsContainer}>
        {stats.map((stat, index) => (
          <View key={index} style={styles.statCard}>
            <View style={styles.statHeader}>
              <View style={[styles.statIcon, { backgroundColor: '#3B82F6' }]}>
                <Ionicons name={stat.icon as any} size={24} color="#FFFFFF" />
              </View>
              <View style={styles.statInfo}>
                <Text style={styles.statName}>{stat.name}</Text>
                <Text style={styles.statValue}>{stat.value}</Text>
                <Text style={[
                  styles.statChange,
                  { color: stat.changeType === 'increase' ? '#10B981' : '#EF4444' }
                ]}>
                  {stat.change} from last month
                </Text>
              </View>
            </View>
          </View>
        ))}
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          {quickActions.map((action, index) => (
            <TouchableOpacity
              key={index}
              style={styles.actionCard}
              onPress={action.onPress}
            >
              <View style={[styles.actionIcon, { backgroundColor: action.color }]}>
                <Ionicons name={action.icon as any} size={24} color="#FFFFFF" />
              </View>
              <Text style={styles.actionName}>{action.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Real-time Waste Collections */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Waste Collections</Text>
        {wasteCollections.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="trash-outline" size={48} color="#9CA3AF" />
            <Text style={styles.emptyText}>No waste collections yet</Text>
          </View>
        ) : (
          <View style={styles.wasteCollectionsList}>
            {wasteCollections.slice(0, 10).map((collection) => {
              const driver = allUsers.find(u => u.uid === collection.driverId);
              return (
                <View key={collection.id} style={styles.wasteCollectionCard}>
                  <View style={styles.wasteCollectionHeader}>
                    <View style={styles.driverInfo}>
                      <Ionicons name="person-circle" size={32} color="#3B82F6" />
                      <View style={styles.driverDetails}>
                        <Text style={styles.driverName}>
                          {driver?.name || 'Unknown Driver'}
                        </Text>
                        <Text style={styles.driverRole}>
                          {driver?.role?.toUpperCase() || 'DRIVER'}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.wasteAmount}>
                      <Text style={styles.wasteValue}>{collection.amount}kg</Text>
                      <Text style={styles.wasteLabel}>Collected</Text>
                    </View>
                  </View>
                  <View style={styles.wasteCollectionDetails}>
                    <Text style={styles.wasteLocation}>
                      📍 {collection.location}
                    </Text>
                    <Text style={styles.wasteTime}>
                      🕒 {collection.timestamp ?
                        `${Math.floor((new Date() - collection.timestamp) / 60000)} min ago` :
                        'Just now'}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </View>

      {/* Real-time Driver Status */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Live Driver Status</Text>
        {driverStatuses.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="car-outline" size={48} color="#9CA3AF" />
            <Text style={styles.emptyText}>No active drivers</Text>
          </View>
        ) : (
          <View style={styles.driverStatusList}>
            {driverStatuses.slice(0, 8).map((status) => {
              const driver = allUsers.find(u => u.uid === status.driverId);
              return (
                <View key={status.id} style={styles.driverStatusCard}>
                  <View style={styles.driverStatusHeader}>
                    <View style={styles.driverInfo}>
                      <Ionicons name="person" size={24} color="#374151" />
                      <Text style={styles.driverName}>
                        {driver?.name || 'Unknown Driver'}
                      </Text>
                    </View>
                    <View style={[
                      styles.statusBadge,
                      { backgroundColor:
                        status.status === 'on-duty' ? '#10B981' :
                        status.status === 'lunch' ? '#F59E0B' : '#EF4444'
                      }
                    ]}>
                      <Text style={styles.statusText}>
                        {status.status?.toUpperCase() || 'OFFLINE'}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.driverStatusDetails}>
                    <Text style={styles.statusDetail}>
                      🗑️ Waste: {status.wasteCollected || 0}kg
                    </Text>
                    <Text style={styles.statusDetail}>
                      🚛 Trips: {status.tripsCompleted || 0}
                    </Text>
                    <Text style={styles.statusDetail}>
                      📍 {status.currentLocation || 'Location unknown'}
                    </Text>
                    <Text style={styles.statusDetail}>
                      🕒 {status.lastUpdated ?
                        `${Math.floor((new Date() - status.lastUpdated) / 60000)} min ago` :
                        'Never updated'}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </View>

      {/* Management Tabs */}
      <View style={styles.section}>
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'requests' && styles.activeTab]}
            onPress={() => setActiveTab('requests')}
          >
            <Text style={[styles.tabText, activeTab === 'requests' && styles.activeTabText]}>
              Role Requests ({roleRequests.filter(r => r.status === 'pending').length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'users' && styles.activeTab]}
            onPress={() => setActiveTab('users')}
          >
            <Text style={[styles.tabText, activeTab === 'users' && styles.activeTabText]}>
              All Users ({allUsers.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'assignments' && styles.activeTab]}
            onPress={() => setActiveTab('assignments')}
          >
            <Text style={[styles.tabText, activeTab === 'assignments' && styles.activeTabText]}>
              Assignments ({driverAssignments.filter(a => a.status === 'active').length})
            </Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#3B82F6" />
            <Text style={styles.loadingText}>Loading data...</Text>
          </View>
        ) : (
          <View style={styles.usersContainer}>
            {/* Role Requests Tab */}
            {activeTab === 'requests' && (
              roleRequests.filter(r => r.status === 'pending').length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="time-outline" size={48} color="#9CA3AF" />
                  <Text style={styles.emptyText}>No pending role requests</Text>
                </View>
              ) : (
                roleRequests.filter(r => r.status === 'pending').map((request) => (
                  <View key={request.id} style={styles.userCard}>
                    <View style={styles.userInfo}>
                      <Text style={styles.userName}>{request.userName}</Text>
                      <Text style={styles.userEmail}>{request.userEmail}</Text>
                      <Text style={styles.userRole}>Requested Role: {request.requestedRole}</Text>
                      <Text style={styles.userDate}>
                        Requested: {convertTimestamp(request.requestedAt)}
                      </Text>
                    </View>
                    <View style={styles.userActions}>
                      <TouchableOpacity
                        style={[styles.actionButton, styles.approveButton]}
                        onPress={() => approveRoleRequest(request)}
                      >
                        <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                        <Text style={styles.actionButtonText}>Approve</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.actionButton, styles.rejectButton]}
                        onPress={() => rejectRoleRequest(request)}
                      >
                        <Ionicons name="close" size={16} color="#FFFFFF" />
                        <Text style={styles.actionButtonText}>Reject</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )
            )}

            {/* All Users Tab */}
            {activeTab === 'users' && (
              allUsers.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="people-outline" size={48} color="#9CA3AF" />
                  <Text style={styles.emptyText}>No users found</Text>
                </View>
              ) : (
                allUsers.map((user) => (
                  <View key={user.uid} style={styles.userCard}>
                    <View style={styles.userInfo}>
                      <Text style={styles.userName}>{user.name}</Text>
                      <Text style={styles.userEmail}>{user.email}</Text>
                      <Text style={styles.userRole}>Role: {user.role || 'No role assigned'}</Text>
                      <View style={styles.statusContainer}>
                        <View style={[
                          styles.statusBadge,
                          {
                            backgroundColor:
                              user.status === 'approved' ? '#10B981' :
                              user.status === 'pending' ? '#F59E0B' : '#EF4444'
                          }
                        ]}>
                          <Text style={styles.statusText}>{user.status}</Text>
                        </View>
                      </View>
                    </View>
                    <View style={styles.userActions}>
                      {user.role === 'driver' && user.status === 'approved' && (
                        <TouchableOpacity
                          style={[styles.actionButton, { backgroundColor: '#8B5CF6' }]}
                          onPress={() => {
                            setSelectedDriver(user);
                            setAssignModalVisible(true);
                          }}
                        >
                          <Ionicons name="person-add" size={16} color="#FFFFFF" />
                          <Text style={styles.actionButtonText}>Assign to ZI</Text>
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity
                        style={styles.editButton}
                        onPress={() => openEditModal(user)}
                      >
                        <Ionicons name="create" size={20} color="#3B82F6" />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )
            )}

            {/* Driver Assignments Tab */}
            {activeTab === 'assignments' && (
              driverAssignments.filter(a => a.status === 'active').length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="car-outline" size={48} color="#9CA3AF" />
                  <Text style={styles.emptyText}>No driver assignments</Text>
                </View>
              ) : (
                driverAssignments.filter(a => a.status === 'active').map((assignment) => (
                  <View key={assignment.id} style={styles.userCard}>
                    <View style={styles.userInfo}>
                      <Text style={styles.userName}>Driver: {assignment.driverName}</Text>
                      <Text style={styles.userEmail}>{assignment.driverEmail}</Text>
                      <Text style={styles.userRole}>Assigned to ZI: {assignment.ziName}</Text>
                      <Text style={styles.userDate}>
                        Assigned: {convertTimestamp(assignment.assignedAt)}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.rejectButton]}
                      onPress={() => removeDriverAssignment(assignment.id)}
                    >
                      <Ionicons name="close" size={16} color="#FFFFFF" />
                      <Text style={styles.actionButtonText}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                ))
              )
            )}
          </View>
        )}
      </View>

      {/* Recent Activities */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Activities</Text>
        <View style={styles.activitiesContainer}>
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

      {/* System Health */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>System Health</Text>
        <View style={styles.healthContainer}>
          <View style={styles.healthItem}>
            <Text style={styles.healthLabel}>Server Status</Text>
            <View style={[styles.healthBadge, { backgroundColor: '#10B981' }]}>
              <Text style={styles.healthBadgeText}>Online</Text>
            </View>
          </View>
          <View style={styles.healthItem}>
            <Text style={styles.healthLabel}>Database</Text>
            <View style={[styles.healthBadge, { backgroundColor: '#10B981' }]}>
              <Text style={styles.healthBadgeText}>Healthy</Text>
            </View>
          </View>
          <View style={styles.healthItem}>
            <Text style={styles.healthLabel}>API Response</Text>
            <View style={[styles.healthBadge, { backgroundColor: '#F59E0B' }]}>
              <Text style={styles.healthBadgeText}>125ms</Text>
            </View>
          </View>
          <View style={styles.healthItem}>
            <Text style={styles.healthLabel}>Active Users</Text>
            <Text style={styles.healthValue}>342</Text>
          </View>
        </View>
      </View>

      {/* Edit User Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit User Role</Text>
            {selectedUser && (
              <View>
                <Text style={styles.modalUserName}>{selectedUser.name}</Text>
                <Text style={styles.modalUserEmail}>{selectedUser.email}</Text>

                <Text style={styles.modalLabel}>Select New Role:</Text>
                <View style={styles.modalPickerContainer}>
                  <Picker
                    selectedValue={editRole}
                    onValueChange={(value) => setEditRole(value)}
                    style={styles.modalPicker}
                  >
                    <Picker.Item label="Zone Incharge" value="zi" />
                    <Picker.Item label="HR Manager" value="hr" />
                    <Picker.Item label="Contractor" value="contractor" />
                    <Picker.Item label="Driver" value="driver" />
                    <Picker.Item label="Admin" value="admin" />
                  </Picker>
                </View>

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.cancelButton]}
                    onPress={() => setModalVisible(false)}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.saveButton]}
                    onPress={() => updateUserRole(selectedUser, editRole)}
                  >
                    <Text style={styles.saveButtonText}>Save</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Driver Assignment Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={assignModalVisible}
        onRequestClose={() => setAssignModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Assign Driver to ZI</Text>
            {selectedDriver && (
              <View>
                <Text style={styles.modalUserName}>Driver: {selectedDriver.name}</Text>
                <Text style={styles.modalUserEmail}>{selectedDriver.email}</Text>

                <Text style={styles.modalLabel}>Select ZI to assign:</Text>
                <View style={styles.modalPickerContainer}>
                  <Picker
                    selectedValue={selectedZI}
                    onValueChange={(value) => setSelectedZI(value)}
                    style={styles.modalPicker}
                  >
                    <Picker.Item label="Select a ZI..." value="" />
                    {availableZIs.map((zi) => (
                      <Picker.Item
                        key={zi.uid}
                        label={`${zi.name} (${zi.email})`}
                        value={zi.uid}
                      />
                    ))}
                  </Picker>
                </View>

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.cancelButton]}
                    onPress={() => {
                      setAssignModalVisible(false);
                      setSelectedDriver(null);
                      setSelectedZI('');
                    }}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.saveButton]}
                    onPress={() => {
                      if (selectedZI && selectedDriver) {
                        assignDriverToZI(selectedDriver.uid, selectedZI);
                      } else {
                        Alert.alert('Error', 'Please select a ZI');
                      }
                    }}
                    disabled={!selectedZI}
                  >
                    <Text style={styles.saveButtonText}>Assign</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>
      </ScrollView>
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
    marginBottom: 8,
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
    color: '#EF4444',
    marginTop: 2,
    fontWeight: '600',
  },
  logoutButton: {
    padding: 8,
  },
  lastUpdated: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  content: {
    flex: 1,
  },
  statsContainer: {
    padding: 20,
    gap: 16,
  },
  statCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  statInfo: {
    flex: 1,
  },
  statName: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  statChange: {
    fontSize: 12,
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
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionCard: {
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
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  actionName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
    textAlign: 'center',
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
  healthContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  healthItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  healthLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  healthBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  healthBadgeText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  healthValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 4,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tabText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#3B82F6',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 8,
    fontSize: 14,
    color: '#6B7280',
  },
  usersContainer: {
    gap: 12,
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#6B7280',
    paddingVertical: 40,
  },
  userCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  userRole: {
    fontSize: 14,
    color: '#3B82F6',
    marginBottom: 4,
  },
  userDate: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  statusContainer: {
    marginTop: 4,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  userActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  approveButton: {
    backgroundColor: '#10B981',
  },
  rejectButton: {
    backgroundColor: '#EF4444',
  },
  actionButtonText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  editButton: {
    padding: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalUserName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  modalUserEmail: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
  },
  modalLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  modalPickerContainer: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    marginBottom: 24,
  },
  modalPicker: {
    height: 50,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#F3F4F6',
  },
  saveButton: {
    backgroundColor: '#3B82F6',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#6B7280',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  // Waste Collection Styles
  wasteCollectionsList: {
    gap: 12,
  },
  wasteCollectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  wasteCollectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  driverInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  driverDetails: {
    marginLeft: 8,
  },
  driverName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  driverRole: {
    fontSize: 10,
    color: '#6B7280',
    marginTop: 2,
  },
  wasteAmount: {
    alignItems: 'center',
  },
  wasteValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#059669',
  },
  wasteLabel: {
    fontSize: 10,
    color: '#6B7280',
  },
  wasteCollectionDetails: {
    gap: 4,
  },
  wasteLocation: {
    fontSize: 12,
    color: '#374151',
  },
  wasteTime: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  // Driver Status Styles
  driverStatusList: {
    gap: 12,
  },
  driverStatusCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  driverStatusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
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
  driverStatusDetails: {
    gap: 4,
  },
  statusDetail: {
    fontSize: 12,
    color: '#374151',
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
});

export default AdminDashboard;
