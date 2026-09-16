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

// Initialize Firestore with Long Polling enabled for iframe & proxy stability
let firestoreDb: Firestore | null = null;
const rawDatabaseId = (firebaseConfigJson as any).firestoreDatabaseId;
const databaseId = rawDatabaseId && rawDatabaseId !== '(default)' ? rawDatabaseId : undefined;

try {
  // Primary attempt: Persistent local cache + Long Polling for sandboxed iframe stability
  firestoreDb = initializeFirestore(
    app, 
    {
      experimentalForceLongPolling: true,
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager(),
      }),
    },
    databaseId
  );
} catch (primaryError) {
  // Secondary attempt: Fallback to memory cache + Long Polling if IndexedDB is restricted in sandboxed iframe
  try {
    firestoreDb = initializeFirestore(
      app,
      {
        experimentalForceLongPolling: true,
      },
      databaseId
    );
  } catch (fallbackError) {
    try {
      firestoreDb = getFirestore(app, databaseId);
    } catch (err) {
      console.warn('Firebase Firestore initialization notice:', err);
    }
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
