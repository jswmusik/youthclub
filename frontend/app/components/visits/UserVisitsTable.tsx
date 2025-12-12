'use client';

import { VisitSession } from '@/types/visit';
import { getMediaUrl } from '@/app/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';

interface Props {
  visits: VisitSession[];
  preferredClubId?: number | null;
  loading: boolean;
  page: number;
  totalCount: number;
  onPageChange: (newPage: number) => void;
}

export default function UserVisitsTable({ 
  visits, 
  preferredClubId, 
  loading, 
  page, 
  totalCount,
  onPageChange 
}: Props) {
  // Pagination logic
  const pageSize = 10;
  const totalPages = Math.ceil(totalCount / pageSize);
  
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('sv-SE', {
      year: 'numeric', month: 'short', day: 'numeric'
    });
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('sv-SE', {
      hour: '2-digit', minute: '2-digit'
    });
  };

  const calculateDuration = (start: string, end?: string | null) => {
    if (!end) return 'Active';
    const diff = new Date(end).getTime() - new Date(start).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  if (loading) {
    return (
      <Card className="border border-gray-100 shadow-sm bg-white overflow-hidden">
        <div className="p-8 text-center text-gray-400 animate-pulse">Loading visits...</div>
      </Card>
    );
  }

  return (
    <>
      {/* Desktop Table */}
      <Card className="hidden md:block border border-gray-100 shadow-sm bg-white overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-gray-100 hover:bg-transparent">
              <TableHead className="h-12 text-gray-600 font-semibold">Club</TableHead>
              <TableHead className="h-12 text-gray-600 font-semibold">Date</TableHead>
              <TableHead className="h-12 text-gray-600 font-semibold">Check In</TableHead>
              <TableHead className="h-12 text-gray-600 font-semibold">Check Out</TableHead>
              <TableHead className="h-12 text-gray-600 font-semibold">Duration</TableHead>
              <TableHead className="h-12 text-gray-600 font-semibold">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visits.map((visit) => {
              // Highlight Logic: If visited club != preferred club
              // Only apply if preferredClubId is known (not null)
              const isGuestVisit = preferredClubId && visit.club !== preferredClubId;
              
              return (
                <TableRow 
                  key={visit.id} 
                  className={`border-b border-gray-50 hover:bg-gray-50/50 transition-colors ${isGuestVisit ? 'bg-orange-50/50 hover:bg-orange-50' : ''}`}
                >
                  <TableCell className="py-4">
                    <div className="flex items-center gap-3">
                      {visit.club_avatar && (
                        <Avatar className="h-9 w-9 rounded-lg border border-gray-200 bg-gray-50">
                          <AvatarImage src={getMediaUrl(visit.club_avatar) || undefined} className="object-cover" />
                          <AvatarFallback className="rounded-lg font-bold text-xs bg-[#EBEBFE] text-[#4D4DA4]">
                            {visit.club_name?.charAt(0)?.toUpperCase() || 'C'}
                          </AvatarFallback>
                        </Avatar>
                      )}
                      <div>
                        <div className={`font-semibold ${isGuestVisit ? 'text-orange-700' : 'text-[#121213]'}`}>
                          {visit.club_name}
                        </div>
                        {isGuestVisit && (
                          <Badge variant="outline" className="text-xs bg-orange-50 text-orange-700 border-orange-200 mt-1">
                            Guest Visit
                          </Badge>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="py-4">
                    <div className="font-semibold text-[#121213]">{formatDate(visit.check_in_at)}</div>
                  </TableCell>
                  <TableCell className="py-4 text-gray-600">
                    {formatTime(visit.check_in_at)}
                  </TableCell>
                  <TableCell className="py-4 text-gray-600">
                    {visit.check_out_at ? formatTime(visit.check_out_at) : '-'}
                  </TableCell>
                  <TableCell className="py-4 text-gray-600">
                    {calculateDuration(visit.check_in_at, visit.check_out_at)}
                  </TableCell>
                  <TableCell className="py-4">
                    {visit.check_out_at ? (
                      <Badge variant="outline" className="bg-gray-50 text-gray-800 border-gray-200">
                        Completed
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        Active
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
            {visits.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="p-8 text-center text-gray-500">
                  No visits found for this period.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-3">
        {visits.map((visit) => {
          const isGuestVisit = preferredClubId && visit.club !== preferredClubId;
          
          return (
            <Card key={visit.id} className={`border border-gray-100 shadow-sm ${isGuestVisit ? 'bg-orange-50/50' : 'bg-white'}`}>
              <div className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {visit.club_avatar && (
                        <Avatar className="h-8 w-8 rounded-lg border border-gray-200 bg-gray-50">
                          <AvatarImage src={getMediaUrl(visit.club_avatar) || undefined} className="object-cover" />
                          <AvatarFallback className="rounded-lg font-bold text-xs bg-[#EBEBFE] text-[#4D4DA4]">
                            {visit.club_name?.charAt(0)?.toUpperCase() || 'C'}
                          </AvatarFallback>
                        </Avatar>
                      )}
                      <div>
                        <div className={`font-semibold text-sm ${isGuestVisit ? 'text-orange-700' : 'text-[#121213]'}`}>
                          {visit.club_name}
                        </div>
                        {isGuestVisit && (
                          <Badge variant="outline" className="text-xs bg-orange-50 text-orange-700 border-orange-200 mt-1">
                            Guest Visit
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="font-semibold text-[#121213] text-sm">{formatDate(visit.check_in_at)}</div>
                  </div>
                  <div>
                    {visit.check_out_at ? (
                      <Badge variant="outline" className="bg-gray-50 text-gray-800 border-gray-200">
                        Completed
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        Active
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-100">
                  <div>
                    <div className="text-xs text-gray-500 uppercase font-semibold">Check In</div>
                    <div className="text-sm text-gray-700">{formatTime(visit.check_in_at)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 uppercase font-semibold">Check Out</div>
                    <div className="text-sm text-gray-700">{visit.check_out_at ? formatTime(visit.check_out_at) : '-'}</div>
                  </div>
                  <div className="col-span-2">
                    <div className="text-xs text-gray-500 uppercase font-semibold">Duration</div>
                    <div className="text-sm text-gray-700">{calculateDuration(visit.check_in_at, visit.check_out_at)}</div>
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
        {visits.length === 0 && (
          <Card className="border border-gray-100 shadow-sm bg-white">
            <div className="p-8 text-center text-gray-500">No visits found for this period.</div>
          </Card>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 py-4">
          <Button 
            variant="outline" 
            size="sm" 
            disabled={page === 1} 
            onClick={() => onPageChange(page - 1)}
            className="text-gray-600 hover:text-gray-900 hover:bg-gray-50"
          >
            Prev
          </Button>
          <div className="text-sm text-gray-500">Page {page} of {totalPages}</div>
          <Button 
            variant="outline" 
            size="sm" 
            disabled={page >= totalPages} 
            onClick={() => onPageChange(page + 1)}
            className="text-gray-600 hover:text-gray-900 hover:bg-gray-50"
          >
            Next
          </Button>
        </div>
      )}
    </>
  );
}
