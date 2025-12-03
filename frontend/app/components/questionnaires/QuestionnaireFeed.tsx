'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { questionnaireApi } from '../../../lib/questionnaire-api';
import { useRouter } from 'next/navigation';

export default function QuestionnaireFeed() {
  const [questionnaires, setQuestionnaires] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    loadFeed();
  }, []);

  const loadFeed = async () => {
    try {
      let allQuestionnaires: any[] = [];
      let nextUrl: string | null = null;
      let page = 1;
      
      // Fetch all pages
      do {
        const params = new URLSearchParams();
        params.set('page', page.toString());
        params.set('page_size', '100'); // Request larger page size
        
        const res = await questionnaireApi.getFeed(params);
        const data = res.data;
        
        const pageQuestionnaires = Array.isArray(data) ? data : data.results || [];
        allQuestionnaires = [...allQuestionnaires, ...pageQuestionnaires];
        
        // Check if there's a next page
        nextUrl = data.next || null;
        page++;
        
        // Safety limit to prevent infinite loops
        if (page > 100) {
          console.warn('[QuestionnaireFeed] Reached page limit (100), stopping pagination');
          break;
        }
      } while (nextUrl);
      
      console.log('[QuestionnaireFeed] Total questionnaires received:', allQuestionnaires.length);
      console.log('[QuestionnaireFeed] Questionnaires data:', allQuestionnaires.map(q => ({
        id: q.id,
        title: q.title,
        is_completed: q.is_completed,
        is_started: q.is_started,
        response_status: q.response_status,
        expiration_date: q.expiration_date
      })));
      setQuestionnaires(allQuestionnaires);
    } catch (err) {
      console.error('[QuestionnaireFeed] Error loading feed:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Loading surveys...</div>;

  const now = new Date();
  
  // 1. Available questionnaires: Not expired, not completed, not started
  const available = questionnaires.filter(q => {
    const expirationDate = new Date(q.expiration_date);
    const isAvailable = expirationDate >= now && !q.is_completed && !q.is_started;
    if (isAvailable) {
      console.log('[QuestionnaireFeed] Available questionnaire:', q.id, q.title);
    }
    return isAvailable;
  });
  
  // 2. Started but not finished: Has STARTED response, not COMPLETED
  const started = questionnaires.filter(q => {
    const isStarted = q.is_started && !q.is_completed;
    if (isStarted) {
      console.log('[QuestionnaireFeed] Started questionnaire:', q.id, q.title, 'response_status:', q.response_status);
    }
    return isStarted;
  });
  
  // 3. Completed history: Has COMPLETED response
  const completed = questionnaires.filter(q => q.is_completed);
  
  console.log('[QuestionnaireFeed] Filtered counts:', {
    total: questionnaires.length,
    available: available.length,
    started: started.length,
    completed: completed.length
  });

  return (
    <div className="space-y-8">
      {/* Available Questionnaires */}
      <div>
        <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <span className="bg-blue-100 text-blue-600 p-1.5 rounded-lg">📝</span>
          Available Questionnaires
        </h2>
        
        {available.length === 0 ? (
          <div className="bg-gray-50 rounded-xl p-8 text-center border border-gray-100">
            <p className="text-gray-500">No new questionnaires available at the moment.</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {available.map(q => {
              const expirationDate = new Date(q.expiration_date);
              const isExpiringSoon = expirationDate.getTime() - now.getTime() < 3 * 24 * 60 * 60 * 1000; // 3 days
              
              return (
                <div key={q.id} className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow relative overflow-hidden group">
                  {/* Reward Badge */}
                  {q.benefit_limit !== 0 && (
                    <div className="absolute top-0 right-0 bg-yellow-400 text-yellow-900 text-xs font-bold px-3 py-1 rounded-bl-lg z-10">
                      🎁 Reward Inside
                    </div>
                  )}
                  
                  <h3 className="font-bold text-gray-900 text-lg mb-2">{q.title}</h3>
                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">{q.description}</p>
                  
                  <div className="flex items-center justify-between mt-auto">
                    <span className={`text-xs ${isExpiringSoon ? 'text-orange-600 font-medium' : 'text-gray-500'}`}>
                      Expires: {expirationDate.toLocaleDateString()}
                    </span>
                    <Link 
                      href={`/dashboard/youth/questionnaires/${q.id}`}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-blue-700 transition-colors"
                    >
                      Start Survey →
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Started but Not Finished */}
      {started.length > 0 && (
        <div className="pt-6 border-t border-gray-200">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <span className="bg-orange-100 text-orange-600 p-1.5 rounded-lg">⏳</span>
            In Progress
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {started.map(q => {
              const expirationDate = new Date(q.expiration_date);
              const isExpired = expirationDate < now;
              const progress = q.progress || 0;
              const answeredCount = q.answered_questions || 0;
              const totalCount = q.total_questions || 0;
              
              return (
                <div key={q.id} className={`p-5 rounded-xl shadow-sm border ${isExpired ? 'bg-gray-50 border-gray-200 opacity-75' : 'bg-white border-gray-100 hover:shadow-md'} transition-shadow relative overflow-hidden group`}>
                  <h3 className="font-bold text-gray-900 text-lg mb-2">{q.title}</h3>
                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">{q.description}</p>
                  
                  {/* Progress Bar */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                      <span className="font-medium">Progress</span>
                      <span className="font-bold">{progress}%</span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-orange-500 transition-all duration-300 rounded-full"
                        style={{ width: `${progress}%` }}
                      ></div>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {answeredCount} of {totalCount} questions answered
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between mt-auto">
                    <div className="flex flex-col">
                      <span className="text-xs text-orange-600 font-medium">In Progress</span>
                      <span className={`text-xs ${isExpired ? 'text-red-600' : 'text-gray-500'}`}>
                        {isExpired ? 'Expired' : `Expires: ${expirationDate.toLocaleDateString()}`}
                      </span>
                    </div>
                    <Link 
                      href={`/dashboard/youth/questionnaires/${q.id}`}
                      className="bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-orange-700 transition-colors"
                    >
                      Continue →
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Completed History */}
      {completed.length > 0 && (
        <div className="pt-6 border-t border-gray-200">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <span className="bg-green-100 text-green-600 p-1.5 rounded-lg">✓</span>
            Completed
          </h2>
          <div className="space-y-3">
            {completed.map(q => (
              <div key={q.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-100">
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-800">{q.title}</h4>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-green-600 font-medium">✓ Completed</span>
                    <span className="text-xs text-gray-500">
                      Expired: {new Date(q.expiration_date).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <Link 
                  href={`/dashboard/youth/questionnaires/${q.id}`}
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  View Details →
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

