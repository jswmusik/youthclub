'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Cookies from 'js-cookie';
import NavBar from '@/app/components/NavBar';
import QuestionnaireRunner from '@/app/components/questionnaires/QuestionnaireRunner';
import { questionnaireApi } from '@/lib/questionnaire-api';

export default function QuestionnaireRunnerPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
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
    
    loadUnfinishedCount();
  }, [user, router]);
  
  // Refresh count periodically to catch changes (e.g., when user starts a questionnaire)
  useEffect(() => {
    const interval = setInterval(() => {
      loadUnfinishedCount();
    }, 5000); // Refresh every 5 seconds
    
    return () => clearInterval(interval);
  }, []);

  const loadUnfinishedCount = async () => {
    try {
      let allQuestionnaires: any[] = [];
      let nextUrl: string | null = null;
      let page = 1;
      
      // Fetch all pages
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
      
      // Count available questionnaires: not expired, not completed, not started
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
                  className="w-full text-left px-3 py-2 rounded-md text-sm transition-colors text-emerald-700 bg-emerald-50 hover:bg-emerald-100 font-medium flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                
                {/* Questionnaires */}
                <button
                  onClick={() => router.push('/dashboard/youth/questionnaires')}
                  className="w-full text-left px-3 py-2 rounded-md text-sm transition-colors bg-blue-50 text-blue-700 font-medium flex items-center justify-between group"
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

          {/* Main Content */}
          <main className="flex-1">
            <button
              onClick={() => router.push('/dashboard/youth/questionnaires')}
              className="mb-6 flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors text-sm font-medium"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Questionnaires
            </button>
            <QuestionnaireRunner 
              questionnaireId={params.id as string} 
              onDataLoaded={() => {
                // Refresh count when questionnaire data is loaded (which creates STARTED response)
                setTimeout(() => {
                  loadUnfinishedCount();
                }, 500);
              }}
            />
          </main>
        </div>
      </div>
    </div>
  );
}

