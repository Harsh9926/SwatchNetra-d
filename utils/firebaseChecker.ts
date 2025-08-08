import { auth, db } from '../config/firebase';

export const checkFirebaseConfiguration = async () => {
  console.log('🔥 Checking Firebase Configuration...');
  
  try {
    // Check if Firebase app is initialized
    console.log('✅ Firebase app initialized');
    console.log('📱 App name:', auth.app.name);
    console.log('🔑 Project ID:', auth.app.options.projectId);
    
    // Check Auth configuration
    console.log('🔐 Auth instance:', auth ? 'Available' : 'Not available');
    
    // Check Firestore configuration
    console.log('📊 Firestore instance:', db ? 'Available' : 'Not available');
    
    return {
      success: true,
      projectId: auth.app.options.projectId,
      authAvailable: !!auth,
      firestoreAvailable: !!db
    };
  } catch (error) {
    console.error('❌ Firebase configuration error:', error);
    return {
      success: false,
      error: error
    };
  }
};
