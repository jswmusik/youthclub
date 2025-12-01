'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import QRCode from 'react-qr-code';
import { useAuth } from '@/context/AuthContext';
import { visits } from '@/lib/api';
import api from '@/lib/api';
import Toast from '@/app/components/Toast';

export default function KioskPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [clubName, setClubName] = useState<string>('The Club');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error'; isVisible: boolean }>({
    message: '',
    type: 'error',
    isVisible: false,
  });

  // Extract club ID from user
  const assignedClub = user?.assigned_club;
  const clubId = typeof assignedClub === 'object' && assignedClub !== null 
    ? (assignedClub as any).id 
    : typeof assignedClub === 'number' 
    ? assignedClub 
    : null;

  // 1. Clock Logic (Updates every second)
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // 2. Fetch club name (optional, for display)
  useEffect(() => {
    if (!clubId) return;

    const fetchClubName = async () => {
      try {
        const res = await api.get(`/clubs/${clubId}/`);
        if (res.data?.name) {
          setClubName(res.data.name);
        }
      } catch (error) {
        // Silently fail - we'll use default name
        console.error('Failed to fetch club name', error);
      }
    };

    fetchClubName();
  }, [clubId]);

  // 3. Token Logic (Fetches new QR every 30 seconds)
  useEffect(() => {
    if (!clubId || !user) return;

    const fetchToken = async () => {
      try {
        const response = await visits.getKioskToken(clubId);
        setToken(response.data.token);
        setLoading(false);
        // Clear any previous error toast on success
        setToast({ message: '', type: 'error', isVisible: false });
      } catch (error: any) {
        console.error("Kiosk Error", error);
        const errorMessage = error.response?.data?.error || error.response?.status === 401 
          ? 'Authentication required. Please log in again.' 
          : error.response?.status === 403
          ? 'You do not have permission to access this kiosk.'
          : 'Failed to update QR Code';
        
        setToast({ 
          message: errorMessage, 
          type: 'error', 
          isVisible: true 
        });
        setLoading(false);
      }
    };

    // Initial fetch
    fetchToken();

    // Refresh every 30s
    const interval = setInterval(fetchToken, 30000);
    return () => clearInterval(interval);
  }, [clubId, user]);

  // Check authentication and permissions (only after auth has finished loading)
  useEffect(() => {
    // Wait for auth to finish loading before checking
    if (authLoading) return;
    
    // If no user after loading, redirect to login
    if (!user) {
      router.push('/login');
      return;
    }
    
    // Check if user is an admin
    if (user.role !== 'CLUB_ADMIN' && user.role !== 'SUPER_ADMIN' && user.role !== 'MUNICIPALITY_ADMIN') {
      router.push('/dashboard/youth');
      return;
    }
  }, [user, authLoading, router]);

  // Show loading state while auth is being checked
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-10">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-400 mx-auto mb-4"></div>
          <p className="text-xl">Loading...</p>
        </div>
      </div>
    );
  }

  // If no user after loading, show nothing (will redirect)
  if (!user) {
    return null;
  }

  if (!clubId || (user.role === 'CLUB_ADMIN' && !user.assigned_club)) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-10">
        <div className="text-center">
          <p className="text-xl">You must be a Club Admin with an assigned club to view this Kiosk.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-8">
      
      {/* Header / Clock */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-2">Welcome to {clubName}</h1>
        <p className="text-xl text-slate-400">Scan to check in</p>
        <div className="mt-8 text-6xl font-mono font-bold tracking-wider text-emerald-400">
          {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
        <div className="text-xl text-slate-500 mt-2">
            {currentTime.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
        </div>
      </div>

      {/* QR Container */}
      <div className="bg-white p-8 rounded-3xl shadow-2xl">
        {loading || !token ? (
          <div className="h-64 w-64 flex items-center justify-center text-slate-800 animate-pulse">
            Generating Secure Code...
          </div>
        ) : (
          <div className="flex flex-col items-center">
             <QRCode 
                value={token} 
                size={300} 
                level="H" // High error correction
             />
             <p className="text-slate-500 mt-4 text-sm font-mono">
                Security Token updates automatically
             </p>
          </div>
        )}
      </div>

      {/* Footer Instructions */}
      <div className="mt-16 text-center max-w-lg text-slate-400">
        <p>Open the Youth App and tap <strong>"Scan"</strong> to enter.</p>
        <p className="mt-4 text-sm">Need help? Ask a staff member for manual check-in.</p>
      </div>

      {/* Toast Notification */}
      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={() => setToast({ ...toast, isVisible: false })}
      />
    </div>
  );
}

