'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter, usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/context/AuthContext';
import Cookies from 'js-cookie';
import NavBar from '@/app/components/NavBar';
import YouthSidebar from '@/app/components/youth/YouthSidebar';
import QuestionnaireRunner from '@/app/components/questionnaires/QuestionnaireRunner';
import { X } from 'lucide-react';

export default function QuestionnaireRunnerPage() {
  const params = useParams();
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();
  const tSidebar = useTranslations('sidebar');
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
      <NavBar darkMode={true} onMenuToggle={() => setIsSidebarOpen(!isSidebarOpen)} showBackButton={true} hideBottomNavOnMobile={true} />
      
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
          <h1 className="text-xl font-bold text-[var(--brand-light)] font-heading">{tSidebar('menu')}</h1>
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
            <main className="p-0 sm:p-4 md:p-6 pb-24 md:pb-6">
              <QuestionnaireRunner questionnaireId={params.id as string} darkMode={true} />
            </main>
          </div>
        </div>
      </div>
    </div>
  );
}
