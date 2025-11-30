'use client';

import { useState, useEffect } from 'react';
import { Club } from '@/types/organization';
import { getMediaUrl } from '../../utils';
import { useAuth } from '@/context/AuthContext';
import { followClub, unfollowClub } from '@/lib/api';
import Toast from '../Toast';

interface ClubHeaderProps {
  club: Club;
}

export default function ClubHeader({ club }: ClubHeaderProps) {
  const { user, refreshUser } = useAuth();
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ message: '', type: 'success' as 'success' | 'error', isVisible: false });

  // If no hero image, use a gradient based on your app's theme
  const heroImageUrl = club.hero_image ? getMediaUrl(club.hero_image) : null;
  const avatarUrl = club.avatar ? getMediaUrl(club.avatar) : null;

  // Check if user follows this club on load
  useEffect(() => {
    if (user && user.followed_clubs_ids) {
      setIsFollowing(user.followed_clubs_ids.includes(club.id));
    }
  }, [user, club.id]);

  const handleFollowToggle = async () => {
    if (!user) return;

    setLoading(true);

    try {
      if (isFollowing) {
        await unfollowClub(club.id);
        setToast({ message: `Unfollowed ${club.name}`, type: 'success', isVisible: true });
      } else {
        await followClub(club.id);
        setToast({ message: `Following ${club.name}`, type: 'success', isVisible: true });
      }
      
      // Update local state
      setIsFollowing(!isFollowing);
      
      // Refresh user context to sync the 'followed_clubs_ids' array
      await refreshUser();
      
    } catch (error) {
      console.error('Failed to toggle follow status', error);
      setToast({ message: 'Something went wrong', type: 'error', isVisible: true });
    } finally {
      setLoading(false);
    }
  };

  // Determine if we should show the button
  const isYouth = user?.role === 'YOUTH_MEMBER';
  const isHomeClub = user?.preferred_club?.id === club.id || (typeof user?.preferred_club === 'number' && user.preferred_club === club.id);

  return (
    <>
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

            {/* ACTIONS */}
            <div className="flex gap-3 mt-4 md:mt-0 md:ml-auto">
              {isYouth && !isHomeClub && (
                <button
                  onClick={handleFollowToggle}
                  disabled={loading}
                  className={`px-6 py-2 rounded-full font-medium transition-colors ${
                    isFollowing
                      ? 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-300'
                      : 'bg-blue-600 hover:bg-blue-700 text-white border-none'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {loading ? 'Processing...' : isFollowing ? 'Unfollow' : 'Follow'}
                </button>
              )}
              
              {/* Badge for Home Club */}
              {isYouth && isHomeClub && (
                <span className="px-4 py-2 rounded-full bg-green-500 text-white text-sm font-bold shadow-sm">
                  Your Home Club
                </span>
              )}
            </div>

          </div>
        </div>
      </div>

      {/* Toast Notification */}
      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={() => setToast({ ...toast, isVisible: false })}
      />
    </>
  );
}

