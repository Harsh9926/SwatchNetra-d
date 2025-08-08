import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  doc, 
  updateDoc, 
  deleteDoc,
  orderBy 
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { UserRole } from '../../contexts/AuthContext';

interface RoleRequest {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  requestedRole: UserRole;
  status: 'pending' | 'approved' | 'rejected';
  requestedAt: Date;
  adminEmail: string;
}

const RoleRequestsManager: React.FC = () => {
  const [roleRequests, setRoleRequests] = useState<RoleRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadRoleRequests();
  }, []);

  const loadRoleRequests = () => {
    try {
      // Set up real-time listener for role requests
      const requestsQuery = query(
        collection(db, 'roleRequests'),
        where('adminEmail', '==', 'harsh@gmail.com'),
        orderBy('requestedAt', 'desc')
      );

      const unsubscribe = onSnapshot(requestsQuery, (snapshot) => {
        const requestsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          requestedAt: doc.data().requestedAt?.toDate() || new Date()
        })) as RoleRequest[];

        console.log('📋 Role requests updated:', requestsData.length);
        setRoleRequests(requestsData);
        setLoading(false);
      }, (error) => {
        console.error('Error loading role requests:', error);
        setLoading(false);
      });

      return unsubscribe;
    } catch (error) {
      console.error('Error setting up role requests listener:', error);
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  const approveRoleRequest = async (request: RoleRequest, assignedRole?: UserRole) => {
    try {
      const finalRole = assignedRole || request.requestedRole;
      
      // Update user document with approved status and assigned role
      await updateDoc(doc(db, 'users', request.userId), {
        role: finalRole,
        status: 'approved'
      });

      // Update role request status
      await updateDoc(doc(db, 'roleRequests', request.id), {
        status: 'approved',
        approvedAt: new Date(),
        assignedRole: finalRole
      });

      Alert.alert(
        'Request Approved!', 
        `${request.userName} has been approved as ${finalRole}. They can now login and access their dashboard.`
      );
    } catch (error) {
      console.error('Error approving role request:', error);
      Alert.alert('Error', 'Failed to approve role request');
    }
  };

  const rejectRoleRequest = async (request: RoleRequest) => {
    Alert.alert(
      'Reject Role Request',
      `Are you sure you want to reject ${request.userName}'s request for ${request.requestedRole} role?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            try {
              // Update user document with rejected status
              await updateDoc(doc(db, 'users', request.userId), {
                status: 'rejected'
              });

              // Update role request status
              await updateDoc(doc(db, 'roleRequests', request.id), {
                status: 'rejected',
                rejectedAt: new Date()
              });

              Alert.alert('Request Rejected', `${request.userName}'s role request has been rejected.`);
            } catch (error) {
              console.error('Error rejecting role request:', error);
              Alert.alert('Error', 'Failed to reject role request');
            }
          }
        }
      ]
    );
  };

  const showRoleOptions = (request: RoleRequest) => {
    const roles: UserRole[] = ['zi', 'hr', 'contractor', 'driver'];
    
    Alert.alert(
      'Assign Role',
      `Choose a role for ${request.userName}:`,
      [
        ...roles.map(role => ({
          text: role.toUpperCase(),
          onPress: () => approveRoleRequest(request, role)
        })),
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const getRoleBadgeColor = (role: UserRole) => {
    switch (role) {
      case 'zi': return { backgroundColor: '#FEF3C7', color: '#92400E' };
      case 'hr': return { backgroundColor: '#DBEAFE', color: '#1E40AF' };
      case 'contractor': return { backgroundColor: '#F3E8FF', color: '#7C3AED' };
      case 'driver': return { backgroundColor: '#FEE2E2', color: '#991B1B' };
      default: return { backgroundColor: '#F3F4F6', color: '#374151' };
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#F59E0B';
      case 'approved': return '#10B981';
      case 'rejected': return '#EF4444';
      default: return '#6B7280';
    }
  };

  const pendingRequests = roleRequests.filter(req => req.status === 'pending');
  const processedRequests = roleRequests.filter(req => req.status !== 'pending');

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading role requests...</Text>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Pending Requests */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          Pending Role Requests ({pendingRequests.length})
        </Text>
        
        {pendingRequests.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="checkmark-circle" size={48} color="#10B981" />
            <Text style={styles.emptyStateText}>No pending role requests</Text>
            <Text style={styles.emptyStateSubtext}>All requests have been processed</Text>
          </View>
        ) : (
          <View style={styles.requestsList}>
            {pendingRequests.map((request) => (
              <View key={request.id} style={styles.requestCard}>
                <View style={styles.requestHeader}>
                  <View style={styles.userInfo}>
                    <Text style={styles.userName}>{request.userName}</Text>
                    <Text style={styles.userEmail}>{request.userEmail}</Text>
                  </View>
                  <View style={[styles.roleBadge, getRoleBadgeColor(request.requestedRole)]}>
                    <Text style={[styles.roleBadgeText, { color: getRoleBadgeColor(request.requestedRole).color }]}>
                      {request.requestedRole.toUpperCase()}
                    </Text>
                  </View>
                </View>

                <View style={styles.requestMeta}>
                  <Text style={styles.requestTime}>
                    Requested: {request.requestedAt.toLocaleDateString()} at {request.requestedAt.toLocaleTimeString()}
                  </Text>
                </View>

                <View style={styles.requestActions}>
                  <TouchableOpacity
                    style={styles.approveButton}
                    onPress={() => approveRoleRequest(request)}
                  >
                    <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                    <Text style={styles.approveButtonText}>Approve as {request.requestedRole.toUpperCase()}</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={styles.assignButton}
                    onPress={() => showRoleOptions(request)}
                  >
                    <Ionicons name="options" size={16} color="#3B82F6" />
                    <Text style={styles.assignButtonText}>Assign Different Role</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={styles.rejectButton}
                    onPress={() => rejectRoleRequest(request)}
                  >
                    <Ionicons name="close" size={16} color="#FFFFFF" />
                    <Text style={styles.rejectButtonText}>Reject</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Processed Requests */}
      {processedRequests.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Recent Processed Requests ({processedRequests.length})
          </Text>
          <View style={styles.requestsList}>
            {processedRequests.slice(0, 10).map((request) => (
              <View key={request.id} style={[styles.requestCard, styles.processedCard]}>
                <View style={styles.requestHeader}>
                  <View style={styles.userInfo}>
                    <Text style={styles.userName}>{request.userName}</Text>
                    <Text style={styles.userEmail}>{request.userEmail}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(request.status) }]}>
                    <Text style={styles.statusBadgeText}>{request.status.toUpperCase()}</Text>
                  </View>
                </View>
                <View style={styles.requestMeta}>
                  <Text style={styles.requestTime}>
                    Requested: {request.requestedRole.toUpperCase()} • {request.requestedAt.toLocaleDateString()}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      )}
    </ScrollView>
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
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
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
  },
  requestsList: {
    gap: 12,
  },
  requestCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
  },
  processedCard: {
    borderLeftColor: '#6B7280',
    opacity: 0.8,
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 14,
    color: '#6B7280',
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  roleBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  requestMeta: {
    marginBottom: 12,
  },
  requestTime: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  requestActions: {
    gap: 8,
  },
  approveButton: {
    backgroundColor: '#10B981',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  approveButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  assignButton: {
    backgroundColor: '#EBF4FF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  assignButtonText: {
    color: '#3B82F6',
    fontSize: 14,
    fontWeight: '500',
  },
  rejectButton: {
    backgroundColor: '#EF4444',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  rejectButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
});

export default RoleRequestsManager;
