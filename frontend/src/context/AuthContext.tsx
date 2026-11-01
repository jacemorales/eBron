import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User, Gender, Hall } from '../types';
import { api } from '../services/api';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  register: (data: {
    fullName: string;
    regNumber: string;
    matricNumber: string;
    schoolEmail: string;
    gender: Gender;
    hallOfResidence: Hall;
    roomNumber: string;
    password: string;
  }) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  updateProfile: (data: {
    fullName: string;
    gender: Gender;
    hallOfResidence: Hall;
    roomNumber: string;
  }) => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const AUTH_KEY = 'ebron_active_user';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(AUTH_KEY);
      if (saved) setUser(JSON.parse(saved));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  const login = async (email: string, pass: string) => {
    const res = await api.login(email, pass);
    if (res.success && res.user) {
      setUser(res.user);
      localStorage.setItem(AUTH_KEY, JSON.stringify(res.user));
      return { success: true };
    }
    return { success: false, error: res.error || 'Login failed.' };
  };

  const register = async (data: any) => {
    const res = await api.register(data);
    if (res.success && res.user) {
      setUser(res.user);
      localStorage.setItem(AUTH_KEY, JSON.stringify(res.user));
      return { success: true };
    }
    return { success: false, error: res.error || 'Registration failed.' };
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(AUTH_KEY);
  };

  const updateProfile = async (data: any) => {
    if (!user) return { success: false, error: 'Not authenticated' };
    const res = await api.updateDeliveryProfile(user.userId, data);
    if (res.success && res.user) {
      setUser(res.user);
      localStorage.setItem(AUTH_KEY, JSON.stringify(res.user));
      return { success: true };
    }
    return { success: false, error: res.error };
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const c = useContext(AuthContext);
  if (!c) throw new Error('useAuth must be within AuthProvider');
  return c;
}
