'use client';

import { useState, useEffect, Suspense } from 'react';
import { useParams } from 'next/navigation';
import api from '@/lib/api';
import GuardianForm from '@/app/components/GuardianForm';
import { Users } from 'lucide-react';

function EditPageContent() {
  const { id } = useParams() as { id: string };
  const [data, setData] = useState(null);

  useEffect(() => {
    if (id) {
      api.get(`/users/${id}/`).then(res => setData(res.data)).catch(err => {
        console.error('Failed to load guardian:', err);
      });
    }
  }, [id]);

  if (!data) return (
    <div className="min-h-screen bg-[var(--dark-900)] flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-purple)] flex items-center justify-center mx-auto mb-4 animate-pulse">
          <Users className="w-6 h-6 text-white" />
        </div>
        <p className="text-[var(--brand-light)]/60">Loading guardian...</p>
      </div>
    </div>
  );

  // Pass the base path - the form will preserve URL params from its own searchParams
  return (
    <div>
      <GuardianForm initialData={data} redirectPath="/admin/municipality/guardians" scope="MUNICIPALITY" />
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[var(--dark-900)] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-purple)] flex items-center justify-center mx-auto mb-4 animate-pulse">
            <Users className="w-6 h-6 text-white" />
          </div>
          <p className="text-[var(--brand-light)]/60">Loading guardian...</p>
        </div>
      </div>
    }>
      <EditPageContent />
    </Suspense>
  );
}

