import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  collection, 
  doc, 
  setDoc, 
  updateDoc, 
  onSnapshot, 
  query, 
  where,
  orderBy,
  addDoc,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from './AuthContext';

export type TripStatus = 'off-duty' | 'on-duty' | 'lunch' | 'break';

export interface DriverStatus {
  id: string;
  driverId: string;
  driverName: string;
  driverEmail: string;
  status: TripStatus;
  currentLocation?: string;
  wasteCollected: number; // in kg
  tripsCompleted: number;
  shiftStartTime?: Date;
  shiftEndTime?: Date;
  lastUpdated: Date;
  isActive: boolean;
}

export interface WasteCollection {
  id: string;
  driverId: string;
  amount: number; // in kg
  location: string;
  timestamp: Date;
  tripId?: string;
}

export interface Attendance {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  date: string; // YYYY-MM-DD format
  checkInTime?: Date;
  checkOutTime?: Date;
  totalHours: number;
  status: 'present' | 'absent' | 'partial' | 'completed';
  isAutoMarked: boolean;
}

interface DriverContextType {
  driverStatus: DriverStatus | null;
  allDriverStatuses: DriverStatus[];
  wasteCollections: WasteCollection[];
  attendance: Attendance | null;
  trips: any[];
  currentTrip: any | null;
  loading: boolean;
  updateDriverStatus: (status: TripStatus, location?: string) => Promise<void>;
  addWasteCollection: (amount: number, location: string) => Promise<void>;
  startTrip: (route: string, vehicleId?: string) => Promise<string | undefined>;
  completeTrip: (totalWaste?: number) => Promise<void>;
  updateLiveLocation: (latitude: number, longitude: number, address?: string) => Promise<void>;
  markAttendance: (type: 'checkin' | 'checkout') => Promise<void>;
}

const DriverContext = createContext<DriverContextType | undefined>(undefined);

export const useDriver = () => {
  const context = useContext(DriverContext);
  if (context === undefined) {
    throw new Error('useDriver must be used within a DriverProvider');
  }
  return context;
};

export const DriverProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { userData } = useAuth();
  const [driverStatus, setDriverStatus] = useState<DriverStatus | null>(null);
  const [allDriverStatuses, setAllDriverStatuses] = useState<DriverStatus[]>([]);
  const [wasteCollections, setWasteCollections] = useState<WasteCollection[]>([]);
  const [attendance, setAttendance] = useState<Attendance | null>(null);
  const [trips, setTrips] = useState<any[]>([]);
  const [currentTrip, setCurrentTrip] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  // Initialize driver status and listeners
  useEffect(() => {
    if (!userData) {
      setLoading(false);
      return;
    }

    // Listen to all driver statuses (for admin)
    const statusQuery = query(
      collection(db, 'driverStatuses'),
      orderBy('lastUpdated', 'desc')
    );

    const unsubscribeStatuses = onSnapshot(statusQuery, (snapshot) => {
      const statuses = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        shiftStartTime: doc.data().shiftStartTime?.toDate(),
        shiftEndTime: doc.data().shiftEndTime?.toDate(),
        lastUpdated: doc.data().lastUpdated?.toDate() || new Date()
      })) as DriverStatus[];

      setAllDriverStatuses(statuses);

      // Set current user's status if they're a driver
      if (userData.role === 'driver') {
        const userStatus = statuses.find(s => s.driverId === userData.uid);
        setDriverStatus(userStatus || null);
      }

      setLoading(false);
    });

    // Listen to waste collections for current user
    if (userData.role === 'driver') {
      const today = new Date().toISOString().split('T')[0];
      const wasteQuery = query(
        collection(db, 'wasteCollections'),
        where('driverId', '==', userData.uid),
        where('date', '==', today),
        orderBy('timestamp', 'desc')
      );

      const unsubscribeWaste = onSnapshot(wasteQuery, (snapshot) => {
        const collections = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          timestamp: doc.data().timestamp?.toDate() || new Date()
        })) as WasteCollection[];

        setWasteCollections(collections);
      });

      // Listen to attendance for current user
      const attendanceQuery = query(
        collection(db, 'attendance'),
        where('userId', '==', userData.uid),
        where('date', '==', today)
      );

      const unsubscribeAttendance = onSnapshot(attendanceQuery, (snapshot) => {
        if (!snapshot.empty) {
          const attendanceDoc = snapshot.docs[0];
          const attendanceData = {
            id: attendanceDoc.id,
            ...attendanceDoc.data(),
            checkInTime: attendanceDoc.data().checkInTime?.toDate(),
            checkOutTime: attendanceDoc.data().checkOutTime?.toDate()
          } as Attendance;
          setAttendance(attendanceData);
        } else {
          setAttendance(null);
        }
      });

      return () => {
        unsubscribeStatuses();
        unsubscribeWaste();
        unsubscribeAttendance();
      };
    }

    return () => {
      unsubscribeStatuses();
    };
  }, [userData]);

  const updateDriverStatus = async (status: TripStatus, location?: string) => {
    if (!userData || userData.role !== 'driver') return;

    try {
      const statusData: Partial<DriverStatus> = {
        driverId: userData.uid,
        driverName: userData.name,
        driverEmail: userData.email,
        status,
        currentLocation: location || 'Location not set',
        lastUpdated: new Date(),
        isActive: status !== 'off-duty'
      };

      // If going on duty, set shift start time
      if (status === 'on-duty' && (!driverStatus || driverStatus.status === 'off-duty')) {
        statusData.shiftStartTime = new Date();
        statusData.wasteCollected = 0;
        statusData.tripsCompleted = 0;
        
        // Auto mark attendance check-in
        await markAttendance('checkin');
      }

      // If going off duty, set shift end time
      if (status === 'off-duty' && driverStatus && driverStatus.status !== 'off-duty') {
        statusData.shiftEndTime = new Date();
        
        // Auto mark attendance check-out
        await markAttendance('checkout');
      }

      const statusRef = doc(db, 'driverStatuses', userData.uid);
      await setDoc(statusRef, statusData, { merge: true });

      console.log('✅ Driver status updated:', status);
    } catch (error) {
      console.error('❌ Error updating driver status:', error);
      throw error;
    }
  };

  const addWasteCollection = async (amount: number, location: string) => {
    if (!userData || userData.role !== 'driver') return;

    try {
      const wasteData: Omit<WasteCollection, 'id'> = {
        driverId: userData.uid,
        amount,
        location,
        timestamp: new Date()
      };

      await addDoc(collection(db, 'wasteCollections'), {
        ...wasteData,
        timestamp: serverTimestamp(),
        date: new Date().toISOString().split('T')[0]
      });

      // Update driver status with new waste collected total
      if (driverStatus) {
        const newTotal = driverStatus.wasteCollected + amount;
        await updateDoc(doc(db, 'driverStatuses', userData.uid), {
          wasteCollected: newTotal
        });
      }

      console.log('✅ Waste collection added:', amount, 'kg at', location);
    } catch (error) {
      console.error('❌ Error adding waste collection:', error);
      throw error;
    }
  };

  const startTrip = async (route: string, vehicleId?: string) => {
    if (!userData || userData.role !== 'driver') return;

    try {
      const tripData = {
        driverId: userData.uid,
        driverName: userData.name,
        route,
        vehicleId: vehicleId || userData.vehicleId || `VEH-${userData.uid.slice(-6)}`,
        startTime: new Date(),
        status: 'in-progress',
        wasteCollected: 0,
        locations: [],
        createdAt: new Date()
      };

      const tripRef = await addDoc(collection(db, 'trips'), {
        ...tripData,
        startTime: serverTimestamp(),
        createdAt: serverTimestamp()
      });

      setCurrentTrip({ id: tripRef.id, ...tripData });

      // Update driver status to on-duty if not already
      if (driverStatus?.status !== 'on-duty') {
        await updateDriverStatus('on-duty');
      }

      console.log('✅ Trip started:', tripRef.id);
      return tripRef.id;
    } catch (error) {
      console.error('❌ Error starting trip:', error);
      throw error;
    }
  };

  const completeTrip = async (totalWaste?: number) => {
    if (!userData || userData.role !== 'driver' || !currentTrip) return;

    try {
      // Update trip as completed
      await updateDoc(doc(db, 'trips', currentTrip.id), {
        endTime: serverTimestamp(),
        status: 'completed',
        totalWasteCollected: totalWaste || currentTrip.wasteCollected,
        completedAt: new Date()
      });

      // Update driver status
      const newTripsCompleted = (driverStatus?.tripsCompleted || 0) + 1;
      await updateDoc(doc(db, 'driverStatuses', userData.uid), {
        tripsCompleted: newTripsCompleted,
        lastTripCompleted: new Date()
      });

      setCurrentTrip(null);
      console.log('✅ Trip completed. Total trips:', newTripsCompleted);
    } catch (error) {
      console.error('❌ Error completing trip:', error);
      throw error;
    }
  };

  const updateLiveLocation = async (latitude: number, longitude: number, address?: string) => {
    if (!userData) return;

    try {
      const locationData = {
        latitude,
        longitude,
        address: address || 'Unknown location',
        timestamp: new Date(),
        driverId: userData.uid,
        driverName: userData.name
      };

      // Update driver status with current location
      await updateDoc(doc(db, 'driverStatuses', userData.uid), {
        currentLocation: address || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
        latitude,
        longitude,
        lastLocationUpdate: serverTimestamp()
      });

      // Add to location history
      await addDoc(collection(db, 'locationHistory'), {
        ...locationData,
        timestamp: serverTimestamp()
      });

      // If on a trip, update trip location
      if (currentTrip) {
        await updateDoc(doc(db, 'trips', currentTrip.id), {
          currentLocation: address || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
          latitude,
          longitude,
          lastLocationUpdate: serverTimestamp()
        });
      }

      console.log('✅ Live location updated:', address || `${latitude}, ${longitude}`);
    } catch (error) {
      console.error('❌ Error updating live location:', error);
      throw error;
    }
  };

  const markAttendance = async (type: 'checkin' | 'checkout') => {
    if (!userData) return;

    try {
      const today = new Date().toISOString().split('T')[0];
      const now = new Date();

      if (type === 'checkin') {
        const attendanceData: Omit<Attendance, 'id'> = {
          userId: userData.uid,
          userName: userData.name,
          userEmail: userData.email,
          date: today,
          checkInTime: now,
          totalHours: 0,
          status: 'present',
          isAutoMarked: true
        };

        await setDoc(doc(db, 'attendance', `${userData.uid}_${today}`), {
          ...attendanceData,
          checkInTime: serverTimestamp()
        });
      } else if (type === 'checkout' && attendance) {
        const checkInTime = attendance.checkInTime;
        if (checkInTime) {
          const totalHours = (now.getTime() - checkInTime.getTime()) / (1000 * 60 * 60);
          const status = totalHours >= 9 ? 'completed' : totalHours >= 4 ? 'partial' : 'present';

          await updateDoc(doc(db, 'attendance', `${userData.uid}_${today}`), {
            checkOutTime: serverTimestamp(),
            totalHours: Math.round(totalHours * 100) / 100,
            status
          });
        }
      }

      console.log('✅ Attendance marked:', type);
    } catch (error) {
      console.error('❌ Error marking attendance:', error);
      throw error;
    }
  };

  const value: DriverContextType = {
    driverStatus,
    allDriverStatuses,
    wasteCollections,
    attendance,
    trips,
    currentTrip,
    loading,
    updateDriverStatus,
    addWasteCollection,
    startTrip,
    completeTrip,
    updateLiveLocation,
    markAttendance
  };

  return (
    <DriverContext.Provider value={value}>
      {children}
    </DriverContext.Provider>
  );
};

export default DriverContext;
