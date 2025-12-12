'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, BarChart3, ChevronUp, FileText, Users, Info, Search, Filter, Printer, Star, MessageSquare } from 'lucide-react';
import { questionnaireApi } from '../../../lib/questionnaire-api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

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

  if (loading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="animate-pulse text-gray-400">Loading analytics...</div>
    </div>
  );
  if (!data) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-red-500">Failed to load data.</div>
    </div>
  );

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

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline', label: string }> = {
      'PUBLISHED': { variant: 'default', label: 'Published' },
      'DRAFT': { variant: 'secondary', label: 'Draft' },
      'ARCHIVED': { variant: 'outline', label: 'Archived' },
    };
    const statusInfo = statusMap[status] || { variant: 'outline' as const, label: status };
    return <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>;
  };

  return (
    <div className="space-y-4 sm:space-y-6 pb-20">
      {/* Header */}
      <Card className="border border-gray-100 shadow-sm bg-white">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-2">
                <Link href={`${basePath}${searchParams.get('page') ? `?page=${searchParams.get('page')}` : ''}`}>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-500 hover:text-gray-900 hover:bg-gray-100">
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                </Link>
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-xl sm:text-2xl font-bold tracking-tight text-[#121213] break-words">
                    {data.questionnaire_info?.title || 'Questionnaire Analytics'}
                  </CardTitle>
                  {data.questionnaire_info?.description && (
                    <p className="text-sm text-gray-500 mt-1 break-words">{data.questionnaire_info.description}</p>
                  )}
                </div>
              </div>
            </div>
            <Button 
              onClick={() => window.print()} 
              variant="outline"
              className="gap-2 border-gray-200 hover:bg-gray-50"
            >
              <Printer className="h-4 w-4" />
              <span className="hidden sm:inline">Print / PDF</span>
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Analytics Dashboard */}
      {!loading && (
        <Collapsible open={analyticsExpanded} onOpenChange={setAnalyticsExpanded} className="space-y-2">
          <Card className="border border-gray-100 shadow-sm bg-white">
            <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-gray-500" />
                <h3 className="text-sm font-semibold text-gray-500">Analytics Dashboard</h3>
              </div>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="w-9 p-0 h-8">
                  <ChevronUp className={cn(
                    "h-3.5 w-3.5 transition-transform duration-300 ease-in-out",
                    analyticsExpanded ? "rotate-0" : "rotate-180"
                  )} />
                  <span className="sr-only">Toggle Analytics</span>
                </Button>
              </CollapsibleTrigger>
            </div>
            <CollapsibleContent>
              <CardContent className="p-4 sm:p-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                  {/* Card 1: Total Responses */}
                  <Card className="bg-[#EBEBFE]/30 border-none shadow-sm">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-medium text-gray-500">Total Responses</CardTitle>
                        <div className="w-8 h-8 rounded-lg bg-[#4D4DA4]/10 flex items-center justify-center">
                          <FileText className="h-4 w-4 text-[#4D4DA4]" />
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-[#4D4DA4]">{data.total_responses || 0}</div>
                      <p className="text-xs text-gray-500 mt-1">out of {data.total_eligible || 0} members</p>
                    </CardContent>
                  </Card>

                  {/* Card 2: Gender Breakdown */}
                  <Card className="bg-[#EBEBFE]/30 border-none shadow-sm">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-medium text-gray-500">Gender Responses</CardTitle>
                        <div className="w-8 h-8 rounded-lg bg-[#FF5485]/10 flex items-center justify-center">
                          <Users className="h-4 w-4 text-[#FF5485]" />
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Male:</span>
                          <span className="font-bold text-[#121213]">{data.gender_breakdown?.male || 0}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Female:</span>
                          <span className="font-bold text-[#121213]">{data.gender_breakdown?.female || 0}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Other:</span>
                          <span className="font-bold text-[#121213]">{data.gender_breakdown?.other || 0}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Card 3: Questionnaire Info */}
                  <Card className="bg-[#EBEBFE]/30 border-none shadow-sm sm:col-span-2 lg:col-span-1">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-medium text-gray-500">Questionnaire Info</CardTitle>
                        <div className="w-8 h-8 rounded-lg bg-[#4D4DA4]/10 flex items-center justify-center">
                          <Info className="h-4 w-4 text-[#4D4DA4]" />
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">Status:</span>
                          {getStatusBadge(data.questionnaire_info?.status || 'N/A')}
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Start Date:</span>
                          <span className="font-semibold text-[#121213]">{formatDate(data.questionnaire_info?.start_date)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Expires:</span>
                          <span className="font-semibold text-[#121213]">{formatDate(data.questionnaire_info?.expiration_date)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Anonymous:</span>
                          <span className="font-semibold text-[#121213]">{data.questionnaire_info?.is_anonymous ? 'Yes' : 'No'}</span>
                        </div>
                        {data.questionnaire_info?.target_audience && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Target:</span>
                            <span className="font-semibold text-[#121213]">{data.questionnaire_info.target_audience}</span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}

      {/* FILTERS */}
      {!loading && data && (
        <Collapsible open={filtersExpanded} onOpenChange={setFiltersExpanded} className="space-y-2">
          <Card className="border border-gray-100 shadow-sm bg-white">
            <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-gray-500" />
                <h3 className="text-sm font-semibold text-gray-500">Filters</h3>
              </div>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="w-9 p-0 h-8">
                  <ChevronUp className={cn(
                    "h-3.5 w-3.5 transition-transform duration-300 ease-in-out",
                    filtersExpanded ? "rotate-0" : "rotate-180"
                  )} />
                  <span className="sr-only">Toggle Filters</span>
                </Button>
              </CollapsibleTrigger>
            </div>
            <CollapsibleContent>
              <CardContent className="p-3 sm:p-4">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                  {/* Search */}
                  <div className="md:col-span-7">
                    <Label htmlFor="search" className="text-xs font-semibold text-gray-500 uppercase mb-1.5 block">Search</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        id="search"
                        type="text"
                        placeholder="Search questions..."
                        className="pl-9 border-gray-200 focus:border-[#4D4DA4] focus:ring-[#4D4DA4]"
                        value={searchParams.get('search') || ''}
                        onChange={e => updateUrl('search', e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Question Selector */}
                  <div className="md:col-span-5">
                    <Label htmlFor="question" className="text-xs font-semibold text-gray-500 uppercase mb-1.5 block">Question</Label>
                    <select
                      id="question"
                      className="flex h-10 w-full rounded-md border border-gray-200 bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4D4DA4] focus-visible:ring-offset-2 focus-visible:border-[#4D4DA4]"
                      value={searchParams.get('question') || ''}
                      onChange={(e) => updateUrl('question', e.target.value)}
                    >
                      <option value="">All Questions</option>
                      {data.questions.map((q: any, idx: number) => (
                        <option key={q.id} value={q.id.toString()}>
                          Q{idx + 1}. {q.text.length > 50 ? q.text.substring(0, 50) + '...' : q.text}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}

      {/* Questions List */}
      <div className="grid gap-4 sm:gap-6">
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
              <Card key={q.id} className="border border-gray-100 shadow-sm bg-white overflow-hidden">
                {/* Decorative gradient bar at top */}
                <div className="h-1 bg-gradient-to-r from-[#4D4DA4] via-[#FF5485] to-[#4D4DA4]"></div>
                
                <CardHeader className="pb-4">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-[#4D4DA4] to-[#FF5485] flex items-center justify-center text-white font-bold text-sm sm:text-lg shadow-md flex-shrink-0">
                          {originalIdx + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-base sm:text-xl font-bold text-[#121213] leading-tight break-words">
                            {q.text}
                          </CardTitle>
                        </div>
                      </div>
                    </div>
                    <Badge variant="secondary" className="whitespace-nowrap">
                      {q.type.replace('_', ' ')}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="pt-0">
                  {/* VISUALIZATION SWITCHER */}
                  
                  {/* 1. RATING */}
                  {q.type === 'RATING' && (
                    <Card className="bg-gradient-to-br from-[#EBEBFE] to-[#EBEBFE]/50 border border-[#4D4DA4]/20">
                      <CardContent className="p-4 sm:p-6">
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-6">
                          <div className="flex items-center gap-4 sm:gap-6">
                            <div className="text-4xl sm:text-6xl font-black bg-gradient-to-br from-[#4D4DA4] to-[#FF5485] bg-clip-text text-transparent">
                              {q.average_rating?.toFixed(1) || '0.0'}
                            </div>
                            <div className="flex flex-col">
                              <div className="flex text-xl sm:text-2xl gap-1 mb-2">
                                {[1, 2, 3, 4, 5].map(star => (
                                  <Star
                                    key={star}
                                    className={cn(
                                      "h-5 w-5 sm:h-6 sm:w-6 transition-all duration-300",
                                      star <= Math.round(q.average_rating || 0)
                                        ? 'fill-[#FF5485] text-[#FF5485] drop-shadow-lg scale-110'
                                        : 'fill-gray-200 text-gray-300'
                                    )}
                                  />
                                ))}
                              </div>
                              <div className="text-xs sm:text-sm text-gray-600 font-semibold uppercase tracking-wide">Average Rating</div>
                            </div>
                          </div>
                          {/* Visual progress circle */}
                          <div className="relative w-20 h-20 sm:w-24 sm:h-24">
                            <svg className="transform -rotate-90 w-full h-full">
                              <circle
                                cx="50%"
                                cy="50%"
                                r="40%"
                                stroke="currentColor"
                                strokeWidth="8"
                                fill="none"
                                className="text-gray-200"
                              />
                              <circle
                                cx="50%"
                                cy="50%"
                                r="40%"
                                stroke="currentColor"
                                strokeWidth="8"
                                fill="none"
                                strokeDasharray={`${(q.average_rating / 5) * 251.2} 251.2`}
                                className="text-[#FF5485] transition-all duration-1000 ease-out"
                                strokeLinecap="round"
                              />
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center">
                              <span className="text-xs font-bold text-gray-600">
                                {Math.round(((q.average_rating || 0) / 5) * 100)}%
                              </span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* 2. CHOICE (BAR CHART) */}
                  {['SINGLE_CHOICE', 'MULTI_CHOICE'].includes(q.type) && (
                    <div className="space-y-3 sm:space-y-4">
                      {q.answers.map((ans: any, i: number) => (
                        <div key={i} className="group">
                          <div className="flex justify-between items-center mb-2">
                            <span className="font-semibold text-[#121213] text-sm break-words flex-1 pr-2">{ans.option}</span>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <Badge variant="outline" className="text-xs font-bold">
                                {ans.count}
                              </Badge>
                              <span className="text-sm font-bold text-[#121213] min-w-[50px] text-right">
                                {ans.percentage}%
                              </span>
                            </div>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-6 overflow-hidden shadow-inner relative">
                            <div 
                              className="bg-gradient-to-r from-[#4D4DA4] to-[#FF5485] h-6 rounded-full transition-all duration-1000 ease-out shadow-lg relative overflow-hidden"
                              style={{ width: `${ans.percentage}%` }}
                            >
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
                    <Card className="bg-[#EBEBFE]/30 border border-gray-200">
                      <CardContent className="p-4 sm:p-6">
                        <div className="flex items-center gap-2 mb-4">
                          <MessageSquare className="h-4 w-4 sm:h-5 sm:w-5 text-[#4D4DA4]" />
                          <h4 className="text-xs sm:text-sm font-bold text-gray-700 uppercase tracking-wide">Latest Answers</h4>
                          {q.latest_text_answers && q.latest_text_answers.length > 0 && (
                            <Badge variant="secondary" className="ml-auto">
                              {q.latest_text_answers.length} {q.latest_text_answers.length === 1 ? 'answer' : 'answers'}
                            </Badge>
                          )}
                        </div>
                        {q.latest_text_answers && q.latest_text_answers.length > 0 ? (
                          <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                            {q.latest_text_answers.map((txt: string, i: number) => (
                              <Card key={i} className="bg-white border-l-4 border-l-[#4D4DA4] shadow-sm hover:shadow-md transition-shadow">
                                <CardContent className="p-3 sm:p-4">
                                  <div className="flex items-start gap-3">
                                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#4D4DA4] to-[#FF5485] flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mt-0.5">
                                      {i + 1}
                                    </div>
                                    <p className="text-sm text-gray-700 leading-relaxed flex-1 break-words">
                                      "{txt}"
                                    </p>
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-8">
                            <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                            <p className="text-sm text-gray-400 italic">No text answers yet.</p>
                          </div>
                        )}
                        {q.latest_text_answers?.length >= 10 && (
                          <div className="mt-4 pt-4 border-t border-gray-300 text-center">
                            <span className="text-xs text-gray-500 font-medium">Showing last 10 answers only.</span>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}
                </CardContent>
              </Card>
            );
          })}
      </div>
    </div>
  );
}
