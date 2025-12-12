'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

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
  const router = useRouter();
  const pathname = usePathname();
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
    router.push(pathname);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
      {/* Start Date */}
      <div className="md:col-span-3 lg:col-span-3">
        <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">From Date</label>
        <Input 
          type="date" 
          className="bg-gray-50 border-0"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
        />
      </div>
      
      {/* End Date */}
      <div className="md:col-span-3 lg:col-span-3">
        <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">To Date</label>
        <Input 
          type="date" 
          className="bg-gray-50 border-0"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
        />
      </div>

      {/* Club Filter */}
      {showClubFilter && (
        <div className="md:col-span-4 lg:col-span-4">
          <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">Club</label>
          <select
            className="flex h-9 w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#4D4DA4]"
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

      {/* Clear Button */}
      <div className={cn("md:col-span-2", showClubFilter ? "lg:col-span-2" : "lg:col-span-3")}>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClear}
          className="w-full text-gray-500 hover:text-red-600 hover:bg-red-50 gap-2"
        >
          <X className="h-4 w-4" /> Clear
        </Button>
      </div>
    </div>
  );
}
