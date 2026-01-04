'use client';

import { Suspense, useRef } from 'react';
import { useTranslations } from 'next-intl';
import BookingCalendar from '../../../../components/bookings/admin/BookingCalendar';
import Link from 'next/link';
import { Plus, CalendarDays } from 'lucide-react';
import BackButton from '@/app/components/BackButton';

function MunicipalityBookingCalendarPageContent() {
  const t = useTranslations('bookingsAdmin.calendar');
  const calendarRef = useRef<{ openCreateModal: () => void }>(null);

  return (
    <div className="min-h-screen bg-[var(--dark-900)]">
      <div className="py-4 sm:py-6 px-0 sm:px-4 space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="px-4 sm:px-0 space-y-4">
          {/* Top row: Back button and New Booking button */}
          <div className="flex items-center justify-between">
            <BackButton href="/admin/municipality/bookings" label={t('backToDashboard')} />
            <button 
              onClick={() => calendarRef.current?.openCreateModal()}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-[var(--dark-900)] bg-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/90 rounded-xl transition-colors shadow-lg shadow-[var(--brand-primary)]/20"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">{t('newBooking')}</span>
            </button>
          </div>
          
          {/* Title and description */}
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-[var(--brand-primary)] flex items-center justify-center">
              <CalendarDays className="w-6 h-6 text-[var(--dark-900)]" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-[var(--brand-light)]">{t('title')}</h1>
              <p className="text-sm text-[var(--brand-light)]/50 mt-0.5">{t('description')}</p>
            </div>
          </div>
        </div>
        
        <div className="h-[calc(100vh-200px)] min-h-[600px] flex flex-col">
          <BookingCalendar scope="MUNICIPALITY" ref={calendarRef} />
        </div>
      </div>
    </div>
  );
}

function LoadingFallback() {
  const t = useTranslations('bookingsAdmin.calendar');
  return (
    <div className="min-h-screen bg-[var(--dark-900)] flex flex-col justify-center items-center py-20 gap-4">
      <div className="w-12 h-12 rounded-xl bg-[var(--brand-primary)] flex items-center justify-center animate-pulse">
        <CalendarDays className="w-6 h-6 text-[var(--dark-900)]" />
      </div>
      <div className="text-[var(--brand-light)]/60 animate-pulse">{t('loading')}</div>
    </div>
  );
}

export default function MunicipalityBookingCalendarPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <MunicipalityBookingCalendarPageContent />
    </Suspense>
  );
}
