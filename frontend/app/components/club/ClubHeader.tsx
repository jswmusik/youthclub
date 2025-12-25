'use client';

import { useState, useEffect } from 'react';
import { Club } from '@/types/organization';
import { getMediaUrl } from '../../utils';
import { useAuth } from '@/context/AuthContext';
import { followClub, unfollowClub } from '@/lib/api';
import Toast from '../Toast';

interface ClubHeaderProps {
  club: Club;
  darkMode?: boolean;
}

export default function ClubHeader({ club, darkMode = false }: ClubHeaderProps) {
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
      <div className={`sm:rounded-xl overflow-hidden border ${
        darkMode 
          ? 'bg-[var(--dark-800)] border-[var(--dark-600)]' 
          : 'bg-white shadow-sm border-gray-100'
      }`}>
        
        {/* 1. COVER IMAGE AREA */}
        <div 
          className="relative h-48 md:h-64 w-full bg-cover bg-center group"
          style={{ 
            backgroundImage: heroImageUrl 
              ? `url(${heroImageUrl})` 
              : darkMode 
                ? 'linear-gradient(to right, var(--brand-purple), var(--brand-primary))' 
                : 'linear-gradient(to right, #4F46E5, #9333EA)',
            backgroundColor: darkMode ? 'var(--dark-700)' : '#e5e7eb'
          }}
        >
          {/* Dark Overlay on Hover (subtle like profile) */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition duration-300" />
          {/* Gradient overlay for text readability */}
          <div className={`absolute inset-0 bg-gradient-to-t ${
            darkMode ? 'from-[var(--dark-800)]/80 via-transparent to-transparent' : 'from-black/20 via-transparent to-transparent'
          }`} />
        </div>

        {/* 2. PROFILE INFO AREA */}
        <div className="relative px-4 sm:px-6 pb-6">
          
          <div className="flex flex-col md:flex-row items-start md:items-end -mt-12 mb-4">
            
            {/* AVATAR */}
            <div className="relative mr-5">
              <div className={`w-24 h-24 md:w-32 md:h-32 rounded-full border-4 overflow-hidden relative ${
                darkMode 
                  ? 'border-[var(--dark-800)] bg-[var(--dark-700)]' 
                  : 'border-white bg-white shadow-md'
              }`}>
                {avatarUrl ? (
                  <img src={avatarUrl} alt={club.name} className="w-full h-full object-cover" />
                ) : (
                  <div className={`w-full h-full flex items-center justify-center ${
                    darkMode ? 'bg-[var(--dark-600)]' : 'bg-gray-100'
                  }`}>
                    <span className={`text-2xl md:text-3xl font-bold ${
                      darkMode ? 'text-[var(--brand-light)]/60' : 'text-gray-500'
                    }`}>
                      {club.name.substring(0, 2).toUpperCase()}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* TEXT INFO */}
            <div className="flex-1 mt-4 md:mt-0 min-w-0">
              <h1 className={`text-2xl font-bold truncate font-heading ${
                darkMode ? 'text-[var(--brand-light)]' : 'text-gray-900'
              }`}>
                {club.name}
              </h1>
              <p className={`text-sm mb-3 ${
                darkMode ? 'text-[var(--brand-light)]/60' : 'text-gray-500'
              }`}>
                {club.municipality_name}
              </p>
            </div>

            {/* ACTIONS */}
            <div className="flex gap-3 mt-4 md:mt-0 md:ml-auto">
              {isYouth && !isHomeClub && (
                <button
                  onClick={handleFollowToggle}
                  disabled={loading}
                  className={`px-6 py-2 rounded-full font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                    isFollowing
                      ? darkMode
                        ? 'bg-[var(--dark-700)] hover:bg-[var(--dark-600)] text-[var(--brand-light)]/80 border border-[var(--dark-500)]'
                        : 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-300'
                      : darkMode
                        ? 'bg-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/90 text-[var(--dark-900)]'
                        : 'bg-blue-600 hover:bg-blue-700 text-white border-none'
                  }`}
                >
                  {loading ? 'Processing...' : isFollowing ? 'Unfollow' : 'Follow'}
                </button>
              )}
              
              {/* Badge for Home Club */}
              {isYouth && isHomeClub && (
                <span className={`px-4 py-2 rounded-full text-sm font-bold ${
                  darkMode 
                    ? 'bg-[var(--brand-third)] text-[var(--dark-900)]' 
                    : 'bg-green-500 text-white shadow-sm'
                }`}>
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
        darkMode={darkMode}
      />
    </>
  );
}
