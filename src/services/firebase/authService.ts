/**
 * Phase 50: Production Firebase Authentication Service
 * Manages real Firebase Auth state, session persistence, login, registration, and user identity.
 * Zero mock users, real Firebase UID enforcement.
 */

import { 
  User, 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  updateProfile,
  signInAnonymously,
  NextOrObserver
} from 'firebase/auth';
import { auth } from './firebaseConfig';
import { recordHealthAudit } from '../audit/systemHealthAuditService';

export interface AuthUserState {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  isAnonymous: boolean;
}

export function formatAuthUser(user: User | null): AuthUserState | null {
  if (!user) return null;
  return {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName || user.email?.split('@')[0] || 'Logistics Member',
    photoURL: user.photoURL,
    isAnonymous: user.isAnonymous,
  };
}

/**
 * Subscribes to real-time Firebase Auth state changes
 */
export function subscribeToAuth(callback: (user: User | null) => void): () => void {
  if (!auth) {
    callback(null);
    return () => {};
  }
  return onAuthStateChanged(auth, callback);
}

/**
 * Sign in with email and password
 */
export async function loginWithEmail(email: string, pass: string): Promise<User> {
  if (!auth) throw new Error('Firebase Auth is not initialized');
  const cred = await signInWithEmailAndPassword(auth, email.trim(), pass);
  
  await recordHealthAudit({
    userId: cred.user.uid,
    companyId: 'AUTH_SYSTEM',
    entityType: 'System' as any,
    entityId: cred.user.uid,
    action: 'USER_LOGIN' as any,
    result: 'SUCCESS',
    details: `User logged in: ${cred.user.email} (${cred.user.uid})`,
  });

  return cred.user;
}

/**
 * Register a new user with email and password
 */
export async function registerWithEmail(
  email: string, 
  pass: string, 
  displayName: string
): Promise<User> {
  if (!auth) throw new Error('Firebase Auth is not initialized');
  const cred = await createUserWithEmailAndPassword(auth, email.trim(), pass);
  
  if (displayName && displayName.trim()) {
    await updateProfile(cred.user, { displayName: displayName.trim() });
  }

  await recordHealthAudit({
    userId: cred.user.uid,
    companyId: 'AUTH_SYSTEM',
    entityType: 'System' as any,
    entityId: cred.user.uid,
    action: 'USER_REGISTER' as any,
    result: 'SUCCESS',
    details: `New user registered: ${cred.user.email} (${cred.user.uid})`,
  });

  return cred.user;
}

/**
 * Sign in anonymously as a fallback (guarantees a real Firebase UID is always issued for rules)
 */
export async function loginAnonymously(): Promise<User> {
  if (!auth) throw new Error('Firebase Auth is not initialized');
  const cred = await signInAnonymously(auth);

  await recordHealthAudit({
    userId: cred.user.uid,
    companyId: 'AUTH_SYSTEM',
    entityType: 'System' as any,
    entityId: cred.user.uid,
    action: 'USER_LOGIN_ANONYMOUS' as any,
    result: 'SUCCESS',
    details: `Anonymous user session created: ${cred.user.uid}`,
  });

  return cred.user;
}

/**
 * Sign out current user
 */
export async function logoutUser(): Promise<void> {
  if (!auth) return;
  const currentUid = auth.currentUser?.uid || 'unknown';
  const currentEmail = auth.currentUser?.email || 'unknown';
  
  await signOut(auth);

  await recordHealthAudit({
    userId: currentUid,
    companyId: 'AUTH_SYSTEM',
    entityType: 'System' as any,
    entityId: currentUid,
    action: 'USER_LOGOUT' as any,
    result: 'SUCCESS',
    details: `User logged out: ${currentEmail} (${currentUid})`,
  });
}

/**
 * Returns current authenticated user or null
 */
export function getCurrentAuthUser(): User | null {
  return auth?.currentUser || null;
}
