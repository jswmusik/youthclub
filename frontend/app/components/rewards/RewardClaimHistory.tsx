'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, Search, BarChart3, ChevronUp, X, Calendar } from 'lucide-react';
import api from '../../../lib/api';
import { getMediaUrl } from '../../utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
      <Collapsible open={analyticsExpanded} onOpenChange={setAnalyticsExpanded} className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-gray-500" />
            <h3 className="text-sm font-semibold text-gray-500">Analytics</h3>
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
        <CollapsibleContent className="space-y-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
            {/* Card 1: Total Claims */}
            <Card className="bg-[#EBEBFE]/30 border-none shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">Total Claims</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-[#4D4DA4]">{analytics.total_claims}</div>
              </CardContent>
            </Card>

            {/* Card 2: Claims Last 30 Days */}
            <Card className="bg-[#EBEBFE]/30 border-none shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">Last 30 Days</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-[#4D4DA4]">{analytics.claims_last_30_days}</div>
              </CardContent>
            </Card>

            {/* Card 3: Gender Breakdown */}
            <Card className="bg-[#EBEBFE]/30 border-none shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">Demographic Claims</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Male:</span>
                    <span className="font-bold text-[#4D4DA4]">{analytics.gender.male}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Female:</span>
                    <span className="font-bold text-[#4D4DA4]">{analytics.gender.female}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Other:</span>
                    <span className="font-bold text-[#4D4DA4]">{analytics.gender.other}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Filters */}
      <Card className="border border-gray-100 shadow-sm bg-white">
        <div className="p-4 space-y-4">
          {/* Main Filters Row */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
            {/* Search - Takes more space on larger screens */}
            <div className="relative md:col-span-5 lg:col-span-4">
              <label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">Search</label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                <Input 
                  placeholder="Search by name..." 
                  className="pl-9 bg-gray-50 border-0"
                  value={searchParams.get('search') || ''}
                  onChange={e => updateUrl('search', e.target.value)}
                />
              </div>
            </div>
            
            {/* Date From */}
            <div className="md:col-span-3 lg:col-span-2">
              <label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">From Date</label>
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
              <label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">To Date</label>
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
            <div className="md:col-span-1 lg:col-span-1 flex items-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push(pathname)}
                className="w-full h-9 text-gray-500 hover:text-red-600 hover:bg-red-50 gap-2"
              >
                <X className="h-4 w-4" /> Clear
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Table */}
      <Card className="border border-gray-100 shadow-sm bg-white">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-12 text-center text-gray-500">Loading claims...</div>
          ) : claims.length === 0 ? (
            <div className="p-12 text-center text-gray-500">No claims found.</div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-gray-100 hover:bg-transparent">
                    <TableHead className="h-12 text-gray-600 font-semibold">Member</TableHead>
                    <TableHead className="h-12 text-gray-600 font-semibold">Gender</TableHead>
                    <TableHead className="h-12 text-gray-600 font-semibold">Age</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {claims.map((claim) => (
                    <TableRow key={claim.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                      <TableCell className="py-4">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={claim.user_avatar ? getMediaUrl(claim.user_avatar) : undefined} />
                            <AvatarFallback className="bg-[#EBEBFE] text-[#4D4DA4] text-sm font-semibold">
                              {getInitials(claim.user_first_name || '', claim.user_last_name || '')}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <div className="font-semibold text-[#121213] text-sm">
                              {getFullName(claim)}
                            </div>
                            <div className="text-xs text-gray-500 truncate">
                              {claim.user_club_name || 'No club'}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-4">
                        <div className="text-sm text-[#121213] capitalize">
                          {claim.user_gender?.toLowerCase() || 'N/A'}
                        </div>
                      </TableCell>
                      <TableCell className="py-4">
                        <div className="text-sm text-[#121213]">
                          {claim.user_birth_date ? `${calculateAge(claim.user_birth_date)} years` : 'N/A'}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6">
                  <div className="flex flex-1 justify-between sm:hidden">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateUrl('page', String(currentPage - 1))}
                      disabled={currentPage === 1}
                      className="gap-2"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateUrl('page', String(currentPage + 1))}
                      disabled={currentPage >= totalPages}
                      className="gap-2"
                    >
                      Next
                      <ChevronLeft className="h-4 w-4 rotate-180" />
                    </Button>
                  </div>
                  <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm text-gray-700">
                        Showing <span className="font-medium">{(currentPage - 1) * pageSize + 1}</span> to{' '}
                        <span className="font-medium">{Math.min(currentPage * pageSize, totalCount)}</span> of{' '}
                        <span className="font-medium">{totalCount}</span> results
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateUrl('page', String(currentPage - 1))}
                        disabled={currentPage === 1}
                        className="gap-2"
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateUrl('page', String(currentPage + 1))}
                        disabled={currentPage >= totalPages}
                        className="gap-2"
                      >
                        Next
                        <ChevronLeft className="h-4 w-4 rotate-180" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

