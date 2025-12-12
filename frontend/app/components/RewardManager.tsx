'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import { Plus, Search, BarChart3, ChevronUp, Eye, Edit, Trash2, X, Gift, Building, MapPin, Globe } from 'lucide-react';
import api from '../../lib/api';
import Toast from './Toast';
import ConfirmationModal from './ConfirmationModal';
import { getMediaUrl } from '../utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

interface Reward {
  id: number;
  name: string;
  image: string | null;
  owner_role: string;
  municipality_name?: string;
  club_name?: string;
  is_active: boolean;
  expiration_date: string | null;
  usage_limit: number | null;
}

interface Analytics {
  total_created: number;
  active_rewards: number;
  expired_rewards: number;
  total_uses: number;
  uses_last_7_days: number;
}

interface RewardManagerProps {
  basePath: string; // e.g. "/admin/super/rewards"
}

export default function RewardManager({ basePath }: RewardManagerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  // Determine admin type from pathname
  const isSuperAdmin = pathname.includes('/super');
  const isMuniAdmin = pathname.includes('/municipality');
  const isClubAdmin = pathname.includes('/club');
  
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [allRewards, setAllRewards] = useState<Reward[]>([]); // Store all rewards from API
  const [filteredRewards, setFilteredRewards] = useState<Reward[]>([]); // Store filtered rewards for pagination
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyticsExpanded, setAnalyticsExpanded] = useState(true);
  
  // Actions
  const [toast, setToast] = useState({ message: '', type: 'success' as 'success'|'error', isVisible: false });
  const [rewardToDelete, setRewardToDelete] = useState<Reward | null>(null);

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
    const scope = searchParams.get('scope');
    const status = searchParams.get('status');
    const expired = searchParams.get('expired');
    
    // Always include page if it exists and is not '1', or if we're on a page > 1
    const currentPage = Number(searchParams.get('page')) || 1;
    if (currentPage > 1) params.set('page', currentPage.toString());
    if (search) params.set('search', search);
    if (scope) params.set('scope', scope);
    if (status) params.set('status', status);
    if (expired) params.set('expired', expired);
    
    const queryString = params.toString();
    return queryString ? `${path}?${queryString}` : path;
  };


  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [searchParams, allRewards]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch all rewards (may need to paginate through all pages)
      let allRewardsData: Reward[] = [];
      let page = 1;
      const pageSize = 100;
      const maxPages = 100;
      
      while (page <= maxPages) {
        const params = new URLSearchParams();
        params.set('page', page.toString());
        params.set('page_size', pageSize.toString());
        
        const res: any = await api.get(`/rewards/?${params.toString()}`);
        const responseData: any = res?.data;
        
        if (!responseData) {
          break;
        }
        
        let pageRewards: Reward[] = [];
        
        if (Array.isArray(responseData)) {
          pageRewards = responseData;
          allRewardsData = [...allRewardsData, ...pageRewards];
          break;
        } else if (responseData.results && Array.isArray(responseData.results)) {
          pageRewards = responseData.results;
          allRewardsData = [...allRewardsData, ...pageRewards];
          
          const hasNext = responseData.next !== null && responseData.next !== undefined;
          const hasAllResults = responseData.count > 0 && allRewardsData.length >= responseData.count;
          const gotEmptyPage = pageRewards.length === 0;
          
          if (!hasNext || hasAllResults || gotEmptyPage) {
            break;
          }
          
          page++;
        } else {
          break;
        }
      }
      
      const [statsRes] = await Promise.all([
        api.get('/rewards/analytics_overview/')
      ]);
      
      setAllRewards(allRewardsData);
      setAnalytics(statsRes.data);
    } catch (err) {
      console.error(err);
      setToast({ message: 'Failed to load rewards.', type: 'error', isVisible: true });
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...allRewards];
    
    // Search by name
    const search = searchParams.get('search') || '';
    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(r => r.name.toLowerCase().includes(searchLower));
    }
    
    // Filter by scope
    const scope = searchParams.get('scope') || '';
    if (scope) {
      if (scope === 'GLOBAL') {
        filtered = filtered.filter(r => r.owner_role === 'SUPER_ADMIN');
      } else if (scope === 'MUNICIPALITY') {
        filtered = filtered.filter(r => r.owner_role === 'MUNICIPALITY_ADMIN');
      } else if (scope === 'CLUB') {
        filtered = filtered.filter(r => r.owner_role === 'CLUB_ADMIN');
      }
    }
    
    // Filter by status
    const status = searchParams.get('status') || '';
    if (status) {
      if (status === 'active') {
        filtered = filtered.filter(r => r.is_active);
      } else if (status === 'inactive') {
        filtered = filtered.filter(r => !r.is_active);
      }
    }
    
    // Filter by expired
    const expired = searchParams.get('expired') || '';
    if (expired) {
      const now = new Date();
      if (expired === 'yes') {
        filtered = filtered.filter(r => {
          if (!r.expiration_date) return false;
          return new Date(r.expiration_date) < now;
        });
      } else if (expired === 'no') {
        filtered = filtered.filter(r => {
          if (!r.expiration_date) return true; // No expiry = not expired
          return new Date(r.expiration_date) >= now;
        });
      }
    }
    
    setFilteredRewards(filtered);
    
    // Apply pagination
    const currentPage = Number(searchParams.get('page')) || 1;
    const pageSize = 10;
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    setRewards(filtered.slice(startIndex, endIndex));
  };

  const handleDelete = async () => {
    if (!rewardToDelete) return;
    try {
      await api.delete(`/rewards/${rewardToDelete.id}/`);
      setToast({ message: 'Reward deleted successfully.', type: 'success', isVisible: true });
      setRewardToDelete(null);
      await fetchData(); // Refresh list
      // Reapply filters to maintain current page if possible
      applyFilters();
    } catch (err) {
      setToast({ message: 'Failed to delete reward.', type: 'error', isVisible: true });
    }
  };

  const getScopeLabel = (r: Reward) => {
    if (r.owner_role === 'SUPER_ADMIN') return 'Global';
    if (r.owner_role === 'MUNICIPALITY_ADMIN') return r.municipality_name || 'Municipality';
    if (r.owner_role === 'CLUB_ADMIN') return r.club_name || 'Club';
    return '-';
  };

  const getScopeIcon = (r: Reward) => {
    if (r.owner_role === 'SUPER_ADMIN') return <Globe className="h-3 w-3" />;
    if (r.owner_role === 'MUNICIPALITY_ADMIN') return <MapPin className="h-3 w-3" />;
    if (r.owner_role === 'CLUB_ADMIN') return <Building className="h-3 w-3" />;
    return null;
  };

  // Pagination logic
  const currentPage = Number(searchParams.get('page')) || 1;
  const pageSize = 10;
  const totalPages = Math.ceil(filteredRewards.length / pageSize);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#121213]">Manage Rewards</h1>
          <p className="text-gray-500 mt-1">Manage rewards and their information.</p>
        </div>
        <Link href={`${basePath}/create`}>
          <Button className="w-full sm:w-auto gap-2 bg-[#4D4DA4] hover:bg-[#FF5485] text-white rounded-full transition-colors">
            <Plus className="h-4 w-4" /> Add Reward
          </Button>
        </Link>
      </div>

      {/* Analytics */}
      {!loading && analytics && (
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
              {/* Card 1: Active Rewards */}
              <Card className="bg-[#EBEBFE]/30 border-none shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-500">Active Rewards</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-[#4D4DA4]">{analytics.active_rewards}</div>
                </CardContent>
              </Card>

              {/* Card 2: Total Created */}
              <Card className="bg-[#EBEBFE]/30 border-none shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-500">Total Created</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-[#4D4DA4]">{analytics.total_created}</div>
                </CardContent>
              </Card>

              {/* Card 3: Total Claims */}
              <Card className="bg-[#EBEBFE]/30 border-none shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-500">Total Claims</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-[#4D4DA4]">{analytics.total_uses}</div>
                </CardContent>
              </Card>

              {/* Card 4: Claims (7 Days) */}
              <Card className="bg-[#EBEBFE]/30 border-none shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-500">Claims (7 Days)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-[#4D4DA4]">{analytics.uses_last_7_days}</div>
                </CardContent>
              </Card>
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Filters */}
      <Card className="border border-gray-100 shadow-sm bg-white">
        <div className="p-4 space-y-4">
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
            
            {/* Scope Filter - Only for Super Admin */}
            {isSuperAdmin && (
              <div className="md:col-span-2 lg:col-span-2">
                <select 
                  className="flex h-9 w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#4D4DA4]"
                  value={searchParams.get('scope') || ''} 
                  onChange={e => updateUrl('scope', e.target.value)}
                >
                  <option value="">All Scopes</option>
                  <option value="GLOBAL">Global</option>
                  <option value="MUNICIPALITY">Municipality</option>
                  <option value="CLUB">Club</option>
                </select>
              </div>
            )}

            {/* Scope - For Municipality Admin */}
            {isMuniAdmin && (
              <div className="md:col-span-2 lg:col-span-2">
                <select 
                  className="flex h-9 w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#4D4DA4]"
                  value={searchParams.get('scope') || ''} 
                  onChange={e => updateUrl('scope', e.target.value)}
                >
                  <option value="">All Scopes</option>
                  <option value="MUNICIPALITY">Municipality</option>
                  <option value="CLUB">Club</option>
                </select>
              </div>
            )}
            
            {/* Status Filter */}
            <div className={cn("md:col-span-2", (isSuperAdmin || isMuniAdmin) ? "lg:col-span-2" : "lg:col-span-3")}>
              <select 
                className="flex h-9 w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#4D4DA4]"
                value={searchParams.get('status') || ''} 
                onChange={e => updateUrl('status', e.target.value)}
              >
                <option value="">All Statuses</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            
            {/* Expired Filter */}
            <div className={cn("md:col-span-2", (isSuperAdmin || isMuniAdmin) ? "lg:col-span-2" : "lg:col-span-3")}>
              <select 
                className="flex h-9 w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#4D4DA4]"
                value={searchParams.get('expired') || ''} 
                onChange={e => updateUrl('expired', e.target.value)}
              >
                <option value="">All</option>
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
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

      {/* Content */}
      {loading ? (
        <div className="py-20 flex justify-center text-gray-400">
          <div className="animate-pulse">Loading...</div>
        </div>
      ) : rewards.length === 0 ? (
        <Card className="border border-gray-100 shadow-sm">
          <div className="py-20 text-center">
            <p className="text-gray-500">No rewards found.</p>
          </div>
        </Card>
      ) : (
        <>
          {/* MOBILE: Cards */}
          <div className="grid grid-cols-1 gap-3 md:hidden">
            {rewards.map(reward => (
              <Card key={reward.id} className="overflow-hidden border-l-4 border-l-[#4D4DA4] shadow-sm">
                <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <Avatar className="h-10 w-10 rounded-lg border border-gray-200 bg-gray-50 flex-shrink-0">
                      <AvatarImage src={reward.image ? getMediaUrl(reward.image) : undefined} className="object-cover" />
                      <AvatarFallback className="rounded-lg font-bold text-xs bg-[#EBEBFE] text-[#4D4DA4]">
                        <Gift className="h-5 w-5" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base font-semibold text-[#121213] truncate">
                        {reward.name}
                      </CardTitle>
                      <CardDescription className="text-xs text-gray-500 truncate flex items-center gap-1">
                        {getScopeIcon(reward)}
                        {getScopeLabel(reward)}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 pt-0">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-xs text-gray-500 uppercase font-semibold">Status</span>
                      <Badge variant="outline" className={
                        reward.is_active 
                          ? 'bg-green-50 text-green-700 border-green-200' 
                          : 'bg-gray-50 text-gray-700 border-gray-200'
                      }>
                        {reward.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-xs text-gray-500 uppercase font-semibold">Expiry</span>
                      <span className="text-sm text-gray-600">
                        {reward.expiration_date ? new Date(reward.expiration_date).toLocaleDateString() : 'No Expiry'}
                      </span>
                    </div>
                  </div>
                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                    <Link href={buildUrlWithParams(`${basePath}/${reward.id}`)} className="flex-1">
                      <Button variant="ghost" size="sm" className="w-full justify-center gap-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50">
                        <Eye className="h-4 w-4" />
                        View
                      </Button>
                    </Link>
                    <Link href={buildUrlWithParams(`${basePath}/edit/${reward.id}`)} className="flex-1">
                      <Button variant="ghost" size="sm" className="w-full justify-center gap-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50">
                        <Edit className="h-4 w-4" />
                        Edit
                      </Button>
                    </Link>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="flex-1 justify-center gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => setRewardToDelete(reward)}
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* DESKTOP: Table */}
          <Card className="hidden md:block border border-gray-100 shadow-sm bg-white overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-gray-100 hover:bg-transparent">
                  <TableHead className="h-12 text-gray-600 font-semibold">Reward</TableHead>
                  <TableHead className="h-12 text-gray-600 font-semibold">Scope</TableHead>
                  <TableHead className="h-12 text-gray-600 font-semibold">Status</TableHead>
                  <TableHead className="h-12 text-gray-600 font-semibold">Expiry</TableHead>
                  <TableHead className="h-12 text-right text-gray-600 font-semibold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rewards.map(reward => (
                  <TableRow key={reward.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                    <TableCell className="py-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9 rounded-lg border border-gray-200 bg-gray-50">
                          <AvatarImage src={reward.image ? getMediaUrl(reward.image) : undefined} className="object-cover" />
                          <AvatarFallback className="rounded-lg font-bold text-xs bg-[#EBEBFE] text-[#4D4DA4]">
                            <Gift className="h-4 w-4" />
                          </AvatarFallback>
                        </Avatar>
                        <div className="font-semibold text-[#121213]">{reward.name}</div>
                      </div>
                    </TableCell>
                    <TableCell className="py-4">
                      <div className="flex items-center gap-1.5 text-sm text-gray-600">
                        {getScopeIcon(reward)}
                        {getScopeLabel(reward)}
                      </div>
                    </TableCell>
                    <TableCell className="py-4">
                      <Badge variant="outline" className={
                        reward.is_active 
                          ? 'bg-green-50 text-green-700 border-green-200' 
                          : 'bg-gray-50 text-gray-700 border-gray-200'
                      }>
                        {reward.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-4">
                      <span className="text-sm text-gray-600">
                        {reward.expiration_date ? new Date(reward.expiration_date).toLocaleDateString() : 'No Expiry'}
                      </span>
                    </TableCell>
                    <TableCell className="py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Link href={buildUrlWithParams(`${basePath}/${reward.id}`)}>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-500 hover:text-gray-900 hover:bg-gray-100">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Link href={buildUrlWithParams(`${basePath}/edit/${reward.id}`)}>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-500 hover:text-gray-900 hover:bg-gray-100">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 w-8 p-0 text-gray-500 hover:text-red-600 hover:bg-red-50"
                          onClick={() => setRewardToDelete(reward)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </>
      )}

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

      <ConfirmationModal 
        isVisible={!!rewardToDelete}
        onClose={() => setRewardToDelete(null)}
        onConfirm={handleDelete}
        title="Delete Reward"
        message={`Are you sure you want to delete "${rewardToDelete?.name}"? This action cannot be undone.`}
        confirmButtonText="Delete"
        cancelButtonText="Cancel"
        variant="danger"
      />

      <Toast {...toast} onClose={() => setToast({...toast, isVisible: false})} />
    </div>
  );
}