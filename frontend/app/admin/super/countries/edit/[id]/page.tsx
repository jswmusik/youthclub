'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import api from '@/lib/api';
import CountryForm from '@/app/components/CountryForm';
import { Card } from '@/components/ui/card';

export default function Page() {
  const { id } = useParams() as { id: string };
  const [data, setData] = useState(null);

  useEffect(() => {
    if(id) api.get(`/countries/${id}/`).then(res => setData(res.data));
  }, [id]);

  if (!data) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="text-gray-400 animate-pulse">Loading...</div>
      </div>
    );
  }

  return <CountryForm initialData={data} redirectPath="/admin/super/countries" />;
}

