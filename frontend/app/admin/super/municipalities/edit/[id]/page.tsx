'use client';

import { useState, useEffect, Suspense } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import api from '@/lib/api';
import MunicipalityForm from '@/app/components/MunicipalityForm';

function EditPageContent() {
  const { id } = useParams() as { id: string };
  const searchParams = useSearchParams();
  const [data, setData] = useState(null);

  useEffect(() => {
    if(id) api.get(`/municipalities/${id}/`).then(res => setData(res.data));
  }, [id]);

  const buildRedirectPath = () => {
    const params = new URLSearchParams();
    const page = searchParams.get('page');
    const search = searchParams.get('search');
    const country = searchParams.get('country');
    
    if (page && page !== '1') params.set('page', page);
    if (search) params.set('search', search);
    if (country) params.set('country', country);
    
    const queryString = params.toString();
    return queryString ? `/admin/super/municipalities?${queryString}` : '/admin/super/municipalities';
  };

  if (!data) return <div className="p-8">Loading...</div>;

  return (
    <div className="p-8">
      <MunicipalityForm initialData={data} redirectPath={buildRedirectPath()} />
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

