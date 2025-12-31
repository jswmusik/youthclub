'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Link from 'next/link';

import api from '../../../../lib/api';
import MyBookingCard from '../../../components/bookings/youth/MyBookingCard';
import BookingDetailModal from '../../../components/bookings/youth/BookingDetailModal';
import NavBar from '../../../components/NavBar';
import YouthSidebar from '../../../components/youth/YouthSidebar';
import { BookingsPageSkeleton } from '../../../components/ui/Skeleton';
import Footer from '@/app/components/Footer';
import { Plus, Calendar, Clock, XCircle, CalendarDays, X } from 'lucide-react';
import { useAuth } from '../../../../context/AuthContext';
import Cookies from 'js-cookie';

// Minimum skeleton display time (in ms) for better UX
const MIN_LOADING_TIME = 400;

type FilterType = 'upcoming' | 'history' | 'cancelled';

export default function YouthBookingsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();
  const t = useTranslations('bookings');
  const tSidebar = useTranslations('sidebar');
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('upcoming');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [minLoadingComplete, setMinLoadingComplete] = useState(false);

  // Minimum loading time for skeleton display
  useEffect(() => {
    const timer = setTimeout(() => {
      setMinLoadingComplete(true);
    }, MIN_LOADING_TIME);
    return () => clearTimeout(timer);
  }, []);

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
    
    fetchMyBookings();
  }, [user, router, filter]);

  const fetchMyBookings = async () => {
    setLoading(true);
    try {
      let allBookings: any[] = [];
      let nextUrl: string | null = null;
      let page = 1;
      
      // Fetch all pages of bookings
      do {
        const params = new URLSearchParams();
        params.set('page', page.toString());
        params.set('page_size', '100'); // Fetch 100 per page to minimize requests
        
        const res = await api.get(`/bookings/bookings/?${params.toString()}`);
        const data = res.data;
        
        const pageBookings = Array.isArray(data) ? data : data.results || [];
        allBookings = [...allBookings, ...pageBookings];
        
        // Check if there's a next page
        nextUrl = data.next || null;
        page++;
        
        // Safety limit to prevent infinite loops
        if (page > 100) break;
      } while (nextUrl);
      
      setBookings(allBookings);
    } catch (err) {
      console.error(err);
      setBookings([]);
    } finally {
      setLoading(false);
    }
  };

  // Filter bookings based on selected filter
  const getFilteredBookings = () => {
    const now = new Date();
    
    return bookings.filter((booking: any) => {
      const startTime = new Date(booking.start_time);
      const isPast = startTime < now;
      
      switch (filter) {
        case 'upcoming':
          return !isPast && booking.status !== 'CANCELLED';
        case 'history':
          return isPast && booking.status !== 'CANCELLED';
        case 'cancelled':
          return booking.status === 'CANCELLED';
        default:
          return true;
      }
    });
  };

  const filteredBookings = getFilteredBookings();
  
  // Show skeleton while loading (with minimum display time)
  const showSkeleton = loading || !minLoadingComplete;

  return (
    <div className="min-h-screen flex flex-col bg-[var(--dark-900)]">
      <div className="flex-1">
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
          <aside className="hidden md:block fixed top-16 w-56 h-[calc(100vh-4rem)] overflow-y-auto py-4 z-30" style={{ left: 'max(1rem, calc((100vw - 80rem) / 2 + 1.5rem))' }}>
            <YouthSidebar activePath={pathname} darkMode={true} />
          </aside>
          
          {/* Content wrapper with left margin for sidebar */}
          <div className="md:ml-60">
            <main className="p-0 sm:p-4 md:p-6 pb-24 md:pb-6">
              {showSkeleton ? (
                <BookingsPageSkeleton />
              ) : (
                <>
                  {/* Header Section */}
                  <div className="mb-4 sm:mb-6 px-4 sm:px-0 pt-4 sm:pt-0">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-3 sm:mb-4">
                      <div>
                        <div className="flex items-center gap-2 sm:gap-3 mb-1">
                          <CalendarDays className="w-6 h-6 sm:w-7 sm:h-7 text-[var(--brand-primary)]" />
                          <h1 className="text-2xl sm:text-3xl md:text-4xl text-[var(--brand-light)] font-heading font-bold">
                            {t('myBookings')}
                          </h1>
                        </div>
                        <p className="text-[var(--brand-light)]/60 text-sm pl-8 sm:pl-10">
                          {filter === 'upcoming' && t('upcomingReservations')}
                          {filter === 'history' && t('pastBookings')}
                          {filter === 'cancelled' && t('cancelledBookings')}
                        </p>
                      </div>
                      <Link 
                        href="/dashboard/youth/bookings/new"
                        className="inline-flex items-center gap-2 bg-[var(--brand-primary)] text-[var(--dark-900)] px-4 py-2.5 rounded-xl font-bold hover:bg-[var(--brand-primary)]/90 transition-all text-sm"
                      >
                        <Plus className="w-4 h-4" />
                        {t('newBooking')}
                      </Link>
                    </div>

                    {/* Filters Section */}
                    <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] p-3 sm:p-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          onClick={() => setFilter('upcoming')}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                            filter === 'upcoming'
                              ? 'bg-[var(--brand-third)] text-[var(--dark-900)]'
                              : 'bg-[var(--dark-700)] text-[var(--brand-light)]/60 hover:bg-[var(--dark-600)] hover:text-[var(--brand-light)]'
                          }`}
                        >
                          <Calendar className="w-3.5 h-3.5" />
                          {t('upcoming')}
                        </button>
                        
                        <button
                          onClick={() => setFilter('history')}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                            filter === 'history'
                              ? 'bg-[var(--brand-purple)] text-[var(--brand-light)]'
                              : 'bg-[var(--dark-700)] text-[var(--brand-light)]/60 hover:bg-[var(--dark-600)] hover:text-[var(--brand-light)]'
                          }`}
                        >
                          <Clock className="w-3.5 h-3.5" />
                          {t('history')}
                        </button>
                        
                        <button
                          onClick={() => setFilter('cancelled')}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                            filter === 'cancelled'
                              ? 'bg-[var(--brand-red)] text-[var(--brand-light)]'
                              : 'bg-[var(--dark-700)] text-[var(--brand-light)]/60 hover:bg-[var(--dark-600)] hover:text-[var(--brand-light)]'
                          }`}
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          {t('cancelled')}
                        </button>
                      </div>
                    </div>
                  </div>

                  {filteredBookings.length === 0 ? (
                <div className="text-center py-12 mx-4 sm:mx-0 bg-[var(--dark-800)] rounded-xl sm:rounded-2xl border border-[var(--dark-600)]">
                  <div className="max-w-md mx-auto px-4">
                    {filter === 'upcoming' && (
                      <>
                        <div className="w-20 h-20 bg-[var(--brand-primary)]/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                          <Calendar className="w-10 h-10 text-[var(--brand-primary)]" />
                        </div>
                        <p className="text-[var(--brand-light)] mb-2 font-bold text-lg font-heading">{t('noUpcomingBookings')}</p>
                        <p className="text-sm text-[var(--brand-light)]/60 mb-4">{t('noUpcomingBookingsMessage')}</p>
                        <Link 
                          href="/dashboard/youth/bookings/new"
                          className="inline-flex items-center gap-2 bg-[var(--brand-primary)] text-[var(--dark-900)] px-5 py-2.5 rounded-xl font-bold hover:bg-[var(--brand-primary)]/90 transition-all"
                        >
                          {t('bookAResource')}
                        </Link>
                      </>
                    )}
                    {filter === 'history' && (
                      <>
                        <div className="w-20 h-20 bg-[var(--dark-700)] rounded-2xl flex items-center justify-center mx-auto mb-4">
                          <Clock className="w-10 h-10 text-[var(--brand-light)]/40" />
                        </div>
                        <p className="text-[var(--brand-light)] mb-2 font-bold text-lg font-heading">{t('noBookingHistory')}</p>
                        <p className="text-sm text-[var(--brand-light)]/60">{t('noBookingHistoryMessage')}</p>
                      </>
                    )}
                    {filter === 'cancelled' && (
                      <>
                        <div className="w-20 h-20 bg-[var(--brand-red)]/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                          <XCircle className="w-10 h-10 text-[var(--brand-red)]" />
                        </div>
                        <p className="text-[var(--brand-light)] mb-2 font-bold text-lg font-heading">{t('noCancelledBookings')}</p>
                        <p className="text-sm text-[var(--brand-light)]/60">{t('noCancelledBookingsMessage')}</p>
                      </>
                    )}
                  </div>
                </div>
                  ) : (
                    <div className="space-y-3 px-4 sm:px-0">
                      {filteredBookings.map((booking: any) => (
                        <MyBookingCard 
                          key={booking.id} 
                          booking={booking}
                          onClick={() => setSelectedBooking(booking)}
                          darkMode={true}
                        />
                      ))}
                    </div>
                  )}
                </>
              )}
            </main>
          </div>
        </div>
      </div>

      {/* Booking Detail Modal */}
      {selectedBooking && (
        <BookingDetailModal
          booking={selectedBooking}
          onClose={() => setSelectedBooking(null)}
          onUpdate={() => {
            fetchMyBookings();
            setSelectedBooking(null);
          }}
          darkMode={true}
        />
      )}
      </div>
      
      {/* Footer */}
      <Footer />
    </div>
  );
}
