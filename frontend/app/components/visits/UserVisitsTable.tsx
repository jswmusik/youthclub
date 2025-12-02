'use client';

import { VisitSession } from '@/types/visit';
import { getMediaUrl } from '@/app/utils';

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

  return (
    <>
      {/* LIST */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? <div className="p-8 text-center">Loading...</div> : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Club</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Check In</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Check Out</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Duration</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {visits.map((visit) => {
                // Highlight Logic: If visited club != preferred club
                // Only apply if preferredClubId is known (not null)
                const isAway = preferredClubId && visit.club !== preferredClubId;
                
                return (
                  <tr 
                    key={visit.id} 
                    className={`hover:bg-gray-50 ${isAway ? 'bg-orange-50' : ''}`}
                  >
                    <td className="px-6 py-4">
                      <div className="font-bold text-gray-900">{formatDate(visit.check_in_at)}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {visit.club_avatar && (
                          <img 
                            src={getMediaUrl(visit.club_avatar) || ''} 
                            className="w-10 h-10 rounded-full object-cover"
                            alt="" 
                          />
                        )}
                        <div>
                          <div className={`font-bold ${isAway ? 'text-orange-900' : 'text-gray-900'}`}>
                            {visit.club_name}
                          </div>
                          {isAway && (
                            <span className="text-xs text-orange-600 font-semibold">Guest Visit</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {formatTime(visit.check_in_at)}
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {visit.check_out_at ? formatTime(visit.check_out_at) : '-'}
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {calculateDuration(visit.check_in_at, visit.check_out_at)}
                    </td>
                    <td className="px-6 py-4">
                      {visit.check_out_at ? (
                        <span className={`px-2 py-1 rounded text-xs font-bold bg-gray-100 text-gray-800`}>
                          Completed
                        </span>
                      ) : (
                        <span className={`px-2 py-1 rounded text-xs font-bold bg-green-100 text-green-800`}>
                          Active
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {visits.length === 0 && (
                <tr><td colSpan={6} className="p-8 text-center text-gray-500">No visits found for this period.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6 rounded-lg shadow">
          <div className="flex flex-1 justify-between sm:hidden">
            <button 
              disabled={page === 1}
              onClick={() => onPageChange(page - 1)}
              className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Previous
            </button>
            <button 
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
              className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Next
            </button>
          </div>
          <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Showing page <span className="font-medium">{page}</span> of <span className="font-medium">{totalPages}</span>
                {' '}(Total: {totalCount})
              </p>
            </div>
            <div>
              <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                <button
                  disabled={page === 1}
                  onClick={() => onPageChange(page - 1)}
                  className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                >
                  <span className="sr-only">Previous</span>
                  ← Prev
                </button>
                
                {/* Simple Pagination Numbers */}
                {[...Array(totalPages)].map((_, i) => {
                  const p = i + 1;
                  return (
                    <button
                      key={p}
                      onClick={() => onPageChange(p)}
                      className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold 
                        ${p === page 
                          ? 'bg-blue-600 text-white focus:z-20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600' 
                          : 'text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0'}`}
                    >
                      {p}
                    </button>
                  );
                })}

                <button
                  disabled={page >= totalPages}
                  onClick={() => onPageChange(page + 1)}
                  className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                >
                  <span className="sr-only">Next</span>
                  Next →
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

