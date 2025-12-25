'use client';

import { useState, useEffect, Suspense } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import api from '@/lib/api';
import CustomFieldForm from '../../../../../components/CustomFieldForm';
import { Settings2 } from 'lucide-react';

function EditCustomFieldContent() {
  const { id } = useParams() as { id: string };
  const searchParams = useSearchParams();
  const [data, setData] = useState(null);

  useEffect(() => {
    if(id) api.get(`/custom-fields/${id}/`).then(res => setData(res.data));
  }, [id]);

  const buildUrlWithParams = (path: string) => {
    const params = new URLSearchParams();
    const page = searchParams.get('page');
    const search = searchParams.get('search');
    const fieldType = searchParams.get('field_type');
    const context = searchParams.get('context');
    const targetRole = searchParams.get('target_role');
    const status = searchParams.get('status');
    
    if (page && page !== '1') params.set('page', page);
    if (search) params.set('search', search);
    if (fieldType) params.set('field_type', fieldType);
    if (context) params.set('context', context);
    if (targetRole) params.set('target_role', targetRole);
    if (status) params.set('status', status);
    
    const queryString = params.toString();
    return queryString ? `${path}?${queryString}` : path;
  };

  if (!data) {
    return (
      <div className="min-h-screen bg-[var(--dark-900)] flex flex-col justify-center items-center py-20 gap-4">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-purple)] flex items-center justify-center animate-pulse">
          <Settings2 className="w-6 h-6 text-white" />
        </div>
        <div className="text-[var(--brand-light)]/60 animate-pulse">Loading field...</div>
      </div>
    );
  }

  return (
    <CustomFieldForm 
      initialData={data} 
      redirectPath={buildUrlWithParams("/admin/municipality/custom-fields")} 
      scope="MUNICIPALITY" 
    />
  );
}

export default function Page() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[var(--dark-900)] flex flex-col justify-center items-center py-20 gap-4">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-purple)] flex items-center justify-center animate-pulse">
          <Settings2 className="w-6 h-6 text-white" />
        </div>
        <div className="text-[var(--brand-light)]/60 animate-pulse">Loading...</div>
      </div>
    }>
      <EditCustomFieldContent />
    </Suspense>
  );
}
