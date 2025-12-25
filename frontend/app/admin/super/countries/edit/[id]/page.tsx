'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import api from '@/lib/api';
import CountryForm from '@/app/components/CountryForm';
import { Globe } from 'lucide-react';

export default function Page() {
  const { id } = useParams() as { id: string };
  const [data, setData] = useState(null);

  useEffect(() => {
    if(id) api.get(`/countries/${id}/`).then(res => setData(res.data));
  }, [id]);

  if (!data) {
    return (
      <div className="min-h-screen bg-[var(--dark-900)] flex flex-col justify-center items-center py-20 gap-4">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-purple)] flex items-center justify-center animate-pulse">
          <Globe className="w-6 h-6 text-white" />
        </div>
        <div className="text-[var(--brand-light)]/60 animate-pulse">Loading country data...</div>
      </div>
    );
  }

  return <CountryForm initialData={data} redirectPath="/admin/super/countries" />;
}
