'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import NavBar from '@/app/components/NavBar';
import YouthSidebar from '@/app/components/youth/YouthSidebar';
import ProfileEditForm from '@/app/components/profile/ProfileEditForm';
import { X } from 'lucide-react';

export default function EditProfilePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations('profile');
  const tSidebar = useTranslations('sidebar');
  const [profileData, setProfileData] = useState<any>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    } else if (user) {
      // Fetch fresh data for the form
      api.get('/auth/users/me/').then(res => setProfileData(res.data));
    }
  }, [user, authLoading, router]);

  if (!profileData) return (
    <div className="min-h-screen bg-[var(--dark-900)] flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[var(--brand-primary)]"></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[var(--dark-900)]">
      <NavBar darkMode={true} showBackButton={true} onMenuToggle={() => setIsSidebarOpen(true)} />
      
      {/* Mobile Sidebar Overlay */}
      <div 
        className={`fixed inset-0 bg-black/70 z-40 md:hidden transition-opacity duration-300 ${
          isSidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setIsSidebarOpen(false)}
      />
      
      {/* Mobile Sidebar */}
      <aside 
        className={`fixed top-0 left-0 h-screen w-64 z-50 bg-[var(--dark-800)] transform transition-transform duration-300 md:hidden ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between h-14 sm:h-16 px-4 border-b border-[var(--dark-500)]">
          <h1 className="text-xl font-bold text-[var(--brand-primary)]">{tSidebar('menu')}</h1>
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="w-9 h-9 flex items-center justify-center rounded-xl text-[var(--brand-light)] hover:bg-[var(--dark-600)]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4 overflow-y-auto h-[calc(100vh-3.5rem)] sm:h-[calc(100vh-4rem)]">
          <YouthSidebar activePath={pathname} darkMode />
        </div>
      </aside>
      
      <div className="max-w-4xl mx-auto px-0 sm:px-4 md:px-8 pb-20 pt-16 sm:pt-20">
        {/* Header */}
        <div className="mb-6 sm:mb-8 text-center px-4 sm:px-0 pt-4 sm:pt-6">
          <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-[var(--brand-secondary)] to-[var(--brand-primary)] rounded-xl sm:rounded-2xl mb-4">
            <svg className="w-7 h-7 sm:w-8 sm:h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[var(--brand-light)] mb-2 sm:mb-3 font-heading">{t('editProfile')}</h1>
          <p className="text-[var(--brand-light)]/60 text-sm sm:text-base max-w-xl mx-auto">
            {t('editProfileDescription')}
          </p>
        </div>
        
        <ProfileEditForm user={profileData} darkMode={true} />
      </div>
    </div>
  );
}
