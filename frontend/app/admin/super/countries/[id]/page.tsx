'use client';

import { useParams } from 'next/navigation';
import CountryDetailView from '@/app/components/CountryDetailView';

export default function Page() {
  const { id } = useParams() as { id: string };
  return (
    <div className="min-h-screen bg-[var(--dark-900)] py-4 sm:py-8">
      <div className="sm:max-w-4xl sm:mx-auto sm:px-6">
        <CountryDetailView countryId={id} basePath="/admin/super/countries" />
      </div>
    </div>
  );
}
