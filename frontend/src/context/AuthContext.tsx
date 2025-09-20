'use client';

import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { User, AuthState, LoginRequest, RegisterRequest } from '@/types';
import { apiClient } from '@/lib/api';
import toast from 'react-hot-toast';

interface AuthContextType extends AuthState {
  login: (credentials: LoginRequest) => Promise<void>;
  register: (userData: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  const [user, setUser] = useState<User | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | undefined>(undefined);

  const refreshUser = async () => {
    try {
      setIsLoading(true);
      setError(undefined);
      
      const response = await apiClient.getProfile();
      if (response.success && response.data) {
        setUser(response.data);
      } else {
        setUser(undefined);
      }
    } catch {
      // Silently handle auth errors on refresh
      setUser(undefined);
      setError(undefined);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const login = async (credentials: LoginRequest) => {
    try {
      setIsLoading(true);
      setError(undefined);

      const response = await apiClient.login(credentials);
      
      if (response.success && response.data) {
        setUser(response.data);
        toast.success(response.message || 'Login successful!');
      } else {
        throw new Error(response.message || 'Login failed');
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Login failed';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (userData: RegisterRequest) => {
    try {
      setIsLoading(true);
      setError(undefined);

      const response = await apiClient.register(userData);
      
      if (response.success && response.data) {
        setUser(response.data);
        toast.success(response.message || 'Registration successful!');
      } else {
        throw new Error(response.message || 'Registration failed');
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Registration failed';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      setIsLoading(true);
      await apiClient.logout();
      setUser(undefined);
      toast.success('Logged out successfully');
    } catch (err: any) {
      // Even if logout fails on server, clear local state
      setUser(undefined);
      console.error('Logout error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const value: AuthContextType = useMemo(() => ({
    user,
    isAuthenticated: !!user,
    isLoading,
    error,
    login,
    register,
    logout,
    refreshUser,
  }), [user, isLoading, error]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
