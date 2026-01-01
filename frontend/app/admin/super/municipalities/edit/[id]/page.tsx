'use client';

import { useState, useEffect, Suspense } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import api from '@/lib/api';
import MunicipalityForm from '@/app/components/MunicipalityForm';
import { MapPin } from 'lucide-react';

function EditPageContent() {
  const t = useTranslations('municipalitiesAdmin');
  const { id } = useParams() as { id: string };
  const [data, setData] = useState(null);

  useEffect(() => {
    if(id) api.get(`/municipalities/${id}/`).then(res => setData(res.data));
  }, [id]);

  if (!data) {
    return (
      <div className="min-h-screen bg-[var(--dark-900)] flex flex-col justify-center items-center py-20 gap-4">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-purple)] flex items-center justify-center animate-pulse">
          <MapPin className="w-6 h-6 text-white" />
        </div>
        <div className="text-[var(--brand-light)]/60 animate-pulse">{t('edit.loadingMunicipalityData')}</div>
      </div>
    );
  }

  // Pass the base path without query params - the form will preserve params from its own URL
  return <MunicipalityForm initialData={data} redirectPath="/admin/super/municipalities" />;
}

export default function Page() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[var(--dark-900)] flex flex-col justify-center items-center py-20 gap-4">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-purple)] flex items-center justify-center animate-pulse">
          <MapPin className="w-6 h-6 text-white" />
        </div>
        <div className="text-[var(--brand-light)]/60 animate-pulse">Loading...</div>
      </div>
    }>
      <EditPageContent />
    </Suspense>
  );
}
