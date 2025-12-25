'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import api, { visits } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import NavBar from '@/app/components/NavBar';
import ProfileHeader from '@/app/components/profile/ProfileHeader';
import ProfileContent from '@/app/components/profile/ProfileContent';
import YouthSidebar from '@/app/components/youth/YouthSidebar';
import { X } from 'lucide-react';
import YouthFooter from '@/app/components/youth/YouthFooter';

export default function YouthProfilePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  
  // We might want to fetch "fresher" data than what's in context, 
  // specifically if we need relations like full Club objects.
  const [profileData, setProfileData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    // Redirect if not logged in
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    const fetchProfileDetails = async () => {
      try {
        // Fetch fresh user data + relations (if your serializer supports depth)
        const res = await api.get('/auth/users/me/');
        setProfileData(res.data);
      } catch (error) {
        console.error("Failed to fetch profile", error);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchProfileDetails();
    }
  }, [user, authLoading, router]);

  // Check active visit status
  useEffect(() => {
    if (!user || user.role !== 'YOUTH_MEMBER') return;

    const checkVisitStatus = async () => {
      try {
        const res = await visits.getMyActiveVisit();
        setIsCheckedIn(res.data?.is_checked_in || false);
      } catch (e) {
        setIsCheckedIn(false);
      }
    };
    
    checkVisitStatus();
    const interval = setInterval(checkVisitStatus, 30000);
    return () => clearInterval(interval);
  }, [user]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--dark-900)]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[var(--brand-primary)]"></div>
      </div>
    );
  }

  if (!profileData) return null;

  return (
    <div className="min-h-screen bg-[var(--dark-900)]">
      <NavBar 
        showBackButton={true}
        darkMode={true}
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
        className={`fixed top-0 left-0 h-screen w-64 z-50 bg-[var(--dark-800)] transform transition-transform duration-300 md:hidden ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between h-14 sm:h-16 px-4 border-b border-[var(--dark-500)]">
          <h1 className="text-xl font-bold text-[var(--brand-primary)]">Menu</h1>
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
      
      {/* Main Layout */}
      <div className="pt-14 sm:pt-16">
        <main className="pb-20">
          
          {/* 1. Profile Header Container */}
          <div className="max-w-6xl mx-auto px-0 sm:px-4 md:pt-6 md:px-6">
            <ProfileHeader 
              user={profileData} 
              primaryClub={profileData.preferred_club}
              darkMode={true}
            />
          </div>

          {/* 2. Tabs & Content */}
          <div className="mt-6 sm:mt-8">
            <ProfileContent user={profileData} darkMode={true} isCheckedIn={isCheckedIn} />
          </div>

        </main>
      </div>
      
      {/* Footer */}
      <YouthFooter />
    </div>
  );
}

