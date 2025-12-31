'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import QRCode from 'react-qr-code';
import { useAuth } from '@/context/AuthContext';
import { visits } from '@/lib/api';
import api from '@/lib/api';
import { useToast } from '../../../../../hooks/useToast';
import { QrCode, Clock, Users, Keyboard } from 'lucide-react';
import { useTranslations } from 'next-intl';

export default function KioskPage() {
  const t = useTranslations('clubVisits.kioskScreen');
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [pinCode, setPinCode] = useState<string | null>(null);
  const [pinExpiresIn, setPinExpiresIn] = useState<number>(0);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [clubName, setClubName] = useState<string>('The Club');
  const { success, error, info, warning } = useToast();

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
        } catch (error: any) {
        console.error("Kiosk Error", error);
        const errorMessage = error.response?.data?.error || error.response?.status === 401 
          ? t('errors.authenticationRequired')
          : error.response?.status === 403
          ? t('errors.noPermission')
          : t('errors.failedToUpdateQR');
        
        error(errorMessage);
        setLoading(false);
      }
    };

    // Initial fetch
    fetchToken();

    // Refresh every 30s
    const interval = setInterval(fetchToken, 30000);
    return () => clearInterval(interval);
  }, [clubId, user]);

  // 4. PIN Code Logic (Fetches PIN and updates countdown)
  useEffect(() => {
    if (!clubId || !user) return;

    const fetchPin = async () => {
      try {
        const response = await visits.getKioskPin(clubId);
        setPinCode(response.data.pin);
        setPinExpiresIn(response.data.expires_in);
      } catch (error: any) {
        console.error("PIN fetch error", error);
        // Don't show error toast for PIN - it's a secondary feature
      }
    };

    // Initial fetch
    fetchPin();

    // Refresh every 60 seconds to get new PIN when it changes
    const interval = setInterval(fetchPin, 60000);
    return () => clearInterval(interval);
  }, [clubId, user]);

  // 5. Countdown timer for PIN expiry (updates every second)
  useEffect(() => {
    if (pinExpiresIn <= 0) return;

    const timer = setInterval(() => {
      setPinExpiresIn(prev => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [pinExpiresIn > 0]); // Only run when there's time remaining

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
          <p className="text-xl text-[var(--brand-light)]/70">{t('loading')}</p>
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
          <p className="text-xl text-[var(--brand-light)]">{t('mustBeAdmin')}</p>
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
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-[var(--brand-light)]">{t('welcomeTo', { clubName })}</h1>
        </div>
        <p className="text-lg sm:text-xl text-[var(--brand-light)]/60 mb-8">{t('scanToCheckIn')}</p>
        
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

      {/* QR and PIN Container */}
      <div className="flex flex-col lg:flex-row items-center gap-6 lg:gap-10 mb-8 sm:mb-12">
        {/* QR Code */}
        <div className="bg-[var(--dark-800)] border-2 border-[var(--dark-600)] p-6 sm:p-8 md:p-10 rounded-2xl shadow-2xl">
          {loading || !token ? (
            <div className="h-64 w-64 sm:h-80 sm:w-80 flex flex-col items-center justify-center text-[var(--brand-light)]/60">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-purple)] flex items-center justify-center mb-4 animate-pulse">
                <QrCode className="w-8 h-8 text-white" />
              </div>
              <p className="text-sm sm:text-base font-medium animate-pulse">{t('generatingSecureCode')}</p>
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
                  {t('securityTokenUpdates')}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="hidden lg:flex flex-col items-center gap-3 text-[var(--brand-light)]/40">
          <div className="h-16 w-px bg-[var(--dark-600)]"></div>
          <span className="text-sm font-medium uppercase tracking-wider">{t('or')}</span>
          <div className="h-16 w-px bg-[var(--dark-600)]"></div>
        </div>
        <div className="lg:hidden flex items-center gap-3 text-[var(--brand-light)]/40 w-full max-w-xs">
          <div className="flex-1 h-px bg-[var(--dark-600)]"></div>
          <span className="text-sm font-medium uppercase tracking-wider">{t('or')}</span>
          <div className="flex-1 h-px bg-[var(--dark-600)]"></div>
        </div>

        {/* PIN Code Display */}
        <div className="bg-[var(--dark-800)] border-2 border-[var(--dark-600)] p-6 sm:p-8 rounded-2xl shadow-2xl">
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-2 mb-4">
              <Keyboard className="w-5 h-5 text-[var(--brand-purple)]" />
              <p className="text-sm sm:text-base text-[var(--brand-light)]/60">{t('noCameraCode')}</p>
            </div>
            
            {pinCode ? (
              <>
                <div className="bg-[var(--dark-700)] px-6 sm:px-8 py-4 sm:py-6 rounded-xl border-2 border-[var(--brand-purple)]/30">
                  <div className="text-4xl sm:text-5xl md:text-6xl font-mono font-bold tracking-[0.2em] sm:tracking-[0.3em] bg-gradient-to-r from-[var(--brand-purple)] to-[var(--brand-primary)] bg-clip-text text-transparent">
                    {pinCode}
                  </div>
                </div>
                
                <div className="mt-4 sm:mt-6 flex items-center gap-2 px-4 py-2 bg-[var(--dark-700)] rounded-xl border border-[var(--dark-500)]">
                  <Clock className="w-3 h-3 text-[var(--brand-light)]/40" />
                  <p className="text-xs sm:text-sm text-[var(--brand-light)]/60">
                    {t('codeRefreshesIn', { minutes: Math.ceil(pinExpiresIn / 60) })}
                  </p>
                </div>
              </>
            ) : (
              <div className="h-24 flex items-center justify-center">
                <div className="animate-pulse text-[var(--brand-light)]/40">{t('loadingPin')}</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer Instructions */}
      <div className="mt-8 sm:mt-12 text-center max-w-lg w-full px-4">
        <div className="bg-[var(--dark-800)] rounded-xl border border-[var(--dark-600)] p-4 sm:p-6">
          <p className="text-base sm:text-lg text-[var(--brand-light)]/70 mb-3">
            {t('openAppAndScan')} <strong className="text-[var(--brand-primary)]">"{t('scanButton')}"</strong> {t('toEnter')}
          </p>
          <p className="text-sm text-[var(--brand-light)]/50">
            {t('needHelp')}
          </p>
        </div>
      </div>

      {/* Toast Notification */}
    </div>
  );
}
