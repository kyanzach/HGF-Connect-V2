import React, { createContext, useContext, useEffect, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import { setSignOutHandler } from '@/api/client';

export interface HgfUser {
  id: number;
  firstName: string;
  lastName: string;
  fullName: string;
  username?: string | null;
  email?: string | null;
  phone?: string | null;
  role: string;
  status: string;
  type?: string;
  ageGroup?: string;
  favoriteVerse?: string | null;
  profilePicture?: string | null;
  coverPhoto?: string | null;
  ministries?: string[];
}

interface AuthContextType {
  user: HgfUser | null;
  isLoading: boolean;
  login: (token: string, member: HgfUser) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (partial: Partial<HgfUser>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<HgfUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setSignOutHandler(() => {
      setUser(null);
    });
    return () => {
      setSignOutHandler(() => {});
    };
  }, []);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const token = await SecureStore.getItemAsync('hgf_token');
        const userData = await SecureStore.getItemAsync('hgf_user');
        if (token && userData) {
          setUser(JSON.parse(userData));
        }
      } catch {
        // ignore
      } finally {
        setIsLoading(false);
      }
    };
    loadUser();
  }, []);

  const login = async (token: string, member: HgfUser) => {
    setIsLoading(true);
    try {
      await SecureStore.setItemAsync('hgf_token', token);
      await SecureStore.setItemAsync('hgf_user', JSON.stringify(member));
      setUser(member);
    } catch {
      setUser(member);
    } finally {
      setIsLoading(false);
    }
  };

  const updateUser = async (partial: Partial<HgfUser>) => {
    setUser((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...partial };
      SecureStore.setItemAsync('hgf_user', JSON.stringify(next)).catch(() => {});
      return next;
    });
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await SecureStore.deleteItemAsync('hgf_token');
      await SecureStore.deleteItemAsync('hgf_user');
      setUser(null);
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
