import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  StyleSheet,
  Modal,
  TextInput,
  Linking,
  Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../contexts/AuthContext';
import AppHeader from '../../components/ui/AppHeader';
import Colors from '../../constants/Colors';

const SettingsScreen: React.FC = () => {
  const { userData, logout } = useAuth();
  const [settings, setSettings] = useState({
    notifications: true,
    autoSync: true,
    locationTracking: true,
    autoBackup: false,
    soundEnabled: true,
  });
  
  const [currentLocation, setCurrentLocation] = useState<string>('');
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [profileName, setProfileName] = useState(userData?.name || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    loadSettings();
    getCurrentLocation();
  }, []);

  const loadSettings = async () => {
    try {
      const savedSettings = await AsyncStorage.getItem('userSettings');
      if (savedSettings) {
        setSettings(JSON.parse(savedSettings));
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const saveSettings = async (newSettings: typeof settings) => {
    try {
      await AsyncStorage.setItem('userSettings', JSON.stringify(newSettings));
      setSettings(newSettings);
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  };

  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const location = await Location.getCurrentPositionAsync({});
        const address = await Location.reverseGeocodeAsync({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
        
        if (address.length > 0) {
          const addr = address[0];
          const locationString = `${addr.street || ''} ${addr.city || ''}`.trim();
          setCurrentLocation(locationString || 'Location detected');
        }
      }
    } catch (error) {
      console.error('Error getting location:', error);
    }
  };

  const handleToggleSetting = async (key: keyof typeof settings) => {
    const newSettings = { ...settings, [key]: !settings[key] };
    await saveSettings(newSettings);
    Alert.alert('Settings Updated', `${key} has been ${newSettings[key] ? 'enabled' : 'disabled'}`);
  };

  const handleSaveProfile = () => {
    if (!profileName.trim()) {
      Alert.alert('Error', 'Name cannot be empty');
      return;
    }
    Alert.alert('Success', 'Profile updated successfully');
    setShowProfileModal(false);
  };

  const handleChangePassword = () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'New passwords do not match');
      return;
    }
    Alert.alert('Success', 'Password changed successfully');
    setShowPasswordModal(false);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  const handleExportData = async () => {
    try {
      const exportData = {
        user: userData,
        settings: settings,
        location: currentLocation,
        exportDate: new Date().toISOString(),
      };
      
      const dataString = JSON.stringify(exportData, null, 2);
      
      await Share.share({
        message: `SWACH NETRA User Data Export:\n\n${dataString}`,
        title: 'User Data Export',
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to export data');
    }
  };

  const handleContactSupport = () => {
    Alert.alert(
      'Contact Support',
      'Choose how you want to contact support:',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Email', 
          onPress: () => Linking.openURL('mailto:support@swachnetra.com?subject=Support Request')
        },
        { 
          text: 'Phone', 
          onPress: () => Linking.openURL('tel:+911234567890')
        }
      ]
    );
  };

  const handleAbout = () => {
    Alert.alert(
      'About SWACH NETRA',
      `Version: 1.0.0\nBuild: ${new Date().getFullYear()}.${new Date().getMonth() + 1}\n\nSWACH NETRA Admin Mobile App\nWaste Management System`,
      [{ text: 'OK' }]
    );
  };

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

  const settingsGroups = [
    {
      title: 'Account',
      options: [
        {
          title: 'Edit Profile',
          subtitle: 'Update your personal information',
          icon: 'person' as keyof typeof Ionicons.glyphMap,
          onPress: () => setShowProfileModal(true),
          showArrow: true,
        },
        {
          title: 'Change Password',
          subtitle: 'Update your account password',
          icon: 'lock-closed' as keyof typeof Ionicons.glyphMap,
          onPress: () => setShowPasswordModal(true),
          showArrow: true,
        },
        {
          title: 'Current Location',
          subtitle: currentLocation || 'Tap to get location',
          icon: 'location' as keyof typeof Ionicons.glyphMap,
          onPress: getCurrentLocation,
          showArrow: true,
        },
      ]
    },
    {
      title: 'Preferences',
      options: [
        {
          title: 'Push Notifications',
          subtitle: 'Receive app notifications',
          key: 'notifications' as keyof typeof settings,
          icon: 'notifications' as keyof typeof Ionicons.glyphMap,
          isToggle: true,
        },
        {
          title: 'Location Tracking',
          subtitle: 'Track location for monitoring',
          key: 'locationTracking' as keyof typeof settings,
          icon: 'location' as keyof typeof Ionicons.glyphMap,
          isToggle: true,
        },
        {
          title: 'Auto Sync',
          subtitle: 'Automatically sync data',
          key: 'autoSync' as keyof typeof settings,
          icon: 'sync' as keyof typeof Ionicons.glyphMap,
          isToggle: true,
        },
        {
          title: 'Auto Backup',
          subtitle: 'Automatically backup data',
          key: 'autoBackup' as keyof typeof settings,
          icon: 'cloud-upload' as keyof typeof Ionicons.glyphMap,
          isToggle: true,
        },
      ]
    },
    {
      title: 'Data & Storage',
      options: [
        {
          title: 'Export Data',
          subtitle: 'Download your data',
          icon: 'download' as keyof typeof Ionicons.glyphMap,
          onPress: handleExportData,
          showArrow: true,
        },
        {
          title: 'Help & Support',
          subtitle: 'Get help and contact support',
          icon: 'help-circle' as keyof typeof Ionicons.glyphMap,
          onPress: handleContactSupport,
          showArrow: true,
        },
        {
          title: 'About',
          subtitle: 'App version and information',
          icon: 'information-circle' as keyof typeof Ionicons.glyphMap,
          onPress: handleAbout,
          showArrow: true,
        },
      ]
    }
  ];

  return (
    <View style={styles.container}>
      <AppHeader title="Settings" />
      
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* User Info */}
        <View style={styles.userSection}>
          <View style={styles.userAvatar}>
            <Ionicons name="person" size={32} color="#FFFFFF" />
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{userData?.name || 'User'}</Text>
            <Text style={styles.userEmail}>{userData?.email || 'user@example.com'}</Text>
            <Text style={styles.userRole}>{userData?.role?.toUpperCase() || 'USER'}</Text>
          </View>
        </View>

        {/* Settings Groups */}
        {settingsGroups.map((group, groupIndex) => (
          <View key={groupIndex} style={styles.settingsGroup}>
            <Text style={styles.groupTitle}>{group.title}</Text>
            <View style={styles.groupItems}>
              {group.options.map((option, optionIndex) => (
                <TouchableOpacity
                  key={optionIndex}
                  style={[
                    styles.settingItem,
                    optionIndex === group.options.length - 1 && styles.lastItem,
                  ]}
                  onPress={option.onPress}
                  disabled={option.isToggle}
                >
                  <View style={styles.settingLeft}>
                    <View style={styles.settingIcon}>
                      <Ionicons name={option.icon} size={20} color="#6B7280" />
                    </View>
                    <View style={styles.settingText}>
                      <Text style={styles.settingTitle}>{option.title}</Text>
                      <Text style={styles.settingSubtitle}>{option.subtitle}</Text>
                    </View>
                  </View>
                  <View style={styles.settingRight}>
                    {option.isToggle && option.key ? (
                      <Switch
                        value={settings[option.key]}
                        onValueChange={() => handleToggleSetting(option.key!)}
                        trackColor={{ false: '#E5E7EB', true: '#3B82F6' }}
                        thumbColor={settings[option.key] ? '#FFFFFF' : '#FFFFFF'}
                      />
                    ) : option.showArrow ? (
                      <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                    ) : null}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        {/* Logout Button */}
        <View style={styles.logoutSection}>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={20} color="#EF4444" />
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Profile Modal */}
      <Modal
        visible={showProfileModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowProfileModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Profile</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Full Name</Text>
              <TextInput
                style={styles.textInput}
                value={profileName}
                onChangeText={setProfileName}
                placeholder="Enter your full name"
              />
            </View>
            
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowProfileModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleSaveProfile}
              >
                <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Password Modal */}
      <Modal
        visible={showPasswordModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowPasswordModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Change Password</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Current Password</Text>
              <TextInput
                style={styles.textInput}
                value={currentPassword}
                onChangeText={setCurrentPassword}
                placeholder="Enter current password"
                secureTextEntry
              />
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>New Password</Text>
              <TextInput
                style={styles.textInput}
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="Enter new password"
                secureTextEntry
              />
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Confirm New Password</Text>
              <TextInput
                style={styles.textInput}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Confirm new password"
                secureTextEntry
              />
            </View>
            
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowPasswordModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleChangePassword}
              >
                <Text style={styles.saveButtonText}>Change Password</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },
  content: {
    padding: 16,
  },
  userSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  userAvatar: {
    width: 60,
    height: 60,
    backgroundColor: '#3B82F6',
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 2,
  },
  userRole: {
    fontSize: 12,
    color: '#3B82F6',
    fontWeight: '500',
  },
  settingsGroup: {
    marginBottom: 20,
  },
  groupTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
    marginLeft: 4,
  },
  groupItems: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  lastItem: {
    borderBottomWidth: 0,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIcon: {
    width: 40,
    height: 40,
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  settingText: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  settingRight: {
    marginLeft: 12,
  },
  logoutSection: {
    marginTop: 20,
    marginBottom: 40,
  },
  logoutButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#EF4444',
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 20,
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#111827',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#6B7280',
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#3B82F6',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
  },
});

export default SettingsScreen;
