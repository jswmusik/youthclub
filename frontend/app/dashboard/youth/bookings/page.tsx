'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '../../../../lib/api';
import MyBookingCard from '../../../components/bookings/youth/MyBookingCard';
import BookingDetailModal from '../../../components/bookings/youth/BookingDetailModal';
import NavBar from '../../../components/NavBar';
import { Plus, Calendar, Clock, XCircle } from 'lucide-react';
import { useAuth } from '../../../../context/AuthContext';
import Cookies from 'js-cookie';
import { questionnaireApi } from '../../../../lib/questionnaire-api';

type FilterType = 'upcoming' | 'history' | 'cancelled';

export default function YouthBookingsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('upcoming');
  const [unfinishedCount, setUnfinishedCount] = useState(0);
  const [selectedBooking, setSelectedBooking] = useState<any>(null);

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
    loadUnfinishedCount();
  }, [user, router, filter]);

  const loadUnfinishedCount = async () => {
    try {
      let allQuestionnaires: any[] = [];
      let nextUrl: string | null = null;
      let page = 1;
      
      do {
        const params = new URLSearchParams();
        params.set('page', page.toString());
        params.set('page_size', '100');
        
        const res = await questionnaireApi.getFeed(params);
        const data = res.data;
        
        const pageQuestionnaires = Array.isArray(data) ? data : data.results || [];
        allQuestionnaires = [...allQuestionnaires, ...pageQuestionnaires];
        
        nextUrl = data.next || null;
        page++;
        
        if (page > 100) break;
      } while (nextUrl);
      
      const now = new Date();
      const available = allQuestionnaires.filter((q: any) => {
        const expirationDate = new Date(q.expiration_date);
        return expirationDate >= now && !q.is_completed && !q.is_started;
      });
      
      setUnfinishedCount(available.length);
    } catch (err) {
      console.error('Failed to load unfinished questionnaires count:', err);
    }
  };

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

  return (
    <div className="min-h-screen bg-gray-100">
      <NavBar />
      <div className="max-w-7xl mx-auto px-4 py-6 md:py-8">
        <div className="flex flex-col md:flex-row gap-8">
          {/* Sidebar (Navigation) - Same as dashboard */}
          <aside className="w-full md:w-64 flex-shrink-0 space-y-8 md:sticky md:top-[72px] md:self-start md:max-h-[calc(100vh-88px)] md:overflow-y-auto">
            {/* Header */}
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
              <p className="text-sm text-gray-500 mt-1">Your Activity & Navigation</p>
            </div>

            {/* Filter Block */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Filter Bookings</label>
              <div className="space-y-2">
                <button
                  onClick={() => setFilter('upcoming')}
                  className={`w-full text-left px-3 py-2.5 rounded-md text-sm transition-colors flex items-center gap-2 ${
                    filter === 'upcoming'
                      ? 'bg-blue-50 text-blue-700 font-medium border border-blue-200'
                      : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
                  }`}
                >
                  <Calendar className="w-4 h-4" />
                  Coming Bookings
                </button>
                <button
                  onClick={() => setFilter('history')}
                  className={`w-full text-left px-3 py-2.5 rounded-md text-sm transition-colors flex items-center gap-2 ${
                    filter === 'history'
                      ? 'bg-blue-50 text-blue-700 font-medium border border-blue-200'
                      : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
                  }`}
                >
                  <Clock className="w-4 h-4" />
                  Booking History
                </button>
                <button
                  onClick={() => setFilter('cancelled')}
                  className={`w-full text-left px-3 py-2.5 rounded-md text-sm transition-colors flex items-center gap-2 ${
                    filter === 'cancelled'
                      ? 'bg-blue-50 text-blue-700 font-medium border border-blue-200'
                      : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
                  }`}
                >
                  <XCircle className="w-4 h-4" />
                  Cancelled Bookings
                </button>
              </div>
            </div>

            {/* Navigation Menu */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Navigation</label>
              <div className="space-y-1">
                {/* Your Feed */}
                <button
                  onClick={() => router.push('/dashboard/youth')}
                  className="w-full text-left px-3 py-2 rounded-md text-sm transition-colors text-gray-600 hover:bg-gray-50"
                >
                  Your Feed
                </button>
                
                {/* Scan to Check In */}
                <button
                  onClick={() => router.push('/dashboard/youth/scan')}
                  className="w-full text-left px-3 py-2 rounded-md text-sm transition-colors text-gray-600 hover:bg-gray-50 flex items-center gap-2"
                >
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4h-4v-4H8m13-9v2m-3-2v2m-3-2v2m-3-2v2m-3-2v2m-3-2v2m-3-2v2m-3-2v2m-3-2v2M5 3v2m0 12v2m0-6v2m14-8v2m0 6v2m-4-6h2m-6 0h2" />
                  </svg>
                  Scan to Check In
                </button>

                {/* Visit History */}
                <button
                  onClick={() => router.push('/dashboard/youth/visits')}
                  className="w-full text-left px-3 py-2 rounded-md text-sm transition-colors text-gray-600 hover:bg-gray-50"
                >
                  Visit History
                </button>
                
                {/* Borrow Items */}
                <button
                  onClick={() => router.push('/dashboard/youth/inventory')}
                  className="w-full text-left px-3 py-2 rounded-md text-sm transition-colors text-gray-600 hover:bg-gray-50 flex items-center gap-2"
                >
                  <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                  Borrow Items
                </button>
                
                {/* Bookings - Active */}
                <button
                  onClick={() => router.push('/dashboard/youth/bookings')}
                  className="w-full text-left px-3 py-2 rounded-md text-sm transition-colors bg-blue-50 text-blue-700 font-medium flex items-center gap-2"
                >
                  <Calendar className="w-4 h-4" />
                  Bookings
                </button>
                
                {/* Questionnaires */}
                <button
                  onClick={() => router.push('/dashboard/youth/questionnaires')}
                  className="w-full text-left px-3 py-2 rounded-md text-sm transition-colors text-gray-600 hover:bg-gray-50 flex items-center justify-between group"
                >
                  <span className="group-hover:text-blue-600">Questionnaires</span>
                  {unfinishedCount > 0 && (
                    <span className="bg-blue-600 text-white text-xs font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center">
                      {unfinishedCount}
                    </span>
                  )}
                </button>
                
                {/* Groups */}
                <button
                  onClick={() => router.push('/dashboard/youth/groups')}
                  className="w-full text-left px-3 py-2 rounded-md text-sm transition-colors text-gray-600 hover:bg-gray-50 flex items-center justify-between group"
                >
                  <span className="group-hover:text-blue-600">Groups</span>
                  {(() => {
                    const memberships = (user as any)?.my_memberships || [];
                    const approvedCount = memberships.filter((m: any) => m.status === 'APPROVED').length;
                    return approvedCount > 0 ? (
                      <span className="bg-yellow-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                        {approvedCount}
                      </span>
                    ) : null;
                  })()}
                </button>
                
                {/* My Groups */}
                <button
                  onClick={() => router.push('/dashboard/youth/profile?tab=clubs')}
                  className="w-full text-left px-3 py-2 rounded-md text-sm transition-colors text-gray-600 hover:bg-gray-50"
                >
                  My Groups
                </button>
                
                {/* My Guardians */}
                <button
                  onClick={() => router.push('/dashboard/youth/profile?tab=guardians')}
                  className="w-full text-left px-3 py-2 rounded-md text-sm transition-colors text-gray-600 hover:bg-gray-50"
                >
                  My Guardians
                </button>
                
                {/* My Club */}
                {user?.preferred_club?.id ? (
                  <button
                    onClick={() => router.push(`/dashboard/youth/club/${user.preferred_club.id}`)}
                    className="w-full text-left px-3 py-2 rounded-md text-sm transition-colors text-gray-600 hover:bg-gray-50"
                  >
                    My Club
                  </button>
                ) : (
                  <button
                    disabled
                    className="w-full text-left px-3 py-2 rounded-md text-sm text-gray-400 cursor-not-allowed"
                  >
                    My Club
                  </button>
                )}
                
                {/* News */}
                <button
                  onClick={() => router.push('/dashboard/youth/news')}
                  className="w-full text-left px-3 py-2 rounded-md text-sm transition-colors text-gray-600 hover:bg-gray-50"
                >
                  News
                </button>
                
                {/* Events */}
                <button
                  disabled
                  className="w-full text-left px-3 py-2 rounded-md text-sm text-gray-400 cursor-not-allowed flex items-center justify-between"
                >
                  <span>Events</span>
                  <span className="bg-yellow-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                    6
                  </span>
                </button>
              </div>
            </div>
          </aside>

          {/* Main Content - Bookings List */}
          <main className="flex-1">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">My Bookings</h1>
                <p className="text-sm text-gray-500 mt-1">
                  {filter === 'upcoming' && 'Your upcoming reservations'}
                  {filter === 'history' && 'Your past bookings'}
                  {filter === 'cancelled' && 'Cancelled bookings'}
                </p>
              </div>
              <Link 
                href="/dashboard/youth/bookings/new"
                className="bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 shadow-sm transition-colors flex items-center gap-2"
              >
                <Plus className="w-4 h-4" /> New Booking
              </Link>
            </div>

            {loading ? (
              <div className="text-center py-10 text-gray-500">Loading bookings...</div>
            ) : filteredBookings.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-200">
                <div className="max-w-md mx-auto">
                  {filter === 'upcoming' && (
                    <>
                      <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500 mb-2 font-medium">No upcoming bookings</p>
                      <p className="text-sm text-gray-400 mb-4">You don't have any upcoming reservations.</p>
                      <Link 
                        href="/dashboard/youth/bookings/new"
                        className="inline-block text-blue-600 font-semibold hover:underline"
                      >
                        Book a resource →
                      </Link>
                    </>
                  )}
                  {filter === 'history' && (
                    <>
                      <Clock className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500 mb-2 font-medium">No booking history</p>
                      <p className="text-sm text-gray-400">You haven't completed any bookings yet.</p>
                    </>
                  )}
                  {filter === 'cancelled' && (
                    <>
                      <XCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500 mb-2 font-medium">No cancelled bookings</p>
                      <p className="text-sm text-gray-400">You haven't cancelled any bookings.</p>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredBookings.map((booking: any) => (
                  <MyBookingCard 
                    key={booking.id} 
                    booking={booking}
                    onClick={() => setSelectedBooking(booking)}
                  />
                ))}
              </div>
            )}
          </main>
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
        />
      )}
    </div>
  );
}
