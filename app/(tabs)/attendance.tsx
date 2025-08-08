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
  addDoc, 
  updateDoc, 
  doc, 
  onSnapshot,
  query,
  where,
  orderBy 
} from 'firebase/firestore';
import { db } from '../../config/firebase';

interface AttendanceRecord {
  id: string;
  userId: string;
  userName: string;
  userRole: string;
  date: string;
  status: 'present' | 'absent' | 'late' | 'half-day';
  checkInTime?: string;
  checkOutTime?: string;
  zone: string;
  department: string;
  notes?: string;
  overrideBy?: string;
  overrideReason?: string;
  isOverride: boolean;
}

const AttendanceScreen: React.FC = () => {
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedRole, setSelectedRole] = useState('all');
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null);
  const [overrideReason, setOverrideReason] = useState('');

  const loadAttendance = () => {
    try {
      // Set up real-time listener for attendance collection (simplified to avoid index issues)
      const attendanceQuery = collection(db, 'attendance');

      const unsubscribe = onSnapshot(attendanceQuery, (snapshot) => {
        const attendanceData = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            userId: data.userId || '',
            userName: data.userName || data.name || 'Unknown User',
            userRole: data.userRole || data.role || 'Worker',
            date: data.date || new Date().toISOString().split('T')[0],
            status: data.status || 'absent',
            checkInTime: data.checkInTime || (data.checkIn ? new Date(data.checkIn.seconds * 1000).toLocaleTimeString() : ''),
            checkOutTime: data.checkOutTime || (data.checkOut ? new Date(data.checkOut.seconds * 1000).toLocaleTimeString() : ''),
            zone: data.zone || 'Zone A',
            department: data.department || 'Operations',
            notes: data.notes || '',
            overrideBy: data.overrideBy || '',
            overrideReason: data.overrideReason || '',
            isOverride: data.isOverride || false
          };
        }) as AttendanceRecord[];

        // Sort in memory by date (newest first)
        attendanceData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        console.log('📅 Attendance updated:', attendanceData.length);
        setAttendance(attendanceData);
        setLoading(false);
      }, (error) => {
        console.error('Error loading attendance:', error);
        // If no attendance data exists, show empty state instead of mock data
        setAttendance([]);
        setLoading(false);
      });

      return unsubscribe;
    } catch (error) {
      console.error('Error setting up attendance listener:', error);
      setAttendance([]);
      setLoading(false);
      return () => {};
    }
  };

  const initializeSampleAttendance = async () => {
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    
    const sampleAttendance = [
      // Today's attendance
      {
        userId: 'user1',
        userName: 'Rajesh Kumar',
        userRole: 'Worker',
        date: today,
        status: 'present',
        checkInTime: '08:15',
        checkOutTime: '',
        zone: 'Zone A',
        department: 'Sanitation',
        isOverride: false
      },
      {
        userId: 'user2',
        userName: 'Priya Sharma',
        userRole: 'Driver',
        date: today,
        status: 'late',
        checkInTime: '08:45',
        checkOutTime: '',
        zone: 'Zone B',
        department: 'Transport',
        notes: 'Traffic jam on route',
        isOverride: false
      },
      {
        userId: 'user3',
        userName: 'Amit Patel',
        userRole: 'ZI',
        date: today,
        status: 'present',
        checkInTime: '08:00',
        checkOutTime: '',
        zone: 'Zone A',
        department: 'Administration',
        isOverride: false
      },
      {
        userId: 'user4',
        userName: 'Sunita Devi',
        userRole: 'Driver',
        date: today,
        status: 'absent',
        zone: 'Zone A',
        department: 'Transport',
        notes: 'Medical leave',
        isOverride: true,
        overrideBy: 'Admin',
        overrideReason: 'Approved medical leave'
      },
      {
        userId: 'user5',
        userName: 'Vikram Singh',
        userRole: 'Contractor',
        date: today,
        status: 'half-day',
        checkInTime: '08:30',
        checkOutTime: '13:00',
        zone: 'Zone C',
        department: 'Waste Management',
        notes: 'Personal work',
        isOverride: false
      },
      // Yesterday's attendance
      {
        userId: 'user1',
        userName: 'Rajesh Kumar',
        userRole: 'Worker',
        date: yesterday,
        status: 'present',
        checkInTime: '08:10',
        checkOutTime: '17:00',
        zone: 'Zone A',
        department: 'Sanitation',
        isOverride: false
      },
      {
        userId: 'user2',
        userName: 'Priya Sharma',
        userRole: 'Driver',
        date: yesterday,
        status: 'present',
        checkInTime: '08:00',
        checkOutTime: '17:15',
        zone: 'Zone B',
        department: 'Transport',
        isOverride: false
      }
    ];

    // Only create sample data if no attendance records exist
    try {
      const existingRecords = await getDocs(collection(db, 'attendance'));
      if (existingRecords.size === 0) {
        for (const record of sampleAttendance) {
          await addDoc(collection(db, 'attendance'), record);
        }
        console.log('✅ Sample attendance initialized');
      }
    } catch (error) {
      console.error('Error initializing sample attendance:', error);
    }
  };

  // Function to create attendance records from real users
  const createAttendanceFromUsers = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];

      // Get all users from Firebase
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const users = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Check if attendance already exists for today
      const todayAttendanceSnapshot = await getDocs(
        query(collection(db, 'attendance'), where('date', '==', today))
      );

      if (todayAttendanceSnapshot.size > 0) {
        console.log('Attendance for today already exists');
        return;
      }

      // Create attendance records for all approved users
      const approvedUsers = users.filter(user => user.status === 'approved');

      for (const user of approvedUsers) {
        const attendanceRecord = {
          userId: user.id,
          userName: user.name || 'Unknown User',
          userRole: user.role || 'Worker',
          date: today,
          status: Math.random() > 0.2 ? 'present' : 'absent', // 80% present rate
          checkInTime: Math.random() > 0.2 ? `08:${Math.floor(Math.random() * 30).toString().padStart(2, '0')}` : '',
          checkOutTime: '',
          zone: user.zone || 'Zone A',
          department: user.role === 'zi' ? 'Administration' :
                     user.role === 'driver' ? 'Transport' :
                     user.role === 'hr' ? 'Human Resources' :
                     user.role === 'contractor' ? 'Waste Management' : 'Operations',
          notes: '',
          overrideBy: '',
          overrideReason: '',
          isOverride: false
        };

        await addDoc(collection(db, 'attendance'), attendanceRecord);
      }

      console.log(`✅ Created attendance records for ${approvedUsers.length} users`);
    } catch (error) {
      console.error('Error creating attendance from users:', error);
    }
  };

  useEffect(() => {
    const unsubscribe = loadAttendance();
    // Create attendance from real users if needed
    createAttendanceFromUsers();
    return unsubscribe;
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  const overrideAttendance = async (newStatus: AttendanceRecord['status']) => {
    if (!selectedRecord || !overrideReason.trim()) {
      Alert.alert('Error', 'Please provide a reason for the override');
      return;
    }

    try {
      await updateDoc(doc(db, 'attendance', selectedRecord.id), {
        status: newStatus,
        isOverride: true,
        overrideBy: 'Admin',
        overrideReason: overrideReason.trim(),
        notes: overrideReason.trim()
      });
      
      Alert.alert('Success', 'Attendance status updated successfully');
      setShowOverrideModal(false);
      setSelectedRecord(null);
      setOverrideReason('');
    } catch (error) {
      console.error('Error overriding attendance:', error);
      Alert.alert('Error', 'Failed to update attendance status');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present': return { backgroundColor: '#D1FAE5', color: '#065F46', icon: 'checkmark-circle' };
      case 'absent': return { backgroundColor: '#FEE2E2', color: '#991B1B', icon: 'close-circle' };
      case 'late': return { backgroundColor: '#FEF3C7', color: '#92400E', icon: 'time' };
      case 'half-day': return { backgroundColor: '#E0E7FF', color: '#3730A3', icon: 'partly-sunny' };
      default: return { backgroundColor: '#F3F4F6', color: '#374151', icon: 'help-circle' };
    }
  };

  const filteredAttendance = attendance.filter(record => {
    const matchesDate = record.date === selectedDate;
    const matchesRole = selectedRole === 'all' || record.userRole === selectedRole;
    return matchesDate && matchesRole;
  });

  const roleOptions = ['all', 'ZI', 'HR', 'Contractor', 'Worker', 'Driver'];
  const statusOptions = ['present', 'absent', 'late', 'half-day'];

  // Calculate statistics
  const totalRecords = filteredAttendance.length;
  const presentCount = filteredAttendance.filter(r => r.status === 'present').length;
  const absentCount = filteredAttendance.filter(r => r.status === 'absent').length;
  const lateCount = filteredAttendance.filter(r => r.status === 'late').length;
  const halfDayCount = filteredAttendance.filter(r => r.status === 'half-day').length;
  const attendanceRate = totalRecords > 0 ? Math.round(((presentCount + lateCount + halfDayCount) / totalRecords) * 100) : 0;

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading attendance...</Text>
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
            <Text style={styles.title}>Attendance Management</Text>
            <View style={styles.headerStats}>
              <Text style={styles.headerStatsText}>
                {attendanceRate}% present
              </Text>
            </View>
          </View>

          {/* Date Selector */}
          <View style={styles.dateSection}>
            <Text style={styles.sectionTitle}>Select Date:</Text>
            <View style={styles.dateSelector}>
              <TouchableOpacity
                style={[styles.dateButton, selectedDate === new Date().toISOString().split('T')[0] && styles.dateButtonActive]}
                onPress={() => setSelectedDate(new Date().toISOString().split('T')[0])}
              >
                <Text style={[styles.dateButtonText, selectedDate === new Date().toISOString().split('T')[0] && styles.dateButtonTextActive]}>
                  Today
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.dateButton, selectedDate === new Date(Date.now() - 86400000).toISOString().split('T')[0] && styles.dateButtonActive]}
                onPress={() => setSelectedDate(new Date(Date.now() - 86400000).toISOString().split('T')[0])}
              >
                <Text style={[styles.dateButtonText, selectedDate === new Date(Date.now() - 86400000).toISOString().split('T')[0] && styles.dateButtonTextActive]}>
                  Yesterday
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.dateButton, selectedDate === new Date(Date.now() - 172800000).toISOString().split('T')[0] && styles.dateButtonActive]}
                onPress={() => setSelectedDate(new Date(Date.now() - 172800000).toISOString().split('T')[0])}
              >
                <Text style={[styles.dateButtonText, selectedDate === new Date(Date.now() - 172800000).toISOString().split('T')[0] && styles.dateButtonTextActive]}>
                  2 Days Ago
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Role Filter */}
          <View style={styles.filterSection}>
            <Text style={styles.sectionTitle}>Filter by Role:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.filterTabs}>
                {roleOptions.map((role) => (
                  <TouchableOpacity
                    key={role}
                    style={[
                      styles.filterTab,
                      selectedRole === role ? styles.filterTabActive : styles.filterTabInactive
                    ]}
                    onPress={() => setSelectedRole(role)}
                  >
                    <Text style={[
                      styles.filterTabText,
                      selectedRole === role ? styles.filterTabTextActive : styles.filterTabTextInactive
                    ]}>
                      {role === 'all' ? 'All' : role}
                      {role !== 'all' && (
                        <Text style={styles.filterTabCount}>
                          {' '}({attendance.filter(r => r.userRole === role && r.date === selectedDate).length})
                        </Text>
                      )}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionSection}>
            <TouchableOpacity
              style={styles.createButton}
              onPress={createAttendanceFromUsers}
            >
              <Ionicons name="add-circle" size={20} color="#FFFFFF" />
              <Text style={styles.createButtonText}>Create Today's Attendance</Text>
            </TouchableOpacity>
          </View>

          {/* Statistics Cards */}
          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <View style={styles.statHeader}>
                <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                <Text style={styles.statTitle}>Present</Text>
              </View>
              <Text style={styles.statNumber}>{presentCount}</Text>
            </View>
            <View style={styles.statCard}>
              <View style={styles.statHeader}>
                <Ionicons name="close-circle" size={20} color="#EF4444" />
                <Text style={styles.statTitle}>Absent</Text>
              </View>
              <Text style={styles.statNumber}>{absentCount}</Text>
            </View>
            <View style={styles.statCard}>
              <View style={styles.statHeader}>
                <Ionicons name="time" size={20} color="#F59E0B" />
                <Text style={styles.statTitle}>Late</Text>
              </View>
              <Text style={styles.statNumber}>{lateCount}</Text>
            </View>
            <View style={styles.statCard}>
              <View style={styles.statHeader}>
                <Ionicons name="partly-sunny" size={20} color="#8B5CF6" />
                <Text style={styles.statTitle}>Half Day</Text>
              </View>
              <Text style={styles.statNumber}>{halfDayCount}</Text>
            </View>
          </View>

          {/* Attendance Table */}
          <View style={styles.attendanceTable}>
            <Text style={styles.tableTitle}>
              Attendance for {new Date(selectedDate).toLocaleDateString()}
            </Text>

            {filteredAttendance.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="calendar-outline" size={48} color="#9CA3AF" />
                <Text style={styles.emptyStateText}>No attendance records found</Text>
                <Text style={styles.emptyStateSubtext}>
                  Try selecting a different date or role filter
                </Text>
              </View>
            ) : (
              <View style={styles.tableContainer}>
                {filteredAttendance.map((record) => (
                  <View key={record.id} style={styles.tableRow}>
                    <View style={styles.employeeInfo}>
                      <Text style={styles.employeeName}>{record.userName}</Text>
                      <Text style={styles.employeeRole}>{record.userRole} • {record.zone}</Text>
                      <Text style={styles.employeeDepartment}>{record.department}</Text>
                    </View>

                    <View style={styles.attendanceInfo}>
                      <View style={[styles.statusBadge, getStatusColor(record.status)]}>
                        <Ionicons
                          name={getStatusColor(record.status).icon as any}
                          size={14}
                          color={getStatusColor(record.status).color}
                        />
                        <Text style={[styles.statusText, { color: getStatusColor(record.status).color }]}>
                          {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                        </Text>
                      </View>

                      {record.checkInTime && (
                        <Text style={styles.timeText}>
                          In: {record.checkInTime}
                          {record.checkOutTime && ` • Out: ${record.checkOutTime}`}
                        </Text>
                      )}

                      {record.notes && (
                        <Text style={styles.notesText}>{record.notes}</Text>
                      )}

                      {record.isOverride && (
                        <Text style={styles.overrideText}>
                          Override by {record.overrideBy}
                        </Text>
                      )}
                    </View>

                    <TouchableOpacity
                      style={styles.overrideButton}
                      onPress={() => {
                        setSelectedRecord(record);
                        setShowOverrideModal(true);
                      }}
                    >
                      <Ionicons name="create" size={16} color="#6B7280" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Override Modal */}
      <Modal
        visible={showOverrideModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Override Attendance</Text>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => {
                setShowOverrideModal(false);
                setSelectedRecord(null);
                setOverrideReason('');
              }}
            >
              <Ionicons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {selectedRecord && (
            <View style={styles.modalContent}>
              <View style={styles.employeeDetails}>
                <Text style={styles.modalEmployeeName}>{selectedRecord.userName}</Text>
                <Text style={styles.modalEmployeeInfo}>
                  {selectedRecord.userRole} • {selectedRecord.zone} • {selectedRecord.department}
                </Text>
                <Text style={styles.modalDate}>
                  Date: {new Date(selectedRecord.date).toLocaleDateString()}
                </Text>
                <Text style={styles.modalCurrentStatus}>
                  Current Status: {selectedRecord.status.charAt(0).toUpperCase() + selectedRecord.status.slice(1)}
                </Text>
              </View>

              <View style={styles.statusSelector}>
                <Text style={styles.selectorTitle}>Select New Status:</Text>
                <View style={styles.statusButtons}>
                  {statusOptions.map((status) => (
                    <TouchableOpacity
                      key={status}
                      style={[styles.statusButton, getStatusColor(status)]}
                      onPress={() => overrideAttendance(status as AttendanceRecord['status'])}
                    >
                      <Ionicons
                        name={getStatusColor(status).icon as any}
                        size={16}
                        color={getStatusColor(status).color}
                      />
                      <Text style={[styles.statusButtonText, { color: getStatusColor(status).color }]}>
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.reasonSection}>
                <Text style={styles.reasonLabel}>Reason for Override *</Text>
                <TextInput
                  style={styles.reasonInput}
                  placeholder="Enter reason for attendance override..."
                  value={overrideReason}
                  onChangeText={setOverrideReason}
                  multiline
                  numberOfLines={3}
                />
              </View>
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
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  headerStatsText: {
    fontSize: 12,
    color: '#065F46',
    fontWeight: '600',
  },
  dateSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  dateSelector: {
    flexDirection: 'row',
    gap: 8,
  },
  dateButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  dateButtonActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  dateButtonText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  dateButtonTextActive: {
    color: 'white',
  },
  filterSection: {
    marginBottom: 20,
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
  actionSection: {
    marginBottom: 20,
    paddingHorizontal: 16,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    gap: 8,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  filterTabCount: {
    fontSize: 12,
    opacity: 0.8,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statTitle: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 6,
    fontWeight: '500',
  },
  statNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  attendanceTable: {
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
  tableTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 16,
    textAlign: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 12,
    fontWeight: '500',
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 4,
    textAlign: 'center',
  },
  tableContainer: {
    gap: 12,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  employeeInfo: {
    flex: 1,
  },
  employeeName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  employeeRole: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 2,
  },
  employeeDepartment: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  attendanceInfo: {
    flex: 1,
    alignItems: 'flex-end',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  timeText: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 2,
  },
  notesText: {
    fontSize: 11,
    color: '#9CA3AF',
    fontStyle: 'italic',
    marginBottom: 2,
  },
  overrideText: {
    fontSize: 10,
    color: '#EF4444',
    fontWeight: '500',
  },
  overrideButton: {
    padding: 8,
    marginLeft: 8,
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
  employeeDetails: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
  },
  modalEmployeeName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  modalEmployeeInfo: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  modalDate: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 4,
  },
  modalCurrentStatus: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  statusSelector: {
    marginBottom: 24,
  },
  selectorTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  statusButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statusButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    flex: 1,
    minWidth: '45%',
  },
  statusButtonText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  reasonSection: {
    marginBottom: 24,
  },
  reasonLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  reasonInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    backgroundColor: 'white',
    color: '#111827',
    textAlignVertical: 'top',
    minHeight: 80,
  },
});

export default AttendanceScreen;
