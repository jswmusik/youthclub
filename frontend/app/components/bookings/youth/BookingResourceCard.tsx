'use client';

import Link from 'next/link';
import { getMediaUrl } from '../../../utils';
import { Calendar, Users, AlertCircle } from 'lucide-react';

interface ResourceProps {
  id: number;
  name: string;
  image: string | null;
  description: string;
  max_participants: number;
  requires_training: boolean;
  club_name?: string; // Optional, for municipality view
}

export default function BookingResourceCard({ resource }: { resource: ResourceProps }) {
  return (
    <Link href={`/dashboard/youth/bookings/resource/${resource.id}`} className="block">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden active:scale-95 transition-transform duration-150">
        <div className="h-32 bg-gray-200 relative">
          {resource.image ? (
            <img src={getMediaUrl(resource.image) || ''} alt={resource.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400">
              <Calendar className="w-8 h-8" />
            </div>
          )}
          {resource.requires_training && (
            <div className="absolute top-2 right-2 bg-yellow-400 text-yellow-900 text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1 shadow-sm">
              <AlertCircle className="w-3 h-3" />
              License Req.
            </div>
          )}
        </div>
        
        <div className="p-4">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-bold text-gray-900 leading-tight">{resource.name}</h3>
              {resource.club_name && (
                <p className="text-xs text-gray-500 mt-0.5">{resource.club_name}</p>
              )}
            </div>
          </div>
          
          <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
            <div className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              <span>Max {resource.max_participants}</span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

