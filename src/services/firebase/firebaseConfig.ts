import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, 
  initializeFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager,
  Firestore 
} from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import firebaseConfigJson from '../../../firebase-applet-config.json';

const firebaseConfig = {
  apiKey: firebaseConfigJson.apiKey,
  authDomain: firebaseConfigJson.authDomain,
  projectId: firebaseConfigJson.projectId,
  storageBucket: firebaseConfigJson.storageBucket,
  messagingSenderId: firebaseConfigJson.messagingSenderId,
  appId: firebaseConfigJson.appId,
};

// Initialize Firebase safely (avoiding duplicate app initialization in hot reloads)
export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Firestore with Persistent Local Cache for offline support
let firestoreDb: Firestore | null = null;
try {
  firestoreDb = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager(),
    }),
  });
} catch (error) {
  // If already initialized or if IndexedDB is restricted in iframe/container
  try {
    firestoreDb = getFirestore(app);
  } catch (err) {
    console.warn('Firebase Firestore initialization notice:', err);
  }
}

export const db = firestoreDb;

// Initialize Storage
let firebaseStorage: FirebaseStorage | null = null;
try {
  firebaseStorage = getStorage(app);
} catch (error) {
  console.warn('Firebase Storage initialization notice:', error);
}

export const storage = firebaseStorage;
