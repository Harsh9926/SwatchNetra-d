import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  StyleSheet,
  Modal,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { 
  collection, 
  getDocs, 
  updateDoc, 
  deleteDoc,
  doc, 
  onSnapshot,
  query,
  where,
  orderBy,
  addDoc
} from 'firebase/firestore';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { auth, db } from '../../config/firebase';

interface RegistrationRequest {
  id: string;
  name: string;
  email: string;
  requestedRole: string;
  phone: string;
  requestedZone: string;
  status: 'pending' | 'approved' | 'rejected';
  requestDate: string;
  requestedBy: string;
  department: string;
  notes: string;
  processedBy?: string;
  processedDate?: string;
  rejectionReason?: string;
}

const RegistrationRequestsScreen: React.FC = () => {
  const [requests, setRequests] = useState<RegistrationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState('pending');
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<RegistrationRequest | null>(null);

  const loadRequests = () => {
    try {
      const requestsQuery = query(
        collection(db, 'registrationRequests'),
        orderBy('requestDate', 'desc')
      );
      
      const unsubscribe = onSnapshot(requestsQuery, (snapshot) => {
        const requestsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as RegistrationRequest[];
        
        console.log('📋 Registration requests updated:', requestsData.length);
        setRequests(requestsData);
        setLoading(false);
      }, (error) => {
        console.error('Error loading registration requests:', error);
        setLoading(false);
      });

      return unsubscribe;
    } catch (error) {
      console.error('Error setting up requests listener:', error);
      setLoading(false);
      return () => {};
    }
  };

  useEffect(() => {
    const unsubscribe = loadRequests();
    return unsubscribe;
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  const approveRequest = async (request: RegistrationRequest) => {
    try {
      // Create Firebase Auth account
      const tempPassword = 'PMC123456'; // Temporary password
      const userCredential = await createUserWithEmailAndPassword(auth, request.email, tempPassword);
      const user = userCredential.user;
      
      // Update user profile
      await updateProfile(user, {
        displayName: request.name
      });
      
      // Create user document in Firestore
      await addDoc(collection(db, 'users'), {
        name: request.name,
        email: request.email,
        role: request.requestedRole,
        phone: request.phone,
        zone: request.requestedZone,
        status: 'active',
        joinDate: new Date().toISOString().split('T')[0],
        employeeId: `PMC-${Date.now()}`,
        department: request.department,
        createdAt: new Date().toISOString(),
        lastLogin: null,
        approvedBy: 'Admin'
      });
      
      // Update registration request status
      await updateDoc(doc(db, 'registrationRequests', request.id), {
        status: 'approved',
        processedBy: 'Admin',
        processedDate: new Date().toISOString()
      });
      
      Alert.alert('Success', `Registration approved for ${request.name}. Temporary password: ${tempPassword}`);
      setShowDetailModal(false);
    } catch (error: any) {
      console.error('Error approving request:', error);
      Alert.alert('Error', 'Failed to approve registration: ' + error.message);
    }
  };

  const rejectRequest = async (request: RegistrationRequest, reason: string) => {
    try {
      await updateDoc(doc(db, 'registrationRequests', request.id), {
        status: 'rejected',
        processedBy: 'Admin',
        processedDate: new Date().toISOString(),
        rejectionReason: reason
      });
      
      Alert.alert('Success', 'Registration request rejected');
      setShowDetailModal(false);
    } catch (error) {
      console.error('Error rejecting request:', error);
      Alert.alert('Error', 'Failed to reject registration');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return { backgroundColor: '#FEF3C7', color: '#92400E' };
      case 'approved': return { backgroundColor: '#D1FAE5', color: '#065F46' };
      case 'rejected': return { backgroundColor: '#FEE2E2', color: '#991B1B' };
      default: return { backgroundColor: '#F3F4F6', color: '#374151' };
    }
  };

  const filteredRequests = requests.filter(request => 
    selectedStatus === 'all' || request.status === selectedStatus
  );

  const statusOptions = ['pending', 'approved', 'rejected', 'all'];

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading registration requests...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Registration Requests</Text>
            <View style={styles.headerStats}>
              <Text style={styles.headerStatsText}>
                {requests.filter(r => r.status === 'pending').length} pending
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
                      selectedStatus === status ? styles.filterTabActive : styles.filterTabInactive
                    ]}
                    onPress={() => setSelectedStatus(status)}
                  >
                    <Text style={[
                      styles.filterTabText,
                      selectedStatus === status ? styles.filterTabTextActive : styles.filterTabTextInactive
                    ]}>
                      {status === 'all' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1)}
                      {status !== 'all' && (
                        <Text style={styles.filterTabCount}>
                          {' '}({requests.filter(r => r.status === status).length})
                        </Text>
                      )}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>

          {/* Requests List */}
          <View style={styles.requestsList}>
            {filteredRequests.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="document-outline" size={48} color="#9CA3AF" />
                <Text style={styles.emptyStateText}>No registration requests found</Text>
              </View>
            ) : (
              filteredRequests.map((request) => (
                <TouchableOpacity
                  key={request.id}
                  style={styles.requestCard}
                  onPress={() => {
                    setSelectedRequest(request);
                    setShowDetailModal(true);
                  }}
                >
                  <View style={styles.requestHeader}>
                    <View style={styles.requestInfo}>
                      <Text style={styles.requestName}>{request.name}</Text>
                      <Text style={styles.requestEmail}>{request.email}</Text>
                      <Text style={styles.requestRole}>Requested Role: {request.requestedRole}</Text>
                    </View>
                    <View style={[styles.statusBadge, getStatusColor(request.status)]}>
                      <Text style={[styles.statusText, { color: getStatusColor(request.status).color }]}>
                        {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                      </Text>
                    </View>
                  </View>
                  
                  <View style={styles.requestFooter}>
                    <Text style={styles.requestDate}>
                      Requested: {new Date(request.requestDate).toLocaleDateString()}
                    </Text>
                    <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>
        </View>
      </ScrollView>

      {/* Detail Modal */}
      <Modal
        visible={showDetailModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Registration Request</Text>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowDetailModal(false)}
            >
              <Ionicons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {selectedRequest && (
            <ScrollView style={styles.modalContent}>
              <View style={styles.requestDetails}>
                <Text style={styles.detailName}>{selectedRequest.name}</Text>
                <Text style={styles.detailEmail}>{selectedRequest.email}</Text>
                <Text style={styles.detailInfo}>Role: {selectedRequest.requestedRole}</Text>
                <Text style={styles.detailInfo}>Zone: {selectedRequest.requestedZone}</Text>
                <Text style={styles.detailInfo}>Department: {selectedRequest.department}</Text>
                <Text style={styles.detailInfo}>
                  Requested: {new Date(selectedRequest.requestDate).toLocaleDateString()}
                </Text>
                {selectedRequest.notes && (
                  <Text style={styles.detailNotes}>Notes: {selectedRequest.notes}</Text>
                )}
              </View>
            </ScrollView>
          )}

          {selectedRequest && selectedRequest.status === 'pending' && (
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.rejectButton}
                onPress={() => {
                  Alert.prompt(
                    'Reject Request',
                    'Please provide a reason for rejection:',
                    (reason) => {
                      if (reason && reason.trim()) {
                        rejectRequest(selectedRequest, reason.trim());
                      }
                    }
                  );
                }}
              >
                <Text style={styles.rejectButtonText}>Reject</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.approveButton}
                onPress={() => {
                  Alert.alert(
                    'Approve Request',
                    `Approve registration for ${selectedRequest.name}?`,
                    [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Approve', onPress: () => approveRequest(selectedRequest) }
                    ]
                  );
                }}
              >
                <Text style={styles.approveButtonText}>Approve</Text>
              </TouchableOpacity>
            </View>
          )}
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
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  headerStats: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  headerStatsText: {
    fontSize: 12,
    color: '#92400E',
    fontWeight: '600',
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
  requestsList: {
    gap: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 12,
  },
  requestCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  requestInfo: {
    flex: 1,
  },
  requestName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  requestEmail: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  requestRole: {
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
  requestFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  requestDate: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'white',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  modalCloseButton: {
    padding: 4,
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  requestDetails: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 16,
  },
  detailName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  detailEmail: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 12,
  },
  detailInfo: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 4,
  },
  detailNotes: {
    fontSize: 14,
    color: '#6B7280',
    fontStyle: 'italic',
    marginTop: 8,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    gap: 12,
  },
  rejectButton: {
    flex: 1,
    backgroundColor: '#EF4444',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  rejectButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  approveButton: {
    flex: 1,
    backgroundColor: '#10B981',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  approveButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
});

export default RegistrationRequestsScreen;
