'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useTheme } from 'next-themes';
import CheckInScanner from '@/app/components/visits/CheckInScanner';
import PinCheckIn from '@/app/components/visits/PinCheckIn';
import NavBar from '@/app/components/NavBar';
import YouthSidebar from '@/app/components/youth/YouthSidebar';
import { ScanPageSkeleton } from '@/app/components/ui/Skeleton';
import Footer from '@/app/components/Footer';
import { X, QrCode, ArrowLeft, Keyboard } from 'lucide-react';

// Minimum skeleton display time (in ms) for better UX
const MIN_LOADING_TIME = 500;

type CheckInMode = 'qr' | 'pin';

export default function ScanPage() {
  const t = useTranslations('visits');
  const tNav = useTranslations('nav');
  const router = useRouter();
  const pathname = usePathname();
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [checkInMode, setCheckInMode] = useState<CheckInMode>('qr');

  // Theme detection - default to light mode for member pages
  useEffect(() => {
    setMounted(true);
  }, []);
  const darkMode = mounted && theme === 'dark';

  useEffect(() => {
    // Show skeleton for minimum time before displaying scanner
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, MIN_LOADING_TIME);

    return () => clearTimeout(timer);
  }, []);

  const handleSuccess = () => {
    // Redirect back to dashboard after successful check-in
    setTimeout(() => {
      router.push('/dashboard/youth');
    }, 1500);
  };

  return (
    <div className={`min-h-screen flex flex-col ${darkMode ? 'bg-[var(--dark-900)]' : 'bg-gray-50'}`}>
      <div className="flex-1">
      <NavBar 
        darkMode={darkMode}
        onMenuToggle={() => setIsSidebarOpen(!isSidebarOpen)}
        showBackButton={true}
      />
      
      {/* Mobile Sidebar Overlay */}
      <div 
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden transition-opacity duration-300 ${
          isSidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setIsSidebarOpen(false)}
      />
      
      {/* Mobile Sidebar */}
      <aside 
        className={`fixed top-0 left-0 h-screen w-64 z-50 border-r transform transition-transform duration-300 md:hidden ${
          darkMode 
            ? 'bg-[var(--dark-800)] border-[var(--dark-600)]' 
            : 'bg-white border-[#4D4DA4]/15'
        } ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className={`flex items-center justify-between p-4 border-b ${
          darkMode ? 'border-[var(--dark-600)]' : 'border-[#4D4DA4]/15'
        }`}>
          <h1 className={`text-xl font-bold font-heading ${
            darkMode ? 'text-[var(--brand-light)]' : 'text-gray-900'
          }`}>{tNav('menu')}</h1>
          <button
            onClick={() => setIsSidebarOpen(false)}
            className={`w-8 h-8 flex items-center justify-center rounded-lg ${
              darkMode 
                ? 'text-[var(--brand-light)]/60 hover:bg-[var(--dark-700)] hover:text-[var(--brand-light)]' 
                : 'text-gray-500 hover:bg-[#EBEBFE] hover:text-gray-700'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4 overflow-y-auto h-[calc(100vh-64px)]">
          <YouthSidebar activePath={pathname} darkMode={darkMode} />
        </div>
      </aside>
      
      {/* Main Layout */}
      <div className="pt-14 sm:pt-16">
        <div className="max-w-7xl mx-auto px-0 sm:px-4 md:px-6 relative">
          {/* Desktop Sidebar - Fixed position aligned with container */}
          <aside className="hidden md:block fixed top-16 w-56 h-[calc(100vh-4rem)] overflow-y-auto py-4 z-30" style={{ left: 'max(1rem, calc((100vw - 80rem) / 2 + 1.5rem))' }}>
            <YouthSidebar activePath={pathname} darkMode={darkMode} />
          </aside>
          
          {/* Content wrapper with left margin for sidebar */}
          <div className="md:ml-60">
            <div className="pt-4 sm:pt-8 px-4 sm:px-0 pb-24 md:pb-8 flex flex-col items-center">
              {isLoading ? (
                <ScanPageSkeleton />
              ) : (
                <>
                  {/* Header */}
                  <div className="mb-6 sm:mb-8 text-center">
                    <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 ${
                      darkMode ? 'bg-[var(--brand-primary)]/20' : 'bg-[#4D4DA4]/10'
                    }`}>
                      {checkInMode === 'qr' ? (
                        <QrCode className={`w-8 h-8 ${darkMode ? 'text-[var(--brand-primary)]' : 'text-[#4D4DA4]'}`} />
                      ) : (
                        <Keyboard className={`w-8 h-8 ${darkMode ? 'text-[var(--brand-primary)]' : 'text-[#4D4DA4]'}`} />
                      )}
                    </div>
                    <h1 className={`text-2xl sm:text-3xl font-bold font-heading ${
                      darkMode ? 'text-[var(--brand-light)]' : 'text-gray-900'
                    }`}>{t('checkIn')}</h1>
                    <p className={`mt-2 text-sm sm:text-base ${
                      darkMode ? 'text-[var(--brand-light)]/60' : 'text-gray-600'
                    }`}>
                      {checkInMode === 'qr' ? t('scanInstructions') : t('pinInstructions')}
                    </p>
                  </div>

                  {/* Mode Toggle */}
                  <div className={`flex items-center justify-center gap-2 mb-6 p-1 rounded-xl border ${
                    darkMode 
                      ? 'bg-[var(--dark-800)] border-[var(--dark-600)]' 
                      : 'bg-white border-[#4D4DA4]/15 shadow-sm'
                  }`}>
                    <button
                      onClick={() => setCheckInMode('qr')}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                        checkInMode === 'qr'
                          ? darkMode 
                            ? 'bg-[var(--brand-primary)] text-[var(--dark-900)]' 
                            : 'bg-[#4D4DA4] text-white'
                          : darkMode 
                            ? 'text-[var(--brand-light)]/60 hover:text-[var(--brand-light)]' 
                            : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      <QrCode className="w-4 h-4" />
                      {t('scanQR')}
                    </button>
                    <button
                      onClick={() => setCheckInMode('pin')}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                        checkInMode === 'pin'
                          ? darkMode 
                            ? 'bg-[var(--brand-primary)] text-[var(--dark-900)]' 
                            : 'bg-[#4D4DA4] text-white'
                          : darkMode 
                            ? 'text-[var(--brand-light)]/60 hover:text-[var(--brand-light)]' 
                            : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      <Keyboard className="w-4 h-4" />
                      {t('enterPin')}
                    </button>
                  </div>

                  {/* Check-in Method */}
                  {checkInMode === 'qr' ? (
                    <CheckInScanner onSuccess={handleSuccess} darkMode={darkMode} />
                  ) : (
                    <PinCheckIn onSuccess={handleSuccess} darkMode={darkMode} />
                  )}

                  <button 
                    onClick={() => router.back()}
                    className={`mt-6 sm:mt-8 mb-4 flex items-center gap-2 transition-colors font-medium text-sm ${
                      darkMode 
                        ? 'text-[var(--brand-light)]/60 hover:text-[var(--brand-primary)]' 
                        : 'text-gray-500 hover:text-[#4D4DA4]'
                    }`}
                  >
                    <ArrowLeft className="w-4 h-4" />
                    {t('cancelAndGoBack')}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
      </div>
      
      {/* Footer */}
      <Footer />
    </div>
  );
}