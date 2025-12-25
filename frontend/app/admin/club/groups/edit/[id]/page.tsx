'use client';

import { useState, useEffect, Suspense } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import api from '@/lib/api'; 
import GroupForm from '@/app/components/GroupForm';
import { Layers } from 'lucide-react';

function EditGroupContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const id = params?.id as string;
  
  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (id) {
      const fetchGroup = async () => {
        try {
          const res = await api.get(`/groups/${id}/`);
          setGroup(res.data);
        } catch (err) {
          console.error(err);
          setError('Failed to load group data.');
        } finally {
          setLoading(false);
        }
      };
      fetchGroup();
    }
  }, [id]);

  const buildUrlWithParams = (path: string) => {
    const urlParams = new URLSearchParams();
    const page = searchParams.get('page');
    const search = searchParams.get('search');
    const municipality = searchParams.get('municipality');
    const club = searchParams.get('club');
    const type = searchParams.get('type');
    
    if (page && page !== '1') urlParams.set('page', page);
    if (search) urlParams.set('search', search);
    if (municipality) urlParams.set('municipality', municipality);
    if (club) urlParams.set('club', club);
    if (type) urlParams.set('type', type);
    
    const queryString = urlParams.toString();
    return queryString ? `${path}?${queryString}` : path;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--dark-900)] py-4 sm:py-8">
        <div className="sm:max-w-3xl sm:mx-auto sm:px-6 px-4">
          <div className="flex items-center justify-center gap-3 py-20">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-purple)] flex items-center justify-center animate-pulse">
              <Layers className="h-5 w-5 text-white" />
            </div>
            <span className="text-[var(--brand-light)]/50">Loading group...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error || !group) {
    return (
      <div className="min-h-screen bg-[var(--dark-900)] py-4 sm:py-8">
        <div className="sm:max-w-3xl sm:mx-auto sm:px-6 px-4">
          <div className="py-20 text-center text-red-400">{error || 'Group not found'}</div>
        </div>
      </div>
    );
  }

  return (
    <GroupForm 
      initialData={group} 
      redirectPath={buildUrlWithParams("/admin/club/groups")} 
    />
  );
}

export default function EditGroupPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[var(--dark-900)] py-4 sm:py-8">
        <div className="sm:max-w-3xl sm:mx-auto sm:px-6 px-4">
          <div className="flex items-center justify-center gap-3 py-20">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-purple)] flex items-center justify-center animate-pulse">
              <Layers className="h-5 w-5 text-white" />
            </div>
            <span className="text-[var(--brand-light)]/50">Loading group...</span>
          </div>
        </div>
      </div>
    }>
      <EditGroupContent />
    </Suspense>
  );
}
