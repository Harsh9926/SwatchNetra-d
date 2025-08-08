import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  Alert,
  Modal,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import RoleRequestsManager from '../../components/admin/RoleRequestsManager';
import {
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
  updateDoc,
  onSnapshot,
  query,
  where,
  orderBy
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import AppHeader from '../../components/ui/AppHeader';
import Colors from '../../constants/Colors';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'ZI' | 'HR' | 'Contractor' | 'Worker' | 'Driver';
  phone: string;
  zone: string;
  status: 'active' | 'inactive';
  joinDate: string;
  employeeId?: string;
  department?: string;
  supervisor?: string;
  lastLogin?: string;
}

const UsersScreen: React.FC = () => {
  const router = useRouter();
  const { userData } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<'users' | 'requests'>('users');
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    role: 'Worker' as User['role'],
    phone: '',
    zone: '',
    department: '',
    supervisor: '',
    employeeId: ''
  });

  const loadUsers = () => {
    try {
      // Set up real-time listener for users collection
      const usersQuery = query(
        collection(db, 'users'),
        orderBy('joinDate', 'desc')
      );

      const unsubscribe = onSnapshot(usersQuery, (snapshot) => {
        const usersData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as User[];

        console.log('📊 Users updated:', usersData.length);
        setUsers(usersData);
        setLoading(false);
      }, (error) => {
        console.error('Error loading users:', error);
        // Initialize with sample data if Firebase fails
        initializeSampleUsers();
        setLoading(false);
      });

      return unsubscribe;
    } catch (error) {
      console.error('Error setting up users listener:', error);
      initializeSampleUsers();
      setLoading(false);
      return () => {};
    }
  };

  const initializeSampleUsers = async () => {
    const sampleUsers = [
      {
        name: 'Rajesh Kumar',
        email: 'rajesh.kumar@pmc.gov.in',
        role: 'Worker',
        phone: '+91 9876543210',
        zone: 'Zone A',
        status: 'active',
        joinDate: '2024-01-15',
        employeeId: 'PMC-W-001',
        department: 'Sanitation',
        supervisor: 'Amit Patel'
      },
      {
        name: 'Priya Sharma',
        email: 'priya.sharma@pmc.gov.in',
        role: 'Driver',
        phone: '+91 9876543211',
        zone: 'Zone B',
        status: 'active',
        joinDate: '2024-02-20',
        employeeId: 'PMC-D-001',
        department: 'Transport',
        supervisor: 'Sunita Devi'
      },
      {
        name: 'Amit Patel',
        email: 'amit.patel@pmc.gov.in',
        role: 'ZI',
        phone: '+91 9876543212',
        zone: 'Zone A',
        status: 'active',
        joinDate: '2023-12-10',
        employeeId: 'PMC-ZI-001',
        department: 'Administration'
      },
      {
        name: 'Sunita Devi',
        email: 'sunita.devi@pmc.gov.in',
        role: 'HR',
        phone: '+91 9876543213',
        zone: 'Central Office',
        status: 'active',
        joinDate: '2024-01-05',
        employeeId: 'PMC-HR-001',
        department: 'Human Resources'
      },
      {
        name: 'Vikram Singh',
        email: 'vikram.singh@pmc.gov.in',
        role: 'Contractor',
        phone: '+91 9876543214',
        zone: 'Zone C',
        status: 'active',
        joinDate: '2024-03-01',
        employeeId: 'PMC-C-001',
        department: 'Waste Management'
      }
    ];

    try {
      for (const user of sampleUsers) {
        await addDoc(collection(db, 'users'), user);
      }
      console.log('✅ Sample users initialized');
    } catch (error) {
      console.error('Error initializing sample users:', error);
      setUsers(sampleUsers.map((user, index) => ({ ...user, id: index.toString() })) as User[]);
    }
  };

  useEffect(() => {
    const unsubscribe = loadUsers();
    return unsubscribe;
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    // Real-time listener will automatically update data
    setTimeout(() => setRefreshing(false), 1000);
  };

  const addUser = async () => {
    try {
      if (!newUser.name || !newUser.email || !newUser.phone) {
        Alert.alert('Error', 'Please fill in all required fields');
        return;
      }

      const userData = {
        ...newUser,
        status: 'active',
        joinDate: new Date().toISOString().split('T')[0],
        lastLogin: null
      };

      await addDoc(collection(db, 'users'), userData);
      Alert.alert('Success', 'User added successfully');
      setShowAddModal(false);
      resetNewUser();
    } catch (error) {
      console.error('Error adding user:', error);
      Alert.alert('Error', 'Failed to add user');
    }
  };

  const updateUser = async () => {
    try {
      if (!selectedUser) return;

      // Filter out undefined values
      const updateData: any = {
        name: selectedUser.name,
        email: selectedUser.email,
        role: selectedUser.role,
        phone: selectedUser.phone,
        zone: selectedUser.zone,
        status: selectedUser.status
      };

      // Only add optional fields if they have values
      if (selectedUser.department) {
        updateData.department = selectedUser.department;
      }
      if (selectedUser.supervisor) {
        updateData.supervisor = selectedUser.supervisor;
      }
      if (selectedUser.employeeId) {
        updateData.employeeId = selectedUser.employeeId;
      }

      await updateDoc(doc(db, 'users', selectedUser.id), updateData);

      Alert.alert('Success', 'User updated successfully');
      setShowEditModal(false);
      setSelectedUser(null);
    } catch (error) {
      console.error('Error updating user:', error);
      Alert.alert('Error', 'Failed to update user');
    }
  };

  const toggleUserStatus = async (userId: string, currentStatus: 'active' | 'inactive') => {
    try {
      const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
      await updateDoc(doc(db, 'users', userId), {
        status: newStatus
      });
      Alert.alert('Success', `User status changed to ${newStatus}`);
    } catch (error) {
      console.error('Error updating user status:', error);
      Alert.alert('Error', 'Failed to update user status');
    }
  };

  const deleteUser = async (userId: string, userName: string) => {
    Alert.alert(
      'Delete User',
      `Are you sure you want to delete ${userName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'users', userId));
              Alert.alert('Success', 'User deleted successfully');
            } catch (error) {
              console.error('Error deleting user:', error);
              Alert.alert('Error', 'Failed to delete user');
            }
          }
        }
      ]
    );
  };

  const resetPassword = async (userId: string, userEmail: string) => {
    Alert.alert(
      'Reset Password',
      `Send password reset email to ${userEmail}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send',
          onPress: () => {
            // In a real app, you would send a password reset email
            Alert.alert('Success', 'Password reset email sent');
          }
        }
      ]
    );
  };

  const resetNewUser = () => {
    setNewUser({
      name: '',
      email: '',
      role: 'Worker',
      phone: '',
      zone: '',
      department: '',
      supervisor: '',
      employeeId: ''
    });
  };

  const navigateToUserDetail = (user: User) => {
    router.push({
      pathname: '/user-detail',
      params: {
        userId: user.id,
        userName: user.name,
        userEmail: user.email,
        userRole: user.role,
      }
    });
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.employeeId?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = selectedRole === 'all' || user.role === selectedRole;
    return matchesSearch && matchesRole;
  });

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'ZI': return { backgroundColor: '#FEF3C7', color: '#92400E' }; // Yellow
      case 'HR': return { backgroundColor: '#DBEAFE', color: '#1E40AF' }; // Blue
      case 'Contractor': return { backgroundColor: '#F3E8FF', color: '#7C3AED' }; // Purple
      case 'Worker': return { backgroundColor: '#D1FAE5', color: '#065F46' }; // Green
      case 'Driver': return { backgroundColor: '#FEE2E2', color: '#991B1B' }; // Red
      default: return { backgroundColor: '#F3F4F6', color: '#374151' }; // Gray
    }
  };

  const roleOptions = ['all', 'ZI', 'HR', 'Contractor', 'Worker', 'Driver'];
  const zoneOptions = ['Zone A', 'Zone B', 'Zone C', 'Zone D', 'Central Office'];
  const departmentOptions = ['Administration', 'Human Resources', 'Sanitation', 'Transport', 'Waste Management'];

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading users...</Text>
      </View>
    );
  }

  // Check if user is admin (harsh@gmail.com)
  const isAdmin = userData?.email === 'harsh@gmail.com' && userData?.role === 'admin';

  return (
    <View style={styles.container}>
      <AppHeader title="User Management" />

      {/* Tab Navigation (only for admin) */}
      {isAdmin && (
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'users' && styles.activeTab]}
            onPress={() => setActiveTab('users')}
          >
            <Ionicons name="people" size={20} color={activeTab === 'users' ? '#3B82F6' : '#6B7280'} />
            <Text style={[styles.tabText, activeTab === 'users' && styles.activeTabText]}>
              User Management
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'requests' && styles.activeTab]}
            onPress={() => setActiveTab('requests')}
          >
            <Ionicons name="time" size={20} color={activeTab === 'requests' ? '#3B82F6' : '#6B7280'} />
            <Text style={[styles.tabText, activeTab === 'requests' && styles.activeTabText]}>
              Role Requests
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Content based on active tab */}
      {activeTab === 'requests' && isAdmin ? (
        <RoleRequestsManager />
      ) : (
        <ScrollView
          style={styles.scrollView}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          <View style={styles.content}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>User Management</Text>
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => setShowAddModal(true)}
              >
                <Ionicons name="add" size={20} color="white" />
                <Text style={styles.addButtonText}>Add User</Text>
              </TouchableOpacity>
            </View>

          {/* Search */}
          <View style={styles.searchContainer}>
            <View style={styles.searchInputContainer}>
              <Ionicons name="search" size={20} color="#9CA3AF" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search users by name, email, or ID..."
                value={searchTerm}
                onChangeText={setSearchTerm}
              />
            </View>
          </View>

          {/* Role Filter Tabs */}
          <View style={styles.filterContainer}>
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
                          {' '}({users.filter(u => u.role === role).length})
                        </Text>
                      )}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>

          {/* Users List */}
          <View style={styles.usersList}>
            {filteredUsers.map((user) => (
              <TouchableOpacity
                key={user.id}
                style={styles.userCard}
                onPress={() => navigateToUserDetail(user)}
                activeOpacity={0.7}
              >
                <View style={styles.userCardHeader}>
                  <View style={styles.userInfo}>
                    <View style={styles.userAvatar}>
                      <Ionicons name="person" size={24} color="#6B7280" />
                    </View>
                    <View style={styles.userDetails}>
                      <Text style={styles.userName}>{user.name}</Text>
                      <Text style={styles.userEmail}>{user.email}</Text>
                      {user.employeeId && (
                        <Text style={styles.userEmployeeId}>ID: {user.employeeId}</Text>
                      )}
                    </View>
                  </View>

                  <View style={styles.userActions}>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => toggleUserStatus(user.id, user.status)}
                    >
                      <Ionicons
                        name={user.status === 'active' ? 'pause' : 'play'}
                        size={18}
                        color={user.status === 'active' ? '#F59E0B' : '#10B981'}
                      />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => {
                        setSelectedUser(user);
                        setShowEditModal(true);
                      }}
                    >
                      <Ionicons name="pencil" size={18} color="#3B82F6" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => resetPassword(user.id, user.email)}
                    >
                      <Ionicons name="key" size={18} color="#F59E0B" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => deleteUser(user.id, user.name)}
                    >
                      <Ionicons name="trash" size={18} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.userBadges}>
                  <View style={[styles.roleBadge, getRoleBadgeColor(user.role)]}>
                    <Text style={[styles.roleBadgeText, { color: getRoleBadgeColor(user.role).color }]}>
                      {user.role}
                    </Text>
                  </View>
                  <Text style={styles.userZone}>{user.zone}</Text>
                  <View style={[
                    styles.statusBadge,
                    user.status === 'active' ? styles.statusActive : styles.statusInactive
                  ]}>
                    <Text style={[
                      styles.statusText,
                      user.status === 'active' ? styles.statusActiveText : styles.statusInactiveText
                    ]}>
                      {user.status.charAt(0).toUpperCase() + user.status.slice(1)}
                    </Text>
                  </View>
                </View>

                <View style={styles.userMeta}>
                  <Text style={styles.userPhone}>{user.phone}</Text>
                  {user.department && (
                    <Text style={styles.userDepartment}>Dept: {user.department}</Text>
                  )}
                  <Text style={styles.userJoinDate}>
                    Joined: {user.joinDate ? new Date(user.joinDate).toLocaleDateString() : 'N/A'}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {/* Stats */}
          <View style={styles.statsContainer}>
            {roleOptions.slice(1).map((role) => (
              <View key={role} style={styles.statCard}>
                <Text style={[styles.statNumber, { color: getRoleBadgeColor(role).color }]}>
                  {users.filter(u => u.role === role).length}
                </Text>
                <Text style={styles.statLabel}>{role}s</Text>
              </View>
            ))}
          </View>
        </View>
        </ScrollView>
      )}

      {/* Add User Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add New User</Text>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => {
                setShowAddModal(false);
                resetNewUser();
              }}
            >
              <Ionicons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Full Name *</Text>
              <TextInput
                style={styles.formInput}
                placeholder="Enter full name"
                value={newUser.name}
                onChangeText={(text) => setNewUser({...newUser, name: text})}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Email *</Text>
              <TextInput
                style={styles.formInput}
                placeholder="Enter email address"
                value={newUser.email}
                onChangeText={(text) => setNewUser({...newUser, email: text})}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Phone *</Text>
              <TextInput
                style={styles.formInput}
                placeholder="Enter phone number"
                value={newUser.phone}
                onChangeText={(text) => setNewUser({...newUser, phone: text})}
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Employee ID</Text>
              <TextInput
                style={styles.formInput}
                placeholder="Enter employee ID"
                value={newUser.employeeId}
                onChangeText={(text) => setNewUser({...newUser, employeeId: text})}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Role *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.roleSelector}>
                  {roleOptions.slice(1).map((role) => (
                    <TouchableOpacity
                      key={role}
                      style={[
                        styles.roleSelectorOption,
                        newUser.role === role ? styles.roleSelectorOptionActive : styles.roleSelectorOptionInactive
                      ]}
                      onPress={() => setNewUser({...newUser, role: role as User['role']})}
                    >
                      <Text style={[
                        styles.roleSelectorText,
                        newUser.role === role ? styles.roleSelectorTextActive : styles.roleSelectorTextInactive
                      ]}>
                        {role}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Zone</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.zoneSelector}>
                  {zoneOptions.map((zone) => (
                    <TouchableOpacity
                      key={zone}
                      style={[
                        styles.zoneSelectorOption,
                        newUser.zone === zone ? styles.zoneSelectorOptionActive : styles.zoneSelectorOptionInactive
                      ]}
                      onPress={() => setNewUser({...newUser, zone})}
                    >
                      <Text style={[
                        styles.zoneSelectorText,
                        newUser.zone === zone ? styles.zoneSelectorTextActive : styles.zoneSelectorTextInactive
                      ]}>
                        {zone}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Department</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.departmentSelector}>
                  {departmentOptions.map((dept) => (
                    <TouchableOpacity
                      key={dept}
                      style={[
                        styles.departmentSelectorOption,
                        newUser.department === dept ? styles.departmentSelectorOptionActive : styles.departmentSelectorOptionInactive
                      ]}
                      onPress={() => setNewUser({...newUser, department: dept})}
                    >
                      <Text style={[
                        styles.departmentSelectorText,
                        newUser.department === dept ? styles.departmentSelectorTextActive : styles.departmentSelectorTextInactive
                      ]}>
                        {dept}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Supervisor</Text>
              <TextInput
                style={styles.formInput}
                placeholder="Enter supervisor name"
                value={newUser.supervisor}
                onChangeText={(text) => setNewUser({...newUser, supervisor: text})}
              />
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={() => {
                setShowAddModal(false);
                resetNewUser();
              }}
            >
              <Text style={styles.modalCancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.modalSaveButton}
              onPress={addUser}
            >
              <Text style={styles.modalSaveButtonText}>Add User</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Edit User Modal */}
      <Modal
        visible={showEditModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Edit User</Text>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => {
                setShowEditModal(false);
                setSelectedUser(null);
              }}
            >
              <Ionicons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {selectedUser && (
            <ScrollView style={styles.modalContent}>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Full Name *</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Enter full name"
                  value={selectedUser.name}
                  onChangeText={(text) => setSelectedUser({...selectedUser, name: text})}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Email *</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Enter email address"
                  value={selectedUser.email}
                  onChangeText={(text) => setSelectedUser({...selectedUser, email: text})}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Phone *</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Enter phone number"
                  value={selectedUser.phone}
                  onChangeText={(text) => setSelectedUser({...selectedUser, phone: text})}
                  keyboardType="phone-pad"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Employee ID</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Enter employee ID"
                  value={selectedUser.employeeId || ''}
                  onChangeText={(text) => setSelectedUser({...selectedUser, employeeId: text})}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Role *</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.roleSelector}>
                    {roleOptions.slice(1).map((role) => (
                      <TouchableOpacity
                        key={role}
                        style={[
                          styles.roleSelectorOption,
                          selectedUser.role === role ? styles.roleSelectorOptionActive : styles.roleSelectorOptionInactive
                        ]}
                        onPress={() => setSelectedUser({...selectedUser, role: role as User['role']})}
                      >
                        <Text style={[
                          styles.roleSelectorText,
                          selectedUser.role === role ? styles.roleSelectorTextActive : styles.roleSelectorTextInactive
                        ]}>
                          {role}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Zone</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.zoneSelector}>
                    {zoneOptions.map((zone) => (
                      <TouchableOpacity
                        key={zone}
                        style={[
                          styles.zoneSelectorOption,
                          selectedUser.zone === zone ? styles.zoneSelectorOptionActive : styles.zoneSelectorOptionInactive
                        ]}
                        onPress={() => setSelectedUser({...selectedUser, zone})}
                      >
                        <Text style={[
                          styles.zoneSelectorText,
                          selectedUser.zone === zone ? styles.zoneSelectorTextActive : styles.zoneSelectorTextInactive
                        ]}>
                          {zone}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Department</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.departmentSelector}>
                    {departmentOptions.map((dept) => (
                      <TouchableOpacity
                        key={dept}
                        style={[
                          styles.departmentSelectorOption,
                          selectedUser.department === dept ? styles.departmentSelectorOptionActive : styles.departmentSelectorOptionInactive
                        ]}
                        onPress={() => setSelectedUser({...selectedUser, department: dept})}
                      >
                        <Text style={[
                          styles.departmentSelectorText,
                          selectedUser.department === dept ? styles.departmentSelectorTextActive : styles.departmentSelectorTextInactive
                        ]}>
                          {dept}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Supervisor</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Enter supervisor name"
                  value={selectedUser.supervisor || ''}
                  onChangeText={(text) => setSelectedUser({...selectedUser, supervisor: text})}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Status</Text>
                <View style={styles.statusSelector}>
                  <TouchableOpacity
                    style={[
                      styles.statusSelectorOption,
                      selectedUser.status === 'active' ? styles.statusSelectorOptionActive : styles.statusSelectorOptionInactive
                    ]}
                    onPress={() => setSelectedUser({...selectedUser, status: 'active'})}
                  >
                    <Text style={[
                      styles.statusSelectorText,
                      selectedUser.status === 'active' ? styles.statusSelectorTextActive : styles.statusSelectorTextInactive
                    ]}>
                      Active
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.statusSelectorOption,
                      selectedUser.status === 'inactive' ? styles.statusSelectorOptionActive : styles.statusSelectorOptionInactive
                    ]}
                    onPress={() => setSelectedUser({...selectedUser, status: 'inactive'})}
                  >
                    <Text style={[
                      styles.statusSelectorText,
                      selectedUser.status === 'inactive' ? styles.statusSelectorTextActive : styles.statusSelectorTextInactive
                    ]}>
                      Inactive
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
          )}

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={() => {
                setShowEditModal(false);
                setSelectedUser(null);
              }}
            >
              <Text style={styles.modalCancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.modalSaveButton}
              onPress={updateUser}
            >
              <Text style={styles.modalSaveButtonText}>Update User</Text>
            </TouchableOpacity>
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
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    gap: 8,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#3B82F6',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  activeTabText: {
    color: '#3B82F6',
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
  searchContainer: {
    marginBottom: 16,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
  },
  filterContainer: {
    marginBottom: 24,
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
  usersList: {
    gap: 16,
  },
  userCard: {
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
  userCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  userInfo: {
    flexDirection: 'row',
    flex: 1,
  },
  userAvatar: {
    width: 48,
    height: 48,
    backgroundColor: '#F3F4F6',
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 2,
  },
  userEmployeeId: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  userActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#F9FAFB',
  },
  userBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
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
  userZone: {
    fontSize: 14,
    color: '#6B7280',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusActive: {
    backgroundColor: '#D1FAE5',
  },
  statusInactive: {
    backgroundColor: '#FEE2E2',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statusActiveText: {
    color: '#065F46',
  },
  statusInactiveText: {
    color: '#991B1B',
  },
  userMeta: {
    gap: 4,
  },
  userPhone: {
    fontSize: 14,
    color: '#374151',
  },
  userDepartment: {
    fontSize: 12,
    color: '#6B7280',
  },
  userJoinDate: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 24,
  },
  statCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    flex: 1,
    minWidth: 80,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  statNumber: {
    fontSize: 24,
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
  formGroup: {
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  formInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: 'white',
    color: '#111827',
  },
  roleSelector: {
    flexDirection: 'row',
    gap: 8,
  },
  roleSelectorOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
  },
  roleSelectorOptionActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  roleSelectorOptionInactive: {
    backgroundColor: 'white',
    borderColor: '#D1D5DB',
  },
  roleSelectorText: {
    fontSize: 14,
    fontWeight: '500',
  },
  roleSelectorTextActive: {
    color: 'white',
  },
  roleSelectorTextInactive: {
    color: '#6B7280',
  },
  zoneSelector: {
    flexDirection: 'row',
    gap: 8,
  },
  zoneSelectorOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
  },
  zoneSelectorOptionActive: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  zoneSelectorOptionInactive: {
    backgroundColor: 'white',
    borderColor: '#D1D5DB',
  },
  zoneSelectorText: {
    fontSize: 14,
    fontWeight: '500',
  },
  zoneSelectorTextActive: {
    color: 'white',
  },
  zoneSelectorTextInactive: {
    color: '#6B7280',
  },
  departmentSelector: {
    flexDirection: 'row',
    gap: 8,
  },
  departmentSelectorOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
  },
  departmentSelectorOptionActive: {
    backgroundColor: '#8B5CF6',
    borderColor: '#8B5CF6',
  },
  departmentSelectorOptionInactive: {
    backgroundColor: 'white',
    borderColor: '#D1D5DB',
  },
  departmentSelectorText: {
    fontSize: 14,
    fontWeight: '500',
  },
  departmentSelectorTextActive: {
    color: 'white',
  },
  departmentSelectorTextInactive: {
    color: '#6B7280',
  },
  statusSelector: {
    flexDirection: 'row',
    gap: 8,
  },
  statusSelectorOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    flex: 1,
    alignItems: 'center',
  },
  statusSelectorOptionActive: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  statusSelectorOptionInactive: {
    backgroundColor: 'white',
    borderColor: '#D1D5DB',
  },
  statusSelectorText: {
    fontSize: 14,
    fontWeight: '500',
  },
  statusSelectorTextActive: {
    color: 'white',
  },
  statusSelectorTextInactive: {
    color: '#6B7280',
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  modalCancelButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#6B7280',
  },
  modalSaveButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
  },
  modalSaveButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: 'white',
  },
});

export default UsersScreen;
