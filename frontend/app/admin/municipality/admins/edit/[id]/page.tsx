'use client';

import { useState, useEffect, Suspense } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import api from '@/lib/api';
import AdminForm from '@/app/components/AdminForm';

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
    const role = searchParams.get('role');
    const club = searchParams.get('assigned_club');
    if (page && page !== '1') params.set('page', page);
    if (search) params.set('search', search);
    if (role) params.set('role', role);
    if (club) params.set('assigned_club', club);
    const queryString = params.toString();
    return queryString ? `/admin/municipality/admins?${queryString}` : '/admin/municipality/admins';
  };

  if (!data) return <div className="p-8">Loading...</div>;

  return (
    <div className="p-8">
        <AdminForm initialData={data} redirectPath={buildRedirectPath()} scope="MUNICIPALITY" />
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

