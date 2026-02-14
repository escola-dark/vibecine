import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  browserLocalPersistence,
  browserSessionPersistence,
  onAuthStateChanged,
  setPersistence,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  User,
} from 'firebase/auth';
import { ADMIN_EMAIL, auth } from '@/lib/firebase';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isCheckingAuth: boolean;
  isSigningIn: boolean;
  error: string | null;
  profileName: string;
  login: (email: string, password: string, rememberMe: boolean) => Promise<boolean>;
  logout: () => Promise<void>;
  updateProfileName: (name: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profileName, setProfileName] = useState('');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setProfileName(currentUser?.displayName || '');
      setIsCheckingAuth(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, password: string, rememberMe: boolean) => {
    setIsSigningIn(true);
    setError(null);

    try {
      await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence);
      await signInWithEmailAndPassword(auth, email.trim(), password);
      return true;
    } catch {
      setError('Falha no login. Verifique seu usuário e senha.');
      return false;
    } finally {
      setIsSigningIn(false);
    }
  };

  const logout = async () => {
    await signOut(auth);
  };

  const updateProfileName = async (name: string) => {
    const trimmed = name.trim();
    if (!auth.currentUser || !trimmed) {
      setError('Informe um nome válido para salvar.');
      return false;
    }

    try {
      await updateProfile(auth.currentUser, { displayName: trimmed });
      setProfileName(trimmed);
      setError(null);
      return true;
    } catch {
      setError('Não foi possível salvar o nome. Tente novamente.');
      return false;
    }
  };

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      isAuthenticated: !!user,
      isAdmin: (user?.email || '').toLowerCase() === ADMIN_EMAIL,
      isCheckingAuth,
      isSigningIn,
      error,
      profileName,
      login,
      logout,
      updateProfileName,
    }),
    [user, isCheckingAuth, isSigningIn, error, profileName],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
