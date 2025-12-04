'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '../../../../../lib/api';
import BookingResourceCard from '../../../../components/bookings/youth/BookingResourceCard';
import NavBar from '../../../../components/NavBar';
import { ArrowLeft, Calendar, Search, Building2 } from 'lucide-react';
import { useAuth } from '../../../../../context/AuthContext';
import Cookies from 'js-cookie';
import { questionnaireApi } from '../../../../../lib/questionnaire-api';

type FilterType = 'CLUB' | 'MUNICIPALITY';

export default function BrowseResourcesPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [resources, setResources] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('CLUB');
  const [searchQuery, setSearchQuery] = useState('');
  const [unfinishedCount, setUnfinishedCount] = useState(0);

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
    
    fetchResources();
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

  const fetchResources = async () => {
    setLoading(true);
    try {
      // The backend viewset filters 'is_active=True' automatically for youth.
      // Pass scope parameter to filter by club or municipality
      const scopeParam = filter === 'CLUB' ? 'club' : 'municipality';
      const res = await api.get(`/bookings/resources/?scope=${scopeParam}`);
      setResources(Array.isArray(res.data) ? res.data : res.data.results || []);
    } catch (err) {
      console.error(err);
      setResources([]);
    } finally {
      setLoading(false);
    }
  };

  // Filter and search logic
  const getFilteredResources = () => {
    let filtered = resources;

    // Backend already filters by scope and club, so we just need to filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(res => 
        res.name.toLowerCase().includes(query) ||
        res.description?.toLowerCase().includes(query) ||
        res.club_name?.toLowerCase().includes(query)
      );
    }

    return filtered;
  };

  const displayedResources = getFilteredResources();

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

            {/* Back Button */}
            <div>
              <Link 
                href="/dashboard/youth/bookings"
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 font-medium text-sm transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Bookings
              </Link>
            </div>

            {/* Filter Block */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Filter Resources</label>
              <div className="space-y-2">
                <button
                  onClick={() => setFilter('CLUB')}
                  className={`w-full text-left px-3 py-2.5 rounded-md text-sm transition-colors flex items-center gap-2 ${
                    filter === 'CLUB'
                      ? 'bg-blue-50 text-blue-700 font-medium border border-blue-200'
                      : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
                  }`}
                >
                  <Building2 className="w-4 h-4" />
                  My Club
                </button>
                <button
                  onClick={() => setFilter('MUNICIPALITY')}
                  className={`w-full text-left px-3 py-2.5 rounded-md text-sm transition-colors flex items-center gap-2 ${
                    filter === 'MUNICIPALITY'
                      ? 'bg-blue-50 text-blue-700 font-medium border border-blue-200'
                      : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
                  }`}
                >
                  <Building2 className="w-4 h-4" />
                  Municipality
                </button>
              </div>
            </div>

            {/* Search */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Find a room..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                />
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

          {/* Main Content - Resources List */}
          <main className="flex-1">
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-gray-900">New Booking</h1>
              <p className="text-sm text-gray-500 mt-1">
                {filter === 'CLUB' 
                  ? 'Browse bookable resources from your club'
                  : 'Browse bookable resources from your municipality'}
              </p>
            </div>

            {loading ? (
              <div className="text-center py-10 text-gray-500">Loading resources...</div>
            ) : displayedResources.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-200">
                <div className="max-w-md mx-auto">
                  <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 mb-2 font-medium">
                    {searchQuery 
                      ? `No resources found matching "${searchQuery}"`
                      : filter === 'CLUB'
                        ? 'No resources available in your club'
                        : 'No resources available in your municipality'}
                  </p>
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="text-sm text-blue-600 hover:underline mt-2"
                    >
                      Clear search
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {displayedResources.map((res: any) => (
                  <BookingResourceCard key={res.id} resource={res} />
                ))}
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
