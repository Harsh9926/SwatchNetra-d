import { 
  collection, 
  query, 
  where, 
  orderBy, 
  getDocs, 
  onSnapshot,
  startAfter,
  limit,
  Timestamp 
} from 'firebase/firestore';
import { db } from '../config/firebase';

export interface ChartData {
  labels: string[];
  datasets: {
    data: number[];
    color?: (opacity: number) => string;
    strokeWidth?: number;
  }[];
}

export interface WasteCollectionStats {
  totalWaste: number;
  dailyAverage: number;
  weeklyTrend: number[];
  monthlyTrend: number[];
  topCollectors: { name: string; amount: number }[];
}

export interface DriverPerformanceStats {
  totalDrivers: number;
  activeDrivers: number;
  totalTrips: number;
  averageTripsPerDriver: number;
  topPerformers: { name: string; trips: number; waste: number }[];
}

export interface ZoneStats {
  totalZones: number;
  activeZones: number;
  wasteByZone: { zone: string; amount: number }[];
  efficiencyByZone: { zone: string; efficiency: number }[];
}

class DataService {
  private static instance: DataService;

  static getInstance(): DataService {
    if (!DataService.instance) {
      DataService.instance = new DataService();
    }
    return DataService.instance;
  }

  async getWasteCollectionStats(days: number = 30): Promise<WasteCollectionStats> {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const wasteQuery = query(
        collection(db, 'wasteCollections'),
        where('timestamp', '>=', Timestamp.fromDate(startDate)),
        where('timestamp', '<=', Timestamp.fromDate(endDate)),
        orderBy('timestamp', 'desc')
      );

      const snapshot = await getDocs(wasteQuery);
      const collections = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate() || new Date()
      }));

      // Calculate total waste
      const totalWaste = collections.reduce((sum, item) => sum + (item.amount || 0), 0);
      const dailyAverage = totalWaste / days;

      // Calculate weekly trend (last 7 days)
      const weeklyTrend = this.calculateDailyTrend(collections, 7);
      
      // Calculate monthly trend (last 30 days)
      const monthlyTrend = this.calculateDailyTrend(collections, 30);

      // Get top collectors
      const collectorStats = this.groupByCollector(collections);
      const topCollectors = Object.entries(collectorStats)
        .map(([name, amount]) => ({ name, amount }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 5);

      return {
        totalWaste,
        dailyAverage,
        weeklyTrend,
        monthlyTrend,
        topCollectors
      };
    } catch (error) {
      console.error('Error getting waste collection stats:', error);
      return {
        totalWaste: 0,
        dailyAverage: 0,
        weeklyTrend: [],
        monthlyTrend: [],
        topCollectors: []
      };
    }
  }

  async getDriverPerformanceStats(): Promise<DriverPerformanceStats> {
    try {
      const driversQuery = query(collection(db, 'driverStatuses'));
      const snapshot = await getDocs(driversQuery);
      
      const drivers = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      const totalDrivers = drivers.length;
      const activeDrivers = drivers.filter(driver => driver.status === 'on-duty').length;
      const totalTrips = drivers.reduce((sum, driver) => sum + (driver.tripsCompleted || 0), 0);
      const averageTripsPerDriver = totalDrivers > 0 ? totalTrips / totalDrivers : 0;

      const topPerformers = drivers
        .map(driver => ({
          name: driver.driverName || 'Unknown',
          trips: driver.tripsCompleted || 0,
          waste: driver.wasteCollected || 0
        }))
        .sort((a, b) => b.trips - a.trips)
        .slice(0, 5);

      return {
        totalDrivers,
        activeDrivers,
        totalTrips,
        averageTripsPerDriver,
        topPerformers
      };
    } catch (error) {
      console.error('Error getting driver performance stats:', error);
      return {
        totalDrivers: 0,
        activeDrivers: 0,
        totalTrips: 0,
        averageTripsPerDriver: 0,
        topPerformers: []
      };
    }
  }

  async getZoneStats(): Promise<ZoneStats> {
    try {
      const zonesQuery = query(collection(db, 'zones'));
      const snapshot = await getDocs(zonesQuery);
      
      const zones = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      const totalZones = zones.length;
      const activeZones = zones.filter(zone => zone.isActive !== false).length;

      // Get waste collection by zone
      const wasteQuery = query(collection(db, 'wasteCollections'));
      const wasteSnapshot = await getDocs(wasteQuery);
      const wasteCollections = wasteSnapshot.docs.map(doc => doc.data());

      const wasteByZone = this.groupWasteByZone(wasteCollections, zones);
      const efficiencyByZone = this.calculateZoneEfficiency(zones);

      return {
        totalZones,
        activeZones,
        wasteByZone,
        efficiencyByZone
      };
    } catch (error) {
      console.error('Error getting zone stats:', error);
      return {
        totalZones: 0,
        activeZones: 0,
        wasteByZone: [],
        efficiencyByZone: []
      };
    }
  }

  generateWasteCollectionChart(data: number[]): ChartData {
    const labels = data.map((_, index) => {
      const date = new Date();
      date.setDate(date.getDate() - (data.length - 1 - index));
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    });

    return {
      labels,
      datasets: [{
        data,
        color: (opacity = 1) => `rgba(34, 197, 94, ${opacity})`,
        strokeWidth: 2
      }]
    };
  }

  generateDriverPerformanceChart(drivers: { name: string; trips: number }[]): ChartData {
    return {
      labels: drivers.map(d => d.name),
      datasets: [{
        data: drivers.map(d => d.trips),
        color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
        strokeWidth: 2
      }]
    };
  }

  private calculateDailyTrend(collections: any[], days: number): number[] {
    const trend = new Array(days).fill(0);
    const today = new Date();
    
    collections.forEach(collection => {
      const collectionDate = new Date(collection.timestamp);
      const daysDiff = Math.floor((today.getTime() - collectionDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysDiff >= 0 && daysDiff < days) {
        trend[days - 1 - daysDiff] += collection.amount || 0;
      }
    });
    
    return trend;
  }

  private groupByCollector(collections: any[]): Record<string, number> {
    const stats: Record<string, number> = {};
    
    collections.forEach(collection => {
      const driverId = collection.driverId || 'Unknown';
      stats[driverId] = (stats[driverId] || 0) + (collection.amount || 0);
    });
    
    return stats;
  }

  private groupWasteByZone(wasteCollections: any[], zones: any[]): { zone: string; amount: number }[] {
    const wasteByZone: Record<string, number> = {};
    
    // Initialize zones
    zones.forEach(zone => {
      wasteByZone[zone.name || zone.id] = 0;
    });
    
    // Group waste by zone (simplified - in real app, you'd match by location)
    wasteCollections.forEach(collection => {
      const zoneName = collection.zone || 'Unknown Zone';
      wasteByZone[zoneName] = (wasteByZone[zoneName] || 0) + (collection.amount || 0);
    });
    
    return Object.entries(wasteByZone)
      .map(([zone, amount]) => ({ zone, amount }))
      .sort((a, b) => b.amount - a.amount);
  }

  private calculateZoneEfficiency(zones: any[]): { zone: string; efficiency: number }[] {
    return zones.map(zone => ({
      zone: zone.name || zone.id,
      efficiency: Math.random() * 100 // Simplified - calculate based on actual metrics
    })).sort((a, b) => b.efficiency - a.efficiency);
  }

  // Real-time data subscription
  subscribeToWasteCollections(callback: (data: any[]) => void) {
    const q = query(
      collection(db, 'wasteCollections'),
      orderBy('timestamp', 'desc'),
      limit(50)
    );

    return onSnapshot(q, (snapshot) => {
      const collections = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate() || new Date()
      }));
      callback(collections);
    });
  }

  subscribeToDriverStatuses(callback: (data: any[]) => void) {
    const q = query(collection(db, 'driverStatuses'));

    return onSnapshot(q, (snapshot) => {
      const statuses = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        lastUpdated: doc.data().lastUpdated?.toDate() || new Date()
      }));
      callback(statuses);
    });
  }
}

export default DataService;
