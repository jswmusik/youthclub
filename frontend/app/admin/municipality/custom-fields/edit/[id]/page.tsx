'use client';

import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import api from '@/lib/api';
import CustomFieldForm from '../../../../../components/CustomFieldForm';

export default function Page() {
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

  if (!data) return <div className="p-8">Loading...</div>;

  return (
    <div className="p-8">
      <CustomFieldForm 
        initialData={data} 
        redirectPath={buildUrlWithParams("/admin/municipality/custom-fields")} 
        scope="MUNICIPALITY" 
      />
    </div>
  );
}

