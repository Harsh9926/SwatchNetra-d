import React from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';

// Import role-specific dashboard components
import AdminDashboard from '../dashboards/AdminDashboard';
import ZIDashboard from '../dashboards/ZIDashboard';
import HRDashboard from '../dashboards/HRDashboard';
import ContractorDashboard from '../dashboards/ContractorDashboard';
import DriverDashboard from '../dashboards/DriverDashboard';

const RoleBasedNavigator: React.FC = () => {
  const { userData, logout } = useAuth();

  // If no user data, show error
  if (!userData) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F9FAFB', padding: 20 }}>
        <Ionicons name="warning" size={48} color="#EF4444" />
        <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#111827', marginBottom: 8, textAlign: 'center' }}>
          No User Data Found
        </Text>
        <Text style={{ fontSize: 14, color: '#6B7280', textAlign: 'center', marginBottom: 20 }}>
          Your account data could not be loaded. Please try logging in again.
        </Text>
        <TouchableOpacity
          style={{ backgroundColor: '#3B82F6', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 }}
          onPress={async () => await logout()}
        >
          <Text style={{ color: '#FFFFFF', fontWeight: '500' }}>Logout & Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Check if user has a role assigned
  if (!userData.role) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F9FAFB', padding: 20 }}>
        <Ionicons name="time" size={48} color="#F59E0B" />
        <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#111827', marginBottom: 8, textAlign: 'center' }}>
          Role Assignment Pending
        </Text>
        <Text style={{ fontSize: 14, color: '#6B7280', textAlign: 'center', marginBottom: 20 }}>
          Your role is being assigned by the administrator. Please check back later or contact support.
        </Text>
        <TouchableOpacity
          style={{ backgroundColor: '#3B82F6', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 }}
          onPress={async () => await logout()}
        >
          <Text style={{ color: '#FFFFFF', fontWeight: '500' }}>Logout</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ROLE-BASED ACCESS CONTROL
  console.log('👤 User role-based access for:', userData.email, 'Role:', userData.role);

  switch (userData.role) {
    case 'admin':
      return <AdminDashboard />;

    case 'zi':
      return <ZIDashboard />;

    case 'hr':
      return <HRDashboard />;

    case 'contractor':
      return <ContractorDashboard />;

    case 'driver':
      return <DriverDashboard />;

    default:
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F9FAFB', padding: 20 }}>
          <Ionicons name="help-circle" size={48} color="#6B7280" />
          <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#111827', marginBottom: 8, textAlign: 'center' }}>
            Unknown Role
          </Text>
          <Text style={{ fontSize: 14, color: '#6B7280', textAlign: 'center', marginBottom: 8 }}>
            Your role "{userData.role}" is not recognized by the system.
          </Text>
          <Text style={{ fontSize: 12, color: '#9CA3AF', textAlign: 'center', marginBottom: 20 }}>
            User: {userData.email} | Role: {userData.role}
          </Text>
          <TouchableOpacity
            style={{ backgroundColor: '#6B7280', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 }}
            onPress={async () => {
              Alert.alert(
                'Contact Administrator',
                'Please contact the system administrator to resolve this role issue.',
                [
                  { text: 'Logout', onPress: async () => await logout() },
                  { text: 'OK', style: 'cancel' }
                ]
              );
            }}
          >
            <Text style={{ color: '#FFFFFF', fontWeight: '500' }}>Contact Admin</Text>
          </TouchableOpacity>
        </View>
      );
  }
};

export default RoleBasedNavigator;
