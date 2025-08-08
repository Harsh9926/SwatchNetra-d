import * as Location from 'expo-location';
import { Alert } from 'react-native';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

export interface LocationData {
  latitude: number;
  longitude: number;
  address: string;
  timestamp: Date;
  accuracy?: number;
}

class LocationService {
  private static instance: LocationService;
  private watchId: Location.LocationSubscription | null = null;
  private isTracking: boolean = false;

  static getInstance(): LocationService {
    if (!LocationService.instance) {
      LocationService.instance = new LocationService();
    }
    return LocationService.instance;
  }

  async requestPermissions(): Promise<boolean> {
    try {
      const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
      
      if (foregroundStatus !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Location permission is required for this feature to work properly.',
          [{ text: 'OK' }]
        );
        return false;
      }

      // Request background permissions for continuous tracking
      const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
      
      if (backgroundStatus !== 'granted') {
        Alert.alert(
          'Background Location',
          'Background location access will help track your location even when the app is closed.',
          [{ text: 'OK' }]
        );
      }

      return true;
    } catch (error) {
      console.error('Error requesting location permissions:', error);
      return false;
    }
  }

  async getCurrentLocation(): Promise<LocationData | null> {
    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) return null;

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
        maximumAge: 10000, // 10 seconds
      });

      const address = await this.reverseGeocode(
        location.coords.latitude,
        location.coords.longitude
      );

      return {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        address,
        timestamp: new Date(),
        accuracy: location.coords.accuracy || undefined,
      };
    } catch (error) {
      console.error('Error getting current location:', error);
      Alert.alert('Location Error', 'Unable to get your current location. Please try again.');
      return null;
    }
  }

  async startLocationTracking(userId: string, onLocationUpdate?: (location: LocationData) => void): Promise<boolean> {
    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) return false;

      if (this.isTracking) {
        console.log('Location tracking already started');
        return true;
      }

      this.watchId = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 30000, // Update every 30 seconds
          distanceInterval: 10, // Update when moved 10 meters
        },
        async (location) => {
          try {
            const address = await this.reverseGeocode(
              location.coords.latitude,
              location.coords.longitude
            );

            const locationData: LocationData = {
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
              address,
              timestamp: new Date(),
              accuracy: location.coords.accuracy || undefined,
            };

            // Update user location in Firebase
            await this.updateUserLocation(userId, locationData);

            // Call callback if provided
            if (onLocationUpdate) {
              onLocationUpdate(locationData);
            }

            console.log('Location updated:', address);
          } catch (error) {
            console.error('Error processing location update:', error);
          }
        }
      );

      this.isTracking = true;
      console.log('Location tracking started');
      return true;
    } catch (error) {
      console.error('Error starting location tracking:', error);
      Alert.alert('Tracking Error', 'Unable to start location tracking.');
      return false;
    }
  }

  async stopLocationTracking(): Promise<void> {
    try {
      if (this.watchId) {
        this.watchId.remove();
        this.watchId = null;
      }
      this.isTracking = false;
      console.log('Location tracking stopped');
    } catch (error) {
      console.error('Error stopping location tracking:', error);
    }
  }

  private async reverseGeocode(latitude: number, longitude: number): Promise<string> {
    try {
      const addresses = await Location.reverseGeocodeAsync({
        latitude,
        longitude,
      });

      if (addresses.length > 0) {
        const addr = addresses[0];
        const parts = [
          addr.streetNumber,
          addr.street,
          addr.district,
          addr.city,
          addr.region,
        ].filter(Boolean);

        return parts.length > 0 ? parts.join(', ') : 'Unknown Location';
      }

      return 'Unknown Location';
    } catch (error) {
      console.error('Error reverse geocoding:', error);
      return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
    }
  }

  private async updateUserLocation(userId: string, location: LocationData): Promise<void> {
    try {
      const userRef = doc(db, 'driverStatuses', userId);
      await updateDoc(userRef, {
        currentLocation: location.address,
        latitude: location.latitude,
        longitude: location.longitude,
        lastLocationUpdate: location.timestamp,
        locationAccuracy: location.accuracy,
      });
    } catch (error) {
      console.error('Error updating user location in Firebase:', error);
    }
  }

  async getDistanceBetween(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): Promise<number> {
    // Haversine formula to calculate distance between two points
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c; // Distance in kilometers
    
    return distance;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  isCurrentlyTracking(): boolean {
    return this.isTracking;
  }
}

export default LocationService;
