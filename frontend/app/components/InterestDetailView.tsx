'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import api from '../../lib/api';
import { getMediaUrl } from '../../app/utils';

interface InterestDetailProps {
  interestId: string;
  basePath: string;
}

export default function InterestDetailView({ interestId, basePath }: InterestDetailProps) {
  const searchParams = useSearchParams();
  const [interest, setInterest] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/interests/${interestId}/`).then(res => {
      setInterest(res.data);
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setLoading(false);
    });
  }, [interestId]);

  const buildUrlWithParams = (path: string) => {
    const params = new URLSearchParams();
    const page = searchParams.get('page');
    const search = searchParams.get('search');
    
    if (page && page !== '1') params.set('page', page);
    if (search) params.set('search', search);
    
    const queryString = params.toString();
    return queryString ? `${path}?${queryString}` : path;
  };

  if (loading) return <div className="p-12 text-center text-gray-500">Loading...</div>;
  if (!interest) return <div className="p-12 text-center text-red-500">Interest not found.</div>;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <Link href={buildUrlWithParams(basePath)} className="text-gray-500 hover:text-gray-900 font-bold">← Back to List</Link>
        <Link href={buildUrlWithParams(`${basePath}/edit/${interest.id}`)} className="bg-blue-600 text-white px-4 py-2 rounded font-bold hover:bg-blue-700">
          Edit Interest
        </Link>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-10 text-center">
        
        {/* Big Icon / Image Display */}
        <div className="flex justify-center mb-6">
            {interest.avatar ? (
                <img 
                    src={getMediaUrl(interest.avatar) || ''} 
                    className="w-40 h-40 rounded-2xl object-cover shadow-lg border-4 border-white" 
                    alt={interest.name}
                />
            ) : (
                <div className="w-40 h-40 bg-gray-100 rounded-2xl flex items-center justify-center text-gray-300 text-sm font-bold">
                    No Image
                </div>
            )}
        </div>

        <h1 className="text-4xl font-bold text-gray-900 mb-2">
            {interest.icon} {interest.name}
        </h1>
        <p className="text-gray-500">Interest ID: {interest.id}</p>

        {/* Future expansion: Show count of users interested? */}
      </div>
    </div>
  );
}