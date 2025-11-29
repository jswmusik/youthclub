'use client';

import { useState, useEffect, Suspense } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import api from '@/lib/api';
import GuardianForm from '@/app/components/GuardianForm';

function EditPageContent() {
  const { id } = useParams() as { id: string };
  const searchParams = useSearchParams();
  const [data, setData] = useState(null);

  useEffect(() => {
    if (id) {
      api.get(`/users/${id}/`).then(res => setData(res.data)).catch(err => {
        console.error('Failed to load guardian:', err);
      });
    }
  }, [id]);

  const buildRedirectPath = () => {
    const params = new URLSearchParams();
    const page = searchParams.get('page');
    const search = searchParams.get('search');
    const status = searchParams.get('verification_status');
    const gender = searchParams.get('legal_gender');
    const municipality = searchParams.get('municipality');
    if (page && page !== '1') params.set('page', page);
    if (search) params.set('search', search);
    if (status) params.set('verification_status', status);
    if (gender) params.set('legal_gender', gender);
    if (municipality) params.set('municipality', municipality);
    const queryString = params.toString();
    return queryString ? `/admin/super/guardians?${queryString}` : '/admin/super/guardians';
  };

  if (!data) return <div className="p-8">Loading...</div>;

  return (
    <div className="p-8">
      <GuardianForm initialData={data} redirectPath={buildRedirectPath()} scope="SUPER" />
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div className="p-8">Loading...</div>}>
      <EditPageContent />
    </Suspense>
  );
}

