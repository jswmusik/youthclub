'use client';

import { useState, useEffect, Suspense } from 'react';
import { useParams } from 'next/navigation';
import api from '@/lib/api';
import AdminForm from '@/app/components/AdminForm';

function EditPageContent() {
  const { id } = useParams() as { id: string };
  const [data, setData] = useState(null);

  useEffect(() => {
    if(id) api.get(`/users/${id}/`).then(res => setData(res.data));
  }, [id]);

  if (!data) return <div className="p-8 text-center text-gray-400">Loading...</div>;

  // Pass the base path - the form will preserve URL params from its own searchParams
  return (
    <div>
      <AdminForm initialData={data} redirectPath="/admin/municipality/admins" scope="MUNICIPALITY" />
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-gray-400">Loading...</div>}>
      <EditPageContent />
    </Suspense>
  );
}

