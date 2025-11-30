'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { updateUserProfile } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

// Define simplified interfaces for props to avoid circular dependency hell
// In a real app, import these from your types/user.ts
interface ProfileHeaderProps {
  user: any; // We use 'any' here for flexibility, but strictly it matches your User interface
  primaryClub?: any;
}

export default function ProfileHeader({ user, primaryClub }: ProfileHeaderProps) {
  const router = useRouter();
  const { refreshMessageCount } = useAuth(); // Optional: trigger context refresh if needed
  
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
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700 border border-green-200">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/></svg>
            Verified Member
          </span>
        );
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-700 border border-yellow-200">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd"/></svg>
            Verification Pending
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700 border border-red-200 cursor-pointer hover:bg-red-200 transition">
             Unverified
          </span>
        );
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
      
      {/* 1. COVER IMAGE AREA */}
      <div 
        className="relative h-48 md:h-64 bg-gray-200 w-full bg-cover bg-center group"
        style={{ 
          backgroundImage: backgroundImage ? `url(${backgroundImage})` : 'linear-gradient(to right, #4F46E5, #9333EA)'
        }}
      >
        {/* Dark Overlay on Hover for Edit */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition duration-300" />

        {/* Edit Background Button */}
        <button 
          onClick={() => backgroundInputRef.current?.click()}
          disabled={isUploading}
          className="absolute top-4 right-4 bg-white/80 hover:bg-white text-gray-700 p-2 rounded-full shadow-sm backdrop-blur-sm transition opacity-0 group-hover:opacity-100"
          title="Change Cover Photo"
        >
          {/* Camera Icon */}
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
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
      <div className="relative px-6 pb-6">
        
        <div className="flex flex-col md:flex-row items-start md:items-end -mt-12 mb-4">
          
          {/* AVATAR */}
          <div className="relative group mr-5">
            <div className="w-24 h-24 md:w-32 md:h-32 rounded-full border-4 border-white bg-white shadow-md overflow-hidden relative">
              {user.avatar ? (
                <img src={user.avatar} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gray-100 flex items-center justify-center text-gray-400">
                  <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 24 24"><path d="M24 20.993V24H0v-2.996A14.977 14.977 0 0112.004 15c4.904 0 9.26 2.354 11.996 5.993zM16.002 8.999a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                </div>
              )}
              
              {/* Edit Avatar Overlay */}
              <div 
                onClick={() => avatarInputRef.current?.click()}
                className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition flex items-center justify-center cursor-pointer"
              >
                 <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
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
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl font-bold text-gray-900 truncate">
                {user.first_name} {user.last_name}
              </h1>
              {getVerificationBadge()}
            </div>

            {/* Nickname & Grade */}
            <p className="text-gray-500 text-sm mb-3">
              {user.nickname && <span className="mr-2">@{user.nickname}</span>}
              {user.grade && <span className="px-2 border-l border-gray-300">Grade {user.grade}</span>}
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
                    placeholder="What's on your mind?"
                    className="w-full px-3 py-1 text-sm border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                   />
                 </div>
               ) : (
                 <div 
                   onClick={() => setIsEditingMood(true)}
                   className="group flex items-center gap-2 text-sm text-gray-600 bg-gray-50 hover:bg-gray-100 px-3 py-1.5 rounded-lg cursor-pointer transition w-fit border border-transparent hover:border-gray-200"
                 >
                   {/* Chat Bubble Icon */}
                   <span className="text-gray-400">💬</span>
                   <span className={!mood ? "italic text-gray-400" : "font-medium"}>
                     {mood || "Set a status..."}
                   </span>
                   {/* Edit Pencil (Hidden until hover) */}
                   <svg className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                 </div>
               )}
            </div>
          </div>

          {/* ACTIONS (Desktop Right / Mobile Bottom) */}
          <div className="flex gap-3 mt-4 md:mt-0 md:ml-auto">
             {/* Check In Button (Visual Only for now) */}
             <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition shadow-sm">
               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" /></svg>
               Check In
             </button>
             
             {/* Edit Profile Button */}
             <button 
               onClick={() => router.push('/dashboard/youth/profile/edit')}
               className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg text-sm font-medium transition shadow-sm"
             >
                Edit Profile
             </button>
          </div>

        </div>
      </div>
    </div>
  );
}

