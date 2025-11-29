'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import api from '@/lib/api';
import ClubForm from '@/app/components/ClubForm';

export default function Page() {
  const { id } = useParams() as { id: string };
  const [data, setData] = useState(null);

  useEffect(() => {
    if(id) api.get(`/clubs/${id}/`).then(res => setData(res.data));
  }, [id]);

  if (!data) return <div className="p-8">Loading...</div>;

  return (
    <div className="p-8">
      <ClubForm initialData={data} redirectPath="/admin/municipality/clubs" scope="MUNICIPALITY" />
    </div>
  );
}

