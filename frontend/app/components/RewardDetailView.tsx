'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, Edit, History, BarChart3, ChevronUp, Gift, Clock, Calendar, TrendingUp } from 'lucide-react';
import api from '../../lib/api';
import { getMediaUrl } from '../utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

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
  const [analyticsExpanded, setAnalyticsExpanded] = useState(true);

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

  const fetchData = async () => {
    setLoading(true);
    try {
      const [rewardRes, statsRes] = await Promise.all([
        api.get(`/rewards/${rewardId}/`),
        api.get(`/rewards/${rewardId}/analytics_detail/`)
      ]);
      setReward(rewardRes.data);
      setAnalytics(statsRes.data);
      
      // Fetch only latest 10 claims
      const historyRes = await api.get(`/rewards/${rewardId}/history/?page_size=10`);
      const historyData = historyRes.data.results || historyRes.data;
      setHistory(Array.isArray(historyData) ? historyData : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

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

      {/* 2. ANALYTICS DASHBOARD */}
      {analytics && !loading && (
        <Collapsible open={analyticsExpanded} onOpenChange={setAnalyticsExpanded} className="space-y-2">
          <Card className="border-0 shadow-sm bg-gray-900">
            <div className="flex items-center justify-between px-4 sm:px-6 py-3">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-gray-400" />
                <h3 className="text-sm font-semibold text-white drop-shadow-[0_0_8px_rgba(77,77,164,0.6)]" style={{ textShadow: '0 0 8px rgba(255, 84, 133, 0.4), 0 0 12px rgba(77, 77, 164, 0.3)' }}>
                  Analytics Dashboard
                </h3>
              </div>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="w-9 p-0 h-8 text-gray-400 hover:text-white hover:bg-gray-800">
                  <ChevronUp className={cn(
                    "h-3.5 w-3.5 transition-transform duration-300 ease-in-out",
                    analyticsExpanded ? "rotate-0" : "rotate-180"
                  )} />
                  <span className="sr-only">Toggle Analytics</span>
                </Button>
              </CollapsibleTrigger>
            </div>
            <CollapsibleContent className="transition-all duration-500 ease-in-out">
              <CardContent className="p-4 sm:p-6 pt-3 transition-opacity duration-500 ease-in-out">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
                  {/* Card 1: Total Claims */}
                  <Card className="bg-white/5 backdrop-blur-sm border border-[#4D4DA4]/50 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 relative overflow-hidden"
                    style={{
                      boxShadow: '0 4px 20px rgba(77, 77, 164, 0.3), 0 0 20px rgba(255, 84, 133, 0.2)',
                    }}>
                    <div className="p-3 sm:p-4 flex flex-col items-center space-y-2">
                      <div className="flex items-center gap-2 justify-center">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#4D4DA4] to-[#FF5485] flex items-center justify-center shadow-lg"
                          style={{
                            boxShadow: '0 4px 15px rgba(77, 77, 164, 0.5), 0 0 20px rgba(255, 84, 133, 0.3)',
                          }}>
                          <Gift className="h-5 w-5 text-white" />
                        </div>
                        <CardTitle className="text-sm font-medium text-white/90">Total Claims</CardTitle>
                      </div>
                      <div className="text-2xl sm:text-3xl font-bold text-white">{analytics.total_uses}</div>
                    </div>
                  </Card>

                  {/* Card 2: Last 24h */}
                  <Card className="bg-white/5 backdrop-blur-sm border border-[#0EA5E9]/50 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 relative overflow-hidden"
                    style={{
                      boxShadow: '0 4px 20px rgba(14, 165, 233, 0.3), 0 0 20px rgba(14, 165, 233, 0.2)',
                    }}>
                    <div className="p-3 sm:p-4 flex flex-col items-center space-y-2">
                      <div className="flex items-center gap-2 justify-center">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0EA5E9] to-[#38BDF8] flex items-center justify-center shadow-lg"
                          style={{
                            boxShadow: '0 4px 15px rgba(14, 165, 233, 0.5), 0 0 20px rgba(14, 165, 233, 0.3)',
                          }}>
                          <Clock className="h-5 w-5 text-white" />
                        </div>
                        <CardTitle className="text-sm font-medium text-white/90">Last 24h</CardTitle>
                      </div>
                      <div className="text-2xl sm:text-3xl font-bold text-white">{analytics.uses_last_24h}</div>
                    </div>
                  </Card>

                  {/* Card 3: Last 7 Days */}
                  <Card className="bg-white/5 backdrop-blur-sm border border-[#10B981]/50 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 relative overflow-hidden"
                    style={{
                      boxShadow: '0 4px 20px rgba(16, 185, 129, 0.3), 0 0 20px rgba(16, 185, 129, 0.2)',
                    }}>
                    <div className="p-3 sm:p-4 flex flex-col items-center space-y-2">
                      <div className="flex items-center gap-2 justify-center">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#10B981] to-[#34D399] flex items-center justify-center shadow-lg"
                          style={{
                            boxShadow: '0 4px 15px rgba(16, 185, 129, 0.5), 0 0 20px rgba(16, 185, 129, 0.3)',
                          }}>
                          <TrendingUp className="h-5 w-5 text-white" />
                        </div>
                        <CardTitle className="text-sm font-medium text-white/90">Last 7 Days</CardTitle>
                      </div>
                      <div className="text-2xl sm:text-3xl font-bold text-white">{analytics.uses_last_7d}</div>
                    </div>
                  </Card>

                  {/* Card 4: Last 30 Days */}
                  <Card className="bg-white/5 backdrop-blur-sm border border-[#FF5485]/50 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 relative overflow-hidden"
                    style={{
                      boxShadow: '0 4px 20px rgba(255, 84, 133, 0.3), 0 0 20px rgba(255, 84, 133, 0.2)',
                    }}>
                    <div className="p-3 sm:p-4 flex flex-col items-center space-y-2">
                      <div className="flex items-center gap-2 justify-center">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FF5485] to-[#FF6B9D] flex items-center justify-center shadow-lg"
                          style={{
                            boxShadow: '0 4px 15px rgba(255, 84, 133, 0.5), 0 0 20px rgba(255, 84, 133, 0.3)',
                          }}>
                          <Calendar className="h-5 w-5 text-white" />
                        </div>
                        <CardTitle className="text-sm font-medium text-white/90">Last 30 Days</CardTitle>
                      </div>
                      <div className="text-2xl sm:text-3xl font-bold text-white">{analytics.uses_last_30d}</div>
                    </div>
                  </Card>

                  {/* Card 5: Days Left */}
                  <Card className="bg-white/5 backdrop-blur-sm border border-[#F59E0B]/50 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 relative overflow-hidden"
                    style={{
                      boxShadow: '0 4px 20px rgba(245, 158, 11, 0.3), 0 0 20px rgba(245, 158, 11, 0.2)',
                    }}>
                    <div className="p-3 sm:p-4 flex flex-col items-center space-y-2">
                      <div className="flex items-center gap-2 justify-center">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#F59E0B] to-[#FBBF24] flex items-center justify-center shadow-lg"
                          style={{
                            boxShadow: '0 4px 15px rgba(245, 158, 11, 0.5), 0 0 20px rgba(245, 158, 11, 0.3)',
                          }}>
                          <Clock className="h-5 w-5 text-white" />
                        </div>
                        <CardTitle className="text-sm font-medium text-white/90">Days Left</CardTitle>
                      </div>
                      <div className="text-2xl sm:text-3xl font-bold text-white">{analytics.days_remaining !== null ? analytics.days_remaining : '∞'}</div>
                    </div>
                  </Card>
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
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

          {/* Latest Claims Table */}
          <Card className="border-none shadow-sm bg-white overflow-hidden">
            <CardHeader>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <CardTitle className="text-lg sm:text-xl font-bold text-[#121213]">Latest Claims</CardTitle>
                {history.length > 0 && (
                  <Badge variant="outline" className="bg-[#EBEBFE] text-[#4D4DA4] border-[#4D4DA4]/30 text-xs font-semibold">
                    Showing {history.length} {history.length === 1 ? 'claim' : 'claims'}
                  </Badge>
                )}
              </div>
              <CardDescription className="text-sm text-gray-500 mt-1">
                View the 10 most recent claims for this reward
              </CardDescription>
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
                      <div key={usage.id} className="p-6 space-y-2">
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
                  <div className="hidden md:block overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-b border-gray-100 bg-white hover:bg-white">
                          <TableHead className="h-12 px-6 text-gray-600 font-semibold">User</TableHead>
                          <TableHead className="h-12 px-6 text-gray-600 font-semibold">Email</TableHead>
                          <TableHead className="h-12 px-6 text-right text-gray-600 font-semibold">Date Claimed</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {history.map((usage) => (
                          <TableRow key={usage.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                            <TableCell className="py-4 px-6">
                              <div className="font-semibold text-[#121213] text-sm">{usage.user_name}</div>
                            </TableCell>
                            <TableCell className="py-4 px-6">
                              <div className="text-sm text-gray-500">{usage.user_email}</div>
                            </TableCell>
                            <TableCell className="py-4 px-6 text-right">
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
                  </div>
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