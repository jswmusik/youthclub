'use client';

import { useState, useEffect } from 'react';

interface Props {
  onFilter: (filters: { start_date?: string; end_date?: string; club_id?: string }) => void;
  showClubFilter?: boolean;
  clubs?: { id: number; name: string }[];
  initialStartDate?: string;
  initialEndDate?: string;
  initialClubId?: string;
}

export default function UserVisitsFilter({ 
  onFilter, 
  showClubFilter, 
  clubs = [],
  initialStartDate,
  initialEndDate,
  initialClubId
}: Props) {
  const [startDate, setStartDate] = useState(initialStartDate || '');
  const [endDate, setEndDate] = useState(initialEndDate || '');
  const [clubId, setClubId] = useState(initialClubId || '');

  // Update state when initial values change (e.g., from URL)
  useEffect(() => {
    setStartDate(initialStartDate || '');
    setEndDate(initialEndDate || '');
    setClubId(initialClubId || '');
  }, [initialStartDate, initialEndDate, initialClubId]);

  // Auto-apply filters on change (matching YouthManager behavior)
  // Only apply if values differ from initial values
  useEffect(() => {
    const hasChanged = 
      startDate !== (initialStartDate || '') ||
      endDate !== (initialEndDate || '') ||
      clubId !== (initialClubId || '');

    if (hasChanged) {
      const timer = setTimeout(() => {
        onFilter({
          start_date: startDate || undefined,
          end_date: endDate || undefined,
          club_id: clubId || undefined
        });
      }, 500); // Debounce to avoid too many updates

      return () => clearTimeout(timer);
    }
  }, [startDate, endDate, clubId, initialStartDate, initialEndDate, initialClubId]);

  const handleClear = () => {
    setStartDate('');
    setEndDate('');
    setClubId('');
    onFilter({});
  };

  return (
    <div className="flex flex-wrap gap-4 items-end">
      <div className="w-40">
        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">From Date</label>
        <input 
          type="date" 
          className="w-full border rounded p-2 text-sm bg-gray-50"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
        />
      </div>
      
      <div className="w-40">
        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">To Date</label>
        <input 
          type="date" 
          className="w-full border rounded p-2 text-sm bg-gray-50"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
        />
      </div>

      {showClubFilter && (
        <div className="w-48">
          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Club</label>
          <select
            className="w-full border rounded p-2 text-sm bg-gray-50"
            value={clubId}
            onChange={(e) => setClubId(e.target.value)}
          >
            <option value="">All Clubs</option>
            {clubs.map(club => (
              <option key={club.id} value={club.id.toString()}>{club.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Clear Filters */}
      <button
        onClick={handleClear}
        className="px-4 py-2 text-sm text-gray-500 hover:text-red-500 font-medium"
      >
        Clear Filters
      </button>
    </div>
  );
}

