'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useTheme } from 'next-themes';
import { useAuth } from '@/context/AuthContext';
import GuardianNavBar from '@/app/components/guardian/GuardianNavBar';
import PrivacyDataManager from '@/app/components/privacy/PrivacyDataManager';
import { Shield } from 'lucide-react';

export default function GuardianPrivacyPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const t = useTranslations('privacy');
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);
  
  const darkMode = !mounted || theme === 'dark';

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    } else if (user && user.role !== 'GUARDIAN') {
      router.push('/dashboard/youth');
    }
  }, [user, authLoading, router]);

  if (!user) return (
    <div className={`min-h-screen flex items-center justify-center ${darkMode ? 'bg-[var(--dark-900)]' : 'bg-[#F8F7FE]'}`}>
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[var(--brand-primary)]"></div>
    </div>
  );

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-[var(--dark-900)]' : 'bg-[#F8F7FE]'}`}>
      <GuardianNavBar darkMode={darkMode} />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 md:px-8 pb-20 pt-16 sm:pt-20">
        {/* Header */}
        <div className="mb-6 sm:mb-8 text-center pt-4 sm:pt-6">
          <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-[var(--brand-secondary)] to-[var(--brand-primary)] rounded-xl sm:rounded-2xl mb-4">
            <Shield className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
          </div>
          <h1 className={`text-2xl sm:text-3xl md:text-4xl font-bold mb-2 sm:mb-3 font-heading ${darkMode ? 'text-[var(--brand-light)]' : 'text-gray-900'}`}>
            {t('title') || 'Privacy & Your Data'}
          </h1>
          <p className={`text-sm sm:text-base max-w-xl mx-auto ${darkMode ? 'text-[var(--brand-light)]/60' : 'text-gray-600'}`}>
            {t('description') || 'Manage your privacy settings, consents, and data rights (GDPR)'}
          </p>
        </div>
        
        {/* Privacy Manager Component */}
        <PrivacyDataManager darkMode={darkMode} />
      </div>
    </div>
  );
}

