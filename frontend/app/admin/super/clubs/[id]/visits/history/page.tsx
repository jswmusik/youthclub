'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams, usePathname, useParams } from 'next/navigation';
import { ArrowLeft, Filter, ChevronDown, Search, X } from 'lucide-react';
import { visits } from '@/lib/api';
import { getMediaUrl } from '@/app/utils';
import Toast from '@/app/components/Toast';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export default function SuperClubVisitHistoryPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const params = useParams();
  const clubId = params?.id as string;
  
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtersExpanded, setFiltersExpanded] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error'; isVisible: boolean }>({
    message: '',
    type: 'error',
    isVisible: false,
  });

  const updateUrl = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value); else params.delete(key);
    router.push(`${pathname}?${params.toString()}`);
  };

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const params: { search?: string; start_date?: string; end_date?: string; club_id?: string } = {};
      const search = searchParams.get('search') || '';
      const startDate = searchParams.get('start_date') || '';
      const endDate = searchParams.get('end_date') || '';
      const guestFilter = searchParams.get('guest_filter') || '';
      
      if (search && search.trim()) params.search = search.trim();
      if (startDate && startDate.trim()) params.start_date = startDate.trim();
      if (endDate && endDate.trim()) params.end_date = endDate.trim();
      if (clubId) params.club_id = clubId; // Filter by current club
      
      const res = await visits.getHistory(params);
      let visitsData = res.data.results || res.data || [];
      
      // Client-side filtering for guest status
      if (guestFilter === 'guests') {
        visitsData = visitsData.filter((visit: any) => visit.is_guest === true);
      } else if (guestFilter === 'members') {
        visitsData = visitsData.filter((visit: any) => visit.is_guest === false);
      }
      
      setData(visitsData);
      setToast({ message: '', type: 'error', isVisible: false });
    } catch (error: any) {
      setToast({ 
        message: error.response?.data?.error || "Failed to load history", 
        type: 'error', 
        isVisible: true 
      });
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (clubId) {
      fetchHistory();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, clubId]);

  const isActiveTab = (href: string) => pathname === href;

  return (
    <>
      <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-4 md:space-y-6">
        {/* Back Link */}
        <div>
          <Link href={`/admin/super/clubs/${clubId}`}>
            <Button variant="ghost" size="sm" className="gap-2 text-gray-600 hover:text-gray-900">
              <ArrowLeft className="h-4 w-4" /> Back to Club
            </Button>
          </Link>
        </div>

        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-[#121213]">Visits & Attendance</h1>
            <p className="text-sm md:text-base text-gray-500 mt-1">Archive of all check-ins and check-outs for this club.</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-100 overflow-x-auto">
          <nav className="flex space-x-4 md:space-x-8 min-w-max md:min-w-0">
            <Link 
              href={`/admin/super/clubs/${clubId}/visits`}
              className={`border-b-2 pb-3 md:pb-4 px-1 text-sm font-medium whitespace-nowrap -mb-px transition-colors ${
                isActiveTab(`/admin/super/clubs/${clubId}/visits`) 
                  ? 'border-[#4D4DA4] text-[#4D4DA4]' 
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Live Attendance
            </Link>
            <button className="border-b-2 border-[#4D4DA4] pb-3 md:pb-4 px-1 text-sm font-medium text-[#4D4DA4] -mb-px whitespace-nowrap">
              History Log
            </button>
            <Link 
              href={`/admin/super/clubs/${clubId}/visits/analytics`}
              className={`border-b-2 pb-3 md:pb-4 px-1 text-sm font-medium whitespace-nowrap -mb-px transition-colors ${
                isActiveTab(`/admin/super/clubs/${clubId}/visits/analytics`) 
                  ? 'border-[#4D4DA4] text-[#4D4DA4]' 
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Analytics
            </Link>
          </nav>
        </div>

        {/* FILTERS */}
        <Collapsible open={filtersExpanded} onOpenChange={setFiltersExpanded}>
          <Card className="border border-gray-100 shadow-sm">
            <CollapsibleTrigger asChild>
              <button className="flex items-center justify-between w-full p-3 md:p-4 hover:bg-gray-50/50 transition-colors">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 md:h-5 md:w-5 text-gray-600" />
                  <span className="text-sm font-semibold text-gray-700">Filters</span>
                </div>
                <ChevronDown className={`h-4 w-4 md:h-5 md:w-5 text-gray-600 transition-transform duration-200 ${filtersExpanded ? 'rotate-180' : ''}`} />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="border-t border-gray-100 p-3 md:p-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                  <div className="sm:col-span-2 lg:col-span-1">
                    <Label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">Search</Label>
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                      <Input 
                        type="text" 
                        placeholder="Search by name or email..." 
                        className="pl-9 bg-gray-50 border-gray-200"
                        value={searchParams.get('search') || ''} 
                        onChange={e => updateUrl('search', e.target.value)}
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">Start Date</Label>
                    <Input
                      type="date"
                      className="bg-gray-50 border-gray-200"
                      value={searchParams.get('start_date') || ''}
                      onChange={e => updateUrl('start_date', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">End Date</Label>
                    <Input
                      type="date"
                      className="bg-gray-50 border-gray-200"
                      value={searchParams.get('end_date') || ''}
                      onChange={e => updateUrl('end_date', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">Member Type</Label>
                    <select
                      className="flex h-10 w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4D4DA4]"
                      value={searchParams.get('guest_filter') || ''}
                      onChange={e => updateUrl('guest_filter', e.target.value)}
                    >
                      <option value="">All Members</option>
                      <option value="members">Preferred Members</option>
                      <option value="guests">Guests</option>
                    </select>
                  </div>
                </div>
                <div className="mt-3 md:mt-4 flex justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => router.push(pathname)}
                    className="text-gray-500 hover:text-red-600 hover:bg-red-50 gap-2"
                  >
                    <X className="h-4 w-4" /> Clear Filters
                  </Button>
                </div>
              </div>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* Content */}
        {loading ? (
          <div className="py-20 text-center text-gray-400 animate-pulse">Loading records...</div>
        ) : data.length === 0 ? (
          <div className="py-20 text-center bg-gray-50 rounded-xl border border-dashed border-gray-200">
            <p className="text-gray-500">No records found matching your filters.</p>
          </div>
        ) : (
          <>
            {/* MOBILE: Cards */}
            <div className="grid grid-cols-1 gap-3 md:hidden">
              {data.map((visit: any) => {
                const start = new Date(visit.check_in_at);
                const checkOutAt = visit.check_out_at;
                const hasCheckedOut = checkOutAt !== null && checkOutAt !== undefined && checkOutAt !== '';
                
                let duration: number | null = null;
                let end: Date | null = null;
                
                if (hasCheckedOut) {
                  try {
                    end = new Date(checkOutAt);
                    if (!isNaN(end.getTime())) {
                      const diffMs = end.getTime() - start.getTime();
                      duration = Math.max(0, Math.round(diffMs / 60000));
                    }
                  } catch (e) {
                    console.error('Error parsing check_out_at date:', e);
                  }
                }

                const isGuest = visit.is_guest === true;
                const userId = visit.user || visit.user_details?.id;
                const userName = `${visit.user_details?.first_name || ''} ${visit.user_details?.last_name || ''}`.trim() || 'Unknown User';
                
                return (
                  <Card 
                    key={visit.id} 
                    className={`overflow-hidden border-l-4 shadow-sm ${isGuest ? 'border-l-orange-400 bg-orange-50/30' : 'border-l-[#4D4DA4]'}`}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10 rounded-lg border border-gray-200 bg-gray-50 flex-shrink-0">
                          <AvatarImage src={getMediaUrl(visit.user_details?.avatar) || undefined} className="object-cover" />
                          <AvatarFallback className="rounded-lg font-bold text-xs bg-[#EBEBFE] text-[#4D4DA4]">
                            {userName[0]?.toUpperCase() || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          {userId ? (
                            <Link 
                              href={`/admin/super/youth/${userId}`}
                              className="font-semibold text-[#121213] hover:text-[#4D4DA4] hover:underline transition-colors block truncate"
                            >
                              {userName}
                            </Link>
                          ) : (
                            <CardTitle className="text-base font-semibold text-[#121213] truncate">{userName}</CardTitle>
                          )}
                          {isGuest && (
                            <Badge variant="outline" className="bg-orange-50 text-orange-800 border-orange-200 text-[10px] uppercase mt-1">
                              Guest
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2 pt-0">
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-xs text-gray-500">Date</span>
                          <div className="font-medium text-gray-900">{start.toLocaleDateString()}</div>
                        </div>
                        <div>
                          <span className="text-xs text-gray-500">Duration</span>
                          <div className="font-medium text-gray-900">
                            {duration !== null ? (
                              `${Math.floor(duration/60)}h ${duration%60}m`
                            ) : (
                              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">Active</Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="space-y-1 pt-2 border-t border-gray-100">
                        <div className="text-sm">
                          <span className="text-xs text-gray-500">Check-in:</span>
                          <span className="ml-2 text-[#4D4DA4] font-medium">{start.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                        </div>
                        {end && !isNaN(end.getTime()) && (
                          <div className="text-sm">
                            <span className="text-xs text-gray-500">Check-out:</span>
                            <span className="ml-2 text-gray-600">{end.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                          </div>
                        )}
                        <div className="pt-1">
                          <Badge variant="outline" className="bg-gray-50 text-gray-600 border-gray-200 text-xs">
                            {visit.method === 'QR_KIOSK' ? 'Self Scan' : visit.method}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* DESKTOP: Table */}
            <div className="hidden md:block rounded-xl border border-gray-100 bg-white overflow-hidden">
              <Table>
                <TableHeader className="bg-[#EBEBFE]/50">
                  <TableRow className="border-b border-gray-100 hover:bg-transparent">
                    <TableHead className="text-[#4D4DA4] font-semibold">Member</TableHead>
                    <TableHead className="text-[#4D4DA4] font-semibold">Date</TableHead>
                    <TableHead className="text-[#4D4DA4] font-semibold">In / Out</TableHead>
                    <TableHead className="text-[#4D4DA4] font-semibold">Duration</TableHead>
                    <TableHead className="text-[#4D4DA4] font-semibold">Method</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((visit: any) => {
                    const start = new Date(visit.check_in_at);
                    const checkOutAt = visit.check_out_at;
                    const hasCheckedOut = checkOutAt !== null && checkOutAt !== undefined && checkOutAt !== '';
                    
                    let duration: number | null = null;
                    let end: Date | null = null;
                    
                    if (hasCheckedOut) {
                      try {
                        end = new Date(checkOutAt);
                        if (!isNaN(end.getTime())) {
                          const diffMs = end.getTime() - start.getTime();
                          duration = Math.max(0, Math.round(diffMs / 60000));
                        }
                      } catch (e) {
                        console.error('Error parsing check_out_at date:', e);
                      }
                    }

                    const isGuest = visit.is_guest === true;
                    const userId = visit.user || visit.user_details?.id;
                    const userName = `${visit.user_details?.first_name || ''} ${visit.user_details?.last_name || ''}`.trim() || 'Unknown User';
                    
                    return (
                      <TableRow 
                        key={visit.id} 
                        className={`border-b border-gray-50 hover:bg-gray-50/50 transition-colors ${isGuest ? 'bg-orange-50/50 hover:bg-orange-100/50' : ''}`}
                      >
                        <TableCell className="py-4">
                          <div className="flex items-center gap-2">
                            <Avatar className="h-8 w-8 rounded-lg border border-gray-200 bg-gray-50">
                              <AvatarImage src={getMediaUrl(visit.user_details?.avatar) || undefined} className="object-cover" />
                              <AvatarFallback className="rounded-lg font-bold text-[10px] bg-[#EBEBFE] text-[#4D4DA4]">
                                {userName[0]?.toUpperCase() || 'U'}
                              </AvatarFallback>
                            </Avatar>
                            {userId ? (
                              <Link 
                                href={`/admin/super/youth/${userId}`}
                                className="font-semibold text-[#121213] hover:text-[#4D4DA4] hover:underline transition-colors"
                              >
                                {userName}
                              </Link>
                            ) : (
                              <span className="font-semibold text-[#121213]">{userName}</span>
                            )}
                            {isGuest && (
                              <Badge variant="outline" className="bg-orange-50 text-orange-800 border-orange-200 text-[10px] uppercase">
                                Guest
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="py-4 text-gray-600">
                          {start.toLocaleDateString()}
                        </TableCell>
                        <TableCell className="py-4">
                          <div className="text-[#4D4DA4] font-medium">IN: {start.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</div>
                          {end && !isNaN(end.getTime()) && (
                            <div className="text-gray-500 text-sm">OUT: {end.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</div>
                          )}
                        </TableCell>
                        <TableCell className="py-4 text-gray-600">
                          {duration !== null ? (
                            `${Math.floor(duration/60)}h ${duration%60}m`
                          ) : (
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Active</Badge>
                          )}
                        </TableCell>
                        <TableCell className="py-4">
                          <Badge variant="outline" className="bg-gray-50 text-gray-600 border-gray-200 text-xs">
                            {visit.method === 'QR_KIOSK' ? 'Self Scan' : visit.method}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </div>

      {/* Toast Notification */}
      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={() => setToast({ ...toast, isVisible: false })}
      />
    </>
  );
}

