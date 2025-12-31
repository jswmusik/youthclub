'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams, usePathname, useParams } from 'next/navigation';
import { visits } from '@/lib/api';
import { useToast } from '../../../../../../../hooks/useToast';
import Link from 'next/link';
import { Search, X, Clock, LogIn, LogOut, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getMediaUrl } from '@/app/utils';
import VisitsTabs from '@/app/components/visits/VisitsTabs';
import BackButton from '@/app/components/BackButton';

export default function MunicipalityClubVisitHistoryPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const params = useParams();
  const clubId = params?.id as string;
  
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const { success, error, info, warning } = useToast();

  const updateUrl = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value); else params.delete(key);
    if (key !== 'page') params.set('page', '1');
    router.push(`${pathname}?${params.toString()}`);
  };

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const params: { search?: string; start_date?: string; end_date?: string; club_id?: string | number; page?: number } = {};
      const search = searchParams.get('search') || '';
      const startDate = searchParams.get('start_date') || '';
      const endDate = searchParams.get('end_date') || '';
      const guestFilter = searchParams.get('guest_filter') || '';
      const page = Number(searchParams.get('page')) || 1;
      
      if (search && search.trim()) params.search = search.trim();
      if (startDate && startDate.trim()) params.start_date = startDate.trim();
      if (endDate && endDate.trim()) params.end_date = endDate.trim();
      if (clubId) params.club_id = clubId; // Filter by current club
      if (page > 1) params.page = page;
      
      const res = await visits.getHistory(params);
      let visitsData = res.data.results || res.data || [];
      const count = Array.isArray(res.data) ? visitsData.length : (res.data.count || visitsData.length);
      
      // Client-side filtering for guest status
      if (guestFilter === 'guests') {
        visitsData = visitsData.filter((visit: any) => visit.is_guest === true);
      } else if (guestFilter === 'members') {
        visitsData = visitsData.filter((visit: any) => visit.is_guest === false);
      }
      
      setData(visitsData);
      setTotalCount(count);
      } catch (error: any) {
      error(error.response?.data?.error || "Failed to load history");
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

  // Helper function to convert method to readable name
  const getMethodName = (method: string) => {
    switch (method) {
      case 'QR_KIOSK':
        return 'QR Kiosk Scan';
      case 'MANUAL_ADMIN':
        return 'Manual Admin Entry';
      case 'MANUAL_SELF':
        return 'Manual Self Check-in';
      default:
        return method || '-';
    }
  };

  // Helper function to get user initials
  const getInitials = (first?: string | null, last?: string | null) => {
    const firstInitial = first?.charAt(0)?.toUpperCase() || '';
    const lastInitial = last?.charAt(0)?.toUpperCase() || '';
    return firstInitial + lastInitial || 'U';
  };
  
  // Pagination logic
  const currentPage = Number(searchParams.get('page')) || 1;
  const pageSize = 10;
  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <>
      <div className="p-8 max-w-7xl mx-auto space-y-6">
        {/* Back Link */}
        <div>
          <BackButton href={`/admin/municipality/clubs/${clubId}`} label="Back to Club" />
        </div>

        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-[#121213]">Visits & Attendance</h1>
            <p className="text-gray-500 mt-1">Archive of all check-ins and check-outs for this club.</p>
          </div>
        </div>

        {/* Tabs */}
        <VisitsTabs clubId={clubId} basePath="/admin/municipality/clubs" />

        {/* FILTERS */}
        <Card className="border border-gray-100 shadow-sm bg-white">
          <div className="px-6 py-4 space-y-4">
            {/* Main Filters Row */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
              {/* Search */}
              <div className="relative md:col-span-4 lg:col-span-3">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                <Input 
                  placeholder="Search by name or email..." 
                  className="pl-9 bg-gray-50 border-0"
                  value={searchParams.get('search') || ''}
                  onChange={e => updateUrl('search', e.target.value)}
                />
              </div>
              
              {/* Start Date */}
              <div className="md:col-span-2 lg:col-span-2">
                <Input
                  type="date"
                  className="h-9 bg-gray-50 border-0"
                  value={searchParams.get('start_date') || ''}
                  onChange={e => updateUrl('start_date', e.target.value)}
                />
              </div>
              
              {/* End Date */}
              <div className="md:col-span-2 lg:col-span-2">
                <Input
                  type="date"
                  className="h-9 bg-gray-50 border-0"
                  value={searchParams.get('end_date') || ''}
                  onChange={e => updateUrl('end_date', e.target.value)}
                />
              </div>
              
              {/* Member Type */}
              <div className="md:col-span-2 lg:col-span-2">
                <select 
                  className="flex h-9 w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#4D4DA4]"
                  value={searchParams.get('guest_filter') || ''}
                  onChange={e => updateUrl('guest_filter', e.target.value)}
                >
                  <option value="">All Members</option>
                  <option value="members">Preferred Members</option>
                  <option value="guests">Guests</option>
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

        {/* Table */}
        {loading ? (
          <Card className="border border-gray-100 shadow-sm">
            <div className="py-20 flex justify-center text-gray-400">
              <div className="animate-pulse">Loading records...</div>
            </div>
          </Card>
        ) : data.length === 0 ? (
          <Card className="border border-gray-100 shadow-sm">
            <div className="py-20 text-center">
              <p className="text-gray-500">No records found matching your filters.</p>
            </div>
          </Card>
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
                
                return (
                  <Card key={visit.id} className={`overflow-hidden border-l-4 ${isGuest ? 'border-l-orange-400' : 'border-l-[#4D4DA4]'} shadow-sm`}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <Avatar className="h-10 w-10 rounded-lg border border-gray-200 flex-shrink-0">
                          <AvatarImage src={getMediaUrl(visit.user_details?.avatar) || undefined} className="object-cover" />
                          <AvatarFallback className="rounded-lg font-bold text-xs bg-[#EBEBFE] text-[#4D4DA4]">
                            {getInitials(visit.user_details?.first_name, visit.user_details?.last_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0 space-y-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            {userId ? (
                              <Link 
                                href={`/admin/municipality/youth/${userId}`}
                                className="font-semibold text-[#121213] hover:text-[#4D4DA4] hover:underline transition-colors truncate"
                              >
                                {visit.user_details?.first_name} {visit.user_details?.last_name}
                              </Link>
                            ) : (
                              <span className="font-semibold text-[#121213]">{visit.user_details?.first_name} {visit.user_details?.last_name}</span>
                            )}
                            {isGuest && (
                              <Badge variant="outline" className="text-[10px] bg-orange-50 text-orange-700 border-orange-300">
                                Guest
                              </Badge>
                            )}
                          </div>
                          <div className="space-y-1.5 text-sm">
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-gray-500 uppercase font-semibold">Date</span>
                              <span className="text-gray-600">{start.toLocaleDateString()}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-gray-500 uppercase font-semibold">Check-in</span>
                              <div className="flex items-center gap-1 text-[#10B981]">
                                <LogIn className="h-3 w-3" />
                                <span className="text-sm font-medium">{start.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                              </div>
                            </div>
                            {end && !isNaN(end.getTime()) && (
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-gray-500 uppercase font-semibold">Check-out</span>
                                <div className="flex items-center gap-1 text-gray-500">
                                  <LogOut className="h-3 w-3" />
                                  <span className="text-sm">{end.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                                </div>
                              </div>
                            )}
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-gray-500 uppercase font-semibold">Duration</span>
                              {duration !== null ? (
                                <div className="flex items-center gap-1 text-gray-600">
                                  <Clock className="h-3 w-3" />
                                  <span className="text-sm font-medium">{Math.floor(duration/60)}h {duration%60}m</span>
                                </div>
                              ) : (
                                <Badge variant="outline" className="bg-[#10B981]/10 text-[#10B981] border-[#10B981]/30 text-xs">
                                  Active
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-gray-500 uppercase font-semibold">Method</span>
                              <span className="text-sm text-gray-600">{getMethodName(visit.method)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* DESKTOP: Table */}
            <Card className="hidden md:block border border-gray-100 shadow-sm bg-white overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-gray-100 hover:bg-transparent">
                    <TableHead className="h-12 px-6 text-gray-600 font-semibold">Member</TableHead>
                    <TableHead className="h-12 px-6 text-gray-600 font-semibold">Date</TableHead>
                    <TableHead className="h-12 px-6 text-gray-600 font-semibold">In / Out</TableHead>
                    <TableHead className="h-12 px-6 text-gray-600 font-semibold">Duration</TableHead>
                    <TableHead className="h-12 px-6 text-gray-600 font-semibold">Method</TableHead>
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
                    
                    return (
                      <TableRow 
                        key={visit.id} 
                        className={`border-b border-gray-50 hover:bg-gray-50/50 transition-colors ${isGuest ? 'bg-orange-50/50' : ''}`}
                      >
                        <TableCell className="py-4 px-6">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9 rounded-lg border border-gray-200">
                              <AvatarImage src={getMediaUrl(visit.user_details?.avatar) || undefined} className="object-cover" />
                              <AvatarFallback className="rounded-lg font-bold text-xs bg-[#EBEBFE] text-[#4D4DA4]">
                                {getInitials(visit.user_details?.first_name, visit.user_details?.last_name)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex items-center gap-2">
                              {userId ? (
                                <Link 
                                  href={`/admin/municipality/youth/${userId}`}
                                  className="font-semibold text-[#121213] hover:text-[#4D4DA4] hover:underline transition-colors"
                                >
                                  {visit.user_details?.first_name} {visit.user_details?.last_name}
                                </Link>
                              ) : (
                                <span className="font-semibold text-[#121213]">{visit.user_details?.first_name} {visit.user_details?.last_name}</span>
                              )}
                              {isGuest && (
                                <Badge variant="outline" className="text-[10px] bg-orange-50 text-orange-700 border-orange-300">
                                  Guest
                                </Badge>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="py-4 px-6 text-gray-600">
                          {start.toLocaleDateString()}
                        </TableCell>
                        <TableCell className="py-4 px-6">
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1 text-[#10B981]">
                              <LogIn className="h-3 w-3" />
                              <span className="text-sm font-medium">{start.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                            </div>
                            {end && !isNaN(end.getTime()) && (
                              <div className="flex items-center gap-1 text-gray-500">
                                <LogOut className="h-3 w-3" />
                                <span className="text-sm">{end.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="py-4 px-6">
                          {duration !== null ? (
                            <div className="flex items-center gap-1 text-gray-600">
                              <Clock className="h-3 w-3" />
                              <span className="text-sm font-medium">{Math.floor(duration/60)}h {duration%60}m</span>
                            </div>
                          ) : (
                            <Badge variant="outline" className="bg-[#10B981]/10 text-[#10B981] border-[#10B981]/30">
                              Active
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="py-4 px-6 text-sm text-gray-600">
                          {getMethodName(visit.method)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Card>

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

      {/* Toast Notification */}
    </>
  );
}

