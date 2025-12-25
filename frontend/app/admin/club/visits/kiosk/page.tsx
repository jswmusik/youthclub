'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import QRCode from 'react-qr-code';
import { useAuth } from '@/context/AuthContext';
import { visits } from '@/lib/api';
import api from '@/lib/api';
import Toast from '@/app/components/Toast';
import { QrCode, Clock, Users } from 'lucide-react';

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
      <div className="min-h-screen bg-[var(--dark-900)] text-[var(--brand-light)] flex items-center justify-center p-10">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-purple)] flex items-center justify-center mx-auto mb-4 animate-pulse">
            <QrCode className="w-8 h-8 text-white" />
          </div>
          <p className="text-xl text-[var(--brand-light)]/70">Loading...</p>
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
      <div className="min-h-screen bg-[var(--dark-900)] text-[var(--brand-light)] flex items-center justify-center p-10">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 rounded-2xl bg-[var(--dark-700)] flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-[var(--brand-light)]/30" />
          </div>
          <p className="text-xl text-[var(--brand-light)]">You must be a Club Admin with an assigned club to view this Kiosk.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--dark-900)] text-[var(--brand-light)] flex flex-col items-center justify-center p-4 sm:p-8">
      
      {/* Header / Clock */}
      <div className="text-center mb-8 sm:mb-12 w-full max-w-2xl">
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-purple)] flex items-center justify-center">
            <QrCode className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-[var(--brand-light)]">Welcome to {clubName}</h1>
        </div>
        <p className="text-lg sm:text-xl text-[var(--brand-light)]/60 mb-8">Scan to check in</p>
        
        {/* Clock Display */}
        <div className="bg-[var(--dark-800)] rounded-2xl border-2 border-[var(--dark-600)] p-6 sm:p-8 mb-4">
          <div className="flex items-center justify-center gap-3 mb-2">
            <Clock className="w-6 h-6 sm:w-8 sm:h-8 text-[var(--brand-primary)]" />
            <div className="text-4xl sm:text-5xl md:text-6xl font-mono font-bold tracking-wider bg-gradient-to-r from-[var(--brand-primary)] via-[var(--brand-purple)] to-[var(--brand-peach)] bg-clip-text text-transparent">
              {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
          <div className="text-lg sm:text-xl text-[var(--brand-light)]/50 mt-2">
            {currentTime.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
          </div>
        </div>
      </div>

      {/* QR Container */}
      <div className="bg-[var(--dark-800)] border-2 border-[var(--dark-600)] p-6 sm:p-8 md:p-10 rounded-2xl shadow-2xl mb-8 sm:mb-12">
        {loading || !token ? (
          <div className="h-64 w-64 sm:h-80 sm:w-80 flex flex-col items-center justify-center text-[var(--brand-light)]/60">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-purple)] flex items-center justify-center mb-4 animate-pulse">
              <QrCode className="w-8 h-8 text-white" />
            </div>
            <p className="text-sm sm:text-base font-medium animate-pulse">Generating Secure Code...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <div className="bg-white p-4 sm:p-6 rounded-xl">
              <QRCode 
                value={token} 
                size={250}
                level="H" // High error correction
                fgColor="#000000"
                bgColor="#FFFFFF"
              />
            </div>
            <div className="mt-4 sm:mt-6 flex items-center gap-2 px-4 py-2 bg-[var(--dark-700)] rounded-xl border border-[var(--dark-500)]">
              <div className="w-2 h-2 rounded-full bg-[var(--brand-third)] animate-pulse"></div>
              <p className="text-xs sm:text-sm text-[var(--brand-light)]/60 font-mono">
                Security Token updates automatically
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Footer Instructions */}
      <div className="mt-8 sm:mt-12 text-center max-w-lg w-full px-4">
        <div className="bg-[var(--dark-800)] rounded-xl border border-[var(--dark-600)] p-4 sm:p-6">
          <p className="text-base sm:text-lg text-[var(--brand-light)]/70 mb-3">
            Open the Youth App and tap <strong className="text-[var(--brand-primary)]">"Scan"</strong> to enter.
          </p>
          <p className="text-sm text-[var(--brand-light)]/50">
            Need help? Ask a staff member for manual check-in.
          </p>
        </div>
      </div>

      {/* Toast Notification */}
      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={() => setToast({ ...toast, isVisible: false })}
        darkMode
      />
    </div>
  );
}
