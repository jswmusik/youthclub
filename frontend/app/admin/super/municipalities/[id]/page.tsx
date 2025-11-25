'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import api from '../../../../../lib/api';
import { getMediaUrl } from '../../../../utils';

function MunicipalityViewPageContent() {
  const router = useRouter();
  const params = useParams();
  const municipalityId = params?.id as string;

  const [municipality, setMunicipality] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (municipalityId) {
      fetchMunicipality();
    }
  }, [municipalityId]);

  const fetchMunicipality = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.get(`/municipalities/${municipalityId}/`);
      setMunicipality(res.data);
    } catch (err: any) {
      setError(err?.response?.status === 404 ? 'Municipality not found' : 'Failed to load municipality');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-500">Loading municipality details...</p>
      </div>
    );
  }

  if (error || !municipality) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <p className="text-red-800">{error || 'Municipality not found'}</p>
        </div>
        <Link href="/admin/super/municipalities" className="text-blue-600 hover:text-blue-800">
          ← Back to Municipalities
        </Link>
      </div>
    );
  }

  // Parse social media safely
  let socialMedia = { facebook: '', instagram: '' };
  try {
    if (municipality.social_media) {
      if (typeof municipality.social_media === 'string') {
        socialMedia = { ...socialMedia, ...JSON.parse(municipality.social_media) };
      } else if (typeof municipality.social_media === 'object') {
        socialMedia = { ...socialMedia, ...municipality.social_media };
      }
    }
  } catch (e) {
    console.error('Failed to parse social media:', e);
  }

  return (
    <div className="p-8">
      {/* HEADER */}
      <div className="flex items-center justify-between mb-6">
        <Link href="/admin/super/municipalities" className="text-blue-600 hover:text-blue-800 font-medium">
          ← Back to Municipalities
        </Link>
        <div className="flex gap-4">
          <button
            onClick={() => router.push(`/admin/super/municipalities?edit=${municipality.id}`)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Edit Municipality
          </button>
        </div>
      </div>

      {/* MUNICIPALITY HEADER */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden mb-6">
        <div className="relative">
          {municipality.hero_image && (
            <img
              src={getMediaUrl(municipality.hero_image) || ''}
              alt={municipality.name}
              className="w-full h-64 object-cover"
              onError={(e) => (e.target as HTMLImageElement).style.display = 'none'}
            />
          )}
          <div className={`p-8 ${municipality.hero_image ? 'absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent' : ''}`}>
            <div className="flex items-end gap-6">
              {municipality.avatar && (
                <img
                  src={getMediaUrl(municipality.avatar) || ''}
                  alt={municipality.name}
                  className={`w-24 h-24 rounded-full object-cover border-4 ${municipality.hero_image ? 'border-white' : 'border-gray-200'}`}
                  onError={(e) => (e.target as HTMLImageElement).style.display = 'none'}
                />
              )}
              <div className={municipality.hero_image ? 'text-white' : ''}>
                <h1 className="text-4xl font-bold mb-2">{municipality.name}</h1>
                <p className="text-lg opacity-90">
                  {municipality.country_name || 'Unknown Country'}
                  {municipality.country_code && ` (${municipality.country_code})`}
                </p>
                {municipality.municipality_code && (
                  <p className="text-sm opacity-80 mt-2">Code: {municipality.municipality_code}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* MAIN CONTENT */}
        <div className="lg:col-span-2 space-y-6">
          {/* DESCRIPTION */}
          <div className="bg-white rounded-xl shadow p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">About</h2>
            <p className="text-gray-700 whitespace-pre-wrap">{municipality.description || 'No description provided.'}</p>
          </div>

          {/* CONTACT INFO */}
          <div className="bg-white rounded-xl shadow p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Contact Information</h2>
            <div className="grid grid-cols-2 gap-4">
              {municipality.email && (
                <div>
                  <p className="text-sm text-gray-500 font-bold uppercase">Email</p>
                  <p className="font-medium">{municipality.email}</p>
                </div>
              )}
              {municipality.phone && (
                <div>
                  <p className="text-sm text-gray-500 font-bold uppercase">Phone</p>
                  <p className="font-medium">{municipality.phone}</p>
                </div>
              )}
              {municipality.website_link && (
                <div className="col-span-2">
                  <p className="text-sm text-gray-500 font-bold uppercase">Website</p>
                  <a
                    href={municipality.website_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 underline font-medium"
                  >
                    {municipality.website_link}
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* SOCIAL MEDIA */}
          {(socialMedia.facebook || socialMedia.instagram) && (
            <div className="bg-white rounded-xl shadow p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Social Media</h2>
              <div className="flex gap-4">
                {socialMedia.facebook && (
                  <a
                    href={socialMedia.facebook}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 underline"
                  >
                    Facebook →
                  </a>
                )}
                {socialMedia.instagram && (
                  <a
                    href={socialMedia.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-pink-600 hover:text-pink-800 underline"
                  >
                    Instagram →
                  </a>
                )}
              </div>
            </div>
          )}

          {/* TERMS & CONDITIONS */}
          {municipality.terms_and_conditions && (
            <div className="bg-white rounded-xl shadow p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Terms & Conditions</h2>
              <p className="text-sm text-gray-600 whitespace-pre-wrap">{municipality.terms_and_conditions}</p>
            </div>
          )}
        </div>

        {/* SIDEBAR */}
        <div className="space-y-6">
          {/* QUICK INFO */}
          <div className="bg-white rounded-xl shadow p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Quick Info</h3>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-gray-500 font-bold uppercase">Country</p>
                <p className="text-sm font-medium">
                  {municipality.country_name || 'Unknown'}
                  {municipality.country_code && ` (${municipality.country_code})`}
                </p>
              </div>
              {municipality.municipality_code && (
                <div>
                  <p className="text-xs text-gray-500 font-bold uppercase">Municipality Code</p>
                  <p className="text-sm font-medium">{municipality.municipality_code}</p>
                </div>
              )}
              <div>
                <p className="text-xs text-gray-500 font-bold uppercase">Self Registration</p>
                <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                  municipality.allow_self_registration 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {municipality.allow_self_registration ? 'Allowed' : 'Restricted'}
                </span>
              </div>
            </div>
          </div>

          {/* ACTIONS */}
          <div className="bg-white rounded-xl shadow p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Actions</h3>
            <div className="space-y-2">
              <button
                onClick={() => router.push(`/admin/super/municipalities?edit=${municipality.id}`)}
                className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-center"
              >
                Edit Municipality
              </button>
              <Link
                href="/admin/super/municipalities"
                className="block w-full bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 text-center"
              >
                Back to List
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MunicipalityViewPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center">Loading...</div>}>
      <MunicipalityViewPageContent />
    </Suspense>
  );
}

