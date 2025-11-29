'use client';

import { useState, useEffect, Suspense } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import api from '@/lib/api';
import YouthForm from '@/app/components/YouthForm';

function EditPageContent() {
  const { id } = useParams() as { id: string };
  const searchParams = useSearchParams();
  const [data, setData] = useState(null);

  useEffect(() => {
    if(id) api.get(`/users/${id}/`).then(res => setData(res.data));
  }, [id]);

  const buildRedirectPath = () => {
    const params = new URLSearchParams();
    const page = searchParams.get('page');
    const search = searchParams.get('search');
    const status = searchParams.get('verification_status');
    const gender = searchParams.get('legal_gender');
    if (page && page !== '1') params.set('page', page);
    if (search) params.set('search', search);
    if (status) params.set('verification_status', status);
    if (gender) params.set('legal_gender', gender);
    const queryString = params.toString();
    return queryString ? `/admin/municipality/youth?${queryString}` : '/admin/municipality/youth';
  };

  if (!data) return <div className="p-8">Loading...</div>;

  return (
    <div className="p-8">
      <YouthForm initialData={data} redirectPath={buildRedirectPath()} scope="MUNICIPALITY" />
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

