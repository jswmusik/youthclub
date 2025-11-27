'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import api from '@/lib/api'; 
import GroupForm from '@/app/components/GroupForm';

export default function EditGroupPage() {
  const params = useParams();
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

  if (loading) return <div className="p-12 text-center text-gray-500">Loading group settings...</div>;
  if (error || !group) return <div className="p-12 text-center text-red-500">{error || 'Group not found'}</div>;

  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Edit Group</h1>
        <p className="text-gray-500">Update membership rules and settings.</p>
      </div>
      
      <GroupForm 
        initialData={group} 
        redirectPath="/admin/super/groups" 
      />
    </div>
  );
}