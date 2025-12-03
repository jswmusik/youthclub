'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import api from '../../../lib/api';
import { questionnaireApi } from '../../../lib/questionnaire-api';

interface Props {
  userId: string | number;
  onAnalyticsUpdate?: (analytics: { total_questionnaires: number; total_rewards_earned: number }) => void;
}

export default function IndividualHistory({ userId, onAnalyticsUpdate }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  const [history, setHistory] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState({ total_questionnaires: 0, total_rewards_earned: 0 });
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const [selectedResponse, setSelectedResponse] = useState<any>(null);
  
  const pageSize = 10;
  const currentPage = Number(searchParams.get('page')) || 1;
  const searchQuery = searchParams.get('search') || '';

  useEffect(() => {
    fetchHistory();
  }, [userId]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
        console.log("Fetching questionnaire history for user:", userId);
        const res = await api.get(`/users/${userId}/questionnaire_history/`); 
        console.log("Questionnaire history response:", res.data);
        
        // Handle both old format (array) and new format (object with questionnaires and analytics)
        let newAnalytics;
        if (Array.isArray(res.data)) {
          setHistory(res.data);
          newAnalytics = { 
            total_questionnaires: res.data.length, 
            total_rewards_earned: res.data.filter((h: any) => h.is_benefit_claimed).length 
          };
        } else {
          setHistory(res.data.questionnaires || []);
          newAnalytics = res.data.analytics || { total_questionnaires: 0, total_rewards_earned: 0 };
        }
        setAnalytics(newAnalytics);
        if (onAnalyticsUpdate) {
          onAnalyticsUpdate(newAnalytics);
        }
    } catch (err: any) {
        console.error("History fetch error", err);
        console.error("Error response:", err.response?.data);
        console.error("Error status:", err.response?.status);
        setHistory([]);
        setAnalytics({ total_questionnaires: 0, total_rewards_earned: 0 });
    } finally {
        setLoading(false);
    }
  };

  const updateUrl = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value); else params.delete(key);
    if (key !== 'page') params.set('page', '1');
    router.push(`${pathname}?${params.toString()}`);
  };

  const buildUrlWithParams = (path: string) => {
    const params = new URLSearchParams();
    const page = searchParams.get('page');
    const search = searchParams.get('search');
    
    if (page && page !== '1') params.set('page', page);
    if (search) params.set('search', search);
    
    const queryString = params.toString();
    return queryString ? `${path}?${queryString}` : path;
  };

  const handleDownload = async (item: any) => {
    if (!item.questionnaire_id) {
        console.error("Missing questionnaire ID");
        return;
    }
    
    setDownloadingId(item.id);
    try {
        const response = await questionnaireApi.downloadResponsePdf(item.questionnaire_id, item.id);
        
        // Create a link element, hide it, click it, then remove it
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        const filename = `survey_${item.questionnaire_title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`;
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
        
    } catch (err) {
        console.error("Download failed", err);
        alert("Failed to download PDF.");
    } finally {
        setDownloadingId(null);
    }
  };

  // Filter history by search query
  const filteredHistory = history.filter((h: any) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return h.questionnaire_title?.toLowerCase().includes(query);
  });

  // Client-side pagination
  const totalCount = filteredHistory.length;
  const totalPages = Math.ceil(totalCount / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedHistory = filteredHistory.slice(startIndex, endIndex);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="space-y-4">
      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading history...</div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Questionnaire</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Completed</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {paginatedHistory.map((h: any) => (
                <tr key={h.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="font-bold text-gray-900">{h.questionnaire_title}</div>
                    {h.is_anonymous && (
                      <div className="text-xs text-gray-500 mt-1">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                          Anonymous
                        </span>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {formatDate(h.completed_at)}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      {/* PDF Download Button */}
                      <button
                        onClick={() => handleDownload(h)}
                        disabled={downloadingId === h.id}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-700 bg-gray-50 rounded-md hover:bg-gray-100 hover:text-gray-900 transition-colors disabled:opacity-50"
                      >
                        {downloadingId === h.id ? (
                          <span className="w-3.5 h-3.5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></span>
                        ) : (
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        )}
                        PDF
                      </button>

                      {/* View Answers Button (Only if not anonymous) */}
                      {!h.is_anonymous ? (
                        <button 
                          onClick={() => setSelectedResponse(h)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 rounded-md hover:bg-indigo-100 hover:text-indigo-900 transition-colors"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          View Answers
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
              {paginatedHistory.length === 0 && !loading && (
                <tr>
                  <td colSpan={3} className="p-8 text-center text-gray-500">
                    {history.length === 0 
                      ? 'No questionnaires taken by this user.' 
                      : 'No questionnaires match your search.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6 rounded-lg shadow">
          <div className="flex flex-1 justify-between sm:hidden">
            <button 
              disabled={currentPage === 1}
              onClick={() => updateUrl('page', (currentPage - 1).toString())}
              className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Previous
            </button>
            <button 
              disabled={currentPage >= totalPages}
              onClick={() => updateUrl('page', (currentPage + 1).toString())}
              className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Next
            </button>
          </div>
          <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Showing page <span className="font-medium">{currentPage}</span> of <span className="font-medium">{totalPages}</span>
                {' '}(Total: {totalCount})
              </p>
            </div>
            <div>
              <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                <button
                  disabled={currentPage === 1}
                  onClick={() => updateUrl('page', (currentPage - 1).toString())}
                  className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                >
                  <span className="sr-only">Previous</span>
                  ← Prev
                </button>
                
                {/* Simple Pagination Numbers */}
                {[...Array(totalPages)].map((_, i) => {
                  const p = i + 1;
                  return (
                    <button
                      key={p}
                      onClick={() => updateUrl('page', p.toString())}
                      className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold 
                        ${p === currentPage 
                          ? 'bg-blue-600 text-white focus:z-20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600' 
                          : 'text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0'}`}
                    >
                      {p}
                    </button>
                  );
                })}

                <button
                  disabled={currentPage >= totalPages}
                  onClick={() => updateUrl('page', (currentPage + 1).toString())}
                  className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                >
                  <span className="sr-only">Next</span>
                  Next →
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}
      
      {/* Modal for Quick View */}
      {selectedResponse && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-gray-200 animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="relative p-5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
                    <div className="flex justify-between items-start gap-4">
                        <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                </div>
                                <h3 className="font-bold text-lg text-white truncate">{selectedResponse.questionnaire_title}</h3>
                            </div>
                            <div className="text-sm text-blue-100 flex items-center gap-2 ml-11">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                Completed: {formatDate(selectedResponse.completed_at)}
                            </div>
                        </div>
                        <button 
                            onClick={() => setSelectedResponse(null)} 
                            className="w-8 h-8 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors text-white"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>
                
                {/* Answers Container */}
                <div className="p-6 overflow-y-auto space-y-4 flex-1 bg-gray-50">
                    {selectedResponse.answers.map((ans: any, i: number) => {
                        const answerValue = ans.text_answer || ans.rating_answer || (ans.selected_options && ans.selected_options.length > 0 ? ans.selected_options.join(', ') : null);
                        const hasAnswer = answerValue && answerValue !== '';
                        
                        return (
                            <div key={i} className="group">
                                {/* Question Card */}
                                <div className="bg-white rounded-lg p-4 border border-gray-200 hover:border-blue-300 transition-all duration-200 hover:shadow-md">
                                    <div className="flex items-start gap-3">
                                        {/* Question Number Badge */}
                                        <div className="flex-shrink-0 w-7 h-7 rounded-md bg-blue-100 text-blue-700 flex items-center justify-center font-semibold text-sm">
                                            {i + 1}
                                        </div>
                                        
                                        {/* Question Text */}
                                        <div className="flex-1 min-w-0">
                                            <div className="text-sm font-semibold text-gray-700 mb-2 leading-tight">
                                                {ans.question_text}
                                            </div>
                                            
                                            {/* Answer Display */}
                                            <div className={`mt-2 p-3 rounded-md border transition-colors ${
                                                hasAnswer 
                                                    ? 'bg-gray-50 border-gray-200 group-hover:border-blue-200' 
                                                    : 'bg-gray-50 border-gray-200'
                                            }`}>
                                                {hasAnswer ? (
                                                    <div className="flex items-start gap-2">
                                                        <div className="flex-shrink-0 w-4 h-4 rounded-full bg-green-500 flex items-center justify-center mt-0.5">
                                                            <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                            </svg>
                                                        </div>
                                                        <div className="flex-1">
                                                            {ans.rating_answer ? (
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-xl font-bold text-blue-600">{ans.rating_answer}</span>
                                                                    <div className="flex gap-0.5">
                                                                        {[...Array(5)].map((_, idx) => (
                                                                            <svg 
                                                                                key={idx}
                                                                                className={`w-4 h-4 ${idx < ans.rating_answer ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
                                                                                fill="currentColor" 
                                                                                viewBox="0 0 20 20"
                                                                            >
                                                                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                                                            </svg>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <p className="text-gray-800 leading-relaxed">{answerValue}</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-2 text-gray-400 italic text-sm">
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                        </svg>
                                                        <span>No answer provided</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
                
                {/* Footer */}
                <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-end">
                    <button 
                        onClick={() => setSelectedResponse(null)}
                        className="px-5 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 shadow-sm hover:shadow transition-colors flex items-center gap-2"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        Close
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
}
