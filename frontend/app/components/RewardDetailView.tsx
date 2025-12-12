'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, Loader2, Edit, History } from 'lucide-react';
import api from '../../lib/api';
import { getMediaUrl } from '../utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

interface RewardDetailProps {
  rewardId: string;
  basePath: string; // e.g. "/admin/super/rewards"
}

export default function RewardDetailView({ rewardId, basePath }: RewardDetailProps) {
  const searchParams = useSearchParams();
  const [reward, setReward] = useState<any>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [nextPage, setNextPage] = useState<string | null>(null);
  const historyEndRef = useRef<HTMLDivElement>(null);

  const buildUrlWithParams = (path: string) => {
    const params = new URLSearchParams();
    const page = searchParams.get('page');
    const search = searchParams.get('search');
    const scope = searchParams.get('scope');
    const status = searchParams.get('status');
    const expired = searchParams.get('expired');
    
    if (page && page !== '1') params.set('page', page);
    if (search) params.set('search', search);
    if (scope) params.set('scope', scope);
    if (status) params.set('status', status);
    if (expired) params.set('expired', expired);
    
    const queryString = params.toString();
    return queryString ? `${path}?${queryString}` : path;
  };

  useEffect(() => {
    if (rewardId) {
      fetchData();
    }
  }, [rewardId]);

  const fetchData = async (append = false) => {
    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }
    try {
      const [rewardRes, statsRes] = await Promise.all([
        api.get(`/rewards/${rewardId}/`),
        api.get(`/rewards/${rewardId}/analytics_detail/`)
      ]);
      setReward(rewardRes.data);
      setAnalytics(statsRes.data);
      
      // Fetch history with pagination
      let historyUrl: string;
      if (append && nextPage) {
        // Extract path from full URL if needed
        historyUrl = nextPage.startsWith('http') ? new URL(nextPage).pathname + new URL(nextPage).search : nextPage;
      } else {
        historyUrl = `/rewards/${rewardId}/history/`;
      }
      
      const historyRes = await api.get(historyUrl);
      const historyData = historyRes.data.results || historyRes.data;
      
      if (append) {
        setHistory(prev => [...prev, ...historyData]);
      } else {
        setHistory(historyData);
      }
      
      // Handle pagination - check if there's a next page
      if (historyRes.data.next) {
        // Store the full URL or relative path
        const nextUrl = historyRes.data.next.startsWith('http') 
          ? new URL(historyRes.data.next).pathname + new URL(historyRes.data.next).search 
          : historyRes.data.next;
        setNextPage(nextUrl);
        setHasMore(true);
      } else {
        setNextPage(null);
        setHasMore(false);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const loadMore = () => {
    if (!loadingMore && hasMore && nextPage) {
      fetchData(true);
    }
  };

  // Intersection Observer for infinite scroll
  useEffect(() => {
    if (!hasMore || loadingMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );

    if (historyEndRef.current) {
      observer.observe(historyEndRef.current);
    }

    return () => {
      if (historyEndRef.current) {
        observer.unobserve(historyEndRef.current);
      }
    };
  }, [hasMore, loadingMore, nextPage]);

  if (loading) return <div className="p-12 text-center text-gray-500">Loading details...</div>;
  if (!reward) return <div className="p-12 text-center text-red-500">Reward not found.</div>;

  return (
    <div className="space-y-4 sm:space-y-6">
      
      {/* Header with Back Button and Edit Button */}
      <div className="flex items-center justify-between">
        <Link href={buildUrlWithParams(basePath)}>
          <Button variant="ghost" size="sm" className="gap-2 text-gray-600 hover:text-gray-900">
            <ChevronLeft className="h-4 w-4" />
            Back to List
          </Button>
        </Link>
        
        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <Link href={buildUrlWithParams(`${basePath}/${reward.id}/history`)}>
            <Button variant="outline" size="sm" className="gap-2 text-gray-700 hover:text-[#4D4DA4] hover:border-[#4D4DA4]">
              <History className="h-4 w-4" />
              Claim History
            </Button>
          </Link>
          <Link href={buildUrlWithParams(`${basePath}/edit/${reward.id}`)}>
            <Button size="sm" className="gap-2 bg-[#4D4DA4] hover:bg-[#FF5485] text-white">
              <Edit className="h-4 w-4" />
              Edit Reward
            </Button>
          </Link>
        </div>
      </div>

      {/* 1. REWARD INFO */}
      <div className="flex items-start gap-4 sm:gap-6">
        {/* Image */}
        <div className="w-20 h-20 sm:w-24 sm:h-24 bg-[#EBEBFE]/30 rounded-xl overflow-hidden border-2 border-[#EBEBFE] flex-shrink-0">
          {reward.image ? (
            <img src={getMediaUrl(reward.image) || ''} className="w-full h-full object-cover" alt="Reward" />
          ) : (
            <div className="flex items-center justify-center h-full text-2xl">🎁</div>
          )}
        </div>
        
        {/* Title & Status */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-1">
            <h1 className="text-2xl sm:text-3xl font-bold text-[#121213] break-words">{reward.name}</h1>
            {reward.is_active ? (
              <Badge className="bg-green-50 text-green-700 border-green-200 text-xs font-semibold">Active</Badge>
            ) : (
              <Badge variant="outline" className="bg-gray-50 text-gray-600 border-gray-200 text-xs font-semibold">Inactive</Badge>
            )}
          </div>
          
          <p className="text-sm text-gray-500">
            Owned by: <span className="font-semibold text-[#121213]">{reward.municipality_name || reward.club_name || 'Super Admin'}</span>
          </p>
        </div>
      </div>

      {/* 2. ANALYTICS GRID */}
      {analytics && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
          <Card className="bg-[#EBEBFE]/30 border-none shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium text-gray-500">Total Claims</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold text-[#4D4DA4]">{analytics.total_uses}</div>
            </CardContent>
          </Card>
          <Card className="bg-[#EBEBFE]/30 border-none shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium text-gray-500">Last 24h</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold text-[#4D4DA4]">{analytics.uses_last_24h}</div>
            </CardContent>
          </Card>
          <Card className="bg-[#EBEBFE]/30 border-none shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium text-gray-500">Last 7 Days</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold text-[#4D4DA4]">{analytics.uses_last_7d}</div>
            </CardContent>
          </Card>
          <Card className="bg-[#EBEBFE]/30 border-none shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium text-gray-500">Last 30 Days</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold text-[#4D4DA4]">{analytics.uses_last_30d}</div>
            </CardContent>
          </Card>
          <Card className="bg-[#EBEBFE]/30 border-none shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium text-gray-500">Days Left</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold text-[#FF5485]">{analytics.days_remaining !== null ? analytics.days_remaining : '∞'}</div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
        
        {/* 3. LEFT COL: INFO & CONFIG */}
        <div className="lg:col-span-2 space-y-4 sm:space-y-6">
          {/* Description */}
          <Card className="border border-gray-100 shadow-sm bg-white">
            <CardHeader>
              <CardTitle className="text-lg sm:text-xl font-bold text-[#121213]">About</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm sm:text-base text-[#121213] whitespace-pre-wrap">{reward.description}</p>
              
              {(reward.sponsor_name || reward.sponsor_link) && (
                <div className="pt-4 border-t border-gray-100">
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Sponsor</p>
                  <p className="text-sm sm:text-base font-medium text-[#121213]">
                    {reward.sponsor_name || 'Anonymous'} 
                    {reward.sponsor_link && (
                      <a href={reward.sponsor_link} target="_blank" rel="noopener noreferrer" className="ml-2 text-[#4D4DA4] hover:text-[#FF5485] hover:underline transition-colors">
                        (Visit Website)
                      </a>
                    )}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Usage History Table */}
          <Card className="border border-gray-100 shadow-sm bg-white overflow-hidden">
            <CardHeader className="border-b border-gray-100">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <CardTitle className="text-lg sm:text-xl font-bold text-[#121213]">Claim History</CardTitle>
                {history.length > 0 && (
                  <Badge variant="outline" className="bg-[#EBEBFE] text-[#4D4DA4] border-[#EBEBFE] text-xs font-semibold">
                    {history.length} {history.length === 1 ? 'claim' : 'claims'}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {history.length === 0 ? (
                <div className="p-8 sm:p-12 text-center text-gray-500">
                  <p className="text-sm sm:text-base">No one has claimed this reward yet.</p>
                </div>
              ) : (
                <>
                  {/* Mobile: Cards */}
                  <div className="block md:hidden divide-y divide-gray-100">
                    {history.map((usage) => (
                      <div key={usage.id} className="p-4 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-[#121213] truncate">{usage.user_name}</p>
                            <p className="text-xs text-gray-500 truncate">{usage.user_email}</p>
                          </div>
                          <div className="text-xs text-gray-500 flex-shrink-0 text-right">
                            {(() => {
                              const date = usage.redeemed_at ? new Date(usage.redeemed_at) : (usage.created_at ? new Date(usage.created_at) : null);
                              if (!date) return 'N/A';
                              const dateStr = date.toLocaleDateString();
                              const hours = String(date.getHours()).padStart(2, '0');
                              const minutes = String(date.getMinutes()).padStart(2, '0');
                              return `${dateStr} ${hours}:${minutes}`;
                            })()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Desktop: Table */}
                  <Table className="hidden md:table">
                    <TableHeader>
                      <TableRow className="border-b border-gray-100 hover:bg-transparent">
                        <TableHead className="h-12 text-gray-600 font-semibold">User</TableHead>
                        <TableHead className="h-12 text-gray-600 font-semibold">Email</TableHead>
                        <TableHead className="h-12 text-right text-gray-600 font-semibold">Date Claimed</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {history.map((usage) => (
                        <TableRow key={usage.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                          <TableCell className="py-4">
                            <div className="font-semibold text-[#121213] text-sm">{usage.user_name}</div>
                          </TableCell>
                          <TableCell className="py-4">
                            <div className="text-sm text-gray-500">{usage.user_email}</div>
                          </TableCell>
                          <TableCell className="py-4 text-right">
                            <div className="text-sm text-gray-500">
                              {(() => {
                                const date = usage.redeemed_at ? new Date(usage.redeemed_at) : (usage.created_at ? new Date(usage.created_at) : null);
                                if (!date) return 'N/A';
                                const dateStr = date.toLocaleDateString();
                                const hours = String(date.getHours()).padStart(2, '0');
                                const minutes = String(date.getMinutes()).padStart(2, '0');
                                return `${dateStr} ${hours}:${minutes}`;
                              })()}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  {/* Load More / Pagination */}
                  {hasMore && (
                    <div className="p-4 border-t border-gray-100">
                      <div ref={historyEndRef} className="h-1" />
                      <Button
                        onClick={loadMore}
                        disabled={loadingMore}
                        variant="ghost"
                        className="w-full h-11 text-sm sm:text-base font-semibold text-[#4D4DA4] hover:text-[#FF5485] hover:bg-[#EBEBFE]/30 disabled:opacity-50 touch-manipulation"
                      >
                        {loadingMore ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Loading...
                          </>
                        ) : (
                          'Load More'
                        )}
                      </Button>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* 4. RIGHT COL: RULES */}
        <div className="space-y-4 sm:space-y-6">
          
          {/* Target Rules */}
          <Card className="border border-gray-100 shadow-sm bg-white">
            <CardHeader>
              <CardTitle className="text-lg sm:text-xl font-bold text-[#121213]">Targeting Rules</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <span className="block text-xs font-semibold text-gray-500 uppercase mb-1">Target Audience</span>
                <span className="text-sm sm:text-base font-medium text-[#121213]">{reward.target_member_type === 'YOUTH_MEMBER' ? 'Youth Members' : 'Guardians'}</span>
              </div>
              
              <div>
                <span className="block text-xs font-semibold text-gray-500 uppercase mb-1">Age Range</span>
                <span className="text-sm sm:text-base text-[#121213]">{reward.min_age || 0} - {reward.max_age || 'Any'} years</span>
              </div>

              {reward.target_grades && reward.target_grades.length > 0 && (
                <div>
                  <span className="block text-xs font-semibold text-gray-500 uppercase mb-1">Grades</span>
                  <span className="text-sm sm:text-base text-[#121213]">{reward.target_grades.join(', ')}</span>
                </div>
              )}

              {reward.target_genders && reward.target_genders.length > 0 && (
                <div>
                  <span className="block text-xs font-semibold text-gray-500 uppercase mb-1">Genders</span>
                  <span className="text-sm sm:text-base text-[#121213] capitalize">{reward.target_genders.join(', ').toLowerCase()}</span>
                </div>
              )}

              {reward.target_groups_details && reward.target_groups_details.length > 0 && (
                <div>
                  <span className="block text-xs font-semibold text-gray-500 uppercase mb-2">Specific Groups</span>
                  <div className="flex flex-wrap gap-2">
                    {reward.target_groups_details.map((g: any) => (
                      <Badge key={g.id} variant="outline" className="bg-[#EBEBFE] text-[#4D4DA4] border-[#EBEBFE] text-xs font-semibold">
                        {g.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Active Triggers */}
          <Card className="border border-gray-100 shadow-sm bg-white">
            <CardHeader>
              <CardTitle className="text-lg sm:text-xl font-bold text-[#121213]">Active Triggers</CardTitle>
            </CardHeader>
            <CardContent>
              {reward.active_triggers && reward.active_triggers.length > 0 ? (
                <div className="space-y-2">
                  {reward.active_triggers.map((t: string) => (
                    <div key={t} className="flex items-center gap-2 bg-green-50 text-green-800 px-3 py-2 rounded-lg border border-green-200">
                      <span>⚡</span>
                      <span className="font-semibold text-sm">{t}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No automatic triggers set. Manual claim only.</p>
              )}
            </CardContent>
          </Card>

          {/* Limits */}
          <Card className="border border-gray-100 shadow-sm bg-white">
            <CardHeader>
              <CardTitle className="text-lg sm:text-xl font-bold text-[#121213]">Availability</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <span className="block text-xs font-semibold text-gray-500 uppercase mb-1">Expires On</span>
                <span className={`text-sm sm:text-base ${reward.expiration_date ? 'text-[#121213]' : 'text-gray-400'}`}>
                  {reward.expiration_date ? new Date(reward.expiration_date).toLocaleDateString() : 'No Expiration'}
                </span>
              </div>
              <div>
                <span className="block text-xs font-semibold text-gray-500 uppercase mb-1">Usage Limit</span>
                <span className="text-sm sm:text-base text-[#121213]">{reward.usage_limit ? `${reward.usage_limit} total claims` : 'Unlimited'}</span>
              </div>
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
}