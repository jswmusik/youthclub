'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import Cookies from 'js-cookie';
import api from '../lib/api';
import { useRouter } from 'next/navigation';

// Trial period info for unverified youth members
interface TrialInfo {
  has_access: boolean;
  is_verified: boolean;
  is_in_trial: boolean;
  trial_days_remaining: number | null;
  trial_expired: boolean;
  should_start_trial: boolean;
  club_info: {
    id: number;
    name: string;
    email: string;
    phone: string;
    address: string | null;
    municipality_name: string | null;
  } | null;
}

interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  nickname: string;
  grade: number | null;
  role: string;
  avatar: string | null;
  background_image: string | null;
  mood_status: string;
  verification_status: string;
  preferred_language?: string;
  allowed_features?: string[];
  assigned_municipality?: number | { id: number } | null;
  assigned_club?: number | { id: number } | null;
  preferred_club?: any;
  followed_clubs_ids?: number[];
  trial_info?: TrialInfo | null;
  my_memberships?: Array<{
    id: number;
    group_id: number;
    group_name: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    role: string;
  }>;
}

// 2FA related types
interface TwoFactorState {
  required: boolean;
  email: string;
  password: string; // Temporarily stored for completing login after 2FA
  maskedEmail?: string;
  expiresInMinutes?: number;
  reason?: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<LoginResult>;
  logout: () => void;
  loading: boolean;
  messageCount: number;
  refreshMessageCount: () => Promise<void>;
  refreshUser: () => Promise<void>;
  // 2FA methods
  twoFactorState: TwoFactorState | null;
  initiate2FA: () => Promise<{ success: boolean; message: string; maskedEmail?: string }>;
  verify2FA: (code: string, trustDevice?: boolean) => Promise<{ success: boolean; message: string }>;
  cancel2FA: () => void;
  get2FAStatus: () => Promise<TwoFactorStatus | null>;
  toggle2FA: (enable: boolean) => Promise<{ success: boolean; message: string }>;
}

interface LoginResult {
  success: boolean;
  requires2FA?: boolean;
  message?: string;
  // Trial/verification blocking
  blocked?: boolean;
  blockReason?: 'not_verified' | 'trial_expired' | 'no_club';
  trialInfo?: TrialInfo;
}

interface TwoFactorStatus {
  is_enabled: boolean;
  requirement: 'mandatory_always' | 'mandatory_periodic' | 'optional' | 'not_available';
  can_toggle: boolean;
  last_verified_at: string | null;
  trusted_devices_count: number;
  is_locked: boolean;
  failed_attempts: number;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [messageCount, setMessageCount] = useState(0);
  const [twoFactorState, setTwoFactorState] = useState<TwoFactorState | null>(null);
  const [pendingRememberMe, setPendingRememberMe] = useState(false);
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
            if (msgErr?.response?.status !== 401) {
              console.error('Failed to load message count', msgErr);
            }
            setMessageCount(0);
          }
        } catch (error) {
          console.error("Session expired", error);
          if (typeof window !== 'undefined') {
            sessionStorage.removeItem('redirectAfterLogin');
          }
          Cookies.remove('access_token');
          setMessageCount(0);
        }
      }
      setLoading(false);
    };
    checkUser();
  }, []);

  const refreshMessageCount = async () => {
    if (!user) {
      setMessageCount(0);
      return;
    }
    
    try {
      const res = await api.get('/messages/active_list/');
      const list = Array.isArray(res.data) ? res.data : [];
      setMessageCount(list.length);
    } catch (err: any) {
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
      Cookies.remove('access_token');
      Cookies.remove('refresh_token');
      setUser(null);
    }
  };

  const login = async (email: string, password: string, rememberMe: boolean = false): Promise<LoginResult> => {
    try {
      // Store remember me preference for use after potential 2FA
      setPendingRememberMe(rememberMe);
      
      // First, validate credentials by attempting to get a token
      const res = await api.post('/auth/jwt/create/', { email, password });
      
      // Credentials are valid - now check if 2FA is required
      const trustedDeviceToken = Cookies.get('trusted_device_token');
      const checkRes = await api.post('/2fa/check/', { 
        email, 
        trusted_device_token: trustedDeviceToken 
      });
      
      if (checkRes.data.requires_2fa) {
        // 2FA is required - store credentials temporarily and show 2FA UI
        setTwoFactorState({
          required: true,
          email,
          password,
          reason: checkRes.data.reason
        });
        
        // Don't store the token yet - wait for 2FA verification
        // Actually, we need to store it temporarily to complete login after 2FA
        Cookies.set('_temp_access', res.data.access, { expires: 1/24 }); // 1 hour
        Cookies.set('_temp_refresh', res.data.refresh, { expires: 1/24 });
        
        return { 
          success: false, 
          requires2FA: true, 
          message: 'Two-factor authentication required' 
        };
      }
      
      // No 2FA required - complete login
      return await completeLogin(res.data.access, res.data.refresh, rememberMe);
      
    } catch (error: any) {
      console.error("Login failed", error);
      throw error;
    }
  };

  const completeLogin = async (accessToken: string, refreshToken: string, rememberMe?: boolean): Promise<LoginResult> => {
    // Use pendingRememberMe if rememberMe is not explicitly provided (e.g., after 2FA)
    const shouldRemember = rememberMe ?? pendingRememberMe;
    
    // Set cookie options based on "Remember Me" preference
    // If remember me: 30 days expiration
    // If not: session cookie (no expires = deleted when browser closes)
    const cookieOptions = shouldRemember ? { expires: 30 } : undefined;
    
    // Set tokens with appropriate expiration
    Cookies.set('access_token', accessToken, cookieOptions);
    Cookies.set('refresh_token', refreshToken, cookieOptions);
    
    // Store remember me preference for token refresh logic
    if (shouldRemember) {
      Cookies.set('remember_me', 'true', { expires: 30 });
    } else {
      Cookies.remove('remember_me');
    }
    
    // Clear temp tokens if they exist
    Cookies.remove('_temp_access');
    Cookies.remove('_temp_refresh');
    
    // Clear pending remember me state
    setPendingRememberMe(false);

    // Get User Details
    const userRes = await api.get('/auth/users/me/');
    const userData = userRes.data;
    
    // Check trial/verification status for youth members
    if (userData.role === 'YOUTH_MEMBER' && userData.trial_info) {
      const { has_access, trial_expired, club_info } = userData.trial_info;
      
      if (!has_access) {
        // Clear tokens - don't allow login
        Cookies.remove('access_token');
        Cookies.remove('refresh_token');
        Cookies.remove('remember_me');
        
        // Determine block reason
        let blockReason: 'not_verified' | 'trial_expired' | 'no_club' = 'not_verified';
        if (trial_expired) {
          blockReason = 'trial_expired';
        } else if (!club_info) {
          blockReason = 'no_club';
        }
        
        return {
          success: false,
          blocked: true,
          blockReason,
          trialInfo: userData.trial_info,
        };
      }
    }
    
    setUser(userData);
    setTwoFactorState(null);
    refreshMessageCount();

    // Log the successful login for audit trail
    try {
      await api.post('/users/log_login/');
    } catch (logErr) {
      console.error('Failed to log login event', logErr);
    }

    // Handle redirect
    const savedPath = typeof window !== 'undefined' ? sessionStorage.getItem('redirectAfterLogin') : null;
    
    if (savedPath) {
      sessionStorage.removeItem('redirectAfterLogin');
      
      const isValidPathForRole = (() => {
        switch (userData.role) {
          case 'SUPER_ADMIN':
            return savedPath.startsWith('/admin/super');
          case 'MUNICIPALITY_ADMIN':
            return savedPath.startsWith('/admin/municipality') || savedPath.startsWith('/admin/super');
          case 'CLUB_ADMIN':
            return savedPath.startsWith('/admin/club') || savedPath.startsWith('/admin/municipality') || savedPath.startsWith('/admin/super');
          case 'GUARDIAN':
            return savedPath.startsWith('/dashboard/guardian');
          case 'YOUTH_MEMBER':
            return savedPath.startsWith('/dashboard/youth');
          default:
            return false;
        }
      })();
      
      if (isValidPathForRole) {
        router.push(savedPath);
        return { success: true };
      }
    }

    // Default redirect based on role
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
    
    return { success: true };
  };

  const initiate2FA = async (): Promise<{ success: boolean; message: string; maskedEmail?: string }> => {
    if (!twoFactorState?.email) {
      return { success: false, message: 'No pending 2FA session' };
    }

    try {
      const res = await api.post('/2fa/initiate/', { email: twoFactorState.email });
      
      if (res.data.success) {
        setTwoFactorState(prev => prev ? {
          ...prev,
          maskedEmail: res.data.masked_email,
          expiresInMinutes: res.data.expires_in_minutes
        } : null);
      }
      
      return {
        success: res.data.success,
        message: res.data.message,
        maskedEmail: res.data.masked_email
      };
    } catch (error: any) {
      console.error('Failed to initiate 2FA', error);
      return { 
        success: false, 
        message: error.response?.data?.message || 'Failed to send verification code'
      };
    }
  };

  const verify2FA = async (code: string, trustDevice: boolean = false): Promise<{ success: boolean; message: string }> => {
    if (!twoFactorState?.email) {
      return { success: false, message: 'No pending 2FA session' };
    }

    try {
      const res = await api.post('/2fa/verify/', {
        email: twoFactorState.email,
        code,
        trust_device: trustDevice
      });

      if (res.data.success) {
        // Store trust token if provided
        if (res.data.trust_token) {
          Cookies.set('trusted_device_token', res.data.trust_token, { expires: 30 }); // 30 days
        }

        // Get temp tokens and complete login
        const tempAccess = Cookies.get('_temp_access');
        const tempRefresh = Cookies.get('_temp_refresh');
        
        if (tempAccess && tempRefresh) {
          // Use the stored pendingRememberMe state
          await completeLogin(tempAccess, tempRefresh, pendingRememberMe);
          return { success: true, message: 'Verification successful' };
        } else {
          return { success: false, message: 'Session expired. Please login again.' };
        }
      }

      return {
        success: false,
        message: res.data.message || 'Invalid verification code'
      };
    } catch (error: any) {
      console.error('Failed to verify 2FA', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Verification failed'
      };
    }
  };

  const cancel2FA = () => {
    setTwoFactorState(null);
    Cookies.remove('_temp_access');
    Cookies.remove('_temp_refresh');
  };

  const get2FAStatus = async (): Promise<TwoFactorStatus | null> => {
    try {
      const res = await api.get('/2fa/status/');
      return res.data;
    } catch (error) {
      console.error('Failed to get 2FA status', error);
      return null;
    }
  };

  const toggle2FA = async (enable: boolean): Promise<{ success: boolean; message: string }> => {
    try {
      const res = await api.post('/2fa/toggle/', { enable });
      return {
        success: res.data.success,
        message: res.data.message
      };
    } catch (error: any) {
      console.error('Failed to toggle 2FA', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to update 2FA settings'
      };
    }
  };

  const logout = () => {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('redirectAfterLogin');
    }
    
    Cookies.remove('access_token');
    Cookies.remove('refresh_token');
    Cookies.remove('remember_me');
    Cookies.remove('_temp_access');
    Cookies.remove('_temp_refresh');
    // Note: We keep trusted_device_token for 30 days
    setUser(null);
    setMessageCount(0);
    setTwoFactorState(null);
    setPendingRememberMe(false);
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      login, 
      logout, 
      loading, 
      messageCount, 
      refreshMessageCount, 
      refreshUser,
      twoFactorState,
      initiate2FA,
      verify2FA,
      cancel2FA,
      get2FAStatus,
      toggle2FA
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

// Export types for use in other components
export type { TrialInfo, LoginResult };
