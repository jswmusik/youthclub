'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';

import { useAuth } from '../../../../context/AuthContext';
import Cookies from 'js-cookie';
import NavBar from '../../../components/NavBar';
import YouthSidebar from '../../../components/youth/YouthSidebar';
import QuestionnaireFeed from '@/app/components/questionnaires/QuestionnaireFeed';
import { ClipboardList, X } from 'lucide-react';
import YouthFooter from '../../../components/youth/YouthFooter';


export default function QuestionnaireFeedPage() {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    // Check if user is authenticated
    const token = Cookies.get('access_token');
    if (!token) {
      router.push('/login');
      return;
    }
    
    // Check if user has correct role
    if (user && user.role !== 'YOUTH_MEMBER') {
      router.push('/login');
      return;
    }
  }, [user, router]);

  return (
    <div className="min-h-screen bg-[var(--dark-900)]">
      <NavBar darkMode={true} onMenuToggle={() => setIsSidebarOpen(!isSidebarOpen)} />
      
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
          <h1 className="text-xl font-bold text-[var(--brand-light)] font-heading">Menu</h1>
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
          <aside className="hidden md:block fixed top-16 w-56 h-[calc(100vh-4rem)] overflow-y-auto py-4 bg-[var(--dark-900)] z-30" style={{ left: 'max(1rem, calc((100vw - 80rem) / 2 + 1.5rem))' }}>
            <YouthSidebar activePath={pathname} darkMode={true} />
          </aside>
          
          {/* Content wrapper with left margin for sidebar */}
          <div className="md:ml-60">
            <main className="p-0 sm:p-4 md:p-6 pb-24 md:pb-6">
              {/* Header Section */}
              <div className="mb-4 sm:mb-6 px-4 sm:px-0 pt-4 sm:pt-0">
                <div className="flex items-center gap-2 sm:gap-3 mb-2">
                  <ClipboardList className="w-6 h-6 sm:w-7 sm:h-7 text-[var(--brand-primary)]" />
                  <h1 className="text-2xl sm:text-3xl md:text-4xl text-[var(--brand-light)] font-heading font-bold">
                    My Questionnaires
                  </h1>
                </div>
                <p className="text-[var(--brand-light)]/60 text-sm sm:text-base pl-8 sm:pl-10 font-semibold">
                  Share your opinion and earn rewards!
                </p>
              </div>
              
              {/* Questionnaire Feed */}
              <QuestionnaireFeed darkMode={true} />
            </main>
          </div>
        </div>
      </div>
      
      {/* Footer */}
      <YouthFooter />
    </div>
  );
}
