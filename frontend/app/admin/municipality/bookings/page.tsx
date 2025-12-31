'use client';

import { useTranslations } from 'next-intl';
import Link from 'next/link';
import BookingRequestList from '../../../components/bookings/admin/BookingRequestList';
import { Calendar, Package, CalendarDays } from 'lucide-react';

export default function MuniBookingsPage() {
  const t = useTranslations('bookingsAdmin.main');
  
  return (
    <div className="min-h-screen bg-[var(--dark-900)]">
      <div className="py-4 sm:py-8 px-0 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 px-4 sm:px-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-purple)] flex items-center justify-center">
              <CalendarDays className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-[var(--brand-light)]">{t('title')}</h1>
              <p className="text-[var(--brand-light)]/50 text-sm">{t('description')}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 pl-[60px] sm:pl-0">
            <Link 
              href="/admin/municipality/bookings/resources"
              className="h-10 px-4 bg-[var(--dark-700)] border border-[var(--dark-500)] text-[var(--brand-light)]/70 hover:text-[var(--brand-light)] hover:bg-[var(--dark-600)] rounded-xl transition-all flex items-center gap-2 text-sm font-medium"
            >
              <Package className="h-4 w-4" />
              {t('manageResources')}
            </Link>
            <Link 
              href="/admin/municipality/bookings/calendar"
              className="h-10 px-4 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/90 text-[var(--dark-900)] rounded-xl transition-all flex items-center gap-2 text-sm font-semibold shadow-lg shadow-[var(--brand-primary)]/20"
            >
              <Calendar className="h-4 w-4" />
              {t('viewCalendar')}
            </Link>
          </div>
        </div>

        {/* Main Action Area with Municipality Scope */}
        <BookingRequestList scope="MUNICIPALITY" />
      </div>
    </div>
  );
}
