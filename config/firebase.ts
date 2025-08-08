import { initializeApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAfHhxPGKwXM1K1OSHh7o0BBs-bvtIrqnM",
  authDomain: "bingoz-app.firebaseapp.com",
  projectId: "bingoz-app",
  storageBucket: "bingoz-app.firebasestorage.app",
  messagingSenderId: "820389310142",
  appId: "1:820389310142:web:99367393a057aef085f8ef",
  measurementId: "G-Z35GQ56VDX"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services with AsyncStorage persistence
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage)
});
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;
