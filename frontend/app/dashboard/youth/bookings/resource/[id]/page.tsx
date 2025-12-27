'use client';

import { useParams, useRouter, usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';

import api from '../../../../../../lib/api';
import { getMediaUrl } from '../../../../../utils';
import BookingWizard from '../../../../../components/bookings/youth/BookingWizard';
import NavBar from '../../../../../components/NavBar';
import YouthSidebar from '../../../../../components/youth/YouthSidebar';
import { Calendar, AlertCircle, Building2, Users, X } from 'lucide-react';
import { useAuth } from '../../../../../../context/AuthContext';
import Cookies from 'js-cookie';


export default function BookingWizardPage() {
  const { id } = useParams();
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();
  const t = useTranslations('bookings.resourceDetail');
  const tCard = useTranslations('bookings.resourceCard');
  const tSidebar = useTranslations('sidebar');
  const tResourceTypes = useTranslations('bookings.resourceTypes');
  const [resource, setResource] = useState<any>(null);
  const [loading, setLoading] = useState(true);
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
    
    loadResource();
  }, [id, user, router]);

  const loadResource = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/bookings/resources/${id}/`);
      setResource(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--dark-900)]">
        <NavBar darkMode={true} onMenuToggle={() => setIsSidebarOpen(!isSidebarOpen)} showBackButton={true} />
        <div className="pt-20 flex justify-center py-12">
          <div className="w-12 h-12 border-4 border-[var(--brand-primary)]/20 border-t-[var(--brand-primary)] rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (!resource) {
    return (
      <div className="min-h-screen bg-[var(--dark-900)]">
        <NavBar darkMode={true} onMenuToggle={() => setIsSidebarOpen(!isSidebarOpen)} showBackButton={true} />
        <div className="pt-20 text-center py-12">
          <p className="text-[var(--brand-light)]/60 font-semibold">{t('resourceNotFound')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--dark-900)]">
      <NavBar darkMode={true} onMenuToggle={() => setIsSidebarOpen(!isSidebarOpen)} showBackButton={true} />
      
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
          <aside className="hidden md:block fixed top-16 w-56 h-[calc(100vh-4rem)] overflow-y-auto py-4 bg-[var(--dark-900)] z-30" style={{ left: 'max(1rem, calc((100vw - 80rem) / 2 + 1.5rem))' }}>
            <YouthSidebar activePath={pathname} darkMode={true} />
          </aside>
          
          {/* Content wrapper with left margin for sidebar */}
          <div className="md:ml-60">
            <main className="p-0 sm:p-4 md:p-6 pb-24 md:pb-6">
              {/* Resource Header Card */}
              <div className="bg-[var(--dark-800)] sm:rounded-2xl border-b sm:border border-[var(--dark-600)] overflow-hidden mb-4 sm:mb-6">
                {/* Resource Image - Full width on mobile */}
                <div className="relative h-56 sm:h-64 bg-gradient-to-br from-[var(--dark-700)] to-[var(--dark-600)]">
                  {resource.image ? (
                    <img 
                      src={getMediaUrl(resource.image) || ''} 
                      className="w-full h-full object-cover" 
                      alt={resource.name} 
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Building2 className="w-20 h-20 text-[var(--brand-light)]/20" />
                    </div>
                  )}
                  {/* Gradient overlay for text readability */}
                  <div className="absolute inset-0 bg-gradient-to-t from-[var(--dark-900)]/80 via-transparent to-transparent" />
                </div>

                {/* Resource Info */}
                <div className="p-4 sm:p-6">
                  <div className="mb-4">
                    <h1 className="text-2xl sm:text-3xl font-bold text-[var(--brand-light)] mb-2 font-heading">
                      {resource.name}
                    </h1>
                    {resource.club_name && (
                      <div className="flex items-center gap-2 text-sm text-[var(--brand-primary)] font-bold mb-3">
                        <Building2 className="w-4 h-4" />
                        <span>{resource.club_name}</span>
                      </div>
                    )}
                    {resource.description && (
                      <p className="text-[var(--brand-light)]/70 text-sm leading-relaxed bg-[var(--dark-700)] p-3 rounded-xl border border-[var(--dark-600)]">
                        {resource.description}
                      </p>
                    )}
                  </div>

                  {/* Resource Details */}
                  <div className="flex flex-wrap gap-3 mb-4">
                    {resource.max_participants && (
                      <div className="flex items-center gap-2 bg-[var(--dark-700)] px-4 py-2.5 rounded-xl border border-[var(--dark-600)]">
                        <Users className="w-4 h-4 text-[var(--brand-purple)]" />
                        <span className="text-sm font-bold text-[var(--brand-light)]/80">{tCard('maxPeople', { count: resource.max_participants })}</span>
                      </div>
                    )}
                    {resource.resource_type && (
                      <div className="px-4 py-2.5 bg-[var(--brand-primary)]/10 rounded-xl text-xs font-bold text-[var(--brand-primary)] border border-[var(--brand-primary)]/20">
                        {tResourceTypes(resource.resource_type as 'ROOM' | 'EQUIPMENT')}
                      </div>
                    )}
                  </div>

                  {/* Training Warning */}
                  {resource.requires_training && (
                    <div className="mt-4 bg-[var(--brand-peach)]/10 border border-[var(--brand-peach)]/30 p-4 rounded-xl flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-[var(--brand-peach)] flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-bold text-[var(--brand-peach)] mb-1">{t('licenseRequired')}</p>
                        <p className="text-xs text-[var(--brand-light)]/60 font-semibold">
                          {t('licenseRequiredMessage')}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Booking Wizard */}
              <div className="bg-[var(--dark-800)] sm:rounded-2xl border-y sm:border border-[var(--dark-600)] p-4 sm:p-6">
                <BookingWizard resource={resource} darkMode={true} />
              </div>
            </main>
          </div>
        </div>
      </div>
    </div>
  );
}
