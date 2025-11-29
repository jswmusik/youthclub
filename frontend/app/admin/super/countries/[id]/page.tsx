'use client';

import { useParams } from 'next/navigation';
import CountryDetailView from '@/app/components/CountryDetailView';

export default function Page() {
  const { id } = useParams() as { id: string };
  return (
    <div className="p-8">
      <CountryDetailView countryId={id} basePath="/admin/super/countries" />
    </div>
  );
}

