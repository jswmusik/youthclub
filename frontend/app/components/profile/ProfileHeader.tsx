'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { updateUserProfile } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { Camera, User, MessageCircle, Pencil, Calendar, CheckCircle2, Clock, XCircle, Settings } from 'lucide-react';

// Define simplified interfaces for props to avoid circular dependency hell
// In a real app, import these from your types/user.ts
interface ProfileHeaderProps {
  user: any; // We use 'any' here for flexibility, but strictly it matches your User interface
  primaryClub?: any;
  darkMode?: boolean;
}

export default function ProfileHeader({ user, primaryClub, darkMode = false }: ProfileHeaderProps) {
  const router = useRouter();
  const { refreshMessageCount } = useAuth(); // Optional: trigger context refresh if needed
  const t = useTranslations('profile');
  const tNav = useTranslations('nav');
  
  // Local state for UI feedback
  const [isUploading, setIsUploading] = useState(false);
  const [mood, setMood] = useState(user.mood_status || '');
  const [isEditingMood, setIsEditingMood] = useState(false);

  // File input refs
  const backgroundInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // --- HANDLERS ---

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>, type: 'avatar' | 'background') => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      if (type === 'avatar') {
        await updateUserProfile({ avatar: file });
      } else {
        await updateUserProfile({ background_image: file });
      }
      // Force a refresh so the new image loads
      router.refresh();
      // In a production app, you might want to update local state optimistically or re-fetch user
      window.location.reload(); // Simple way to ensure images update immediately
    } catch (error) {
      console.error(`Failed to upload ${type}`, error);
      alert('Failed to upload image. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const saveMood = async () => {
    setIsEditingMood(false);
    if (mood === user.mood_status) return; // No change

    try {
      await updateUserProfile({ mood_status: mood });
      router.refresh();
    } catch (error) {
      console.error("Failed to update mood", error);
      // Revert on error
      setMood(user.mood_status || '');
    }
  };

  // --- VISUAL HELPERS ---

  // Determine Background Image: User's custom BG -> Club Hero -> Default Gradient
  const backgroundImage = user.background_image 
    ? user.background_image 
    : primaryClub?.hero_image 
      ? primaryClub.hero_image 
      : null; // Will fall back to CSS gradient

  // Verification Badge Logic
  const getVerificationBadge = () => {
    switch (user.verification_status) {
      case 'VERIFIED':
        return (
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
            darkMode 
              ? 'bg-[var(--brand-green)]/20 text-[var(--brand-green)] border border-[var(--brand-green)]/30'
              : 'bg-[var(--brand-green)]/20 text-[var(--brand-green)] border border-[var(--brand-green)]/30'
          }`}>
            <CheckCircle2 className="w-3 h-3" />
            {t('verifiedMember')}
          </span>
        );
      case 'PENDING':
        return (
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
            darkMode
              ? 'bg-[var(--brand-peach)]/20 text-[var(--brand-peach)] border border-[var(--brand-peach)]/30'
              : 'bg-yellow-500/20 text-yellow-600 border border-yellow-500/30'
          }`}>
            <Clock className="w-3 h-3" />
            {t('verificationPending')}
          </span>
        );
      default:
        return (
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold cursor-pointer transition ${
            darkMode
              ? 'bg-[var(--brand-red)]/20 text-[var(--brand-red)] border border-[var(--brand-red)]/30 hover:bg-[var(--brand-red)]/30'
              : 'bg-red-500/20 text-red-500 border border-red-500/30 hover:bg-red-500/30'
          }`}>
            <XCircle className="w-3 h-3" />
             {t('unverified')}
          </span>
        );
    }
  };

  return (
    <div className={`rounded-none sm:rounded-xl overflow-hidden border-y sm:border ${
      darkMode 
        ? 'bg-[var(--dark-800)] border-[var(--dark-500)]' 
        : 'bg-white border-gray-200 shadow-lg'
    }`}>
      
      {/* 1. COVER IMAGE AREA */}
      <div 
        className="relative h-48 md:h-64 w-full bg-cover bg-center group"
        style={{ 
          backgroundImage: backgroundImage 
            ? `url(${backgroundImage})` 
            : darkMode 
              ? 'linear-gradient(to right, var(--brand-secondary), var(--brand-primary))'
              : 'linear-gradient(to right, #4D4DA4, #FF5485)',
          backgroundColor: darkMode ? 'var(--dark-700)' : '#e5e7eb'
        }}
      >
        {/* Light Overlay on Hover for Edit */}
        <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition duration-300" />

        {/* Edit Background Button */}
        <button 
          onClick={() => backgroundInputRef.current?.click()}
          disabled={isUploading}
          className={`absolute top-4 right-4 p-2 rounded-full backdrop-blur-sm transition opacity-0 group-hover:opacity-100 ${
            darkMode
              ? 'bg-[var(--dark-700)]/90 hover:bg-[var(--dark-600)] text-[var(--brand-light)] border border-[var(--dark-500)]'
              : 'bg-white/90 hover:bg-white text-gray-700 shadow-sm border border-gray-200'
          }`}
          title={t('changeCover')}
        >
          <Camera className="w-5 h-5" />
        </button>
        
        <input 
          type="file" 
          ref={backgroundInputRef} 
          className="hidden" 
          accept="image/*"
          onChange={(e) => handleFileChange(e, 'background')}
        />
      </div>

      {/* 2. PROFILE INFO AREA */}
      <div className="relative px-3 sm:px-4 md:px-6 pb-6">
        
        <div className="flex flex-col md:flex-row items-start md:items-end -mt-12 mb-4">
          
          {/* AVATAR */}
          <div className="relative group mr-5">
            <div className={`w-24 h-24 md:w-32 md:h-32 rounded-full border-4 overflow-hidden relative ${
              darkMode 
                ? 'border-[var(--dark-800)] bg-[var(--dark-700)]' 
                : 'border-white bg-white shadow-md'
            }`}>
              {user.avatar ? (
                <img src={user.avatar} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <div className={`w-full h-full flex items-center justify-center ${
                  darkMode ? 'bg-[var(--dark-600)] text-[var(--brand-light)]/40' : 'bg-gray-200 text-gray-400'
                }`}>
                  <User className="w-12 h-12" />
                </div>
              )}
              
              {/* Edit Avatar Overlay */}
              <div 
                onClick={() => avatarInputRef.current?.click()}
                className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center cursor-pointer"
              >
                 <Camera className="w-8 h-8 text-white" />
              </div>
            </div>
            
            <input 
              type="file" 
              ref={avatarInputRef} 
              className="hidden" 
              accept="image/*"
              onChange={(e) => handleFileChange(e, 'avatar')}
            />
          </div>

          {/* TEXT INFO */}
          <div className="flex-1 mt-4 md:mt-0 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h1 className={`text-2xl md:text-3xl lg:text-4xl font-bold truncate font-heading font-bold ${
                darkMode 
                  ? 'text-[var(--brand-primary)] md:bg-[var(--dark-700)]/80 md:backdrop-blur-sm md:px-4 md:py-2 md:rounded-xl' 
                  : 'text-[#4D4DA4] md:bg-white/60 md:backdrop-blur-sm md:px-4 md:py-2 md:rounded-xl md:shadow-sm'
              }`}>
                {user.first_name} {user.last_name}
              </h1>
              {getVerificationBadge()}
            </div>

            {/* Nickname & Grade */}
            <p className={`text-sm mb-3 ${darkMode ? 'text-[var(--brand-light)]/60' : 'text-gray-600'}`}>
              {user.nickname && <span className="mr-2">@{user.nickname}</span>}
              {user.grade && <span className={`px-2 border-l ${darkMode ? 'border-[var(--dark-500)]' : 'border-gray-300'}`}>{t('grade')} {user.grade}</span>}
            </p>

            {/* MOOD STATUS */}
            <div className="relative max-w-md">
               {isEditingMood ? (
                 <div className="flex items-center gap-2">
                   <input 
                    autoFocus
                    type="text" 
                    value={mood}
                    onChange={(e) => setMood(e.target.value)}
                    onBlur={saveMood}
                    onKeyDown={(e) => e.key === 'Enter' && saveMood()}
                    placeholder={t('whatsOnYourMind')}
                    className={`w-full px-3 py-1 text-sm border rounded-lg outline-none ${
                      darkMode
                        ? 'border-[var(--dark-500)] bg-[var(--dark-700)] text-[var(--brand-light)] placeholder-[var(--brand-light)]/40 focus:ring-2 focus:ring-[var(--brand-primary)] focus:border-[var(--brand-primary)]'
                        : 'border-gray-300 bg-gray-50 text-gray-800 focus:ring-2 focus:ring-[#4D4DA4] focus:border-[#4D4DA4]'
                    }`}
                   />
                 </div>
               ) : (
                 <div 
                   onClick={() => setIsEditingMood(true)}
                   className={`group flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg cursor-pointer transition w-fit border ${
                     darkMode
                       ? 'text-[var(--brand-light)]/80 bg-[var(--dark-700)] hover:bg-[var(--dark-600)] border-[var(--dark-500)] hover:border-[var(--brand-primary)]/40'
                       : 'text-gray-700 bg-gray-50 hover:bg-gray-100 border-gray-200 hover:border-[#4D4DA4]/40'
                   }`}
                 >
                   <MessageCircle className={`w-4 h-4 ${darkMode ? 'text-[var(--brand-light)]/50' : 'text-gray-500'}`} />
                   <span className={!mood 
                     ? `italic ${darkMode ? 'text-[var(--brand-light)]/40' : 'text-gray-400'}` 
                     : `font-medium ${darkMode ? 'text-[var(--brand-light)]' : 'text-gray-700'}`
                   }>
                     {mood || t('setStatus')}
                   </span>
                   <Pencil className={`w-3 h-3 opacity-0 group-hover:opacity-100 ml-1 ${darkMode ? 'text-[var(--brand-light)]/40' : 'text-gray-400'}`} />
                 </div>
               )}
            </div>
          </div>

          {/* ACTIONS (Desktop Right / Mobile Bottom) */}
          <div className="flex gap-3 mt-4 md:mt-0 md:ml-auto">
             {/* Check In Button */}
             <button 
               onClick={() => router.push('/dashboard/youth/scan')}
               className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
                 darkMode
                   ? 'bg-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/80 text-[var(--dark-900)]'
                   : 'bg-[#4D4DA4] hover:bg-[#6D6DD4] text-white shadow-sm shadow-[#4D4DA4]/30'
               }`}
             >
               <Calendar className="w-4 h-4" />
               {tNav('checkIn')}
             </button>
             
             {/* Edit Profile Button */}
             <button 
               onClick={() => router.push('/dashboard/youth/profile/edit')}
               className={`flex items-center gap-2 px-4 py-2 border rounded-lg text-sm font-medium transition ${
                 darkMode
                   ? 'bg-[var(--dark-700)] border-[var(--dark-500)] hover:bg-[var(--dark-600)] text-[var(--brand-light)]'
                   : 'bg-white border-gray-200 hover:bg-gray-50 text-gray-700 shadow-sm'
               }`}
             >
                <Settings className="w-4 h-4" />
                {t('editProfile')}
             </button>
          </div>

        </div>
      </div>
    </div>
  );
}

