'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import api from '../../../lib/api';
import { questionnaireApi } from '../../../lib/questionnaire-api';
import { FileText, Calendar, CheckCircle2, X, Star, AlertCircle, Download, Eye } from 'lucide-react';

interface Props {
  userId: string | number;
  onAnalyticsUpdate?: (analytics: { total_questionnaires: number; total_rewards_earned: number }) => void;
}

// Skeleton Components
function Skeleton({ className }: { className?: string }) {
  return (
    <div 
      className={`animate-pulse bg-[var(--dark-600)] rounded ${className}`}
      style={{
        backgroundImage: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.05), transparent)',
        backgroundSize: '200% 100%',
        animation: 'shimmer 1.5s infinite, pulse 2s infinite'
      }}
    />
  );
}

function QuestionnaireCardSkeleton() {
  return (
    <div className="bg-[var(--dark-800)] border-b sm:border sm:rounded-xl border-[var(--dark-600)] p-4">
      <div className="flex items-center gap-3 mb-3">
        <Skeleton className="w-10 h-10 rounded-lg flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-20" />
        </div>
      </div>
      <div className="flex items-center justify-between pt-3 border-t border-[var(--dark-600)]">
        <Skeleton className="h-4 w-24" />
        <div className="flex gap-2">
          <Skeleton className="w-9 h-9 rounded-lg" />
          <Skeleton className="w-9 h-9 rounded-lg" />
        </div>
      </div>
    </div>
  );
}

function QuestionnaireTableRowSkeleton() {
  return (
    <tr className="border-b border-[var(--dark-600)]/50">
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          <Skeleton className="w-9 h-9 rounded-lg flex-shrink-0" />
          <div className="space-y-2">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-4 w-20" />
          </div>
        </div>
      </td>
      <td className="px-6 py-4"><Skeleton className="h-5 w-24" /></td>
      <td className="px-6 py-4">
        <div className="flex items-center justify-end gap-2">
          <Skeleton className="w-16 h-8 rounded-lg" />
          <Skeleton className="w-16 h-8 rounded-lg" />
        </div>
      </td>
    </tr>
  );
}

export default function IndividualHistory({ userId, onAnalyticsUpdate }: Props) {
  const t = useTranslations('youthDetail.questionnaires.table');
  const tModal = useTranslations('youthDetail.questionnaires.modal');
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
        const res = await api.get(`/users/${userId}/questionnaire_history/`); 
        
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

  const handleDownload = async (item: any) => {
    if (!item.questionnaire_id) {
        console.error("Missing questionnaire ID");
        return;
    }
    
    setDownloadingId(item.id);
    try {
        const response = await questionnaireApi.downloadResponsePdf(item.questionnaire_id, item.id);
        
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
        alert(tModal('downloadFailed'));
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

  const getInitial = (title: string) => {
    return title?.charAt(0)?.toUpperCase() || 'Q';
  };

  if (loading) {
    return (
      <>
        {/* Mobile Skeleton */}
        <div className="grid grid-cols-1 gap-0 sm:gap-4 md:hidden">
          {[...Array(4)].map((_, i) => (
            <QuestionnaireCardSkeleton key={i} />
          ))}
        </div>
        
        {/* Desktop Skeleton */}
        <div className="hidden md:block bg-[var(--dark-800)] rounded-2xl border border-[var(--dark-600)] overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--dark-600)]">
                <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">{t('headers.questionnaire')}</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">{t('headers.completed')}</th>
                <th className="text-right px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">{t('headers.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {[...Array(5)].map((_, i) => (
                <QuestionnaireTableRowSkeleton key={i} />
              ))}
            </tbody>
          </table>
        </div>
      </>
    );
  }

  if (paginatedHistory.length === 0) {
    return (
      <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] py-16 px-4 text-center">
        <div className="w-16 h-16 rounded-2xl bg-[var(--dark-700)] flex items-center justify-center mx-auto mb-4">
          <FileText className="w-8 h-8 text-[var(--brand-light)]/30" />
        </div>
        <h3 className="text-lg font-semibold text-[var(--brand-light)] mb-2">{t('emptyState.noQuestionnairesFound')}</h3>
        <p className="text-[var(--brand-light)]/50 text-sm">
          {history.length === 0 
            ? t('emptyState.noQuestionnairesYet')
            : t('emptyState.noMatch')}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Bar */}
      <div className="px-4 sm:px-0">
        <p className="text-sm text-[var(--brand-light)]/50">
          {t('statsBar.showing')} <span className="text-[var(--brand-primary)] font-semibold">{paginatedHistory.length}</span> {t('statsBar.of')} <span className="text-[var(--brand-primary)] font-semibold">{totalCount}</span> {totalCount === 1 ? t('statsBar.questionnaire') : t('statsBar.questionnaires')}
        </p>
      </div>

      {/* MOBILE: Cards */}
      <div className="grid grid-cols-1 gap-0 sm:gap-4 md:hidden">
        {paginatedHistory.map((h: any, index: number) => (
          <div 
            key={h.id} 
            className={`bg-[var(--dark-800)] ${index === 0 ? 'border-t' : ''} border-b sm:border sm:rounded-xl border-[var(--dark-600)] p-4 border-l-4 border-l-[var(--brand-purple)]`}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-[var(--brand-purple)]/20 flex items-center justify-center flex-shrink-0">
                <span className="font-bold text-sm text-[var(--brand-purple)]">
                  {getInitial(h.questionnaire_title)}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-[var(--brand-light)] truncate">{h.questionnaire_title}</div>
                {h.is_anonymous && (
                  <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[var(--dark-600)] text-[var(--brand-light)]/60 mt-1">
                    {t('anonymous')}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center justify-between pt-3 border-t border-[var(--dark-600)]">
              <div className="flex items-center gap-2 text-[var(--brand-light)]/50">
                <Calendar className="w-3.5 h-3.5" />
                <span className="text-xs">{formatDate(h.completed_at)}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDownload(h)}
                  disabled={downloadingId === h.id}
                  className="w-9 h-9 flex items-center justify-center rounded-lg bg-[var(--dark-700)] text-[var(--brand-light)]/60 hover:text-[var(--brand-primary)] hover:bg-[var(--dark-600)] transition-all"
                >
                  {downloadingId === h.id ? (
                    <span className="w-4 h-4 border-2 border-[var(--brand-light)]/30 border-t-[var(--brand-primary)] rounded-full animate-spin block"></span>
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                </button>
                {!h.is_anonymous && (
                  <button 
                    onClick={() => setSelectedResponse(h)}
                    className="w-9 h-9 flex items-center justify-center rounded-lg bg-[var(--dark-700)] text-[var(--brand-light)]/60 hover:text-[var(--brand-purple)] hover:bg-[var(--dark-600)] transition-all"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* DESKTOP: Table */}
      <div className="hidden md:block bg-[var(--dark-800)] rounded-2xl border border-[var(--dark-600)] overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[var(--dark-600)]">
              <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">{t('headers.questionnaire')}</th>
              <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">{t('headers.completed')}</th>
              <th className="text-right px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">{t('headers.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {paginatedHistory.map((h: any, index: number) => (
              <tr 
                key={h.id} 
                className={`${index !== paginatedHistory.length - 1 ? 'border-b border-[var(--dark-600)]/50' : ''} hover:bg-[var(--dark-700)]/30 transition-colors`}
              >
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-[var(--brand-purple)]/20 flex items-center justify-center flex-shrink-0">
                      <span className="font-bold text-xs text-[var(--brand-purple)]">
                        {getInitial(h.questionnaire_title)}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-[var(--brand-light)] truncate">{h.questionnaire_title}</div>
                      {h.is_anonymous && (
                        <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[var(--dark-600)] text-[var(--brand-light)]/60 mt-1">
                          {t('anonymous')}
                        </span>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-[var(--brand-light)]/70 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5" />
                    {formatDate(h.completed_at)}
                  </div>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => handleDownload(h)}
                      disabled={downloadingId === h.id}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[var(--dark-700)] text-[var(--brand-light)]/60 hover:text-[var(--brand-primary)] hover:bg-[var(--dark-600)] transition-all text-xs font-medium border border-[var(--dark-500)]"
                    >
                      {downloadingId === h.id ? (
                        <span className="w-3.5 h-3.5 border-2 border-[var(--brand-light)]/30 border-t-[var(--brand-primary)] rounded-full animate-spin"></span>
                      ) : (
                        <Download className="w-3.5 h-3.5" />
                      )}
                      {t('pdf')}
                    </button>
                    {!h.is_anonymous && (
                      <button 
                        onClick={() => setSelectedResponse(h)}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[var(--dark-700)] text-[var(--brand-light)]/60 hover:text-[var(--brand-purple)] hover:bg-[var(--dark-600)] transition-all text-xs font-medium border border-[var(--dark-500)]"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        {t('view')}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 py-4 px-4 sm:px-0">
          <button 
            disabled={currentPage === 1} 
            onClick={() => updateUrl('page', (currentPage - 1).toString())}
            className="px-4 py-2 rounded-xl text-sm font-medium bg-[var(--dark-700)] border border-[var(--dark-500)] text-[var(--brand-light)]/70 hover:text-[var(--brand-light)] hover:bg-[var(--dark-600)] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {t('pagination.previous')}
          </button>
          <div className="text-sm text-[var(--brand-light)]/50">
            {t('pagination.page')} <span className="text-[var(--brand-primary)] font-semibold">{currentPage}</span> {t('pagination.of')} <span className="text-[var(--brand-primary)] font-semibold">{totalPages}</span>
          </div>
          <button 
            disabled={currentPage >= totalPages} 
            onClick={() => updateUrl('page', (currentPage + 1).toString())}
            className="px-4 py-2 rounded-xl text-sm font-medium bg-[var(--dark-700)] border border-[var(--dark-500)] text-[var(--brand-light)]/70 hover:text-[var(--brand-light)] hover:bg-[var(--dark-600)] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {t('pagination.next')}
          </button>
        </div>
      )}
      
      {/* Modal for Quick View */}
      {selectedResponse && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4 animate-in fade-in duration-200">
            <div className="bg-[var(--dark-800)] rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-[var(--dark-600)] animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="relative px-5 sm:px-6 pt-5 pb-4 border-b border-[var(--dark-600)] bg-[var(--dark-700)]/50">
                    <div className="flex justify-between items-start gap-4">
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-1">
                                <div className="w-10 h-10 rounded-xl bg-[var(--brand-purple)]/20 flex items-center justify-center">
                                    <FileText className="w-5 h-5 text-[var(--brand-purple)]" />
                                </div>
                                <h3 className="font-bold text-lg text-[var(--brand-light)] truncate">{selectedResponse.questionnaire_title}</h3>
                            </div>
                            <div className="text-sm text-[var(--brand-light)]/50 flex items-center gap-2 ml-[52px]">
                                <Calendar className="w-4 h-4" />
                                {tModal('completed')} {formatDate(selectedResponse.completed_at)}
                            </div>
                        </div>
                        <button 
                            onClick={() => setSelectedResponse(null)} 
                            className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[var(--dark-600)] hover:bg-[var(--dark-500)] flex items-center justify-center transition-colors text-[var(--brand-light)]/60 hover:text-[var(--brand-light)] flex-shrink-0"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>
                
                {/* Answers Container */}
                <div className="p-5 sm:p-6 overflow-y-auto space-y-4 flex-1 bg-[var(--dark-800)]">
                    {selectedResponse.answers.map((ans: any, i: number) => {
                        const answerValue = ans.text_answer || ans.rating_answer || (ans.selected_options && ans.selected_options.length > 0 ? ans.selected_options.join(', ') : null);
                        const hasAnswer = answerValue && answerValue !== '';
                        
                        return (
                            <div key={i} className="group">
                                <div className="bg-[var(--dark-700)] rounded-xl p-4 border border-[var(--dark-500)] hover:border-[var(--brand-purple)]/30 transition-all duration-200">
                                    <div className="flex items-start gap-3">
                                        {/* Question Number Badge */}
                                        <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-[var(--brand-purple)]/20 text-[var(--brand-purple)] flex items-center justify-center font-semibold text-sm">
                                            {i + 1}
                                        </div>
                                        
                                        {/* Question Text */}
                                        <div className="flex-1 min-w-0">
                                            <div className="text-sm font-semibold text-[var(--brand-light)] mb-2 leading-tight">
                                                {ans.question_text}
                                            </div>
                                            
                                            {/* Answer Display */}
                                            <div className={`mt-2 p-3 rounded-lg border transition-colors ${
                                                hasAnswer 
                                                    ? 'bg-[var(--dark-800)] border-[var(--dark-600)]' 
                                                    : 'bg-[var(--dark-800)]/50 border-[var(--dark-600)]'
                                            }`}>
                                                {hasAnswer ? (
                                                    <div className="flex items-start gap-2">
                                                        <div className="flex-shrink-0 w-4 h-4 rounded-full bg-[var(--brand-green)] flex items-center justify-center mt-0.5">
                                                            <CheckCircle2 className="w-2.5 h-2.5 text-[var(--dark-900)]" />
                                                        </div>
                                                        <div className="flex-1">
                                                            {ans.rating_answer ? (
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-xl font-bold text-[var(--brand-primary)]">{ans.rating_answer}</span>
                                                                    <div className="flex gap-0.5">
                                                                        {[...Array(5)].map((_, idx) => (
                                                                            <Star 
                                                                                key={idx}
                                                                                className={`w-4 h-4 ${idx < ans.rating_answer ? 'text-yellow-400 fill-yellow-400' : 'text-[var(--dark-500)]'}`}
                                                                            />
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <p className="text-[var(--brand-light)] leading-relaxed">{answerValue}</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-2 text-[var(--brand-light)]/40 italic text-sm">
                                                        <AlertCircle className="w-4 h-4" />
                                                        <span>{tModal('noAnswerProvided')}</span>
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
                <div className="p-4 sm:p-5 bg-[var(--dark-700)]/50 border-t border-[var(--dark-600)] flex justify-end">
                    <button 
                        onClick={() => setSelectedResponse(null)}
                        className="px-5 py-2.5 bg-[var(--brand-primary)] hover:bg-[var(--brand-purple)] text-[var(--dark-900)] font-semibold rounded-xl transition-colors flex items-center gap-2"
                    >
                        <X className="w-4 h-4" />
                        {tModal('close')}
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
}
