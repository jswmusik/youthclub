'use client';

import { useState, useEffect } from 'react';
import api from '../../../../lib/api';
import { formatDistanceToNow, format } from 'date-fns';
import BookingDetailModal from './BookingDetailModal';
import { Users, ChevronLeft, ChevronRight, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getMediaUrl, getInitials } from '@/app/utils';

// Accept scope prop
export default function BookingRequestList({ scope }: { scope?: 'CLUB' | 'MUNICIPALITY' | 'SUPER' }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  
  // Filter State
  const [clubs, setClubs] = useState<any[]>([]);
  const [selectedClub, setSelectedClub] = useState('');
  const [resources, setResources] = useState<any[]>([]);
  const [selectedResource, setSelectedResource] = useState('');
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const pageSize = 10;

  // Fetch clubs and resources
  useEffect(() => {
    if (scope === 'MUNICIPALITY' || scope === 'SUPER') {
      api.get('/clubs/?page_size=100').then(res => {
        setClubs(Array.isArray(res.data) ? res.data : res.data.results || []);
      });
    }
    
    // Fetch resources for filter
    api.get('/bookings/resources/?page_size=100').then(res => {
      setResources(Array.isArray(res.data) ? res.data : res.data.results || []);
    }).catch(err => console.error('Failed to load resources', err));
  }, [scope]);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('status', 'PENDING');
      params.set('page', currentPage.toString());
      params.set('page_size', pageSize.toString());
      
      if (selectedClub) params.set('club', selectedClub);
      if (selectedResource) params.set('resource', selectedResource);
      
      const res = await api.get(`/bookings/bookings/?${params.toString()}`);
      const data = res.data;
      
      setRequests(Array.isArray(data) ? data : data.results || []);
      
      // Update pagination info
      if (data.count !== undefined) {
        setTotalCount(data.count);
        setTotalPages(Math.ceil(data.count / pageSize));
      } else {
        // If no pagination info, assume all results fit on one page
        const results = Array.isArray(data) ? data : data.results || [];
        setTotalCount(results.length);
        setTotalPages(1);
      }
    } catch (err) {
      console.error(err);
      setRequests([]);
      setTotalCount(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  // Re-fetch when filters or page changes
  useEffect(() => {
    setCurrentPage(1); // Reset to first page when filters change
  }, [selectedClub, selectedResource]);

  useEffect(() => {
    fetchRequests();
  }, [currentPage, selectedClub, selectedResource]);

  const getParticipantCount = (participants: any[]) => {
    if (!participants || participants.length === 0) return 1; // Just the user themselves
    return participants.length + 1; // User + participants
  };

  const clearFilters = () => {
    setSelectedClub('');
    setSelectedResource('');
  };

  return (
    <Card className="border border-gray-100 shadow-sm bg-white overflow-hidden">
      {/* Header */}
      <CardHeader className="border-b border-gray-100 bg-gray-50/50">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <CardTitle className="text-lg sm:text-xl font-bold text-[#121213]">Pending Requests</CardTitle>
            <Badge className="bg-[#EBEBFE] text-[#4D4DA4] text-xs font-semibold">
              {totalCount}
            </Badge>
          </div>

          <div className="flex flex-wrap gap-3">
            {/* Resource Filter */}
            <select 
              className="flex h-9 rounded-md border border-gray-200 bg-gray-50 px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#4D4DA4] min-w-[180px]"
              value={selectedResource}
              onChange={e => setSelectedResource(e.target.value)}
            >
              <option value="">All Resources</option>
              {resources.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>

            {/* Club Filter for High-Level Admins */}
            {(scope === 'MUNICIPALITY' || scope === 'SUPER') && (
              <select 
                className="flex h-9 rounded-md border border-gray-200 bg-gray-50 px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#4D4DA4] min-w-[150px]"
                value={selectedClub}
                onChange={e => setSelectedClub(e.target.value)}
              >
                <option value="">All Clubs</option>
                {clubs.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            )}

            {/* Clear Filters Button */}
            {(selectedClub || selectedResource) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="h-9 text-gray-500 hover:text-red-600 hover:bg-red-50 gap-2"
              >
                <X className="h-4 w-4" /> Clear
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      {/* Table */}
      <CardContent className="p-0">
        {loading && requests.length === 0 ? (
          <div className="p-12 text-center text-gray-400">Loading requests...</div>
        ) : requests.length === 0 ? (
          <div className="p-12 text-center text-gray-500">No pending requests 🎉</div>
        ) : (
          <>
            {/* Mobile: Cards */}
            <div className="block md:hidden divide-y divide-gray-100">
              {requests.map((req: any) => {
                const startDate = new Date(req.start_time);
                const endDate = new Date(req.end_time);
                const participantCount = getParticipantCount(req.participants || []);
                
                return (
                  <div
                    key={req.id}
                    className="p-4 space-y-3 cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => setSelectedBooking(req)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <Avatar className="h-10 w-10 rounded-full border border-gray-200 bg-gray-50 flex-shrink-0">
                          <AvatarImage src={req.user_detail?.avatar ? getMediaUrl(req.user_detail.avatar) : undefined} className="object-cover" />
                          <AvatarFallback className="rounded-full font-bold text-xs bg-[#EBEBFE] text-[#4D4DA4]">
                            {getInitials(req.user_detail?.first_name, req.user_detail?.last_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-semibold text-[#121213] truncate">
                            {req.user_detail?.first_name} {req.user_detail?.last_name}
                          </div>
                          <div className="text-xs text-gray-500 truncate">
                            {req.user_detail?.email}
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedBooking(req);
                        }}
                        className="h-8 text-[#4D4DA4] hover:text-[#FF5485] hover:bg-[#EBEBFE] flex-shrink-0"
                      >
                        Review
                      </Button>
                    </div>
                    <div className="space-y-2 pl-13">
                      <div className="text-sm">
                        <span className="text-gray-500">Resource: </span>
                        <span className="font-medium text-[#121213]">{req.resource_name}</span>
                      </div>
                      {scope !== 'CLUB' && req.club_name && (
                        <div className="text-sm">
                          <span className="text-gray-500">Club: </span>
                          <span className="font-medium text-[#121213]">{req.club_name}</span>
                        </div>
                      )}
                      <div className="text-sm">
                        <span className="text-gray-500">Date: </span>
                        <span className="font-medium text-[#121213]">{format(startDate, 'MMM d, yyyy')}</span>
                      </div>
                      <div className="text-sm">
                        <span className="text-gray-500">Time: </span>
                        <span className="font-medium text-[#121213]">
                          {format(startDate, 'HH:mm')} - {format(endDate, 'HH:mm')}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Users className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-500">Guests: </span>
                        <span className="font-medium text-[#121213]">{participantCount}</span>
                      </div>
                      <div className="text-xs text-gray-500">
                        Requested {formatDistanceToNow(new Date(req.created_at))} ago
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop: Table */}
            <Table className="hidden md:table">
              <TableHeader>
                <TableRow className="border-b border-gray-100 hover:bg-transparent">
                  <TableHead className="h-12 text-gray-600 font-semibold">User</TableHead>
                  <TableHead className="h-12 text-gray-600 font-semibold">Resource</TableHead>
                  {scope !== 'CLUB' && (
                    <TableHead className="h-12 text-gray-600 font-semibold">Club</TableHead>
                  )}
                  <TableHead className="h-12 text-gray-600 font-semibold">Date</TableHead>
                  <TableHead className="h-12 text-gray-600 font-semibold">Time</TableHead>
                  <TableHead className="h-12 text-gray-600 font-semibold">Guests</TableHead>
                  <TableHead className="h-12 text-gray-600 font-semibold">Requested</TableHead>
                  <TableHead className="h-12 text-gray-600 font-semibold text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((req: any) => {
                  const startDate = new Date(req.start_time);
                  const endDate = new Date(req.end_time);
                  const participantCount = getParticipantCount(req.participants || []);
                  
                  return (
                    <TableRow
                      key={req.id}
                      className="hover:bg-gray-50/50 cursor-pointer transition-colors"
                      onClick={() => setSelectedBooking(req)}
                    >
                      <TableCell className="px-4 sm:px-6 py-3 sm:py-4">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8 rounded-full border border-gray-200 bg-gray-50">
                            <AvatarImage src={req.user_detail?.avatar ? getMediaUrl(req.user_detail.avatar) : undefined} className="object-cover" />
                            <AvatarFallback className="rounded-full font-bold text-xs bg-[#EBEBFE] text-[#4D4DA4]">
                              {getInitials(req.user_detail?.first_name, req.user_detail?.last_name)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="text-sm font-semibold text-[#121213]">
                              {req.user_detail?.first_name} {req.user_detail?.last_name}
                            </div>
                            <div className="text-xs text-gray-500">
                              {req.user_detail?.email}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="px-4 sm:px-6 py-3 sm:py-4">
                        <div className="text-sm font-medium text-[#121213]">{req.resource_name}</div>
                      </TableCell>
                      {scope !== 'CLUB' && (
                        <TableCell className="px-4 sm:px-6 py-3 sm:py-4">
                          {req.club_name ? (
                            <span className="text-sm text-[#121213]">{req.club_name}</span>
                          ) : (
                            <span className="text-sm text-gray-400">—</span>
                          )}
                        </TableCell>
                      )}
                      <TableCell className="px-4 sm:px-6 py-3 sm:py-4">
                        <div className="text-sm text-[#121213]">{format(startDate, 'MMM d, yyyy')}</div>
                      </TableCell>
                      <TableCell className="px-4 sm:px-6 py-3 sm:py-4">
                        <div className="text-sm text-[#121213]">
                          {format(startDate, 'HH:mm')} - {format(endDate, 'HH:mm')}
                        </div>
                      </TableCell>
                      <TableCell className="px-4 sm:px-6 py-3 sm:py-4">
                        <div className="flex items-center gap-1.5 text-sm text-[#121213]">
                          <Users className="w-4 h-4 text-gray-400" />
                          <span>{participantCount}</span>
                        </div>
                      </TableCell>
                      <TableCell className="px-4 sm:px-6 py-3 sm:py-4">
                        <div className="text-xs text-gray-500">
                          {formatDistanceToNow(new Date(req.created_at))} ago
                        </div>
                      </TableCell>
                      <TableCell className="px-4 sm:px-6 py-3 sm:py-4 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedBooking(req);
                          }}
                          className="h-8 text-[#4D4DA4] hover:text-[#FF5485] hover:bg-[#EBEBFE]"
                        >
                          Review
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </>
        )}
      </CardContent>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6">
          <div className="flex flex-1 justify-between sm:hidden">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={currentPage === 1}
              className="gap-2"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={currentPage >= totalPages}
              className="gap-2"
            >
              Next
              <ChevronRight className="h-4 w-4" />
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
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 1}
                className="gap-2"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              {/* Page Numbers */}
              {[...Array(Math.min(totalPages, 5))].map((_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                
                return (
                  <Button
                    key={pageNum}
                    variant={pageNum === currentPage ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentPage(pageNum)}
                    className={pageNum === currentPage 
                      ? 'bg-[#4D4DA4] hover:bg-[#FF5485] text-white' 
                      : ''}
                  >
                    {pageNum}
                  </Button>
                );
              })}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage >= totalPages}
                className="gap-2"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {selectedBooking && (
        <BookingDetailModal 
          booking={selectedBooking} 
          onClose={() => setSelectedBooking(null)}
          onUpdate={fetchRequests}
        />
      )}
    </Card>
  );
}

