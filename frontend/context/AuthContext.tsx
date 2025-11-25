'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import Cookies from 'js-cookie';
import api from '../lib/api';
import { useRouter } from 'next/navigation';

interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  avatar: string | null;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Check if user is already logged in when page loads
  useEffect(() => {
    const checkUser = async () => {
      const token = Cookies.get('access_token');
      if (token) {
        try {
          const res = await api.get('/auth/users/me/');
          setUser(res.data);
        } catch (error) {
          console.error("Session expired", error);
          Cookies.remove('access_token');
        }
      }
      setLoading(false);
    };
    checkUser();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      // 1. Get Token
      const res = await api.post('/auth/jwt/create/', { email, password });
      Cookies.set('access_token', res.data.access, { expires: 1 }); // Expires in 1 day
      Cookies.set('refresh_token', res.data.refresh, { expires: 1 });

      // 2. Get User Details
      const userRes = await api.get('/auth/users/me/');
      const userData = userRes.data;
      setUser(userData);

      // 3. Redirect based on Role
      switch (userData.role) {
        case 'SUPER_ADMIN':
          router.push('/admin/super');
          break;
        case 'MUNICIPALITY_ADMIN':
          router.push('/admin/municipality');
          break;
        case 'CLUB_ADMIN':
          router.push('/admin/club');
          break;
        case 'GUARDIAN':
          router.push('/dashboard/guardian');
          break;
        case 'YOUTH_MEMBER':
          router.push('/dashboard/youth');
          break;
        default:
          router.push('/');
      }
    } catch (error) {
      console.error("Login failed", error);
      throw error;
    }
  };

  const logout = () => {
    Cookies.remove('access_token');
    Cookies.remove('refresh_token');
    setUser(null);
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};