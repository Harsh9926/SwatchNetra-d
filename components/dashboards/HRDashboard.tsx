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

const HRDashboard: React.FC = () => {
  const { userData, logout } = useAuth();

  const hrStats = [
    { name: 'Total Employees', value: '247', icon: 'people', change: '+12' },
    { name: 'New Hires (Month)', value: '8', icon: 'person-add', change: '+3' },
    { name: 'Attendance Rate', value: '94%', icon: 'checkmark-circle', change: '+2%' },
    { name: 'Pending Requests', value: '15', icon: 'document-text', change: '-5' },
  ];

  const pendingRequests = [
    { id: 1, type: 'Leave Request', employee: 'Rajesh Kumar', date: '2024-01-15', status: 'pending' },
    { id: 2, type: 'Hiring Request', department: 'Operations', position: 'Driver', status: 'review' },
    { id: 3, type: 'Transfer Request', employee: 'Priya Sharma', from: 'Zone A', to: 'Zone B', status: 'pending' },
  ];

  const recentHires = [
    { name: 'Suresh Gupta', position: 'Driver', department: 'Operations', joinDate: '2024-01-10' },
    { name: 'Meera Singh', position: 'Zone Supervisor', department: 'Management', joinDate: '2024-01-08' },
    { name: 'Ravi Kumar', position: 'Mechanic', department: 'Maintenance', joinDate: '2024-01-05' },
  ];

  const attendanceOverview = [
    { department: 'Operations', present: 45, total: 50, rate: 90 },
    { department: 'Management', present: 18, total: 20, rate: 90 },
    { department: 'Maintenance', present: 12, total: 15, rate: 80 },
    { department: 'Administration', present: 8, total: 10, rate: 80 },
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
            <Text style={styles.userRole}>HR Manager</Text>
          </View>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={24} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* HR Stats */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>HR Overview</Text>
          <View style={styles.statsGrid}>
            {hrStats.map((stat, index) => (
              <View key={index} style={styles.statCard}>
                <View style={styles.statIcon}>
                  <Ionicons name={stat.icon as any} size={24} color="#8B5CF6" />
                </View>
                <Text style={styles.statValue}>{stat.value}</Text>
                <Text style={styles.statName}>{stat.name}</Text>
                <Text style={styles.statChange}>{stat.change} this month</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Pending Requests */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pending Requests</Text>
          <View style={styles.requestsContainer}>
            {pendingRequests.map((request) => (
              <View key={request.id} style={styles.requestCard}>
                <View style={styles.requestInfo}>
                  <Text style={styles.requestType}>{request.type}</Text>
                  <Text style={styles.requestDetails}>
                    {request.employee || request.department}
                    {request.date && ` • ${request.date}`}
                    {request.position && ` • ${request.position}`}
                  </Text>
                </View>
                <View style={styles.requestActions}>
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

        {/* Recent Hires */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Hires</Text>
          <View style={styles.hiresContainer}>
            {recentHires.map((hire, index) => (
              <View key={index} style={styles.hireCard}>
                <View style={styles.hireInfo}>
                  <Text style={styles.hireName}>{hire.name}</Text>
                  <Text style={styles.hirePosition}>{hire.position} • {hire.department}</Text>
                </View>
                <Text style={styles.hireDate}>{hire.joinDate}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Attendance Overview */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Today's Attendance</Text>
          <View style={styles.attendanceContainer}>
            {attendanceOverview.map((dept, index) => (
              <View key={index} style={styles.attendanceCard}>
                <Text style={styles.deptName}>{dept.department}</Text>
                <View style={styles.attendanceStats}>
                  <Text style={styles.attendanceNumbers}>{dept.present}/{dept.total}</Text>
                  <Text style={[
                    styles.attendanceRate,
                    {
                      color: dept.rate >= 90 ? '#10B981' : 
                            dept.rate >= 80 ? '#F59E0B' : '#EF4444'
                    }
                  ]}>
                    {dept.rate}%
                  </Text>
                </View>
                <View style={styles.progressBar}>
                  <View 
                    style={[
                      styles.progressFill,
                      {
                        width: `${dept.rate}%`,
                        backgroundColor: dept.rate >= 90 ? '#10B981' : 
                                       dept.rate >= 80 ? '#F59E0B' : '#EF4444'
                      }
                    ]}
                  />
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
              <Ionicons name="person-add" size={32} color="#8B5CF6" />
              <Text style={styles.actionText}>Add Employee</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionCard}>
              <Ionicons name="time" size={32} color="#10B981" />
              <Text style={styles.actionText}>Attendance Report</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionCard}>
              <Ionicons name="document-text" size={32} color="#3B82F6" />
              <Text style={styles.actionText}>Generate Report</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionCard}>
              <Ionicons name="calendar" size={32} color="#F59E0B" />
              <Text style={styles.actionText}>Schedule Review</Text>
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
    color: '#8B5CF6',
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
    backgroundColor: '#F3E8FF',
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
    marginBottom: 4,
  },
  statChange: {
    fontSize: 10,
    color: '#10B981',
    fontWeight: '500',
  },
  requestsContainer: {
    gap: 12,
  },
  requestCard: {
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
  requestInfo: {
    flex: 1,
  },
  requestType: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 4,
  },
  requestDetails: {
    fontSize: 12,
    color: '#6B7280',
  },
  requestActions: {
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
  hiresContainer: {
    gap: 12,
  },
  hireCard: {
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
  hireInfo: {
    flex: 1,
  },
  hireName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 4,
  },
  hirePosition: {
    fontSize: 12,
    color: '#6B7280',
  },
  hireDate: {
    fontSize: 12,
    color: '#8B5CF6',
    fontWeight: '500',
  },
  attendanceContainer: {
    gap: 12,
  },
  attendanceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  deptName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 8,
  },
  attendanceStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  attendanceNumbers: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  attendanceRate: {
    fontSize: 14,
    fontWeight: '600',
  },
  progressBar: {
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
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

export default HRDashboard;
