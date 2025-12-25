'use client';

import Link from 'next/link';

import { getMediaUrl } from '../../../utils';
import { Calendar, Users, AlertCircle, Building2 } from 'lucide-react';


interface ResourceProps {
  id: number;
  name: string;
  image: string | null;
  description: string;
  max_participants: number;
  requires_training: boolean;
  club_name?: string; // Optional, for municipality view
}

interface BookingResourceCardProps {
  resource: ResourceProps;
  darkMode?: boolean;
}

export default function BookingResourceCard({ resource, darkMode = false }: BookingResourceCardProps) {
  return (
    <Link href={`/dashboard/youth/bookings/resource/${resource.id}`} className="block group">
      <div className={`overflow-hidden transition-all duration-300 group-active:scale-95 ${
        darkMode 
          ? 'bg-[var(--dark-800)] rounded-xl border border-[var(--dark-600)] hover:border-[var(--brand-primary)]/30' 
          : 'bg-white rounded-2xl shadow-md border-2 border-[#4D4DA4]/10 hover:shadow-xl hover:border-[#4D4DA4]/30'
      }`}>
        <div className={`h-40 sm:h-48 relative overflow-hidden ${
          darkMode 
            ? 'bg-gradient-to-br from-[var(--dark-700)] to-[var(--dark-600)]' 
            : 'bg-gradient-to-br from-[#EBEBFE] to-[#FFE8F0]'
        }`}>
          {resource.image ? (
            <img 
              src={getMediaUrl(resource.image) || ''} 
              alt={resource.name} 
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Calendar className={`w-12 h-12 ${darkMode ? 'text-[var(--brand-light)]/20' : 'text-[#4D4DA4]/30'}`} />
            </div>
          )}
          {resource.requires_training && (
            <div className={`absolute top-3 right-3 text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5 ${
              darkMode 
                ? 'bg-[var(--brand-peach)] text-[var(--dark-900)]' 
                : 'bg-gradient-to-r from-amber-400 to-amber-500 text-white shadow-lg'
            }`}>
              <AlertCircle className="w-3.5 h-3.5" />
              License Req.
            </div>
          )}
        </div>
        
        <div className="p-4 sm:p-5">
          <div className="mb-3">
            <h3 className={`font-bold text-lg sm:text-xl leading-tight mb-1 font-heading ${
              darkMode ? 'text-[var(--brand-light)]' : 'text-[#4D4DA4]'
            }`}>
              {resource.name}
            </h3>
            {resource.club_name && (
              <p className={`text-xs font-bold flex items-center gap-1 mt-1 ${
                darkMode ? 'text-[var(--brand-primary)]' : 'text-[#FF5485]'
              }`}>
                <Building2 className="w-3 h-3" />
                {resource.club_name}
              </p>
            )}
          </div>
          
          <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${
            darkMode 
              ? 'bg-[var(--dark-700)] border-[var(--dark-600)]' 
              : 'bg-gradient-to-r from-[#EBEBFE]/30 to-[#EBEBFE]/50 border-[#4D4DA4]/10'
          }`}>
            <Users className={`w-4 h-4 ${darkMode ? 'text-[var(--brand-purple)]' : 'text-[#4D4DA4]'}`} />
            <span className={`text-xs font-bold ${darkMode ? 'text-[var(--brand-light)]/80' : 'text-gray-700'}`}>Max {resource.max_participants} people</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
