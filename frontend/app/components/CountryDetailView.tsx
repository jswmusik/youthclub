'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import api from '../../lib/api';
import { getMediaUrl } from '../../app/utils';

interface CountryDetailProps {
  countryId: string;
  basePath: string;
}

export default function CountryDetailView({ countryId, basePath }: CountryDetailProps) {
  const [country, setCountry] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/countries/${countryId}/`).then(res => {
      setCountry(res.data);
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setLoading(false);
    });
  }, [countryId]);

  if (loading) return <div className="p-12 text-center text-gray-500">Loading...</div>;
  if (!country) return <div className="p-12 text-center text-red-500">Country not found.</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <Link href={basePath} className="text-gray-500 hover:text-gray-900 font-bold">← Back to List</Link>
        <Link href={`${basePath}/edit/${country.id}`} className="bg-blue-600 text-white px-4 py-2 rounded font-bold hover:bg-blue-700">
          Edit Country
        </Link>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Banner / Header */}
        <div className="p-8 bg-gray-50 border-b flex items-center gap-6">
            {country.avatar ? (
                <img 
                    src={getMediaUrl(country.avatar) || ''} 
                    className="w-32 h-20 object-contain rounded shadow-sm border bg-white" 
                    alt={country.name}
                />
            ) : (
                <div className="w-32 h-20 bg-gray-200 rounded flex items-center justify-center text-gray-400 font-bold text-xl shadow-sm">
                    {country.country_code}
                </div>
            )}
            <div>
                <h1 className="text-4xl font-bold text-gray-900">{country.name}</h1>
                <span className="inline-block mt-2 px-3 py-1 bg-blue-100 text-blue-800 text-sm font-mono font-bold rounded">
                    {country.country_code}
                </span>
            </div>
        </div>

        {/* Details Grid */}
        <div className="p-8 grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Currency</label>
                <p className="text-lg font-medium text-gray-900">{country.currency_code || '-'}</p>
            </div>
            <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Language</label>
                <p className="text-lg font-medium text-gray-900">{country.default_language || '-'}</p>
            </div>
            <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Timezone</label>
                <p className="text-lg font-medium text-gray-900">{country.timezone || '-'}</p>
            </div>
            
            <div className="md:col-span-3">
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Description</label>
                <div className="bg-gray-50 p-4 rounded-lg text-gray-700">
                    {country.description || 'No description provided.'}
                </div>
            </div>
        </div>
      </div>
    </div>
  );
}