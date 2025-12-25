'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, BarChart3, ChevronUp, ChevronDown, FileText, Users, Info, Search, 
  Filter, Printer, Star, MessageSquare, TrendingUp, Clock, Target, Eye,
  CheckCircle, Calendar, Sparkles, PieChart, Activity
} from 'lucide-react';
import { questionnaireApi } from '../../../lib/questionnaire-api';

interface Props {
  questionnaireId: string;
  basePath: string;
}

export default function QuestionnaireAnalytics({ questionnaireId, basePath }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [analyticsExpanded, setAnalyticsExpanded] = useState(true);
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedQuestion, setSelectedQuestion] = useState('');

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

  if (loading) return (
    <div className="min-h-screen bg-[var(--dark-900)] flex flex-col justify-center items-center py-20 gap-4">
      <div className="relative">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-purple)] flex items-center justify-center animate-pulse">
          <BarChart3 className="w-8 h-8 text-white" />
        </div>
        <div className="absolute -inset-2 bg-gradient-to-br from-[var(--brand-primary)]/20 to-[var(--brand-purple)]/20 rounded-3xl blur-xl animate-pulse"></div>
      </div>
      <div className="text-[var(--brand-light)]/60 animate-pulse">Loading analytics...</div>
    </div>
  );

  if (!data) return (
    <div className="min-h-screen bg-[var(--dark-900)] flex flex-col justify-center items-center py-20 gap-4">
      <div className="w-16 h-16 rounded-2xl bg-[var(--brand-red)]/20 flex items-center justify-center">
        <Info className="w-8 h-8 text-[var(--brand-red)]" />
      </div>
      <div className="text-[var(--brand-red)]">Failed to load analytics data.</div>
    </div>
  );

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const responseRate = data.total_eligible > 0 
    ? Math.round((data.total_responses / data.total_eligible) * 100) 
    : 0;

  const filteredQuestions = data.questions.filter((q: any) => {
    const search = searchTerm.toLowerCase();
    if (search && !q.text.toLowerCase().includes(search)) return false;
    if (selectedQuestion && q.id.toString() !== selectedQuestion) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-[var(--dark-900)] py-4 sm:py-8">
      <div className="sm:max-w-6xl sm:mx-auto sm:px-6">
        
        {/* Hero Header */}
        <div className="relative mb-6 sm:mb-8">
          {/* Background glow */}
          <div className="absolute inset-0 bg-gradient-to-r from-[var(--brand-primary)]/10 via-[var(--brand-purple)]/10 to-[var(--brand-primary)]/10 blur-3xl"></div>
          
          <div className="relative bg-[var(--dark-800)] rounded-none sm:rounded-3xl border-y sm:border border-[var(--dark-600)] overflow-hidden">
            {/* Decorative gradient bar */}
            <div className="h-1.5 bg-gradient-to-r from-[var(--brand-primary)] via-[var(--brand-purple)] to-[var(--brand-primary)]"></div>
            
            <div className="p-4 sm:p-8">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div className="flex items-start gap-4">
                  <Link 
                    href={`${basePath}${searchParams.get('page') ? `?page=${searchParams.get('page')}` : ''}`}
                    className="w-10 h-10 flex items-center justify-center rounded-xl bg-[var(--dark-700)] border border-[var(--dark-500)] text-[var(--brand-light)]/60 hover:text-[var(--brand-primary)] hover:border-[var(--brand-primary)]/30 transition-all flex-shrink-0"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </Link>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="w-5 h-5 text-[var(--brand-primary)]" />
                      <span className="text-sm font-medium text-[var(--brand-primary)]">Analytics Dashboard</span>
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-[var(--brand-light)] mb-2">
                      {data.questionnaire_info?.title || 'Questionnaire Results'}
                    </h1>
                    {data.questionnaire_info?.description && (
                      <p className="text-[var(--brand-light)]/50 text-sm sm:text-base">
                        {data.questionnaire_info.description}
                      </p>
                    )}
                  </div>
                </div>
                <button 
                  onClick={() => window.print()} 
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--dark-700)] border border-[var(--dark-500)] text-[var(--brand-light)]/70 hover:text-[var(--brand-light)] hover:bg-[var(--dark-600)] transition-all"
                >
                  <Printer className="w-4 h-4" />
                  <span className="hidden sm:inline">Export</span>
                </button>
              </div>

              {/* Quick Stats Row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
                <div className="bg-[var(--dark-700)]/50 rounded-xl p-3 border border-[var(--dark-600)]">
                  <div className="flex items-center gap-2 mb-1">
                    <div className={`w-2 h-2 rounded-full ${data.questionnaire_info?.status === 'PUBLISHED' ? 'bg-[var(--brand-green)] animate-pulse' : 'bg-[var(--brand-yellow)]'}`}></div>
                    <span className="text-xs text-[var(--brand-light)]/50">Status</span>
                  </div>
                  <span className={`text-sm font-semibold ${data.questionnaire_info?.status === 'PUBLISHED' ? 'text-[var(--brand-green)]' : 'text-[var(--brand-yellow)]'}`}>
                    {data.questionnaire_info?.status || 'N/A'}
                  </span>
                </div>
                <div className="bg-[var(--dark-700)]/50 rounded-xl p-3 border border-[var(--dark-600)]">
                  <div className="flex items-center gap-2 mb-1">
                    <Calendar className="w-3 h-3 text-[var(--brand-light)]/50" />
                    <span className="text-xs text-[var(--brand-light)]/50">Expires</span>
                  </div>
                  <span className="text-sm font-semibold text-[var(--brand-light)]">
                    {formatDate(data.questionnaire_info?.expiration_date)}
                  </span>
                </div>
                <div className="bg-[var(--dark-700)]/50 rounded-xl p-3 border border-[var(--dark-600)]">
                  <div className="flex items-center gap-2 mb-1">
                    <Target className="w-3 h-3 text-[var(--brand-light)]/50" />
                    <span className="text-xs text-[var(--brand-light)]/50">Target</span>
                  </div>
                  <span className="text-sm font-semibold text-[var(--brand-light)]">
                    {data.questionnaire_info?.target_audience || 'All'}
                  </span>
                </div>
                <div className="bg-[var(--dark-700)]/50 rounded-xl p-3 border border-[var(--dark-600)]">
                  <div className="flex items-center gap-2 mb-1">
                    <Eye className="w-3 h-3 text-[var(--brand-light)]/50" />
                    <span className="text-xs text-[var(--brand-light)]/50">Anonymous</span>
                  </div>
                  <span className="text-sm font-semibold text-[var(--brand-light)]">
                    {data.questionnaire_info?.is_anonymous ? 'Yes' : 'No'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8 px-4 sm:px-0">
          {/* Response Rate Card */}
          <div className="relative group h-full">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-purple)] rounded-2xl sm:rounded-3xl blur opacity-30 group-hover:opacity-50 transition-opacity"></div>
            <div className="relative bg-[var(--dark-800)] rounded-2xl sm:rounded-3xl border border-[var(--dark-600)] p-5 sm:p-6 overflow-hidden h-full flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-purple)] flex items-center justify-center flex-shrink-0">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
                <div className="text-right">
                  <div className="text-4xl sm:text-5xl font-black text-[var(--brand-light)]">{responseRate}%</div>
                </div>
              </div>
              <div className="space-y-2 mt-auto">
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--brand-light)]/50">Response Rate</span>
                  <span className="text-[var(--brand-light)]">{data.total_responses}/{data.total_eligible}</span>
                </div>
                <div className="h-2 bg-[var(--dark-600)] rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-purple)] rounded-full transition-all duration-1000 ease-out"
                    style={{ width: `${responseRate}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>

          {/* Total Responses Card */}
          <div className="relative group h-full">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-[var(--brand-green)] to-[var(--brand-third)] rounded-2xl sm:rounded-3xl blur opacity-30 group-hover:opacity-50 transition-opacity"></div>
            <div className="relative bg-[var(--dark-800)] rounded-2xl sm:rounded-3xl border border-[var(--dark-600)] p-5 sm:p-6 overflow-hidden h-full flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--brand-green)] to-[var(--brand-third)] flex items-center justify-center flex-shrink-0">
                  <FileText className="w-6 h-6 text-[var(--dark-900)]" />
                </div>
                <div className="text-right">
                  <div className="text-4xl sm:text-5xl font-black text-[var(--brand-light)]">{data.total_responses || 0}</div>
                </div>
              </div>
              <div className="space-y-1 mt-auto">
                <span className="text-[var(--brand-light)]/50 text-sm">Total Responses</span>
                <p className="text-xs text-[var(--brand-light)]/40">From {data.total_eligible || 0} eligible members</p>
              </div>
            </div>
          </div>

          {/* Gender Distribution Card */}
          <div className="relative group h-full">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-[var(--brand-peach)] to-[var(--brand-red)] rounded-2xl sm:rounded-3xl blur opacity-30 group-hover:opacity-50 transition-opacity"></div>
            <div className="relative bg-[var(--dark-800)] rounded-2xl sm:rounded-3xl border border-[var(--dark-600)] p-5 sm:p-6 overflow-hidden h-full flex flex-col">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--brand-peach)] to-[var(--brand-red)] flex items-center justify-center flex-shrink-0">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <span className="text-[var(--brand-light)]/50 text-sm">Gender Distribution</span>
              </div>
              <div className="space-y-2 mt-auto">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[var(--brand-light)]/70">Male</span>
                  <span className="text-sm font-bold text-[var(--brand-light)]">{data.gender_breakdown?.male || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[var(--brand-light)]/70">Female</span>
                  <span className="text-sm font-bold text-[var(--brand-light)]">{data.gender_breakdown?.female || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[var(--brand-light)]/70">Other</span>
                  <span className="text-sm font-bold text-[var(--brand-light)]">{data.gender_breakdown?.other || 0}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Filters Section */}
        <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] mb-6 sm:mb-8">
          <button 
            onClick={() => setFiltersExpanded(!filtersExpanded)}
            className="w-full px-4 sm:px-6 py-4 flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-[var(--brand-light)]/50" />
              <span className="text-sm font-medium text-[var(--brand-light)]">Filters & Search</span>
            </div>
            {filtersExpanded ? (
              <ChevronUp className="w-4 h-4 text-[var(--brand-light)]/50" />
            ) : (
              <ChevronDown className="w-4 h-4 text-[var(--brand-light)]/50" />
            )}
          </button>
          
          {filtersExpanded && (
            <div className="px-4 sm:px-6 pb-4 border-t border-[var(--dark-600)]">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
                <div>
                  <label className="block text-xs font-medium text-[var(--brand-light)]/50 mb-2">Search Questions</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[var(--brand-light)]/40" />
                    <input
                      type="text"
                      placeholder="Search..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full h-11 pl-10 pr-4 rounded-xl bg-[var(--dark-700)] border-2 border-[var(--dark-500)] text-[var(--brand-light)] placeholder-[var(--brand-light)]/30 outline-none focus:border-[var(--brand-primary)] transition-colors"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--brand-light)]/50 mb-2">Filter by Question</label>
                  <select
                    value={selectedQuestion}
                    onChange={(e) => setSelectedQuestion(e.target.value)}
                    className="w-full h-11 px-4 rounded-xl bg-[var(--dark-700)] border-2 border-[var(--dark-500)] text-[var(--brand-light)] outline-none focus:border-[var(--brand-primary)] transition-colors appearance-none cursor-pointer"
                    style={{
                      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23F9F8F5' opacity='0.5'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                      backgroundRepeat: 'no-repeat',
                      backgroundPosition: 'right 0.75rem center',
                      backgroundSize: '1rem'
                    }}
                  >
                    <option value="">All Questions</option>
                    {data.questions.map((q: any, idx: number) => (
                      <option key={q.id} value={q.id.toString()}>
                        Q{idx + 1}. {q.text.length > 40 ? q.text.substring(0, 40) + '...' : q.text}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Questions Results */}
        <div className="space-y-6 px-4 sm:px-0">
          {filteredQuestions.length === 0 ? (
            <div className="bg-[var(--dark-800)] rounded-2xl border border-[var(--dark-600)] p-12 text-center">
              <Search className="w-12 h-12 text-[var(--brand-light)]/20 mx-auto mb-4" />
              <p className="text-[var(--brand-light)]/50">No questions match your search criteria.</p>
            </div>
          ) : (
            filteredQuestions.map((q: any, idx: number) => {
              const originalIdx = data.questions.findIndex((origQ: any) => origQ.id === q.id);
              return (
                <div key={q.id} className="relative group">
                  {/* Glow effect */}
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-[var(--brand-primary)]/20 to-[var(--brand-purple)]/20 rounded-2xl sm:rounded-3xl blur opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  
                  <div className="relative bg-[var(--dark-800)] rounded-2xl sm:rounded-3xl border border-[var(--dark-600)] overflow-hidden">
                    {/* Gradient top bar */}
                    <div className="h-1 bg-gradient-to-r from-[var(--brand-primary)] via-[var(--brand-purple)] to-[var(--brand-primary)]"></div>
                    
                    {/* Question Header */}
                    <div className="p-4 sm:p-6 border-b border-[var(--dark-600)]">
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-purple)] flex items-center justify-center text-white font-bold text-lg sm:text-xl flex-shrink-0 shadow-lg">
                          {originalIdx + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-1">
                            <h3 className="text-lg sm:text-xl font-bold text-[var(--brand-light)]">{q.text}</h3>
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold flex-shrink-0 ${
                              q.type === 'RATING' 
                                ? 'bg-[var(--brand-yellow)]/20 text-[var(--brand-yellow)] border border-[var(--brand-yellow)]/30' 
                                : q.type === 'FREE_TEXT'
                                ? 'bg-[var(--brand-blue)]/20 text-[var(--brand-blue)] border border-[var(--brand-blue)]/30'
                                : 'bg-[var(--brand-purple)]/20 text-[var(--brand-purple)] border border-[var(--brand-purple)]/30'
                            }`}>
                              {q.type === 'RATING' && <Star className="w-3 h-3 mr-1" />}
                              {q.type === 'FREE_TEXT' && <MessageSquare className="w-3 h-3 mr-1" />}
                              {['SINGLE_CHOICE', 'MULTI_CHOICE'].includes(q.type) && <PieChart className="w-3 h-3 mr-1" />}
                              {q.type.replace('_', ' ')}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Question Content */}
                    <div className="p-4 sm:p-6">
                      {/* RATING TYPE */}
                      {q.type === 'RATING' && (
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-8 sm:gap-12 py-4">
                          {/* Big Rating Display */}
                          <div className="flex flex-col items-center">
                            <div className="text-6xl sm:text-7xl font-black text-[var(--brand-light)]">
                              {q.average_rating?.toFixed(1) || '0.0'}
                            </div>
                            <div className="flex gap-1.5 mt-3">
                              {[1, 2, 3, 4, 5].map(star => (
                                <Star
                                  key={star}
                                  className={`w-7 h-7 sm:w-8 sm:h-8 transition-all ${
                                    star <= Math.round(q.average_rating || 0)
                                      ? 'fill-[#F59E0B] text-[#F59E0B] drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]'
                                      : 'fill-[var(--dark-600)] text-[var(--dark-500)]'
                                  }`}
                                />
                              ))}
                            </div>
                            <span className="text-sm text-[var(--brand-light)]/50 mt-3">Average Rating</span>
                          </div>

                          {/* Circular Progress */}
                          <div className="relative w-32 h-32 sm:w-40 sm:h-40">
                            <svg className="transform -rotate-90 w-full h-full">
                              <circle
                                cx="50%"
                                cy="50%"
                                r="45%"
                                stroke="var(--dark-600)"
                                strokeWidth="10"
                                fill="none"
                              />
                              <circle
                                cx="50%"
                                cy="50%"
                                r="45%"
                                stroke="url(#ratingGradient)"
                                strokeWidth="10"
                                fill="none"
                                strokeDasharray={`${((q.average_rating || 0) / 5) * 283} 283`}
                                strokeLinecap="round"
                                className="transition-all duration-1000 ease-out"
                              />
                              <defs>
                                <linearGradient id="ratingGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                  <stop offset="0%" stopColor="#F59E0B" />
                                  <stop offset="100%" stopColor="#EF4444" />
                                </linearGradient>
                              </defs>
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                              <span className="text-2xl sm:text-3xl font-bold text-[var(--brand-light)]">
                                {Math.round(((q.average_rating || 0) / 5) * 100)}%
                              </span>
                              <span className="text-xs text-[var(--brand-light)]/50">Satisfaction</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* CHOICE TYPES */}
                      {['SINGLE_CHOICE', 'MULTI_CHOICE'].includes(q.type) && (
                        <div className="space-y-4">
                          {q.answers.map((ans: any, i: number) => {
                            const colors = [
                              { from: 'var(--brand-primary)', to: 'var(--brand-purple)' },
                              { from: 'var(--brand-green)', to: 'var(--brand-third)' },
                              { from: 'var(--brand-peach)', to: 'var(--brand-red)' },
                              { from: 'var(--brand-blue)', to: 'var(--brand-primary)' },
                              { from: 'var(--brand-yellow)', to: 'var(--brand-peach)' },
                            ];
                            const color = colors[i % colors.length];
                            
                            return (
                              <div key={i} className="group/bar">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="font-medium text-[var(--brand-light)] text-sm sm:text-base">{ans.option}</span>
                                  <div className="flex items-center gap-3">
                                    <span className="text-xs px-2 py-1 rounded-lg bg-[var(--dark-700)] text-[var(--brand-light)]/70">
                                      {ans.count} votes
                                    </span>
                                    <span className="text-lg font-bold text-[var(--brand-light)]">{ans.percentage}%</span>
                                  </div>
                                </div>
                                <div className="h-8 sm:h-10 bg-[var(--dark-700)] rounded-xl overflow-hidden relative">
                                  <div 
                                    className="h-full rounded-xl transition-all duration-1000 ease-out relative overflow-hidden"
                                    style={{ 
                                      width: `${ans.percentage}%`,
                                      background: `linear-gradient(to right, ${color.from}, ${color.to})`
                                    }}
                                  >
                                    {/* Shine effect */}
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent transform -skew-x-12 group-hover/bar:translate-x-full transition-transform duration-1000"></div>
                                    
                                    {ans.percentage > 20 && (
                                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-bold text-white drop-shadow">
                                        {ans.percentage}%
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* FREE TEXT TYPE */}
                      {q.type === 'FREE_TEXT' && (
                        <div>
                          <div className="flex items-center gap-2 mb-4">
                            <MessageSquare className="w-5 h-5 text-[var(--brand-blue)]" />
                            <span className="text-sm font-semibold text-[var(--brand-light)]">Latest Responses</span>
                            {q.latest_text_answers && q.latest_text_answers.length > 0 && (
                              <span className="ml-auto text-xs px-2 py-1 rounded-lg bg-[var(--brand-blue)]/20 text-[var(--brand-blue)]">
                                {q.latest_text_answers.length} answers
                              </span>
                            )}
                          </div>
                          
                          {q.latest_text_answers && q.latest_text_answers.length > 0 ? (
                            <div className="space-y-3 max-h-80 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-[var(--dark-500)] scrollbar-track-transparent">
                              {q.latest_text_answers.map((txt: string, i: number) => (
                                <div 
                                  key={i} 
                                  className="bg-[var(--dark-700)] rounded-xl p-4 border-l-4 border-[var(--brand-blue)] hover:bg-[var(--dark-600)] transition-colors"
                                >
                                  <div className="flex items-start gap-3">
                                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[var(--brand-blue)] to-[var(--brand-primary)] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                                      {i + 1}
                                    </div>
                                    <p className="text-sm text-[var(--brand-light)]/80 leading-relaxed flex-1">
                                      "{txt}"
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-center py-12 bg-[var(--dark-700)] rounded-xl">
                              <MessageSquare className="w-12 h-12 text-[var(--brand-light)]/20 mx-auto mb-3" />
                              <p className="text-[var(--brand-light)]/40">No text responses yet.</p>
                            </div>
                          )}
                          
                          {q.latest_text_answers?.length >= 10 && (
                            <p className="text-center text-xs text-[var(--brand-light)]/40 mt-4">
                              Showing latest 10 responses
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="mt-8 sm:mt-12 pb-8 text-center">
          <p className="text-xs text-[var(--brand-light)]/30">
            Analytics generated • {data.questions.length} questions • {data.total_responses} responses
          </p>
        </div>
      </div>
    </div>
  );
}
