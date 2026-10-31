import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, 
  initializeFirestore, 
  memoryLocalCache, 
  doc, 
  getDocFromServer, 
  Firestore 
} from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import { getAuth, Auth } from 'firebase/auth';
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

// Initialize Firestore with memoryLocalCache to eliminate multi-tab lease contention in iframes
const firestoreDbId = (firebaseConfigJson as any).firestoreDatabaseId || undefined;
let firestoreDb: Firestore | null = null;

try {
  firestoreDb = initializeFirestore(
    app, 
    {
      ignoreUndefinedProperties: true,
      localCache: memoryLocalCache(),
    },
    firestoreDbId
  );
} catch (err) {
  try {
    firestoreDb = getFirestore(app, firestoreDbId);
  } catch (fallbackErr) {
    console.warn('Firebase Firestore initialization notice:', fallbackErr);
  }
}

export const db = firestoreDb;

// Validate Connection to Firestore as per Firebase skill guidelines
async function testConnection() {
  if (!db) return;
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration.");
    }
  }
}
testConnection();

// Initialize Storage
let firebaseStorage: FirebaseStorage | null = null;
try {
  firebaseStorage = getStorage(app);
} catch (error) {
  console.warn('Firebase Storage initialization notice:', error);
}

export const storage = firebaseStorage;

// Initialize Firebase Auth
let firebaseAuth: Auth | null = null;
try {
  firebaseAuth = getAuth(app);
} catch (error) {
  console.warn('Firebase Auth initialization notice:', error);
}

export const auth = firebaseAuth;
