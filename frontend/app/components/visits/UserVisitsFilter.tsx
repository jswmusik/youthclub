'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { X, Filter } from 'lucide-react';

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
  const t = useTranslations('youthDetail.visits.filter');
  const router = useRouter();
  const pathname = usePathname();
  const [startDate, setStartDate] = useState(initialStartDate || '');
  const [endDate, setEndDate] = useState(initialEndDate || '');
  const [clubId, setClubId] = useState(initialClubId || '');

  // Update state when initial values change
  useEffect(() => {
    setStartDate(initialStartDate || '');
    setEndDate(initialEndDate || '');
    setClubId(initialClubId || '');
  }, [initialStartDate, initialEndDate, initialClubId]);

  // Auto-apply filters on change
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
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [startDate, endDate, clubId, initialStartDate, initialEndDate, initialClubId]);

  const handleClear = () => {
    setStartDate('');
    setEndDate('');
    setClubId('');
    router.push(pathname);
  };

  const hasFilters = startDate || endDate || clubId;

  const selectArrowStyle = {
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23F9F8F5' opacity='0.5'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 0.75rem center',
    backgroundSize: '1rem'
  };

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2 text-[var(--brand-light)]/50">
        <Filter className="w-4 h-4" />
        <span className="text-sm font-medium">{t('title')}</span>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Start Date */}
        <div className="flex-1 sm:max-w-[180px]">
          <label className="block text-[10px] text-[var(--brand-light)]/40 uppercase font-semibold mb-1.5">{t('fromDate')}</label>
          <input 
            type="date" 
            className="w-full h-10 px-3 bg-[var(--dark-700)] border-2 border-[var(--dark-500)] rounded-xl text-[var(--brand-light)] text-sm outline-none focus:border-[var(--brand-primary)] transition-colors"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>
        
        {/* End Date */}
        <div className="flex-1 sm:max-w-[180px]">
          <label className="block text-[10px] text-[var(--brand-light)]/40 uppercase font-semibold mb-1.5">{t('toDate')}</label>
          <input 
            type="date" 
            className="w-full h-10 px-3 bg-[var(--dark-700)] border-2 border-[var(--dark-500)] rounded-xl text-[var(--brand-light)] text-sm outline-none focus:border-[var(--brand-primary)] transition-colors"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>

        {/* Club Filter */}
        {showClubFilter && (
          <div className="flex-1 sm:max-w-[220px]">
            <label className="block text-[10px] text-[var(--brand-light)]/40 uppercase font-semibold mb-1.5">{t('club')}</label>
            <select
              className="w-full h-10 px-3 bg-[var(--dark-700)] border-2 border-[var(--dark-500)] rounded-xl text-[var(--brand-light)] text-sm outline-none focus:border-[var(--brand-primary)] transition-colors appearance-none cursor-pointer"
              value={clubId}
              onChange={(e) => setClubId(e.target.value)}
              style={selectArrowStyle}
            >
              <option value="">{t('allClubs')}</option>
              {clubs.map(club => (
                <option key={club.id} value={club.id.toString()}>{club.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Clear Button */}
        {hasFilters && (
          <div className="flex items-end">
            <button
              onClick={handleClear}
              className="h-10 px-4 flex items-center gap-2 text-sm font-medium text-[var(--brand-light)]/60 hover:text-[var(--brand-red)] hover:bg-[var(--brand-red)]/10 rounded-xl transition-all"
            >
              <X className="h-4 w-4" /> {t('clear')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
