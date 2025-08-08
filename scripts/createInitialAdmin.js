const { initializeApp } = require('firebase/app');
const { getAuth, createUserWithEmailAndPassword } = require('firebase/auth');
const { getFirestore, doc, setDoc } = require('firebase/firestore');

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBOJGGJGJGJGJGJGJGJGJGJGJGJGJGJGJG",
  authDomain: "swachnetra-admin.firebaseapp.com",
  projectId: "swachnetra-admin",
  storageBucket: "swachnetra-admin.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdefghijklmnopqrstuvwxyz"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

async function createInitialAdmin() {
  try {
    console.log('🔧 Creating initial admin user...');

    // Create admin user in Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      'harsh@gmail.com',
      'harsh123'
    );

    const user = userCredential.user;
    console.log('✅ Admin user created in Firebase Auth:', user.email);

    // Add admin user data to Firestore
    await setDoc(doc(db, 'users', user.uid), {
      uid: user.uid,
      email: user.email,
      name: 'Harsh (Admin)',
      role: 'admin',
      status: 'approved',
      createdAt: new Date(),
      isAdmin: true
    });

    console.log('✅ Admin user data added to Firestore');
    console.log('🎉 Initial admin setup complete!');
    console.log('');
    console.log('Admin Login Credentials:');
    console.log('Email: harsh@gmail.com');
    console.log('Password: harsh123');
    console.log('');

  } catch (error) {
    if (error.code === 'auth/email-already-in-use') {
      console.log('ℹ️  Admin user already exists');
      console.log('Email: harsh@gmail.com');
      console.log('Password: harsh123');
    } else {
      console.error('❌ Error creating admin user:', error.message);
    }
  }

  process.exit(0);
}

// Run the script
createInitialAdmin();
