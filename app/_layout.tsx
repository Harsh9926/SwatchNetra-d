import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/useColorScheme';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { DriverProvider } from '../contexts/DriverContext';
// import { ThemeProvider as CustomThemeProvider } from '../contexts/ThemeContext';
import LoginScreen from '../components/auth/LoginScreen';
import RoleBasedNavigator from '../components/navigation/RoleBasedNavigator';
import { View, ActivityIndicator, Text } from 'react-native';

function AppContent() {
  const { user, userData, loading } = useAuth();
  const colorScheme = useColorScheme();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F9FAFB' }}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  if (!user) {
    return <LoginScreen />;
  }

  // Check if user is approved - all users must be approved to access the system
  if (userData && userData.status !== 'approved') {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F9FAFB', padding: 20 }}>
        <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#111827', marginBottom: 8, textAlign: 'center' }}>
          Account Status: {userData.status}
        </Text>
        <Text style={{ fontSize: 14, color: '#6B7280', textAlign: 'center', marginBottom: 20 }}>
          {userData.status === 'pending'
            ? 'Your account is awaiting admin approval. You will be notified when approved.'
            : 'Your account was rejected. Please contact support for assistance.'
          }
        </Text>
      </View>
    );
  }

  // Check if user has a valid role assigned
  if (userData && userData.status === 'approved' && !userData.role) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F9FAFB', padding: 20 }}>
        <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#111827', marginBottom: 8, textAlign: 'center' }}>
          Role Assignment Pending
        </Text>
        <Text style={{ fontSize: 14, color: '#6B7280', textAlign: 'center', marginBottom: 20 }}>
          Your role is being assigned by admin. Please try again later.
        </Text>
      </View>
    );
  }

  // Role-based navigation for approved users with assigned roles
  if (userData && userData.status === 'approved' && userData.role) {
    // Admin users get full tab navigation
    if (userData.role === 'admin') {
      return (
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <Stack>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="signup" options={{ headerShown: false }} />
            <Stack.Screen name="+not-found" />
          </Stack>
          <StatusBar style="auto" />
        </ThemeProvider>
      );
    }

    // All other roles get role-based single dashboard
    return (
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <RoleBasedNavigator />
        <StatusBar style="auto" />
      </ThemeProvider>
    );
  }

  // Fallback - should not reach here if auth is working properly
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F9FAFB' }}>
      <ActivityIndicator size="large" color="#3B82F6" />
      <Text style={{ marginTop: 16, color: '#6B7280' }}>Loading user data...</Text>
    </View>
  );
}

export default function RootLayout() {
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  if (!loaded) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <DriverProvider>
          <AppContent />
        </DriverProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
