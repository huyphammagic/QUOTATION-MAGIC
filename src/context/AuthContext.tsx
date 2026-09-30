/**
 * Phase 50.1: Hardened Production Authentication Context
 * Subscribes to real Firebase Auth state, exposes user identity,
 * and eliminates client-side simulation.
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User } from 'firebase/auth';
import { 
  subscribeToAuth, 
  loginWithEmail, 
  registerWithEmail, 
  logoutUser, 
  loginAnonymously,
  formatAuthUser, 
  AuthUserState 
} from '../services/firebase/authService';

interface AuthContextType {
  user: AuthUserState | null;
  firebaseUser: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (email: string, pass: string) => Promise<void>;
  register: (email: string, pass: string, displayName: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [user, setUser] = useState<AuthUserState | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeToAuth(async (fUser) => {
      if (fUser) {
        setFirebaseUser(fUser);
        setUser(formatAuthUser(fUser));
        setLoading(false);
      } else {
        // Unauthenticated state
        setFirebaseUser(null);
        setUser(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const login = useCallback(async (email: string, pass: string) => {
    setLoading(true);
    try {
      const u = await loginWithEmail(email, pass);
      setFirebaseUser(u);
      setUser(formatAuthUser(u));
    } finally {
      setLoading(false);
    }
  }, []);

  const register = useCallback(async (email: string, pass: string, displayName: string) => {
    setLoading(true);
    try {
      const u = await registerWithEmail(email, pass, displayName);
      setFirebaseUser(u);
      setUser(formatAuthUser(u));
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    setLoading(true);
    try {
      await logoutUser();
      setFirebaseUser(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const value: AuthContextType = {
    user,
    firebaseUser,
    loading,
    isAuthenticated: Boolean(firebaseUser),
    login,
    register,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
