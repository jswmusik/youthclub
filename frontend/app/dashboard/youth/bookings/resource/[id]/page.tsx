'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import api from '../../../../../../lib/api';
import { getMediaUrl } from '../../../../../utils';
import BookingWizard from '../../../../../components/bookings/youth/BookingWizard';
import { ArrowLeft } from 'lucide-react';

export default function BookingWizardPage() {
  const { id } = useParams();
  const router = useRouter();
  const [resource, setResource] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/bookings/resources/${id}/`)
      .then(res => setResource(res.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="p-8 text-center">Loading...</div>;
  if (!resource) return <div className="p-8 text-center">Resource not found.</div>;

  return (
    <div className="pb-24">
      {/* Header Image */}
      <div className="relative h-48 bg-gray-200">
        {resource.image && (
          <img src={getMediaUrl(resource.image) || ''} className="w-full h-full object-cover" alt={resource.name} />
        )}
        <button 
          onClick={() => router.back()}
          className="absolute top-4 left-4 bg-white/80 p-2 rounded-full backdrop-blur-sm shadow-sm"
        >
          <ArrowLeft className="w-5 h-5 text-gray-800" />
        </button>
      </div>

      <div className="p-5 -mt-6 bg-white rounded-t-3xl relative z-10 min-h-[50vh]">
        <div className="mb-6">
          <h1 className="text-2xl font-black text-gray-900 mb-2">{resource.name}</h1>
          <p className="text-gray-600 text-sm leading-relaxed">{resource.description}</p>
          
          {resource.requires_training && (
            <div className="mt-4 bg-orange-50 border border-orange-100 p-3 rounded-lg text-sm text-orange-800 font-medium">
              ⚠️ This resource requires a license/training. Ensure you are qualified before booking.
            </div>
          )}
        </div>

        <hr className="border-gray-100 my-6" />

        <BookingWizard resource={resource} />
      </div>
    </div>
  );
}

