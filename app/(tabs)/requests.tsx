import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Modal,
  StyleSheet,
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
  where,
  orderBy,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../../config/firebase';

interface Request {
  id: string;
  type: 'Worker' | 'Driver' | 'Vehicle';
  title: string;
  description: string;
  status: 'pending' | 'approved' | 'rejected' | 'forwarded';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  submittedBy: string;
  submittedDate: string;
  assignedTo?: string;
  zone: string;
  department: string;
  requestData?: any;
  approvedBy?: string;
  approvedDate?: string;
  rejectionReason?: string;
  forwardedTo?: string;
  comments?: string[];
}

const RequestsScreen: React.FC = () => {
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedType, setSelectedType] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null);

  const loadRequests = () => {
    try {
      // Set up real-time listener for requests collection
      const requestsQuery = query(
        collection(db, 'requests'),
        orderBy('submittedDate', 'desc')
      );
      
      const unsubscribe = onSnapshot(requestsQuery, (snapshot) => {
        const requestsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Request[];
        
        console.log('📋 Requests updated:', requestsData.length);
        setRequests(requestsData);
        setLoading(false);
      }, (error) => {
        console.error('Error loading requests:', error);
        initializeSampleRequests();
        setLoading(false);
      });

      return unsubscribe;
    } catch (error) {
      console.error('Error setting up requests listener:', error);
      initializeSampleRequests();
      setLoading(false);
      return () => {};
    }
  };

  const initializeSampleRequests = async () => {
    const sampleRequests = [
      {
        type: 'Worker',
        title: 'Additional Sanitation Worker Request',
        description: 'Need additional worker for Zone A due to increased workload during festival season.',
        status: 'pending',
        priority: 'high',
        submittedBy: 'Amit Patel (ZI)',
        submittedDate: new Date().toISOString(),
        zone: 'Zone A',
        department: 'Sanitation',
        requestData: {
          requiredWorkers: 2,
          duration: '2 weeks',
          skills: 'General cleaning, waste sorting'
        }
      },
      {
        type: 'Driver',
        title: 'Replacement Driver for PMC-002',
        description: 'Current driver on medical leave, need immediate replacement for garbage truck operations.',
        status: 'approved',
        priority: 'urgent',
        submittedBy: 'Sunita Devi (HR)',
        submittedDate: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
        zone: 'Zone B',
        department: 'Transport',
        approvedBy: 'Admin',
        approvedDate: new Date().toISOString(),
        requestData: {
          vehicleNumber: 'PMC-002',
          licenseRequired: 'Heavy Vehicle',
          urgency: 'Immediate'
        }
      },
      {
        type: 'Vehicle',
        title: 'New Compactor Vehicle Request',
        description: 'Request for new compactor vehicle to handle increased waste volume in Zone C.',
        status: 'forwarded',
        priority: 'medium',
        submittedBy: 'Vikram Singh (Contractor)',
        submittedDate: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
        zone: 'Zone C',
        department: 'Waste Management',
        forwardedTo: 'Municipal Commissioner',
        requestData: {
          vehicleType: 'Compactor Truck',
          capacity: '10 tons',
          budget: '₹25,00,000'
        }
      },
      {
        type: 'Worker',
        title: 'Night Shift Cleaning Crew',
        description: 'Request for dedicated night shift cleaning crew for commercial areas.',
        status: 'rejected',
        priority: 'low',
        submittedBy: 'Rajesh Kumar (Worker)',
        submittedDate: new Date(Date.now() - 259200000).toISOString(), // 3 days ago
        zone: 'Zone D',
        department: 'Sanitation',
        rejectionReason: 'Budget constraints for current fiscal year',
        requestData: {
          shiftTiming: '10 PM - 6 AM',
          teamSize: 5,
          areas: 'Commercial complexes, markets'
        }
      }
    ];

    try {
      for (const request of sampleRequests) {
        await addDoc(collection(db, 'requests'), request);
      }
      console.log('✅ Sample requests initialized');
    } catch (error) {
      console.error('Error initializing sample requests:', error);
      setRequests(sampleRequests.map((req, index) => ({ ...req, id: index.toString() })) as Request[]);
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

  const approveRequest = async (requestId: string) => {
    try {
      await updateDoc(doc(db, 'requests', requestId), {
        status: 'approved',
        approvedBy: 'Admin',
        approvedDate: new Date().toISOString()
      });
      Alert.alert('Success', 'Request approved successfully');
      setShowDetailModal(false);
    } catch (error) {
      console.error('Error approving request:', error);
      Alert.alert('Error', 'Failed to approve request');
    }
  };

  const rejectRequest = async (requestId: string, reason: string) => {
    try {
      await updateDoc(doc(db, 'requests', requestId), {
        status: 'rejected',
        rejectionReason: reason,
        approvedBy: 'Admin',
        approvedDate: new Date().toISOString()
      });
      Alert.alert('Success', 'Request rejected');
      setShowDetailModal(false);
    } catch (error) {
      console.error('Error rejecting request:', error);
      Alert.alert('Error', 'Failed to reject request');
    }
  };

  const forwardRequest = async (requestId: string, forwardTo: string) => {
    try {
      await updateDoc(doc(db, 'requests', requestId), {
        status: 'forwarded',
        forwardedTo: forwardTo,
        approvedBy: 'Admin',
        approvedDate: new Date().toISOString()
      });
      Alert.alert('Success', `Request forwarded to ${forwardTo}`);
      setShowDetailModal(false);
    } catch (error) {
      console.error('Error forwarding request:', error);
      Alert.alert('Error', 'Failed to forward request');
    }
  };

  const filteredRequests = requests.filter(request => {
    const matchesType = selectedType === 'all' || request.type === selectedType;
    const matchesStatus = selectedStatus === 'all' || request.status === selectedStatus;
    return matchesType && matchesStatus;
  });

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'Worker': return { backgroundColor: '#DBEAFE', color: '#1E40AF' };
      case 'Driver': return { backgroundColor: '#D1FAE5', color: '#065F46' };
      case 'Vehicle': return { backgroundColor: '#FEF3C7', color: '#92400E' };
      default: return { backgroundColor: '#F3F4F6', color: '#374151' };
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return { backgroundColor: '#FEF3C7', color: '#92400E' };
      case 'approved': return { backgroundColor: '#D1FAE5', color: '#065F46' };
      case 'rejected': return { backgroundColor: '#FEE2E2', color: '#991B1B' };
      case 'forwarded': return { backgroundColor: '#E0E7FF', color: '#3730A3' };
      default: return { backgroundColor: '#F3F4F6', color: '#374151' };
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return { backgroundColor: '#FEE2E2', color: '#991B1B' };
      case 'high': return { backgroundColor: '#FED7AA', color: '#9A3412' };
      case 'medium': return { backgroundColor: '#FEF3C7', color: '#92400E' };
      case 'low': return { backgroundColor: '#D1FAE5', color: '#065F46' };
      default: return { backgroundColor: '#F3F4F6', color: '#374151' };
    }
  };

  const typeOptions = ['all', 'Worker', 'Driver', 'Vehicle'];
  const statusOptions = ['all', 'pending', 'approved', 'rejected', 'forwarded'];

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading requests...</Text>
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
            <Text style={styles.title}>Requests & Approvals</Text>
            <View style={styles.headerStats}>
              <Text style={styles.headerStatsText}>
                {filteredRequests.length} of {requests.length}
              </Text>
            </View>
          </View>

          {/* Filter Tabs */}
          <View style={styles.filterSection}>
            <Text style={styles.filterLabel}>Filter by Type:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.filterTabs}>
                {typeOptions.map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.filterTab,
                      selectedType === type ? styles.filterTabActive : styles.filterTabInactive
                    ]}
                    onPress={() => setSelectedType(type)}
                  >
                    <Text style={[
                      styles.filterTabText,
                      selectedType === type ? styles.filterTabTextActive : styles.filterTabTextInactive
                    ]}>
                      {type === 'all' ? 'All' : type}
                      {type !== 'all' && (
                        <Text style={styles.filterTabCount}>
                          {' '}({requests.filter(r => r.type === type).length})
                        </Text>
                      )}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>

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
            {filteredRequests.map((request) => (
              <TouchableOpacity
                key={request.id}
                style={styles.requestCard}
                onPress={() => {
                  setSelectedRequest(request);
                  setShowDetailModal(true);
                }}
              >
                <View style={styles.requestCardHeader}>
                  <View style={styles.requestInfo}>
                    <Text style={styles.requestTitle}>{request.title}</Text>
                    <Text style={styles.requestSubmitter}>
                      by {request.submittedBy} • {request.zone}
                    </Text>
                  </View>
                  <View style={styles.requestBadges}>
                    <View style={[styles.typeBadge, getTypeColor(request.type)]}>
                      <Text style={[styles.typeBadgeText, { color: getTypeColor(request.type).color }]}>
                        {request.type}
                      </Text>
                    </View>
                    <View style={[styles.priorityBadge, getPriorityColor(request.priority)]}>
                      <Text style={[styles.priorityBadgeText, { color: getPriorityColor(request.priority).color }]}>
                        {request.priority.toUpperCase()}
                      </Text>
                    </View>
                  </View>
                </View>

                <Text style={styles.requestDescription} numberOfLines={2}>
                  {request.description}
                </Text>

                <View style={styles.requestFooter}>
                  <View style={[styles.statusBadge, getStatusColor(request.status)]}>
                    <Text style={[styles.statusBadgeText, { color: getStatusColor(request.status).color }]}>
                      {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                    </Text>
                  </View>
                  <Text style={styles.requestDate}>
                    {new Date(request.submittedDate).toLocaleDateString()}
                  </Text>
                  <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {/* Stats Summary */}
          <View style={styles.statsContainer}>
            <Text style={styles.statsTitle}>Summary</Text>
            <View style={styles.statsGrid}>
              {statusOptions.slice(1).map((status) => (
                <View key={status} style={styles.statCard}>
                  <Text style={[styles.statNumber, { color: getStatusColor(status).color }]}>
                    {requests.filter(r => r.status === status).length}
                  </Text>
                  <Text style={styles.statLabel}>
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Request Detail Modal */}
      <Modal
        visible={showDetailModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Request Details</Text>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowDetailModal(false)}
            >
              <Ionicons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {selectedRequest && (
            <ScrollView style={styles.modalContent}>
              {/* Request Header */}
              <View style={styles.requestDetailHeader}>
                <Text style={styles.requestDetailTitle}>{selectedRequest.title}</Text>
                <View style={styles.requestDetailBadges}>
                  <View style={[styles.typeBadge, getTypeColor(selectedRequest.type)]}>
                    <Text style={[styles.typeBadgeText, { color: getTypeColor(selectedRequest.type).color }]}>
                      {selectedRequest.type}
                    </Text>
                  </View>
                  <View style={[styles.priorityBadge, getPriorityColor(selectedRequest.priority)]}>
                    <Text style={[styles.priorityBadgeText, { color: getPriorityColor(selectedRequest.priority).color }]}>
                      {selectedRequest.priority.toUpperCase()}
                    </Text>
                  </View>
                  <View style={[styles.statusBadge, getStatusColor(selectedRequest.status)]}>
                    <Text style={[styles.statusBadgeText, { color: getStatusColor(selectedRequest.status).color }]}>
                      {selectedRequest.status.charAt(0).toUpperCase() + selectedRequest.status.slice(1)}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Request Info */}
              <View style={styles.requestDetailSection}>
                <Text style={styles.sectionTitle}>Request Information</Text>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Submitted by:</Text>
                  <Text style={styles.infoValue}>{selectedRequest.submittedBy}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Zone:</Text>
                  <Text style={styles.infoValue}>{selectedRequest.zone}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Department:</Text>
                  <Text style={styles.infoValue}>{selectedRequest.department}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Submitted on:</Text>
                  <Text style={styles.infoValue}>
                    {new Date(selectedRequest.submittedDate).toLocaleDateString()} at{' '}
                    {new Date(selectedRequest.submittedDate).toLocaleTimeString()}
                  </Text>
                </View>
              </View>

              {/* Description */}
              <View style={styles.requestDetailSection}>
                <Text style={styles.sectionTitle}>Description</Text>
                <Text style={styles.descriptionText}>{selectedRequest.description}</Text>
              </View>

              {/* Request Data */}
              {selectedRequest.requestData && (
                <View style={styles.requestDetailSection}>
                  <Text style={styles.sectionTitle}>Additional Details</Text>
                  {Object.entries(selectedRequest.requestData).map(([key, value]) => (
                    <View key={key} style={styles.infoRow}>
                      <Text style={styles.infoLabel}>
                        {key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1')}:
                      </Text>
                      <Text style={styles.infoValue}>{String(value)}</Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Status Information */}
              {selectedRequest.status !== 'pending' && (
                <View style={styles.requestDetailSection}>
                  <Text style={styles.sectionTitle}>Status Information</Text>
                  {selectedRequest.approvedBy && (
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Processed by:</Text>
                      <Text style={styles.infoValue}>{selectedRequest.approvedBy}</Text>
                    </View>
                  )}
                  {selectedRequest.approvedDate && (
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Processed on:</Text>
                      <Text style={styles.infoValue}>
                        {new Date(selectedRequest.approvedDate).toLocaleDateString()}
                      </Text>
                    </View>
                  )}
                  {selectedRequest.rejectionReason && (
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Rejection reason:</Text>
                      <Text style={styles.infoValue}>{selectedRequest.rejectionReason}</Text>
                    </View>
                  )}
                  {selectedRequest.forwardedTo && (
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Forwarded to:</Text>
                      <Text style={styles.infoValue}>{selectedRequest.forwardedTo}</Text>
                    </View>
                  )}
                </View>
              )}
            </ScrollView>
          )}

          {/* Action Buttons */}
          {selectedRequest && selectedRequest.status === 'pending' && (
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.rejectButton}
                onPress={() => {
                  Alert.alert(
                    'Reject Request',
                    'Please provide a reason for rejection:',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Budget Constraints',
                        onPress: () => rejectRequest(selectedRequest.id, 'Budget constraints')
                      },
                      {
                        text: 'Policy Violation',
                        onPress: () => rejectRequest(selectedRequest.id, 'Policy violation')
                      },
                      {
                        text: 'Insufficient Information',
                        onPress: () => rejectRequest(selectedRequest.id, 'Insufficient information provided')
                      }
                    ]
                  );
                }}
              >
                <Ionicons name="close-circle" size={20} color="white" />
                <Text style={styles.rejectButtonText}>Reject</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.forwardButton}
                onPress={() => {
                  Alert.alert(
                    'Forward Request',
                    'Forward this request to:',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Municipal Commissioner',
                        onPress: () => forwardRequest(selectedRequest.id, 'Municipal Commissioner')
                      },
                      {
                        text: 'Department Head',
                        onPress: () => forwardRequest(selectedRequest.id, 'Department Head')
                      },
                      {
                        text: 'Finance Department',
                        onPress: () => forwardRequest(selectedRequest.id, 'Finance Department')
                      }
                    ]
                  );
                }}
              >
                <Ionicons name="arrow-forward-circle" size={20} color="white" />
                <Text style={styles.forwardButtonText}>Forward</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.approveButton}
                onPress={() => {
                  Alert.alert(
                    'Approve Request',
                    `Are you sure you want to approve "${selectedRequest.title}"?`,
                    [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Approve',
                        onPress: () => approveRequest(selectedRequest.id)
                      }
                    ]
                  );
                }}
              >
                <Ionicons name="checkmark-circle" size={20} color="white" />
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
    marginBottom: 16,
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
    marginBottom: 24,
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
  requestCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  requestInfo: {
    flex: 1,
    marginRight: 12,
  },
  requestTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  requestSubmitter: {
    fontSize: 14,
    color: '#6B7280',
  },
  requestBadges: {
    gap: 6,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  typeBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  priorityBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  requestDescription: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
    marginBottom: 12,
  },
  requestFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  requestDate: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  statsContainer: {
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
  statsTitle: {
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
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    flex: 1,
    minWidth: 80,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
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
  requestDetailHeader: {
    marginBottom: 24,
  },
  requestDetailTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 12,
  },
  requestDetailBadges: {
    flexDirection: 'row',
    gap: 8,
  },
  requestDetailSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: '#6B7280',
    flex: 1,
    marginRight: 12,
  },
  infoValue: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '500',
    flex: 2,
    textAlign: 'right',
  },
  descriptionText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  rejectButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  forwardButton: {
    flex: 1,
    backgroundColor: '#F59E0B',
    paddingVertical: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  forwardButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  approveButton: {
    flex: 1,
    backgroundColor: '#10B981',
    paddingVertical: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  approveButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
});

export default RequestsScreen;
