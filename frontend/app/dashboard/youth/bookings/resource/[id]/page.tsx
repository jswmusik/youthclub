'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import api from '../../../../../../lib/api';
import { getMediaUrl } from '../../../../../utils';
import BookingWizard from '../../../../../components/bookings/youth/BookingWizard';
import NavBar from '../../../../../components/NavBar';
import { ArrowLeft, Calendar, AlertCircle, Building2, Users } from 'lucide-react';
import { useAuth } from '../../../../../../context/AuthContext';
import Cookies from 'js-cookie';
import { questionnaireApi } from '../../../../../../lib/questionnaire-api';

export default function BookingWizardPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [resource, setResource] = useState<any>(null);
  const [loading, setLoading] = useState(true);
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
    
    loadResource();
    loadUnfinishedCount();
  }, [id, user, router]);

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
      <div className="min-h-screen bg-gray-100">
        <NavBar />
        <div className="max-w-7xl mx-auto px-4 py-6 md:py-8">
          <div className="text-center py-10 text-gray-500">Loading resource...</div>
        </div>
      </div>
    );
  }

  if (!resource) {
    return (
      <div className="min-h-screen bg-gray-100">
        <NavBar />
        <div className="max-w-7xl mx-auto px-4 py-6 md:py-8">
          <div className="text-center py-10 text-gray-500">Resource not found.</div>
        </div>
      </div>
    );
  }

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
              <button
                onClick={() => router.back()}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 font-medium text-sm transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Resources
              </button>
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

          {/* Main Content - Resource Details & Booking Wizard */}
          <main className="flex-1">
            {/* Resource Header Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-6">
              {/* Resource Image */}
              <div className="relative h-48 bg-gray-200">
                {resource.image ? (
                  <img 
                    src={getMediaUrl(resource.image) || ''} 
                    className="w-full h-full object-cover" 
                    alt={resource.name} 
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    <Building2 className="w-16 h-16" />
                  </div>
                )}
              </div>

              {/* Resource Info */}
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">{resource.name}</h1>
                    {resource.club_name && (
                      <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                        <Building2 className="w-4 h-4" />
                        <span>{resource.club_name}</span>
                      </div>
                    )}
                    {resource.description && (
                      <p className="text-gray-600 text-sm leading-relaxed">{resource.description}</p>
                    )}
                  </div>
                </div>

                {/* Resource Details */}
                <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-4">
                  {resource.max_participants && (
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-gray-400" />
                      <span>Max {resource.max_participants} participants</span>
                    </div>
                  )}
                  {resource.resource_type && (
                    <div className="px-3 py-1 bg-gray-100 rounded-md text-xs font-medium text-gray-700">
                      {resource.resource_type}
                    </div>
                  )}
                </div>

                {/* Training Warning */}
                {resource.requires_training && (
                  <div className="mt-4 bg-orange-50 border border-orange-200 p-4 rounded-lg flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-orange-900 mb-1">License Required</p>
                      <p className="text-xs text-orange-800">
                        This resource requires a license or training. Ensure you are qualified before booking.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Booking Wizard */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <BookingWizard resource={resource} />
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
