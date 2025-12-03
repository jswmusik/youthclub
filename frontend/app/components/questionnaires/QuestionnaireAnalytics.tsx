'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { questionnaireApi } from '../../../lib/questionnaire-api';

interface Props {
  questionnaireId: string;
  basePath: string; // e.g. /admin/club/questionnaires
}

export default function QuestionnaireAnalytics({ questionnaireId, basePath }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [analyticsExpanded, setAnalyticsExpanded] = useState(true);
  const [filtersExpanded, setFiltersExpanded] = useState(true);

  const updateUrl = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.replace(`${pathname}?${params.toString()}`);
  };

  useEffect(() => {
    loadAnalytics();
  }, [questionnaireId, searchParams]);

  const loadAnalytics = async () => {
    try {
      const res = await questionnaireApi.getAnalytics(questionnaireId);
      setData(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-12 text-center text-gray-500">Loading analytics...</div>;
  if (!data) return <div className="p-12 text-center text-red-500">Failed to load data.</div>;

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex justify-between items-center bg-white p-6 rounded-lg shadow-sm border border-gray-100">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">{data.questionnaire_info?.title || 'Questionnaire Analytics'}</h1>
          <p className="text-sm text-gray-500">{data.questionnaire_info?.description || ''}</p>
        </div>
        <div className="flex gap-3">
          <Link 
            href={`${basePath}${searchParams.get('page') ? `?page=${searchParams.get('page')}` : ''}`}
            className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
          >
            ← Back to List
          </Link>
          <button 
            onClick={() => window.print()} 
            className="px-4 py-2 bg-gray-900 text-white rounded hover:bg-black"
          >
            🖨️ Print / PDF
          </button>
        </div>
      </div>

      {/* Analytics Dashboard */}
      {!loading && (
        <div className="mb-6 bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {/* Toggle Button */}
          <button
            onClick={() => setAnalyticsExpanded(!analyticsExpanded)}
            className="flex items-center justify-between w-full p-4 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <span className="text-sm font-semibold text-gray-700">Analytics Dashboard</span>
            </div>
            <svg 
              className={`w-5 h-5 text-gray-600 transition-transform duration-200 ${analyticsExpanded ? 'rotate-180' : ''}`}
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* Analytics Cards - Collapsible */}
          <div 
            className={`border-t border-gray-200 transition-all duration-300 ease-in-out ${
              analyticsExpanded 
                ? 'max-h-[800px] opacity-100' 
                : 'max-h-0 opacity-0'
            } overflow-hidden`}
          >
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Card 1: Total Responses */}
              <div className="bg-white border border-gray-200 rounded-lg p-5 hover:border-blue-300 hover:shadow-sm transition-all">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Total Responses</h3>
                  <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                </div>
                <p className="text-3xl font-bold text-gray-900">{data.total_responses || 0}</p>
                <p className="text-xs text-gray-500 mt-1">out of {data.total_eligible || 0} members</p>
              </div>

              {/* Card 2: Gender Breakdown */}
              <div className="bg-white border border-gray-200 rounded-lg p-5 hover:border-purple-300 hover:shadow-sm transition-all">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Gender Responses</h3>
                  <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center">
                    <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Male:</span>
                    <span className="font-bold text-gray-900">{data.gender_breakdown?.male || 0}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Female:</span>
                    <span className="font-bold text-gray-900">{data.gender_breakdown?.female || 0}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Other:</span>
                    <span className="font-bold text-gray-900">{data.gender_breakdown?.other || 0}</span>
                  </div>
                </div>
              </div>

              {/* Card 3: Questionnaire Info */}
              <div className="bg-white border border-gray-200 rounded-lg p-5 hover:border-green-300 hover:shadow-sm transition-all md:col-span-2 lg:col-span-1">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Questionnaire Info</h3>
                  <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Status:</span>
                    <span className="font-semibold text-gray-900">{data.questionnaire_info?.status || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Start Date:</span>
                    <span className="font-semibold text-gray-900">{formatDate(data.questionnaire_info?.start_date)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Expires:</span>
                    <span className="font-semibold text-gray-900">{formatDate(data.questionnaire_info?.expiration_date)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Anonymous:</span>
                    <span className="font-semibold text-gray-900">{data.questionnaire_info?.is_anonymous ? 'Yes' : 'No'}</span>
                  </div>
                  {data.questionnaire_info?.target_audience && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Target:</span>
                      <span className="font-semibold text-gray-900">{data.questionnaire_info.target_audience}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FILTERS */}
      {!loading && data && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {/* Toggle Button */}
          <button
            onClick={() => setFiltersExpanded(!filtersExpanded)}
            className="flex items-center justify-between w-full p-4 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              <span className="text-sm font-semibold text-gray-700">Filters</span>
            </div>
            <svg 
              className={`w-5 h-5 text-gray-600 transition-transform duration-200 ${filtersExpanded ? 'rotate-180' : ''}`}
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* Filter Fields - Collapsible */}
          <div 
            className={`border-t border-gray-200 transition-all duration-300 ease-in-out ${
              filtersExpanded 
                ? 'max-h-[1000px] opacity-100' 
                : 'max-h-0 opacity-0'
            } overflow-hidden`}
          >
            <div className="p-4">
              <div className="flex flex-wrap gap-4 items-end">
                {/* Search */}
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Search</label>
                  <input 
                    type="text" 
                    placeholder="Search questions..." 
                    className="w-full border rounded p-2 text-sm bg-gray-50"
                    value={searchParams.get('search') || ''} 
                    onChange={e => updateUrl('search', e.target.value)}
                  />
                </div>

                {/* Question Selector */}
                <div className="w-64">
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Question</label>
                  <select
                    className="w-full border rounded p-2 text-sm bg-gray-50"
                    value={searchParams.get('question') || ''}
                    onChange={e => updateUrl('question', e.target.value)}
                  >
                    <option value="">All Questions</option>
                    {data.questions.map((q: any, idx: number) => (
                      <option key={q.id} value={q.id}>
                        Q{idx + 1}. {q.text.length > 50 ? q.text.substring(0, 50) + '...' : q.text}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Questions List */}
      <div className="grid gap-6">
        {data.questions
          .filter((q: any) => {
            // Apply search filter
            const searchTerm = searchParams.get('search')?.toLowerCase() || '';
            if (searchTerm && !q.text.toLowerCase().includes(searchTerm)) {
              return false;
            }
            
            // Apply question filter
            const questionFilter = searchParams.get('question');
            if (questionFilter && q.id.toString() !== questionFilter) {
              return false;
            }
            
            return true;
          })
          .map((q: any, idx: number) => {
            // Find original index for proper numbering
            const originalIdx = data.questions.findIndex((origQ: any) => origQ.id === q.id);
            return (
            <div key={q.id} className="bg-white p-8 rounded-xl shadow-lg border-2 border-gray-100 hover:border-blue-200 hover:shadow-xl transition-all duration-300 break-inside-avoid relative overflow-hidden">
                {/* Decorative gradient bar at top */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"></div>
                
                <div className="flex justify-between items-start mb-6">
                    <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg shadow-md">
                                {originalIdx + 1}
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 leading-tight">
                                {q.text}
                            </h3>
                        </div>
                    </div>
                    <span className="ml-4 text-xs bg-gradient-to-r from-blue-100 to-purple-100 text-blue-800 px-3 py-1.5 rounded-full font-semibold border border-blue-200 whitespace-nowrap">
                        {q.type.replace('_', ' ')}
                    </span>
                </div>

                {/* VISUALIZATION SWITCHER */}
                
                {/* 1. RATING */}
                {q.type === 'RATING' && (
                    <div className="bg-gradient-to-br from-yellow-50 via-orange-50 to-amber-50 p-8 rounded-xl border-2 border-yellow-200 shadow-md">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-6">
                                <div className="text-6xl font-black bg-gradient-to-br from-yellow-500 to-orange-600 bg-clip-text text-transparent">
                                    {q.average_rating?.toFixed(1) || '0.0'}
                                </div>
                                <div className="flex flex-col">
                                    <div className="flex text-2xl gap-1 mb-2">
                                        {[1, 2, 3, 4, 5].map(star => (
                                            <span 
                                                key={star}
                                                className={`transition-all duration-300 ${
                                                    star <= Math.round(q.average_rating) 
                                                        ? 'text-yellow-400 drop-shadow-lg scale-110' 
                                                        : 'text-gray-300'
                                                }`}
                                            >
                                                {star <= Math.round(q.average_rating) ? '★' : '☆'}
                                            </span>
                                        ))}
                                    </div>
                                    <div className="text-sm text-orange-700 font-bold uppercase tracking-wide">Average Rating</div>
                                </div>
                            </div>
                            {/* Visual progress circle */}
                            <div className="relative w-24 h-24">
                                <svg className="transform -rotate-90 w-24 h-24">
                                    <circle
                                        cx="48"
                                        cy="48"
                                        r="40"
                                        stroke="currentColor"
                                        strokeWidth="8"
                                        fill="none"
                                        className="text-gray-200"
                                    />
                                    <circle
                                        cx="48"
                                        cy="48"
                                        r="40"
                                        stroke="currentColor"
                                        strokeWidth="8"
                                        fill="none"
                                        strokeDasharray={`${(q.average_rating / 5) * 251.2} 251.2`}
                                        className="text-yellow-500 transition-all duration-1000 ease-out"
                                        strokeLinecap="round"
                                    />
                                </svg>
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <span className="text-xs font-bold text-gray-600">
                                        {Math.round((q.average_rating / 5) * 100)}%
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* 2. CHOICE (BAR CHART) */}
                {['SINGLE_CHOICE', 'MULTI_CHOICE'].includes(q.type) && (
                    <div className="space-y-4">
                        {q.answers.map((ans: any, i: number) => (
                            <div key={i} className="group">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="font-semibold text-gray-800 text-sm">{ans.option}</span>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-bold text-gray-600 bg-gray-100 px-2 py-1 rounded">
                                            {ans.count}
                                        </span>
                                        <span className="text-sm font-bold text-gray-700 min-w-[50px] text-right">
                                            {ans.percentage}%
                                        </span>
                                    </div>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-6 overflow-hidden shadow-inner relative">
                                    <div 
                                        className="bg-gradient-to-r from-purple-500 to-pink-500 h-6 rounded-full transition-all duration-1000 ease-out shadow-lg relative overflow-hidden"
                                        style={{ width: `${ans.percentage}%` }}
                                    >
                                        {/* Animated shimmer effect */}
                                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"></div>
                                        {/* Percentage text inside bar if space allows */}
                                        {ans.percentage > 15 && (
                                            <span className="absolute inset-0 flex items-center justify-end pr-2 text-xs font-bold text-white drop-shadow">
                                                {ans.percentage}%
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* 3. FREE TEXT */}
                {q.type === 'FREE_TEXT' && (
                    <div className="bg-gradient-to-br from-gray-50 to-blue-50 rounded-xl p-6 border-2 border-gray-200 shadow-md">
                        <div className="flex items-center gap-2 mb-4">
                            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <h4 className="text-sm font-bold text-gray-700 uppercase tracking-wide">Latest Answers</h4>
                            {q.latest_text_answers && q.latest_text_answers.length > 0 && (
                                <span className="ml-auto text-xs font-semibold bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                                    {q.latest_text_answers.length} {q.latest_text_answers.length === 1 ? 'answer' : 'answers'}
                                </span>
                            )}
                        </div>
                        {q.latest_text_answers && q.latest_text_answers.length > 0 ? (
                            <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                                {q.latest_text_answers.map((txt: string, i: number) => (
                                    <div 
                                        key={i} 
                                        className="bg-white p-4 rounded-lg border-l-4 border-blue-500 shadow-sm hover:shadow-md transition-shadow duration-200 hover:border-blue-600"
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mt-0.5">
                                                {i + 1}
                                            </div>
                                            <p className="text-sm text-gray-700 leading-relaxed flex-1">
                                                "{txt}"
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8">
                                <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                <p className="text-sm text-gray-400 italic">No text answers yet.</p>
                            </div>
                        )}
                        {q.latest_text_answers?.length >= 10 && (
                            <div className="mt-4 pt-4 border-t border-gray-300 text-center">
                                <span className="text-xs text-gray-500 font-medium">Showing last 10 answers only.</span>
                            </div>
                        )}
                    </div>
                )}

            </div>
            );
          })}
      </div>
    </div>
  );
}

