'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
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
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [checkInMode, setCheckInMode] = useState<CheckInMode>('qr');

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
    <div className="min-h-screen flex flex-col bg-[var(--dark-900)]">
      <div className="flex-1">
      <NavBar 
        darkMode={true}
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
        className={`fixed top-0 left-0 h-screen w-64 z-50 bg-[var(--dark-800)] border-r border-[var(--dark-600)] transform transition-transform duration-300 md:hidden ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between p-4 border-b border-[var(--dark-600)]">
          <h1 className="text-xl font-bold text-[var(--brand-light)] font-heading">{tNav('menu')}</h1>
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-[var(--brand-light)]/60 hover:bg-[var(--dark-700)] hover:text-[var(--brand-light)]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4 overflow-y-auto h-[calc(100vh-64px)]">
          <YouthSidebar activePath={pathname} darkMode={true} />
        </div>
      </aside>
      
      {/* Main Layout */}
      <div className="pt-14 sm:pt-16">
        <div className="max-w-7xl mx-auto px-0 sm:px-4 md:px-6 relative">
          {/* Desktop Sidebar - Fixed position aligned with container */}
          <aside className="hidden md:block fixed top-16 w-56 h-[calc(100vh-4rem)] overflow-y-auto py-4 z-30" style={{ left: 'max(1rem, calc((100vw - 80rem) / 2 + 1.5rem))' }}>
            <YouthSidebar activePath={pathname} darkMode={true} />
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
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[var(--brand-primary)]/20 mb-4">
                      {checkInMode === 'qr' ? (
                        <QrCode className="w-8 h-8 text-[var(--brand-primary)]" />
                      ) : (
                        <Keyboard className="w-8 h-8 text-[var(--brand-primary)]" />
                      )}
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-[var(--brand-light)] font-heading">{t('checkIn')}</h1>
                    <p className="text-[var(--brand-light)]/60 mt-2 text-sm sm:text-base">
                      {checkInMode === 'qr' ? t('scanInstructions') : t('pinInstructions')}
                    </p>
                  </div>

                  {/* Mode Toggle */}
                  <div className="flex items-center justify-center gap-2 mb-6 p-1 bg-[var(--dark-800)] rounded-xl border border-[var(--dark-600)]">
                    <button
                      onClick={() => setCheckInMode('qr')}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                        checkInMode === 'qr'
                          ? 'bg-[var(--brand-primary)] text-[var(--dark-900)]'
                          : 'text-[var(--brand-light)]/60 hover:text-[var(--brand-light)]'
                      }`}
                    >
                      <QrCode className="w-4 h-4" />
                      {t('scanQR')}
                    </button>
                    <button
                      onClick={() => setCheckInMode('pin')}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                        checkInMode === 'pin'
                          ? 'bg-[var(--brand-primary)] text-[var(--dark-900)]'
                          : 'text-[var(--brand-light)]/60 hover:text-[var(--brand-light)]'
                      }`}
                    >
                      <Keyboard className="w-4 h-4" />
                      {t('enterPin')}
                    </button>
                  </div>

                  {/* Check-in Method */}
                  {checkInMode === 'qr' ? (
                    <CheckInScanner onSuccess={handleSuccess} darkMode={true} />
                  ) : (
                    <PinCheckIn onSuccess={handleSuccess} darkMode={true} />
                  )}

                  <button 
                    onClick={() => router.back()}
                    className="mt-6 sm:mt-8 mb-4 flex items-center gap-2 text-[var(--brand-light)]/60 hover:text-[var(--brand-primary)] transition-colors font-medium text-sm"
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