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
  nickname: string; // Added
  grade: number | null; // Added
  role: string;
  avatar: string | null;
  
  // --- NEW FIELDS ---
  background_image: string | null;
  mood_status: string;
  verification_status: string; // Useful for the badge
  // ------------------

  assigned_municipality?: number | { id: number } | null;
  assigned_club?: number | { id: number } | null;
  // Type it loosely or strictly depending on your API response depth
  preferred_club?: any;
  followed_clubs_ids?: number[];
  my_memberships?: Array<{
    id: number;
    group_id: number;
    group_name: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    role: string;
  }>;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
  messageCount: number;
  refreshMessageCount: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [messageCount, setMessageCount] = useState(0);
  const router = useRouter();

  // Check if user is already logged in when page loads
  useEffect(() => {
    const checkUser = async () => {
      const token = Cookies.get('access_token');
      if (token) {
        try {
          const res = await api.get('/auth/users/me/');
          const userData = res.data;
          setUser(userData);
          // Refresh message count after user is loaded
          try {
            const msgRes = await api.get('/messages/active_list/');
            const list = Array.isArray(msgRes.data) ? msgRes.data : [];
            setMessageCount(list.length);
          } catch (msgErr: any) {
            // Silently handle 401 for message count
            if (msgErr?.response?.status !== 401) {
              console.error('Failed to load message count', msgErr);
            }
            setMessageCount(0);
          }
        } catch (error) {
          console.error("Session expired", error);
          Cookies.remove('access_token');
          setMessageCount(0);
        }
      }
      setLoading(false);
    };
    checkUser();
  }, []);

  const refreshMessageCount = async () => {
    // Only fetch message count if user is authenticated
    if (!user) {
      setMessageCount(0);
      return;
    }
    
    try {
      const res = await api.get('/messages/active_list/');
      const list = Array.isArray(res.data) ? res.data : [];
      setMessageCount(list.length);
    } catch (err: any) {
      // Silently handle 401 (unauthorized) - user might not be logged in or token expired
      if (err?.response?.status === 401) {
        setMessageCount(0);
        return;
      }
      console.error('Failed to load message count', err);
      setMessageCount(0);
    }
  };

  const refreshUser = async () => {
    const token = Cookies.get('access_token');
    if (!token) {
      setUser(null);
      return;
    }
    
    try {
      const res = await api.get('/auth/users/me/');
      setUser(res.data);
    } catch (error) {
      console.error('Failed to refresh user', error);
      // If token is invalid, clear user
      Cookies.remove('access_token');
      Cookies.remove('refresh_token');
      setUser(null);
    }
  };

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
      refreshMessageCount();

      // Log the successful login for audit trail (ignore failures)
      try {
        await api.post('/users/log_login/');
      } catch (logErr) {
        console.error('Failed to log login event', logErr);
      }

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
    setMessageCount(0);
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, messageCount, refreshMessageCount, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};