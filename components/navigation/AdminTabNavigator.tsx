import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

// Import all the tab screens
import PowerBIDashboard from '../dashboard/PowerBIDashboard';

// Create wrapper components for tab screens
const UsersScreen = () => {
  const UsersComponent = require('../../app/(tabs)/users').default;
  return <UsersComponent />;
};

const RequestsScreen = () => {
  const RequestsComponent = require('../../app/(tabs)/requests').default;
  return <RequestsComponent />;
};

const ZonesScreen = () => {
  const ZonesComponent = require('../../app/(tabs)/zones').default;
  return <ZonesComponent />;
};

const AttendanceScreen = () => {
  const AttendanceComponent = require('../../app/(tabs)/attendance').default;
  return <AttendanceComponent />;
};

const VehiclesScreen = () => {
  const VehiclesComponent = require('../../app/(tabs)/vehicles').default;
  return <VehiclesComponent />;
};

const SettingsScreen = () => {
  const SettingsComponent = require('../../app/(tabs)/settings').default;
  return <SettingsComponent />;
};

const Tab = createBottomTabNavigator();

const AdminTabNavigator: React.FC = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          switch (route.name) {
            case 'Dashboard':
              iconName = focused ? 'analytics' : 'analytics-outline';
              break;
            case 'Users':
              iconName = focused ? 'people' : 'people-outline';
              break;
            case 'Requests':
              iconName = focused ? 'document-text' : 'document-text-outline';
              break;
            case 'Zones':
              iconName = focused ? 'map' : 'map-outline';
              break;
            case 'Attendance':
              iconName = focused ? 'time' : 'time-outline';
              break;
            case 'Vehicles':
              iconName = focused ? 'car' : 'car-outline';
              break;
            case 'Settings':
              iconName = focused ? 'settings' : 'settings-outline';
              break;
            default:
              iconName = 'circle';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#3B82F6',
        tabBarInactiveTintColor: '#6B7280',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#E5E7EB',
          paddingBottom: 5,
          paddingTop: 5,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
        headerShown: false,
      })}
    >
      <Tab.Screen 
        name="Dashboard" 
        component={PowerBIDashboard}
        options={{
          tabBarLabel: 'Dashboard',
        }}
      />
      <Tab.Screen 
        name="Users" 
        component={UsersScreen}
        options={{
          tabBarLabel: 'Users',
        }}
      />
      <Tab.Screen 
        name="Requests" 
        component={RequestsScreen}
        options={{
          tabBarLabel: 'Requests',
        }}
      />
      <Tab.Screen 
        name="Zones" 
        component={ZonesScreen}
        options={{
          tabBarLabel: 'Zones',
        }}
      />
      <Tab.Screen 
        name="Attendance" 
        component={AttendanceScreen}
        options={{
          tabBarLabel: 'Attendance',
        }}
      />
      <Tab.Screen 
        name="Vehicles" 
        component={VehiclesScreen}
        options={{
          tabBarLabel: 'Vehicles',
        }}
      />
      <Tab.Screen 
        name="Settings" 
        component={SettingsScreen}
        options={{
          tabBarLabel: 'Settings',
        }}
      />
    </Tab.Navigator>
  );
};

export default AdminTabNavigator;
