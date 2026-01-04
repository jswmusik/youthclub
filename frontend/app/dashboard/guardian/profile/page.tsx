'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useTheme } from 'next-themes';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import GuardianNavBar from '@/app/components/guardian/GuardianNavBar';
import ProfileHeader from '@/app/components/profile/ProfileHeader';
import GuardianProfileContent from '@/app/components/guardian/GuardianProfileContent';
import GuardianSidebar from '@/app/components/guardian/GuardianSidebar';
import Footer from '@/app/components/Footer';
import { X } from 'lucide-react';

export default function GuardianProfilePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const tSidebar = useTranslations('sidebar');
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);
  
  // Theme detection
  useEffect(() => {
    setMounted(true);
  }, []);
  const darkMode = !mounted || theme === 'dark';
  
  const [profileData, setProfileData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }
    
    if (user && user.role !== 'GUARDIAN') {
      router.push('/dashboard/youth');
      return;
    }

    const fetchProfile = async () => {
      try {
        const res = await api.get('/auth/users/me/');
        setProfileData(res.data);
      } catch (e) {
        console.error('Failed to fetch profile:', e);
      } finally {
        setLoading(false);
      }
    };

    if (user) fetchProfile();
  }, [user, authLoading, router]);

  if (authLoading || loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${darkMode ? 'bg-[var(--dark-900)]' : 'bg-[#F8F7FE]'}`}>
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[var(--brand-primary)]"></div>
      </div>
    );
  }

  if (!profileData) return null;

  return (
    <div className={`min-h-screen flex flex-col ${darkMode ? 'bg-[var(--dark-900)]' : 'bg-[#F8F7FE]'}`}>
      <div className="flex-1">
      <GuardianNavBar 
        onMenuToggle={() => setIsSidebarOpen(true)}
      />
      
      {/* Mobile Sidebar Overlay */}
      <div 
        className={`fixed inset-0 bg-black/70 z-40 md:hidden transition-opacity duration-300 ${
          isSidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setIsSidebarOpen(false)}
      />
      
      {/* Mobile Sidebar */}
      <aside 
        className={`fixed top-0 left-0 h-screen w-64 z-50 transform transition-transform duration-300 md:hidden ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } ${darkMode ? 'bg-[var(--dark-800)]' : 'bg-white'}`}
      >
        <div className={`flex items-center justify-between h-14 sm:h-16 px-4 border-b ${
          darkMode ? 'border-[var(--dark-500)]' : 'border-[#4D4DA4]/10'
        }`}>
          <h1 className="text-xl font-bold text-[var(--brand-primary)]">{tSidebar('menu')}</h1>
          <button
            onClick={() => setIsSidebarOpen(false)}
            className={`w-9 h-9 flex items-center justify-center rounded-xl ${
              darkMode ? 'text-[var(--brand-light)] hover:bg-[var(--dark-600)]' : 'text-gray-500 hover:bg-gray-100'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4 overflow-y-auto h-[calc(100vh-3.5rem)] sm:h-[calc(100vh-4rem)]">
          <GuardianSidebar />
        </div>
      </aside>
      
      {/* Main Layout */}
      <div className="pt-14 sm:pt-16">
        <main className="pb-20">
          
          {/* Profile Header Container */}
          <div className="max-w-6xl mx-auto px-0 sm:px-4 md:pt-6 md:px-6">
            <ProfileHeader 
              user={profileData} 
              primaryClub={null}
              darkMode={darkMode}
              hideCheckIn={true}
            />
          </div>

          {/* Tabs & Content */}
          <div className="mt-6 sm:mt-8">
            <GuardianProfileContent user={profileData} darkMode={darkMode} />
          </div>

        </main>
      </div>
      </div>
      
      {/* Footer */}
      <Footer />
    </div>
  );
}
