'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import api from '@/lib/api';
import CountryForm from '@/app/components/CountryForm';

export default function Page() {
  const { id } = useParams() as { id: string };
  const [data, setData] = useState(null);

  useEffect(() => {
    if(id) api.get(`/countries/${id}/`).then(res => setData(res.data));
  }, [id]);

  if (!data) return <div className="p-8">Loading...</div>;

  return (
    <div className="p-8">
      <CountryForm initialData={data} redirectPath="/admin/super/countries" />
    </div>
  );
}

