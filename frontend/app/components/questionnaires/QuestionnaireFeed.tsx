'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

import { questionnaireApi } from '../../../lib/questionnaire-api';
import { useRouter } from 'next/navigation';
import { ClipboardList, Clock, CheckCircle, Sparkles } from 'lucide-react';


interface QuestionnaireFeedProps {
  darkMode?: boolean;
}

export default function QuestionnaireFeed({ darkMode = false }: QuestionnaireFeedProps) {
  const t = useTranslations('questionnaires');
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

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className={`w-12 h-12 border-4 rounded-full animate-spin ${
          darkMode 
            ? 'border-[var(--brand-primary)]/20 border-t-[var(--brand-primary)]' 
            : 'border-[#4D4DA4]/20 border-t-[#4D4DA4]'
        }`} />
      </div>
    );
  }

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
    <div className="space-y-6 sm:space-y-8 px-4 sm:px-0">
      {/* Available Questionnaires */}
      <div>
        <h2 className={`text-xl sm:text-2xl font-bold mb-4 flex items-center gap-3 font-heading ${
          darkMode ? 'text-[var(--brand-light)]' : 'text-[#4D4DA4]'
        }`}>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
            darkMode 
              ? 'bg-[var(--brand-primary)] text-[var(--dark-900)]' 
              : 'bg-gradient-to-br from-[#4D4DA4] to-[#6D6DD4] text-white shadow-md'
          }`}>
            <ClipboardList className="w-5 h-5" />
          </div>
          {t('availableQuestionnaires')}
        </h2>
        
        {available.length === 0 ? (
          <div className={`rounded-xl sm:rounded-2xl p-8 sm:p-12 text-center border-2 border-dashed ${
            darkMode 
              ? 'bg-[var(--dark-800)] border-[var(--dark-600)]' 
              : 'bg-gradient-to-br from-gray-50 to-gray-100 border-gray-300'
          }`}>
            <ClipboardList className={`w-12 h-12 mx-auto mb-3 ${darkMode ? 'text-[var(--brand-light)]/20' : 'text-gray-300'}`} />
            <p className={`font-semibold ${darkMode ? 'text-[var(--brand-light)]/60' : 'text-gray-500'}`}>{t('noNewQuestionnaires')}</p>
            <p className={`text-xs mt-1 ${darkMode ? 'text-[var(--brand-light)]/40' : 'text-gray-400'}`}>{t('checkBackSoon')}</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:gap-4 md:grid-cols-2">
            {available.map(q => {
              const expirationDate = new Date(q.expiration_date);
              const isExpiringSoon = expirationDate.getTime() - now.getTime() < 3 * 24 * 60 * 60 * 1000; // 3 days
              
              return (
                <div key={q.id} className={`p-5 rounded-xl sm:rounded-2xl border transition-all relative overflow-hidden group ${
                  darkMode 
                    ? 'bg-[var(--dark-700)] border-[var(--dark-500)] hover:border-[var(--brand-primary)]/30' 
                    : 'bg-white shadow-md border-2 border-[#4D4DA4]/10 hover:shadow-xl hover:border-[#4D4DA4]/30'
                }`}>
                  {/* Reward Badge */}
                  {q.benefit_limit !== 0 && (
                    <div className={`absolute top-0 right-0 text-xs font-bold px-3 py-2 rounded-bl-xl flex items-center gap-1 ${
                      darkMode 
                        ? 'bg-[var(--brand-primary)] text-[var(--dark-900)]' 
                        : 'bg-gradient-to-br from-[#FF5485] to-[#FF7AA5] text-white shadow-lg'
                    }`}>
                      <Sparkles className="w-3 h-3" />
                      {t('rewardInside')}
                    </div>
                  )}
                  
                  <h3 className={`font-bold text-lg mb-2 font-heading ${q.benefit_limit !== 0 ? 'pr-24' : ''} ${
                    darkMode ? 'text-[var(--brand-light)]' : 'text-[#4D4DA4]'
                  }`}>
                    {q.title}
                  </h3>
                  <p className={`text-sm mb-4 line-clamp-2 font-medium ${
                    darkMode ? 'text-[var(--brand-light)]/60' : 'text-gray-600'
                  }`}>{q.description}</p>
                  
                  <div className="flex items-center justify-between mt-auto">
                    <span className={`text-xs font-semibold flex items-center gap-1 ${
                      isExpiringSoon 
                        ? darkMode ? 'text-[var(--brand-peach)]' : 'text-[#FF8C42]' 
                        : darkMode ? 'text-[var(--brand-light)]/50' : 'text-gray-500'
                    }`}>
                      <Clock className="w-3.5 h-3.5" />
                      {expirationDate.toLocaleDateString()}
                    </span>
                    <Link 
                      href={`/dashboard/youth/questionnaires/${q.id}`}
                      className={`px-4 py-2 rounded-xl text-sm font-bold transition-all active:scale-95 ${
                        darkMode 
                          ? 'bg-[var(--brand-primary)] text-[var(--dark-900)] hover:bg-[var(--brand-primary)]/90' 
                          : 'bg-gradient-to-r from-[#4D4DA4] to-[#6D6DD4] text-white hover:from-[#3D3D94] hover:to-[#5D5DC4] shadow-md hover:shadow-lg'
                      }`}
                    >
                      {t('startSurvey')}
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
        <div className={`pt-6 sm:pt-8 border-t ${darkMode ? 'border-[var(--dark-600)]' : 'border-gray-200'}`}>
          <h2 className={`text-xl sm:text-2xl font-bold mb-4 flex items-center gap-3 font-heading ${
            darkMode ? 'text-[var(--brand-light)]' : 'text-[#4D4DA4]'
          }`}>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              darkMode 
                ? 'bg-[var(--brand-peach)] text-[var(--dark-900)]' 
                : 'bg-gradient-to-br from-[#FF8C42] to-[#FFA05C] text-white shadow-md'
            }`}>
              <Clock className="w-5 h-5" />
            </div>
            {t('inProgress')}
          </h2>
          <div className="grid gap-3 sm:gap-4 md:grid-cols-2">
            {started.map(q => {
              const expirationDate = new Date(q.expiration_date);
              const isExpired = expirationDate < now;
              const progress = q.progress || 0;
              const answeredCount = q.answered_questions || 0;
              const totalCount = q.total_questions || 0;
              
              return (
                <div key={q.id} className={`p-5 rounded-xl sm:rounded-2xl border transition-all relative overflow-hidden ${
                  isExpired 
                    ? darkMode 
                      ? 'bg-[var(--dark-600)] border-[var(--dark-500)] opacity-75' 
                      : 'bg-gray-50 border-gray-300 opacity-75'
                    : darkMode 
                      ? 'bg-[var(--dark-700)] border-[var(--brand-peach)]/20 hover:border-[var(--brand-peach)]/40' 
                      : 'bg-white shadow-md border-2 border-[#FF8C42]/20 hover:shadow-xl hover:border-[#FF8C42]/40'
                }`}>
                  <h3 className={`font-bold text-lg mb-2 font-heading ${
                    darkMode ? 'text-[var(--brand-light)]' : 'text-[#4D4DA4]'
                  }`}>{q.title}</h3>
                  <p className={`text-sm mb-4 line-clamp-2 font-medium ${
                    darkMode ? 'text-[var(--brand-light)]/60' : 'text-gray-600'
                  }`}>{q.description}</p>
                  
                  {/* Progress Bar */}
                  <div className={`mb-4 p-3 rounded-xl ${
                    darkMode ? 'bg-[var(--dark-700)]' : 'bg-gray-50'
                  }`}>
                    <div className={`flex items-center justify-between text-xs mb-2 ${
                      darkMode ? 'text-[var(--brand-light)]/60' : 'text-gray-600'
                    }`}>
                      <span className="font-bold">{t('progress')}</span>
                      <span className={`font-bold ${darkMode ? 'text-[var(--brand-peach)]' : 'text-[#FF8C42]'}`}>{progress}%</span>
                    </div>
                    <div className={`h-2.5 rounded-full overflow-hidden ${
                      darkMode ? 'bg-[var(--dark-600)]' : 'bg-gray-200'
                    }`}>
                      <div 
                        className={`h-full transition-all duration-300 rounded-full ${
                          darkMode 
                            ? 'bg-[var(--brand-peach)]' 
                            : 'bg-gradient-to-r from-[#FF8C42] to-[#FFA05C] shadow-sm'
                        }`}
                        style={{ width: `${progress}%` }}
                      ></div>
                    </div>
                    <div className={`text-xs mt-1.5 font-semibold ${
                      darkMode ? 'text-[var(--brand-light)]/50' : 'text-gray-500'
                    }`}>
                      {answeredCount} {t('of')} {totalCount} {t('questionsAnswered')}
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between mt-auto">
                    <div className="flex flex-col gap-0.5">
                      <span className={`text-xs font-bold ${darkMode ? 'text-[var(--brand-peach)]' : 'text-[#FF8C42]'}`}>{t('inProgress')}</span>
                      <span className={`text-xs font-semibold flex items-center gap-1 ${
                        isExpired 
                          ? darkMode ? 'text-[var(--brand-red)]' : 'text-red-500' 
                          : darkMode ? 'text-[var(--brand-light)]/50' : 'text-gray-500'
                      }`}>
                        <Clock className="w-3 h-3" />
                        {isExpired ? t('expired') : expirationDate.toLocaleDateString()}
                      </span>
                    </div>
                    <Link 
                      href={`/dashboard/youth/questionnaires/${q.id}`}
                      className={`px-4 py-2 rounded-xl text-sm font-bold transition-all active:scale-95 ${
                        darkMode 
                          ? 'bg-[var(--brand-peach)] text-[var(--dark-900)] hover:bg-[var(--brand-peach)]/90' 
                          : 'bg-gradient-to-r from-[#FF8C42] to-[#FFA05C] text-white hover:from-[#FF7A28] hover:to-[#FF9048] shadow-md hover:shadow-lg'
                      }`}
                    >
                      {t('continue')}
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
        <div className={`pt-6 sm:pt-8 border-t ${darkMode ? 'border-[var(--dark-600)]' : 'border-gray-200'}`}>
          <h2 className={`text-xl sm:text-2xl font-bold mb-4 flex items-center gap-3 font-heading ${
            darkMode ? 'text-[var(--brand-light)]' : 'text-[#4D4DA4]'
          }`}>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              darkMode 
                ? 'bg-[var(--brand-third)] text-[var(--dark-900)]' 
                : 'bg-gradient-to-br from-[#10B981] to-[#059669] text-white shadow-md'
            }`}>
              <CheckCircle className="w-5 h-5" />
            </div>
            {t('completedLabel')}
          </h2>
          <div className="space-y-3">
            {completed.map(q => (
              <div key={q.id} className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:p-5 rounded-xl sm:rounded-2xl border transition-all ${
                darkMode 
                  ? 'bg-[var(--brand-third)]/10 border-[var(--brand-third)]/20 hover:border-[var(--brand-third)]/40' 
                  : 'bg-gradient-to-r from-[#10B981]/10 to-white border-2 border-[#10B981]/20 hover:border-[#10B981]/40 shadow-sm hover:shadow-md'
              }`}>
                <div className="flex-1">
                  <h4 className={`font-bold text-base sm:text-lg font-heading ${
                    darkMode ? 'text-[var(--brand-light)]' : 'text-[#4D4DA4]'
                  }`}>{q.title}</h4>
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className={`text-xs font-bold flex items-center gap-1 ${
                      darkMode ? 'text-[var(--brand-third)]' : 'text-[#10B981]'
                    }`}>
                      <CheckCircle className="w-3.5 h-3.5" />
                      {t('completedLabel')}
                    </span>
                    <span className={`text-xs font-semibold flex items-center gap-1 ${
                      darkMode ? 'text-[var(--brand-light)]/50' : 'text-gray-500'
                    }`}>
                      <Clock className="w-3 h-3" />
                      {new Date(q.expiration_date).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <Link 
                  href={`/dashboard/youth/questionnaires/${q.id}`}
                  className={`px-4 py-2 rounded-xl text-sm font-bold transition-all active:scale-95 whitespace-nowrap ${
                    darkMode 
                      ? 'bg-[var(--dark-700)] border border-[var(--brand-purple)] text-[var(--brand-purple)] hover:bg-[var(--brand-purple)] hover:text-[var(--brand-light)]' 
                      : 'bg-white border-2 border-[#4D4DA4] text-[#4D4DA4] hover:bg-[#4D4DA4] hover:text-white shadow-sm hover:shadow-md'
                  }`}
                >
                  {t('viewDetails')}
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
