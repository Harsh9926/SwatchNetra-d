import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';

const { width } = Dimensions.get('window');

const ContractorDashboard: React.FC = () => {
  const { userData, logout } = useAuth();

  const contractorStats = [
    { name: 'Assigned Workers', value: '25', icon: 'people', status: 'good' },
    { name: 'Present Today', value: '23', icon: 'checkmark-circle', status: 'good' },
    { name: 'Completed Tasks', value: '18', icon: 'checkmark-done', status: 'good' },
    { name: 'Pending Issues', value: '2', icon: 'warning', status: 'warning' },
  ];

  const workers = [
    { id: 1, name: 'Ramesh Yadav', role: 'Sweeper', status: 'present', checkIn: '08:00 AM', location: 'Sector 5' },
    { id: 2, name: 'Sunita Devi', role: 'Cleaner', status: 'present', checkIn: '08:15 AM', location: 'Sector 3' },
    { id: 3, name: 'Mohan Singh', role: 'Driver', status: 'present', checkIn: '07:45 AM', location: 'Route 2' },
    { id: 4, name: 'Kavita Sharma', role: 'Supervisor', status: 'absent', checkIn: '-', location: '-' },
    { id: 5, name: 'Ravi Kumar', role: 'Sweeper', status: 'late', checkIn: '09:30 AM', location: 'Sector 7' },
  ];

  const pendingApprovals = [
    { id: 1, worker: 'Ramesh Yadav', type: 'Overtime', hours: '2 hours', date: '2024-01-14' },
    { id: 2, worker: 'Sunita Devi', type: 'Leave Request', reason: 'Medical', date: '2024-01-16' },
    { id: 3, worker: 'Mohan Singh', type: 'Expense Claim', amount: '₹500', date: '2024-01-13' },
  ];

  const workLogs = [
    { area: 'Sector 5', task: 'Street Cleaning', status: 'completed', worker: 'Ramesh Yadav', time: '2 hours ago' },
    { area: 'Sector 3', task: 'Waste Collection', status: 'in-progress', worker: 'Sunita Devi', time: '1 hour ago' },
    { area: 'Route 2', task: 'Garbage Transport', status: 'completed', worker: 'Mohan Singh', time: '30 min ago' },
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
            <Text style={styles.userRole}>Contractor - Waste Management</Text>
          </View>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={24} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Contractor Stats */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Team Overview</Text>
          <View style={styles.statsGrid}>
            {contractorStats.map((stat, index) => (
              <View key={index} style={styles.statCard}>
                <View style={[
                  styles.statIcon,
                  { backgroundColor: stat.status === 'good' ? '#10B981' : '#F59E0B' }
                ]}>
                  <Ionicons name={stat.icon as any} size={24} color="#FFFFFF" />
                </View>
                <Text style={styles.statValue}>{stat.value}</Text>
                <Text style={styles.statName}>{stat.name}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Worker Status */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Worker Status</Text>
          <View style={styles.workersContainer}>
            {workers.map((worker) => (
              <View key={worker.id} style={styles.workerCard}>
                <View style={styles.workerInfo}>
                  <Text style={styles.workerName}>{worker.name}</Text>
                  <Text style={styles.workerRole}>{worker.role} • {worker.location}</Text>
                  <Text style={styles.workerCheckIn}>Check-in: {worker.checkIn}</Text>
                </View>
                <View style={styles.workerStatus}>
                  <View style={[
                    styles.statusBadge,
                    {
                      backgroundColor:
                        worker.status === 'present' ? '#10B981' :
                        worker.status === 'late' ? '#F59E0B' : '#EF4444'
                    }
                  ]}>
                    <Text style={styles.statusText}>{worker.status}</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Pending Approvals */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pending Approvals</Text>
          <View style={styles.approvalsContainer}>
            {pendingApprovals.map((approval) => (
              <View key={approval.id} style={styles.approvalCard}>
                <View style={styles.approvalInfo}>
                  <Text style={styles.approvalType}>{approval.type}</Text>
                  <Text style={styles.approvalWorker}>{approval.worker}</Text>
                  <Text style={styles.approvalDetails}>
                    {approval.hours || approval.reason || approval.amount} • {approval.date}
                  </Text>
                </View>
                <View style={styles.approvalActions}>
                  <TouchableOpacity style={styles.approveButton}>
                    <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.rejectButton}>
                    <Ionicons name="close" size={16} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Work Logs */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Work Logs</Text>
          <View style={styles.logsContainer}>
            {workLogs.map((log, index) => (
              <View key={index} style={styles.logCard}>
                <View style={styles.logInfo}>
                  <Text style={styles.logArea}>{log.area}</Text>
                  <Text style={styles.logTask}>{log.task}</Text>
                  <Text style={styles.logWorker}>{log.worker} • {log.time}</Text>
                </View>
                <View style={[
                  styles.logStatus,
                  {
                    backgroundColor:
                      log.status === 'completed' ? '#10B981' :
                      log.status === 'in-progress' ? '#3B82F6' : '#F59E0B'
                  }
                ]}>
                  <Text style={styles.logStatusText}>{log.status}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            <TouchableOpacity style={styles.actionCard}>
              <Ionicons name="time" size={32} color="#10B981" />
              <Text style={styles.actionText}>Mark Attendance</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionCard}>
              <Ionicons name="document-text" size={32} color="#3B82F6" />
              <Text style={styles.actionText}>Submit Report</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionCard}>
              <Ionicons name="people" size={32} color="#8B5CF6" />
              <Text style={styles.actionText}>Manage Workers</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionCard}>
              <Ionicons name="calendar" size={32} color="#F59E0B" />
              <Text style={styles.actionText}>Schedule Tasks</Text>
            </TouchableOpacity>
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
    color: '#10B981',
    marginTop: 2,
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
  workersContainer: {
    gap: 12,
  },
  workerCard: {
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
  workerInfo: {
    flex: 1,
  },
  workerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  workerRole: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 2,
  },
  workerCheckIn: {
    fontSize: 12,
    color: '#10B981',
  },
  workerStatus: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  approvalsContainer: {
    gap: 12,
  },
  approvalCard: {
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
  approvalInfo: {
    flex: 1,
  },
  approvalType: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 4,
  },
  approvalWorker: {
    fontSize: 14,
    color: '#3B82F6',
    marginBottom: 2,
  },
  approvalDetails: {
    fontSize: 12,
    color: '#6B7280',
  },
  approvalActions: {
    flexDirection: 'row',
    gap: 8,
  },
  approveButton: {
    backgroundColor: '#10B981',
    borderRadius: 20,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rejectButton: {
    backgroundColor: '#EF4444',
    borderRadius: 20,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logsContainer: {
    gap: 12,
  },
  logCard: {
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
  logInfo: {
    flex: 1,
  },
  logArea: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 4,
  },
  logTask: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 2,
  },
  logWorker: {
    fontSize: 12,
    color: '#10B981',
  },
  logStatus: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  logStatusText: {
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
});

export default ContractorDashboard;
