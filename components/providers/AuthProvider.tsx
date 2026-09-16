'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@/types/api';
import { authApi } from '@/lib/api/auth';
import { RegisterFormData, LoginFormData } from '@/lib/validation/schemas';
import { useRouter } from 'next/navigation';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (data: LoginFormData, next?: string) => Promise<User>;
  register: (data: RegisterFormData) => Promise<User>;
  logout: () => Promise<void>;
  isAdmin: boolean;
  isStaff: boolean;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    let isMounted = true;
    authApi
      .getMe()
      .then((u) => {
        if (isMounted) setUser(u);
      })
      .catch(() => {
        if (isMounted) setUser(null);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const login = async (data: LoginFormData, next?: string): Promise<User> => {
    const res = await authApi.login(data.identifier, data.password);
    setUser(res.user);

    // Role based redirect (HLD §5, Spec §4.3)
    if (res.user.role === 'ADMIN' || res.user.role === 'STAFF') {
      router.push('/admin');
    } else {
      router.push(next || '/home');
    }

    return res.user;
  };

  const register = async (data: RegisterFormData): Promise<User> => {
    const res = await authApi.register({
      name: data.name,
      email: data.email,
      phone: data.phone,
      password: data.password,
    });
    setUser(res.user);
    router.push('/home');
    return res.user;
  };

  const logout = async () => {
    await authApi.logout();
    setUser(null);
    router.push('/');
  };

  const isAdmin = user?.role === 'ADMIN';
  const isStaff = user?.role === 'STAFF' || user?.role === 'ADMIN';
  const isAuthenticated = !!user;

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        register,
        logout,
        isAdmin,
        isStaff,
        isAuthenticated,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

