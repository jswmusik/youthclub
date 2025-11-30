import React from 'react';
import { Club } from '@/types/organization';
import { getMediaUrl } from '../../utils';

interface ClubHeaderProps {
  club: Club;
}

export default function ClubHeader({ club }: ClubHeaderProps) {
  // If no hero image, use a gradient based on your app's theme
  const heroImageUrl = club.hero_image ? getMediaUrl(club.hero_image) : null;
  const avatarUrl = club.avatar ? getMediaUrl(club.avatar) : null;

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
      
      {/* 1. COVER IMAGE AREA */}
      <div 
        className="relative h-48 md:h-64 bg-gray-200 w-full bg-cover bg-center group"
        style={{ 
          backgroundImage: heroImageUrl ? `url(${heroImageUrl})` : 'linear-gradient(to right, #4F46E5, #9333EA)'
        }}
      >
        {/* Dark Overlay on Hover (subtle like profile) */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition duration-300" />
      </div>

      {/* 2. PROFILE INFO AREA */}
      <div className="relative px-6 pb-6">
        
        <div className="flex flex-col md:flex-row items-start md:items-end -mt-12 mb-4">
          
          {/* AVATAR */}
          <div className="relative mr-5">
            <div className="w-24 h-24 md:w-32 md:h-32 rounded-full border-4 border-white bg-white shadow-md overflow-hidden relative">
              {avatarUrl ? (
                <img src={avatarUrl} alt={club.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gray-100 flex items-center justify-center text-gray-400">
                  <span className="text-2xl md:text-3xl font-bold text-gray-500">
                    {club.name.substring(0, 2).toUpperCase()}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* TEXT INFO */}
          <div className="flex-1 mt-4 md:mt-0 min-w-0">
            <h1 className="text-2xl font-bold text-gray-900 truncate">
              {club.name}
            </h1>
            <p className="text-gray-500 text-sm mb-3">
              {club.municipality_name}
            </p>
          </div>

          {/* ACTIONS (Future Proofing) */}
          <div className="flex gap-3 mt-4 md:mt-0 md:ml-auto">
             {/* We can add a "Check In" or "Favorite" button here later */}
          </div>

        </div>
      </div>
    </div>
  );
}

