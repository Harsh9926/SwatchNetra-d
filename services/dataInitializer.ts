import { collection, addDoc, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';

export const initializeFirestoreData = async () => {
  try {
    // Check if data already exists
    const usersSnap = await getDocs(collection(db, 'users'));
    if (usersSnap.size > 0) {
      console.log('Data already exists, skipping initialization');
      return;
    }

    console.log('Initializing Firestore with sample data...');

    // Initialize enhanced users with new roles
    const enhancedUsers = [
      {
        name: 'Dr. Rajesh Sharma',
        email: 'rajesh.sharma@pmc.gov.in',
        role: 'ZI',
        phone: '+91 9876543200',
        zone: 'Zone A',
        status: 'active',
        joinDate: '2023-01-15',
        employeeId: 'PMC-ZI-001',
        department: 'Administration',
        lastLogin: new Date().toISOString()
      },
      {
        name: 'Ms. Priya Patel',
        email: 'priya.patel@pmc.gov.in',
        role: 'HR',
        phone: '+91 9876543201',
        zone: 'Central Office',
        status: 'active',
        joinDate: '2023-02-10',
        employeeId: 'PMC-HR-001',
        department: 'Human Resources',
        lastLogin: new Date().toISOString()
      },
      {
        name: 'Mr. Vikram Singh',
        email: 'vikram.singh@pmc.gov.in',
        role: 'Contractor',
        phone: '+91 9876543202',
        zone: 'Zone B',
        status: 'active',
        joinDate: '2023-03-05',
        employeeId: 'PMC-C-001',
        department: 'Waste Management',
        supervisor: 'Dr. Rajesh Sharma'
      },
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
        supervisor: 'Dr. Rajesh Sharma'
      },
      {
        name: 'Sunita Devi',
        email: 'sunita.devi@pmc.gov.in',
        role: 'Driver',
        phone: '+91 9876543211',
        zone: 'Zone A',
        status: 'active',
        joinDate: '2024-02-20',
        employeeId: 'PMC-D-001',
        department: 'Transport',
        supervisor: 'Mr. Vikram Singh'
      }
    ];

    for (const user of enhancedUsers) {
      await addDoc(collection(db, 'users'), user);
    }

    // Initialize Requests
    const requests = [
      {
        type: 'Worker',
        title: 'Additional Sanitation Workers for Festival Season',
        description: 'Request for 5 additional sanitation workers for Zone A during the upcoming Ganesh festival. Expected duration: 15 days. Workers needed for crowd management and increased waste collection.',
        status: 'pending',
        priority: 'high',
        submittedBy: 'Dr. Rajesh Sharma (ZI)',
        submittedDate: new Date().toISOString(),
        zone: 'Zone A',
        department: 'Sanitation',
        requestData: {
          requiredWorkers: 5,
          duration: '15 days',
          skills: 'Crowd management, waste sorting, festival cleanup',
          estimatedCost: '₹75,000',
          urgency: 'Festival preparation'
        }
      },
      {
        type: 'Driver',
        title: 'Replacement Driver for Medical Leave',
        description: 'Current driver Sunita Devi is on medical leave for 2 weeks. Need immediate replacement for garbage truck PMC-001 operations in Zone A.',
        status: 'approved',
        priority: 'urgent',
        submittedBy: 'Ms. Priya Patel (HR)',
        submittedDate: new Date(Date.now() - 86400000).toISOString(),
        zone: 'Zone A',
        department: 'Transport',
        approvedBy: 'Admin',
        approvedDate: new Date().toISOString(),
        requestData: {
          vehicleNumber: 'PMC-001',
          licenseRequired: 'Heavy Vehicle License',
          duration: '2 weeks',
          replacementFor: 'Sunita Devi',
          urgency: 'Immediate - Service disruption'
        }
      },
      {
        type: 'Vehicle',
        title: 'New Compactor Vehicle for Zone C',
        description: 'Request for procurement of new compactor vehicle to handle increased waste volume in Zone C. Current vehicle is frequently breaking down and causing service delays.',
        status: 'forwarded',
        priority: 'medium',
        submittedBy: 'Mr. Vikram Singh (Contractor)',
        submittedDate: new Date(Date.now() - 172800000).toISOString(),
        zone: 'Zone C',
        department: 'Waste Management',
        forwardedTo: 'Municipal Commissioner',
        requestData: {
          vehicleType: 'Compactor Truck',
          capacity: '10 tons',
          estimatedCost: '₹25,00,000',
          justification: 'Current vehicle breakdown frequency: 3 times/week',
          specifications: 'Euro 6 compliant, GPS enabled'
        }
      },
      {
        type: 'Worker',
        title: 'Night Shift Cleaning Crew for Commercial Areas',
        description: 'Request for dedicated night shift cleaning crew for commercial complexes and markets. Current day shift is insufficient for maintaining cleanliness standards.',
        status: 'rejected',
        priority: 'low',
        submittedBy: 'Rajesh Kumar (Worker)',
        submittedDate: new Date(Date.now() - 259200000).toISOString(),
        zone: 'Zone D',
        department: 'Sanitation',
        rejectionReason: 'Budget constraints for current fiscal year. Proposal can be reconsidered in next budget cycle.',
        requestData: {
          shiftTiming: '10 PM - 6 AM',
          teamSize: 8,
          areas: 'Commercial complexes, wholesale markets, shopping areas',
          estimatedMonthlyCost: '₹2,40,000'
        }
      }
    ];

    for (const request of requests) {
      await addDoc(collection(db, 'requests'), request);
    }

    // Enhanced users already added above

    // Initialize Vehicles
    const vehicles = [
      {
        number: 'PMC-001',
        type: 'Garbage Truck',
        driver: 'Priya Sharma',
        status: 'active',
        location: 'Zone A',
        fuel: 75,
        maintenance: 'Good'
      },
      {
        number: 'PMC-002',
        type: 'Compactor',
        driver: 'Vikram Singh',
        status: 'maintenance',
        location: 'Workshop',
        fuel: 45,
        maintenance: 'Due'
      },
      {
        number: 'PMC-003',
        type: 'Sweeper',
        driver: 'Rajesh Kumar',
        status: 'active',
        location: 'Zone B',
        fuel: 90,
        maintenance: 'Good'
      },
      {
        number: 'PMC-004',
        type: 'Garbage Truck',
        driver: 'Amit Patel',
        status: 'active',
        location: 'Zone C',
        fuel: 60,
        maintenance: 'Good'
      }
    ];

    for (const vehicle of vehicles) {
      await addDoc(collection(db, 'vehicles'), vehicle);
    }

    // Initialize Zones
    const zones = [
      {
        name: 'Zone A - Central',
        area: 'Shivajinagar, Camp, Pune Cantonment',
        activeWorkers: 45,
        totalWorkers: 50,
        activeVehicles: 8,
        totalVehicles: 10,
        lastCollection: new Date().toISOString(),
        status: 'active',
        coverage: 95
      },
      {
        name: 'Zone B - East',
        area: 'Koregaon Park, Kalyani Nagar, Viman Nagar',
        activeWorkers: 38,
        totalWorkers: 45,
        activeVehicles: 6,
        totalVehicles: 8,
        lastCollection: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
        status: 'active',
        coverage: 88
      },
      {
        name: 'Zone C - West',
        area: 'Baner, Aundh, Pashan',
        activeWorkers: 25,
        totalWorkers: 40,
        activeVehicles: 4,
        totalVehicles: 7,
        lastCollection: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
        status: 'maintenance',
        coverage: 72
      },
      {
        name: 'Zone D - South',
        area: 'Kothrud, Warje, Karve Nagar',
        activeWorkers: 42,
        totalWorkers: 48,
        activeVehicles: 7,
        totalVehicles: 9,
        lastCollection: new Date(Date.now() - 1800000).toISOString(), // 30 minutes ago
        status: 'active',
        coverage: 92
      }
    ];

    for (const zone of zones) {
      await addDoc(collection(db, 'zones'), zone);
    }

    // Initialize Drivers (separate from users for vehicle assignment)
    const drivers = [
      {
        name: 'Priya Sharma',
        licenseNumber: 'MH12-2024-001',
        phone: '+91 9876543211',
        experience: '5 years',
        status: 'active',
        currentVehicle: 'PMC-001'
      },
      {
        name: 'Vikram Singh',
        licenseNumber: 'MH12-2024-002',
        phone: '+91 9876543214',
        experience: '3 years',
        status: 'active',
        currentVehicle: 'PMC-002'
      },
      {
        name: 'Ravi Patil',
        licenseNumber: 'MH12-2024-003',
        phone: '+91 9876543215',
        experience: '7 years',
        status: 'active',
        currentVehicle: 'PMC-003'
      }
    ];

    for (const driver of drivers) {
      await addDoc(collection(db, 'drivers'), driver);
    }

    // Initialize Workers (separate collection for detailed worker info)
    const workers = [
      {
        name: 'Rajesh Kumar',
        employeeId: 'PMC-W-001',
        phone: '+91 9876543210',
        zone: 'Zone A',
        shift: 'Morning',
        status: 'active',
        joinDate: '2024-01-15'
      },
      {
        name: 'Sunita Devi',
        employeeId: 'PMC-W-002',
        phone: '+91 9876543213',
        zone: 'Zone A',
        shift: 'Evening',
        status: 'active',
        joinDate: '2024-03-05'
      },
      {
        name: 'Ganesh Rao',
        employeeId: 'PMC-W-003',
        phone: '+91 9876543216',
        zone: 'Zone B',
        shift: 'Morning',
        status: 'active',
        joinDate: '2024-02-10'
      }
    ];

    for (const worker of workers) {
      await addDoc(collection(db, 'workers'), worker);
    }

    console.log('Firestore data initialization completed successfully!');
  } catch (error) {
    console.error('Error initializing Firestore data:', error);
  }
};
