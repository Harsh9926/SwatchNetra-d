// Script to create default admin user
// Run this once to create an admin account

import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, setDoc } from 'firebase/firestore';

// Your Firebase config (replace with your actual config)
const firebaseConfig = {
  // Add your Firebase config here
  apiKey: "your-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "your-sender-id",
  appId: "your-app-id"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

async function createAdminUser() {
  try {
    // Create admin user in Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(
      auth, 
      'admin@swachnetra.com', 
      'admin123'
    );
    
    const user = userCredential.user;
    
    // Add admin user data to Firestore
    await setDoc(doc(db, 'users', user.uid), {
      uid: user.uid,
      email: user.email,
      name: 'System Administrator',
      role: 'admin',
      status: 'approved',
      createdAt: new Date()
    });
    
    console.log('✅ Admin user created successfully!');
    console.log('Email: admin@swachnetra.com');
    console.log('Password: admin123');
    
  } catch (error) {
    console.error('❌ Error creating admin user:', error);
  }
}

createAdminUser();
