import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  updateProfile
} from 'firebase/auth';
import { auth, db } from '../config/firebase';
import { checkFirebaseConfiguration } from '../utils/firebaseChecker';
import { doc, setDoc, addDoc, collection, getDoc } from 'firebase/firestore';

export type UserRole = 'admin' | 'zi' | 'contractor' | 'hr' | 'driver';
export type UserStatus = 'pending' | 'approved' | 'rejected';

export interface UserData {
  uid: string;
  email: string;
  role: UserRole | null; // Can be null until admin approves
  name: string;
  status: UserStatus;
  createdAt: Date;
  requestedRole?: UserRole; // The role user requested during registration
}

interface AuthContextType {
  user: User | null;
  userData: UserData | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string, role: UserRole) => Promise<void>;
  logout: () => Promise<void>;
  getUserRole: () => UserRole | null;
  getUserStatus: () => UserStatus | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch user data from Firestore
  const fetchUserData = async (uid: string): Promise<UserData | null> => {
    try {
      const userDoc = await getDoc(doc(db, 'users', uid));
      if (userDoc.exists()) {
        return userDoc.data() as UserData;
      }

      // If user doesn't exist in Firestore but exists in Auth,
      // check if it's harsh@gmail.com (the only admin) and create the document
      const currentUser = auth.currentUser;
      if (currentUser) {
        const email = currentUser.email;
        if (email === 'harsh@gmail.com') {
          console.log('Creating admin user document for:', email);
          const userData: UserData = {
            uid: currentUser.uid,
            email: currentUser.email!,
            name: 'Harsh (Owner)',
            role: 'admin',
            status: 'approved',
            createdAt: new Date()
          };

          // Create the user document in Firestore
          await setDoc(doc(db, 'users', currentUser.uid), userData);
          return userData;
        }
      }

      return null;
    } catch (error) {
      console.error('Error fetching user data:', error);
      return null;
    }
  };

  useEffect(() => {
    // Check Firebase configuration on startup
    checkFirebaseConfiguration();

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log('🔐 Auth state changed:', user ? 'User logged in' : 'User logged out');
      setUser(user);

      if (user) {
        // Fetch user role and data from Firestore
        const userData = await fetchUserData(user.uid);
        setUserData(userData);
      } else {
        setUserData(null);
      }

      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const login = async (email: string, password: string): Promise<void> => {
    try {
      console.log('🔐 Attempting login for:', email);
      const result = await signInWithEmailAndPassword(auth, email, password);
      console.log('✅ Login successful:', result.user.email);

      // Check user status after successful authentication
      const userData = await fetchUserData(result.user.uid);
      if (userData) {
        if (userData.status === 'pending') {
          await signOut(auth); // Sign out immediately
          throw new Error('Your account is awaiting admin approval.');
        } else if (userData.status === 'rejected') {
          await signOut(auth); // Sign out immediately
          throw new Error('Your account was rejected. Contact support.');
        } else if (userData.status === 'approved' && !userData.role) {
          await signOut(auth); // Sign out immediately
          throw new Error('Your role is being assigned by admin. Please try again later.');
        }
        // If approved and has role, continue with login
      }
    } catch (error: any) {
      console.error('❌ Login error:', error);

      // Handle specific Firebase errors
      if (error.code === 'auth/configuration-not-found') {
        throw new Error('Firebase Authentication is not properly configured. Please enable Email/Password authentication in Firebase Console.');
      } else if (error.code === 'auth/user-not-found') {
        throw new Error('No account found with this email. Please sign up first.');
      } else if (error.code === 'auth/wrong-password') {
        throw new Error('Invalid password. Please try again.');
      } else if (error.code === 'auth/invalid-email') {
        throw new Error('Invalid email address.');
      } else {
        throw new Error(error.message || 'Login failed');
      }
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  };

  const register = async (email: string, password: string, name: string, requestedRole: UserRole): Promise<void> => {
    try {
      console.log('🆕 Creating user account:', email);

      // Prevent admin role registration
      if (requestedRole === 'admin') {
        throw new Error('Admin role registration is not allowed. Contact system administrator.');
      }

      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Save user data to Firestore with pending status and no role assigned yet
      const userData: UserData = {
        uid: user.uid,
        email: user.email!,
        role: null, // No role assigned yet
        name: name,
        status: 'pending',
        createdAt: new Date(),
        requestedRole: requestedRole // Store the requested role
      };

      await setDoc(doc(db, 'users', user.uid), userData);

      // Create a role request for admin approval
      await addDoc(collection(db, 'roleRequests'), {
        userId: user.uid,
        userEmail: user.email,
        userName: name,
        requestedRole: requestedRole,
        status: 'pending',
        requestedAt: new Date(),
        adminEmail: 'harsh@gmail.com' // Only harsh@gmail.com can approve
      });

      // Sign out immediately after registration
      await signOut(auth);

      console.log('✅ User account created successfully - role request sent to admin');
      throw new Error(`Account created successfully! Your request for ${requestedRole} role has been sent to the admin for approval. You will be notified when approved.`);
    } catch (error: any) {
      console.error('❌ Registration error:', error);

      // If it's our success message, re-throw it
      if (error.message.includes('Account created successfully')) {
        throw error;
      }

      // Handle specific Firebase errors
      if (error.code === 'auth/email-already-in-use') {
        throw new Error('This email is already registered. Please use a different email or try logging in.');
      } else if (error.code === 'auth/weak-password') {
        throw new Error('Password is too weak. Please use at least 6 characters.');
      } else if (error.code === 'auth/invalid-email') {
        throw new Error('Invalid email address.');
      } else {
        throw new Error(error.message || 'Registration failed');
      }
    }
  };

  const getUserRole = (): UserRole | null => {
    return userData?.role || null;
  };

  const getUserStatus = (): UserStatus | null => {
    return userData?.status || null;
  };

  const value: AuthContextType = {
    user,
    userData,
    loading,
    login,
    register,
    logout,
    getUserRole,
    getUserStatus
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
