'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, Search, BarChart3, ChevronUp, X, Calendar, Gift, TrendingUp, UsersRound } from 'lucide-react';
import api from '../../../lib/api';
import { getMediaUrl } from '../../utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

interface RewardClaimHistoryProps {
  rewardId: string;
  basePath: string; // e.g. "/admin/super/rewards"
}

export default function RewardClaimHistory({ rewardId, basePath }: RewardClaimHistoryProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  const [reward, setReward] = useState<any>(null);
  const [claims, setClaims] = useState<any[]>([]);
  const [allClaimsForAnalytics, setAllClaimsForAnalytics] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [analyticsExpanded, setAnalyticsExpanded] = useState(true);

  const buildUrlWithParams = (path: string) => {
    const params = new URLSearchParams();
    const page = searchParams.get('page');
    const search = searchParams.get('search');
    const dateFrom = searchParams.get('date_from');
    const dateTo = searchParams.get('date_to');
    
    if (page && page !== '1') params.set('page', page);
    if (search) params.set('search', search);
    if (dateFrom) params.set('date_from', dateFrom);
    if (dateTo) params.set('date_to', dateTo);
    
    const queryString = params.toString();
    return queryString ? `${path}?${queryString}` : path;
  };

  useEffect(() => {
    if (rewardId) {
      fetchReward();
      fetchAllClaimsForAnalytics();
    }
  }, [rewardId]);

  useEffect(() => {
    if (rewardId) {
      fetchClaims();
    }
  }, [searchParams, rewardId]);

  const fetchReward = async () => {
    try {
      const res = await api.get(`/rewards/${rewardId}/`);
      setReward(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAllClaimsForAnalytics = async () => {
    try {
      let allClaims: any[] = [];
      let page = 1;
      const pageSize = 100;
      const maxPages = 100;
      
      while (page <= maxPages) {
        const params = new URLSearchParams();
        params.set('page', page.toString());
        params.set('page_size', pageSize.toString());
        
        const res: any = await api.get(`/rewards/${rewardId}/history/?${params.toString()}`);
        const responseData: any = res?.data;
        
        if (!responseData) break;
        
        let pageClaims: any[] = [];
        
        if (Array.isArray(responseData)) {
          pageClaims = responseData;
          allClaims = [...allClaims, ...pageClaims];
          break;
        } else if (responseData.results && Array.isArray(responseData.results)) {
          pageClaims = responseData.results;
          allClaims = [...allClaims, ...pageClaims];
          
          if (!responseData.next || pageClaims.length === 0) break;
          page++;
        } else {
          break;
        }
      }
      
      setAllClaimsForAnalytics(allClaims);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchClaims = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      const search = searchParams.get('search');
      const dateFrom = searchParams.get('date_from');
      const dateTo = searchParams.get('date_to');
      const page = searchParams.get('page') || '1';
      
      params.set('page', page);
      params.set('page_size', '10');
      
      if (search) params.set('search', search);
      if (dateFrom) params.set('date_from', dateFrom);
      if (dateTo) params.set('date_to', dateTo);
      
      const res = await api.get(`/rewards/${rewardId}/history/?${params.toString()}`);
      
      if (Array.isArray(res.data)) {
        setClaims(res.data);
        setTotalCount(res.data.length);
      } else {
        setClaims(res.data.results || []);
        setTotalCount(res.data.count || 0);
      }
    } catch (err) {
      console.error(err);
      setClaims([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  };

  const updateUrl = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.delete('page'); // Reset to page 1 when filters change
    router.push(`${pathname}?${params.toString()}`);
  };

  const getInitials = (firstName: string, lastName: string) => {
    const first = firstName?.charAt(0)?.toUpperCase() || '';
    const last = lastName?.charAt(0)?.toUpperCase() || '';
    return first + last || '?';
  };

  const getFullName = (claim: any) => {
    if (claim.user_name) return claim.user_name;
    if (claim.user_first_name || claim.user_last_name) {
      return `${claim.user_first_name || ''} ${claim.user_last_name || ''}`.trim();
    }
    return 'Unknown User';
  };

  const calculateAge = (birthDate: string) => {
    if (!birthDate) return 'N/A';
    const birth = new Date(birthDate);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  // Calculate analytics from allClaimsForAnalytics
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const analytics = {
    total_claims: allClaimsForAnalytics.length,
    claims_last_30_days: allClaimsForAnalytics.filter((claim: any) => {
      const claimDate = claim.redeemed_at ? new Date(claim.redeemed_at) : (claim.created_at ? new Date(claim.created_at) : null);
      if (!claimDate) return false;
      return claimDate >= thirtyDaysAgo;
    }).length,
    gender: {
      male: allClaimsForAnalytics.filter((claim: any) => claim.user_gender === 'MALE').length,
      female: allClaimsForAnalytics.filter((claim: any) => claim.user_gender === 'FEMALE').length,
      other: allClaimsForAnalytics.filter((claim: any) => claim.user_gender === 'OTHER').length,
    },
  };

  // Pagination logic
  const currentPage = Number(searchParams.get('page')) || 1;
  const pageSize = 10;
  const totalPages = Math.ceil(totalCount / pageSize);

  if (!reward) {
    return <div className="p-12 text-center text-gray-500">Loading reward details...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Link href={buildUrlWithParams(`${basePath}/${rewardId}`)}>
          <Button variant="ghost" size="sm" className="gap-2 text-gray-600 hover:text-gray-900">
            <ChevronLeft className="h-4 w-4" />
            Back to Reward
          </Button>
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#121213]">Claim History</h1>
          <p className="text-gray-500 mt-1">{reward.name}</p>
        </div>
      </div>

      {/* Analytics */}
      {!loading && (
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
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
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
                      <div className="text-2xl sm:text-3xl font-bold text-white">{analytics.total_claims}</div>
                    </div>
                  </Card>

                  {/* Card 2: Claims Last 30 Days */}
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
                          <TrendingUp className="h-5 w-5 text-white" />
                        </div>
                        <CardTitle className="text-sm font-medium text-white/90">Last 30 Days</CardTitle>
                      </div>
                      <div className="text-2xl sm:text-3xl font-bold text-white">{analytics.claims_last_30_days}</div>
                    </div>
                  </Card>

                  {/* Card 3: Gender Breakdown */}
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
                          <UsersRound className="h-5 w-5 text-white" />
                        </div>
                        <CardTitle className="text-sm font-medium text-white/90">Demographic Claims</CardTitle>
                      </div>
                      <div className="space-y-1.5 w-full">
                        <div className="flex justify-between text-sm">
                          <span className="text-white/70">Male:</span>
                          <span className="font-bold text-white">{analytics.gender.male}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-white/70">Female:</span>
                          <span className="font-bold text-white">{analytics.gender.female}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-white/70">Other:</span>
                          <span className="font-bold text-white">{analytics.gender.other}</span>
                        </div>
                      </div>
                    </div>
                  </Card>
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}

      {/* Filters */}
      <Card className="border border-gray-100 shadow-sm bg-white">
        <div className="px-6 py-4 space-y-4">
          {/* Main Filters Row */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
            {/* Search - Takes more space on larger screens */}
            <div className="relative md:col-span-4 lg:col-span-3">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
              <Input 
                placeholder="Search by name..." 
                className="pl-9 bg-gray-50 border-0"
                value={searchParams.get('search') || ''}
                onChange={e => updateUrl('search', e.target.value)}
              />
            </div>
            
            {/* Date From */}
            <div className="md:col-span-3 lg:col-span-2">
              <div className="relative">
                <Calendar className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                <Input
                  type="date"
                  className="pl-9 bg-gray-50 border-0"
                  value={searchParams.get('date_from') || ''}
                  onChange={e => updateUrl('date_from', e.target.value)}
                />
              </div>
            </div>

            {/* Date To */}
            <div className="md:col-span-3 lg:col-span-2">
              <div className="relative">
                <Calendar className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                <Input
                  type="date"
                  className="pl-9 bg-gray-50 border-0"
                  value={searchParams.get('date_to') || ''}
                  onChange={e => updateUrl('date_to', e.target.value)}
                />
              </div>
            </div>
            
            {/* Clear Button */}
            <div className="md:col-span-2 lg:col-span-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push(pathname)}
                className="w-full text-gray-500 hover:text-red-600 hover:bg-red-50 gap-2"
              >
                <X className="h-4 w-4" /> Clear
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Table */}
      {loading ? (
        <div className="py-20 flex justify-center text-gray-400">
          <div className="animate-pulse">Loading...</div>
        </div>
      ) : claims.length === 0 ? (
        <Card className="border border-gray-100 shadow-sm">
          <div className="py-20 text-center">
            <p className="text-gray-500">No claims found.</p>
          </div>
        </Card>
      ) : (
        <>
          {/* DESKTOP: Table */}
          <Card className="hidden md:block border border-gray-100 shadow-sm bg-white overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-gray-100 hover:bg-transparent">
                  <TableHead className="h-12 px-6 text-gray-600 font-semibold">Member</TableHead>
                  <TableHead className="h-12 px-6 text-gray-600 font-semibold">Gender</TableHead>
                  <TableHead className="h-12 px-6 text-gray-600 font-semibold">Age</TableHead>
                  <TableHead className="h-12 px-6 text-right text-gray-600 font-semibold">Date Claimed</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {claims.map((claim) => {
                  const claimDate = claim.redeemed_at ? new Date(claim.redeemed_at) : (claim.created_at ? new Date(claim.created_at) : null);
                  return (
                    <TableRow key={claim.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                      <TableCell className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9 rounded-full border border-gray-200 bg-gray-50">
                            <AvatarImage src={claim.user_avatar ? getMediaUrl(claim.user_avatar) : undefined} className="object-cover" />
                            <AvatarFallback className="rounded-full font-bold text-xs bg-[#EBEBFE] text-[#4D4DA4]">
                              {getInitials(claim.user_first_name || '', claim.user_last_name || '')}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-semibold text-[#121213]">
                              {getFullName(claim)}
                            </div>
                            <div className="text-xs text-gray-500 truncate">
                              {claim.user_club_name || 'No club'}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-4 px-6">
                        <div className="text-sm text-[#121213] capitalize">
                          {claim.user_gender?.toLowerCase() || 'N/A'}
                        </div>
                      </TableCell>
                      <TableCell className="py-4 px-6">
                        <div className="text-sm text-[#121213]">
                          {claim.user_birth_date ? `${calculateAge(claim.user_birth_date)} years` : 'N/A'}
                        </div>
                      </TableCell>
                      <TableCell className="py-4 px-6 text-right">
                        <div className="text-sm text-gray-500">
                          {claimDate ? (
                            <>
                              <div>{claimDate.toLocaleDateString()}</div>
                              <div className="text-xs">{claimDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                            </>
                          ) : 'N/A'}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>

          {/* MOBILE: Cards */}
          <div className="grid grid-cols-1 gap-3 md:hidden">
            {claims.map((claim) => {
              const claimDate = claim.redeemed_at ? new Date(claim.redeemed_at) : (claim.created_at ? new Date(claim.created_at) : null);
              return (
                <Card key={claim.id} className="overflow-hidden border-l-4 border-l-[#4D4DA4] shadow-sm">
                  <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <Avatar className="h-10 w-10 rounded-full border border-gray-200 bg-gray-50 flex-shrink-0">
                        <AvatarImage src={claim.user_avatar ? getMediaUrl(claim.user_avatar) : undefined} className="object-cover" />
                        <AvatarFallback className="rounded-full font-bold text-xs bg-[#EBEBFE] text-[#4D4DA4]">
                          {getInitials(claim.user_first_name || '', claim.user_last_name || '')}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-base font-semibold text-[#121213] truncate">
                          {getFullName(claim)}
                        </CardTitle>
                        <CardDescription className="text-xs text-gray-500 truncate">
                          {claim.user_club_name || 'No club'}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3 pt-0">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-xs text-gray-500 uppercase font-semibold">Gender</span>
                        <span className="text-sm text-[#121213] capitalize">
                          {claim.user_gender?.toLowerCase() || 'N/A'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-xs text-gray-500 uppercase font-semibold">Age</span>
                        <span className="text-sm text-[#121213]">
                          {claim.user_birth_date ? `${calculateAge(claim.user_birth_date)} years` : 'N/A'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-xs text-gray-500 uppercase font-semibold">Date Claimed</span>
                        <span className="text-sm text-gray-500">
                          {claimDate ? (
                            <>
                              {claimDate.toLocaleDateString()} {claimDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </>
                          ) : 'N/A'}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 py-4">
              <Button 
                variant="outline" 
                size="sm" 
                disabled={currentPage === 1} 
                onClick={() => updateUrl('page', (currentPage - 1).toString())}
                className="text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              >
                Prev
              </Button>
              <div className="text-sm text-gray-500">Page {currentPage} of {totalPages}</div>
              <Button 
                variant="outline" 
                size="sm" 
                disabled={currentPage >= totalPages} 
                onClick={() => updateUrl('page', (currentPage + 1).toString())}
                className="text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

