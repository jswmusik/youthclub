'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Building2 } from 'lucide-react';
import api from '@/lib/api';
import ClubForm from '@/app/components/ClubForm';

export default function Page() {
  const { id } = useParams() as { id: string };
  const [data, setData] = useState(null);

  useEffect(() => {
    if(id) api.get(`/clubs/${id}/`).then(res => setData(res.data));
  }, [id]);

  if (!data) return (
    <div className="min-h-screen bg-[var(--dark-900)] flex flex-col justify-center items-center py-20 gap-4">
      <div className="w-12 h-12 rounded-xl bg-[var(--brand-primary)] flex items-center justify-center animate-pulse">
        <Building2 className="w-6 h-6 text-[var(--dark-900)]" />
      </div>
      <div className="text-[var(--brand-light)]/60 animate-pulse">Loading club...</div>
    </div>
  );

  return (
    <div>
      <ClubForm initialData={data} redirectPath="/admin/municipality/clubs" scope="MUNICIPALITY" />
    </div>
  );
}

