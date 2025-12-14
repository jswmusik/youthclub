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
          {/* Sidebar (Navigation) - Redesigned */}
          <aside className="w-full md:w-64 flex-shrink-0 space-y-6 md:sticky md:top-[72px] md:self-start md:max-h-[calc(100vh-88px)] md:overflow-y-auto">
            {/* Header */}
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-[#4D4DA4] mb-1">Dashboard</h1>
              <p className="text-sm text-gray-600">Your space to explore</p>
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
            <div className="space-y-2">
                {/* Your Feed */}
                <button
                  onClick={() => router.push('/dashboard/youth')}
                  className="w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 text-gray-700 bg-white hover:bg-[#EBEBFE] border border-gray-200 hover:border-[#4D4DA4]/20 flex items-center gap-3 group"
                >
                  <svg className="w-5 h-5 text-gray-600 group-hover:text-[#4D4DA4]" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z"/>
                  </svg>
                  <span>Your Feed</span>
                </button>
                
                {/* Scan to Check In */}
                <button
                  onClick={() => router.push('/dashboard/youth/scan')}
                  className="w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 text-gray-700 bg-white hover:bg-[#EBEBFE] border border-gray-200 hover:border-[#4D4DA4]/20 flex items-center gap-3 group"
                >
                  <svg className="w-5 h-5 text-gray-600 group-hover:text-[#4D4DA4]" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M9.5 6.5v3h-3v-3h3M11 5H5v6h6V5zm-1.5 9.5v3h-3v-3h3M11 13H5v6h6v-6zm6.5-6.5v3h-3v-3h3M19 5h-6v6h6V5zm-6 13h6v-6h-6v6zm1.5-1.5h3v3h-3v-3z"/>
                  </svg>
                  <span>Scan to Check In</span>
                </button>
                
                {/* Borrow Items */}
                <button
                  onClick={() => router.push('/dashboard/youth/inventory')}
                  className="w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 text-gray-700 bg-white hover:bg-[#EBEBFE] border border-gray-200 hover:border-[#4D4DA4]/20 flex items-center gap-3 group"
                >
                  <svg className="w-5 h-5 text-gray-600 group-hover:text-[#4D4DA4]" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20 6h-2.18c.11-.31.18-.65.18-1a2.996 2.996 0 0 0-5.5-1.65l-.5.67-.5-.68C10.96 2.54 10 2 9 2 7.34 2 6 3.34 6 5c0 .35.07.69.18 1H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-5-2c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zM9 4c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm11 15H4v-2h16v2zm0-5H4V8h5.08L7 10.83 8.62 12 11 8.76l1-1.36 1 1.36L15.38 12 17 10.83 14.92 8H20v6z"/>
                  </svg>
                  <span>Borrow Items</span>
                </button>
                
                {/* Bookings - Active */}
                <button
                  onClick={() => router.push('/dashboard/youth/bookings')}
                  className="w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 bg-[#4D4DA4] text-white shadow-sm hover:shadow-md hover:bg-[#5D5DB4] flex items-center gap-3"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zm0-12H5V6h14v2z"/>
                  </svg>
                  <span>Bookings</span>
                </button>
                
                {/* Questionnaires */}
                <button
                  onClick={() => router.push('/dashboard/youth/questionnaires')}
                  className="w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 text-gray-700 bg-white hover:bg-[#EBEBFE] border border-gray-200 hover:border-[#4D4DA4]/20 flex items-center justify-between group"
                >
                  <div className="flex items-center gap-3">
                    <svg className="w-5 h-5 text-gray-600 group-hover:text-[#4D4DA4]" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>
                    </svg>
                    <span>Questionnaires</span>
                  </div>
                  {unfinishedCount > 0 && (
                    <span className="bg-[#FF5485] text-white text-xs font-bold px-2 py-1 rounded-full min-w-[22px] text-center">
                      {unfinishedCount}
                    </span>
                  )}
                </button>
                
                {/* My Groups */}
                <button
                  onClick={() => router.push('/dashboard/youth/profile?tab=clubs')}
                  className="w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 text-gray-700 bg-white hover:bg-[#EBEBFE] border border-gray-200 hover:border-[#4D4DA4]/20 flex items-center gap-3 group"
                >
                  <svg className="w-5 h-5 text-gray-600 group-hover:text-[#4D4DA4]" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
                  </svg>
                  <span>My Groups</span>
                </button>
                
                {/* My Club */}
                {user?.preferred_club?.id ? (
                  <button
                    onClick={() => router.push(`/dashboard/youth/club/${user.preferred_club.id}`)}
                    className="w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 text-gray-700 bg-white hover:bg-[#EBEBFE] border border-gray-200 hover:border-[#4D4DA4]/20 flex items-center gap-3 group"
                  >
                    <svg className="w-5 h-5 text-gray-600 group-hover:text-[#4D4DA4]" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                    </svg>
                    <span>My Club</span>
                  </button>
                ) : (
                  <button
                    disabled
                    className="w-full text-left px-4 py-3 rounded-xl text-sm font-medium text-gray-400 bg-gray-50 border border-gray-200 cursor-not-allowed flex items-center gap-3"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                    </svg>
                    <span>My Club</span>
                  </button>
                )}
                
                {/* News */}
                <button
                  onClick={() => router.push('/dashboard/youth/news')}
                  className="w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 text-gray-700 bg-white hover:bg-[#EBEBFE] border border-gray-200 hover:border-[#4D4DA4]/20 flex items-center gap-3 group"
                >
                  <svg className="w-5 h-5 text-gray-600 group-hover:text-[#4D4DA4]" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>
                  </svg>
                  <span>News</span>
                </button>
                
                {/* Events */}
                <button
                  onClick={() => router.push('/dashboard/youth/events')}
                  className="w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 text-gray-700 bg-white hover:bg-[#EBEBFE] border border-gray-200 hover:border-[#4D4DA4]/20 flex items-center justify-between group"
                >
                  <div className="flex items-center gap-3">
                    <svg className="w-5 h-5 text-gray-600 group-hover:text-[#4D4DA4]" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M17 10H7v2h10v-2zm2-7h-3V1h-2v2H8V1H6v2H3c-1.11 0-1.99.9-1.99 2L1 19c0 1.1.89 2 2 2h16c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H3V8h16v11zm-5-9H7v2h7v-2z"/>
                    </svg>
                    <span>Events</span>
                  </div>
                  <span className="bg-[#FF5485] text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                    6
                  </span>
                </button>
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
