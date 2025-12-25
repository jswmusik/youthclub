'use client';

import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import api from '@/lib/api'; 
import GroupForm from '@/app/components/GroupForm';

export default function EditGroupPage() {
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

  if (loading) return (
    <div className="min-h-screen bg-[var(--dark-900)] flex items-center justify-center">
      <div className="text-center text-[var(--brand-light)]/60">Loading group settings...</div>
    </div>
  );
  if (error || !group) return (
    <div className="min-h-screen bg-[var(--dark-900)] flex items-center justify-center">
      <div className="text-center text-[var(--brand-red)]">{error || 'Group not found'}</div>
    </div>
  );

  return (
    <div className="py-4 sm:py-6 md:py-8 px-0">
      <GroupForm 
        initialData={group} 
        redirectPath={buildUrlWithParams("/admin/municipality/groups")} 
      />
    </div>
  );
}