'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import api from '@/lib/api'; 
import RewardForm from '@/app/components/RewardForm';

export default function EditRewardPage() {
  const params = useParams();
  const id = params?.id as string;
  
  const [reward, setReward] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      api.get(`/rewards/${id}/`)
        .then(res => {
          setReward(res.data);
          setLoading(false);
        })
        .catch(err => {
          console.error(err);
          setLoading(false);
        });
    }
  }, [id]);

  if (loading) return <div className="p-12 text-center text-gray-500">Loading reward...</div>;
  if (!reward) return <div className="p-12 text-center text-red-500">Reward not found.</div>;

  return (
    <div className="max-w-5xl mx-auto p-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Edit Reward</h1>
      </div>
      
      <RewardForm 
        initialData={reward} 
        redirectPath="/admin/super/rewards" 
      />
    </div>
  );
}