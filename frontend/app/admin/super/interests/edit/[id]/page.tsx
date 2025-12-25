'use client';

import { useState, useEffect, Suspense } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import api from '@/lib/api';
import InterestForm from '@/app/components/InterestForm';
import { Heart } from 'lucide-react';

function LoadingState() {
  return (
    <div className="min-h-screen bg-[var(--dark-900)] flex flex-col justify-center items-center py-20 gap-4">
      <div className="relative">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-purple)] flex items-center justify-center animate-pulse">
          <Heart className="w-8 h-8 text-white" />
        </div>
        <div className="absolute -inset-2 bg-gradient-to-br from-[var(--brand-primary)]/20 to-[var(--brand-purple)]/20 rounded-3xl blur-xl animate-pulse"></div>
      </div>
      <div className="text-[var(--brand-light)]/60 animate-pulse">Loading...</div>
    </div>
  );
}

function EditPageContent() {
  const { id } = useParams() as { id: string };
  const searchParams = useSearchParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if(id) {
      api.get(`/interests/${id}/`)
        .then(res => setData(res.data))
        .finally(() => setLoading(false));
    }
  }, [id]);

  const buildRedirectPath = () => {
    const params = new URLSearchParams();
    const page = searchParams.get('page');
    const search = searchParams.get('search');
    if (page && page !== '1') params.set('page', page);
    if (search) params.set('search', search);
    const queryString = params.toString();
    return queryString ? `/admin/super/interests?${queryString}` : '/admin/super/interests';
  };

  if (loading || !data) return <LoadingState />;

  return <InterestForm initialData={data} redirectPath={buildRedirectPath()} />;
}

export default function Page() {
  return (
    <div className="min-h-screen bg-[var(--dark-900)]">
      <Suspense fallback={<LoadingState />}>
        <EditPageContent />
      </Suspense>
    </div>
  );
}

