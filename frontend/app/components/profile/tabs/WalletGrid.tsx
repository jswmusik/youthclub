'use client';

import { useState, useEffect } from 'react';

import { getMediaUrl } from '@/app/utils';
import api from '@/lib/api';
import { useRouter } from 'next/navigation';
import SwipeButton from '@/app/components/ui/SwipeButton';
import { WalletPageSkeleton } from '@/app/components/ui/Skeleton';
import { Wallet, Gift, Ticket, Check, Sparkles } from 'lucide-react';

// Minimum skeleton display time (in ms) for better UX
const MIN_LOADING_TIME = 400;

interface Reward {
  id: number;
  reward_id: number;
  reward_name: string;
  reward_image: string | null;
  description: string;
  is_redeemed: boolean;
  redeemed_at: string | null;
  created_at: string;
  expiration_date: string | null;
  sponsor: string;
}

export default function WalletGrid({ user, darkMode = false }: { user: any; darkMode?: boolean }) {
  const router = useRouter();
  const rewards: Reward[] = user?.my_rewards || [];
  const [selectedReward, setSelectedReward] = useState<Reward | null>(null);
  const [showSkeleton, setShowSkeleton] = useState(true);

  // Minimum loading time for skeleton display
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSkeleton(false);
    }, MIN_LOADING_TIME);
    return () => clearTimeout(timer);
  }, []);
  
  // Redeem State
  const [redeemState, setRedeemState] = useState<'IDLE' | 'SUCCESS' | 'ERROR'>('IDLE');
  const [feedbackMsg, setFeedbackMsg] = useState('');

  // Helper to check if expired
  const isExpired = (dateString: string | null) => {
    if (!dateString) return false;
    return new Date(dateString) < new Date();
  };

  const handleOpenModal = (reward: Reward) => {
    setSelectedReward(reward);
    setRedeemState('IDLE');
    setFeedbackMsg('');
  };

  // Show skeleton while loading
  if (showSkeleton || !user) {
    return <WalletPageSkeleton />;
  }

  const handleRedeem = async () => {
    if (!selectedReward || !selectedReward.reward_id) return;

    try {
      // Call Backend API - use reward_id, not the usage id
      await api.post(`/rewards/${selectedReward.reward_id}/redeem/`);
      
      setRedeemState('SUCCESS');
      setFeedbackMsg(`Used at ${new Date().toLocaleTimeString()}`);
      
      // Refresh page data after short delay so the user sees the "Used" state
      setTimeout(() => {
        router.refresh(); 
        // Note: In Next.js App Router, router.refresh() re-fetches server components. 
        // Since this is a client component consuming props passed from parent, 
        // we might need a full page reload or the parent to re-fetch.
        // For now, simple reload works or assuming parent re-renders.
        window.location.reload(); 
      }, 2000);

    } catch (error) {
      console.error("Redemption failed", error);
      setRedeemState('ERROR');
      setFeedbackMsg("Failed to process. Please try again.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className={`text-2xl font-bold flex items-center gap-3 font-heading ${
          darkMode ? 'text-[var(--brand-light)]' : 'text-[#4D4DA4]'
        }`}>
          <Wallet className={`w-6 h-6 ${darkMode ? 'text-[var(--brand-primary)]' : 'text-[#FF5485]'}`} />
          My Wallet
        </h3>
        <span className={`px-4 py-2 text-sm font-bold rounded-xl ${
          darkMode 
            ? 'bg-[var(--brand-primary)] text-[var(--dark-900)]' 
            : 'bg-gradient-to-r from-[#4D4DA4] to-[#6D6DD4] text-white shadow-md'
        }`}>
          {rewards.filter(r => !r.is_redeemed).length} Available
        </span>
      </div>

      {rewards.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {rewards.map((reward) => {
            const expired = isExpired(reward.expiration_date);
            const active = !reward.is_redeemed && !expired;

            return (
              <div 
                key={reward.id} 
                onClick={() => active && handleOpenModal(reward)}
                className={`
                  relative overflow-hidden transition-all duration-200
                  ${darkMode 
                    ? `bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-500)] ${active ? 'hover:border-[var(--brand-primary)]/50 cursor-pointer' : 'opacity-60'}`
                    : `border-2 rounded-2xl ${active 
                        ? 'bg-white border-[#4D4DA4]/20 shadow-lg hover:shadow-xl cursor-pointer hover:border-[#4D4DA4]/50 hover:scale-105' 
                        : 'bg-gray-50 border-gray-200 opacity-60'}`
                  }
                `}
              >
                {/* Image Section */}
                <div className={`h-40 relative ${
                  darkMode 
                    ? 'bg-gradient-to-br from-[var(--brand-secondary)] to-[var(--brand-purple)]' 
                    : 'bg-gradient-to-br from-[#EBEBFE] to-[#FFE8F0]'
                }`}>
                  {reward.reward_image ? (
                    <img 
                      src={getMediaUrl(reward.reward_image)} 
                      alt={reward.reward_name} 
                      className={`w-full h-full object-cover ${!active ? 'grayscale' : ''}`} 
                    />
                  ) : (
                    <div className={`w-full h-full flex items-center justify-center ${
                      darkMode 
                        ? 'bg-gradient-to-br from-[var(--brand-secondary)] to-[var(--brand-primary)]' 
                        : 'bg-gradient-to-br from-[#4D4DA4] to-[#FF5485]'
                    }`}>
                      <Gift className="w-16 h-16 text-white" />
                    </div>
                  )}
                  
                  {/* Status Badge */}
                  <div className="absolute top-3 right-3">
                    {reward.is_redeemed && (
                      <span className={`text-xs font-bold px-3 py-1.5 rounded-xl ${
                        darkMode 
                          ? 'bg-[var(--dark-600)] text-[var(--brand-light)]/60 border border-[var(--dark-400)]' 
                          : 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 shadow-md'
                      }`}>USED</span>
                    )}
                    {expired && !reward.is_redeemed && (
                      <span className={`text-xs font-bold px-3 py-1.5 rounded-xl ${
                        darkMode 
                          ? 'bg-[var(--brand-red)]/20 text-[var(--brand-red)] border border-[var(--brand-red)]/30' 
                          : 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-md'
                      }`}>EXPIRED</span>
                    )}
                  </div>
                  
                  {/* Active indicator */}
                  {active && (
                    <div className="absolute top-3 left-3">
                      <span className={`text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1 ${
                        darkMode 
                          ? 'bg-[var(--brand-third)]/20 text-[var(--brand-third)] border border-[var(--brand-third)]/30' 
                          : 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-md'
                      }`}>
                        <Sparkles className="w-3 h-3" />
                        READY
                      </span>
                    </div>
                  )}
                </div>

                {/* Ticket "Punch" Holes (Visual Flair) */}
                <div className={`absolute top-40 -left-2 w-5 h-5 rounded-full border-2 ${
                  darkMode 
                    ? 'bg-[var(--dark-900)] border-[var(--dark-500)]' 
                    : 'bg-[#f5f5ff] border-[#4D4DA4]/20'
                }`} />
                <div className={`absolute top-40 -right-2 w-5 h-5 rounded-full border-2 ${
                  darkMode 
                    ? 'bg-[var(--dark-900)] border-[var(--dark-500)]' 
                    : 'bg-[#f5f5ff] border-[#4D4DA4]/20'
                }`} />
                <div className={`border-t-2 border-dashed my-0 ${
                  darkMode ? 'border-[var(--dark-500)]' : 'border-[#4D4DA4]/20'
                }`} />

                {/* Content Section */}
                <div className="p-5">
                  <h4 className={`font-bold text-lg line-clamp-1 mb-2 font-heading ${
                    darkMode ? 'text-[var(--brand-light)]' : 'text-[#4D4DA4]'
                  }`}>{reward.reward_name}</h4>
                  <p className={`text-xs line-clamp-2 mb-3 ${
                    darkMode ? 'text-[var(--brand-light)]/60' : 'text-gray-600'
                  }`}>{reward.description}</p>
                  
                  {reward.sponsor && (
                     <p className={`text-xs font-bold mb-3 flex items-center gap-1 ${
                       darkMode ? 'text-[var(--brand-primary)]' : 'text-[#FF5485]'
                     }`}>
                       <Gift className="w-3 h-3" />
                       {reward.sponsor}
                     </p>
                  )}

                  {active && (
                    <div className={`mt-3 w-full py-2.5 text-xs font-bold rounded-xl text-center ${
                      darkMode 
                        ? 'bg-[var(--brand-secondary)] text-[var(--brand-light)]' 
                        : 'bg-gradient-to-r from-[#4D4DA4] to-[#6D6DD4] text-white shadow-md'
                    }`}>
                      Tap to Redeem
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className={`text-center py-16 rounded-none sm:rounded-2xl border-2 border-dashed ${
          darkMode 
            ? 'bg-[var(--dark-800)] border-[var(--dark-400)]' 
            : 'bg-gradient-to-br from-white to-[#EBEBFE]/30 border-[#4D4DA4]/30'
        }`}>
           <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full mb-4 ${
             darkMode 
               ? 'bg-[var(--dark-600)] border border-[var(--dark-400)]' 
               : 'bg-gradient-to-br from-[#4D4DA4]/10 to-[#FF5485]/10'
           }`}>
             <Ticket className={`w-10 h-10 ${darkMode ? 'text-[var(--brand-purple)]' : 'text-[#4D4DA4]'}`} />
           </div>
           <p className={`font-bold text-xl mb-2 font-heading ${
             darkMode ? 'text-[var(--brand-light)]' : 'text-[#4D4DA4]'
           }`}>Your wallet is empty.</p>
           <p className={`text-sm ${darkMode ? 'text-[var(--brand-light)]/60' : 'text-gray-600'}`}>Join events and club activities to earn rewards!</p>
        </div>
      )}

      {/* REDEMPTION MODAL */}
      {selectedReward && (
        <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm ${
          darkMode ? 'bg-black/80' : 'bg-black/80'
        }`} onClick={() => setSelectedReward(null)}>
           <div className={`max-w-md w-full p-8 pt-20 text-center relative ${
             darkMode 
               ? 'bg-[var(--dark-800)] rounded-xl border border-[var(--dark-500)]' 
               : 'bg-white rounded-3xl border-2 border-[#4D4DA4]/20 shadow-2xl'
           }`} onClick={e => e.stopPropagation()}>
              
              {/* Header Image */}
              <div className={`absolute -top-14 left-1/2 -translate-x-1/2 w-28 h-28 rounded-2xl flex items-center justify-center overflow-hidden border-4 ${
                darkMode 
                  ? 'bg-gradient-to-br from-[var(--brand-secondary)] to-[var(--brand-purple)] border-[var(--dark-800)]' 
                  : 'bg-gradient-to-br from-[#EBEBFE] to-[#FFE8F0] border-white shadow-xl'
              }`}>
                 {selectedReward.reward_image ? (
                    <img src={getMediaUrl(selectedReward.reward_image)} className="w-full h-full object-cover" />
                 ) : (
                    <Gift className={`w-14 h-14 ${darkMode ? 'text-[var(--brand-light)]' : 'text-[#4D4DA4]'}`} />
                 )}
              </div>

              <h3 className={`text-2xl font-bold mb-2 mt-2 font-heading ${
                darkMode ? 'text-[var(--brand-light)]' : 'text-[#4D4DA4]'
              }`}>{selectedReward.reward_name}</h3>
              <p className={`text-sm mb-3 px-2 ${darkMode ? 'text-[var(--brand-light)]/60' : 'text-gray-600'}`}>{selectedReward.description}</p>
              
              {selectedReward.sponsor && (
                <p className={`text-sm font-bold mb-6 flex items-center justify-center gap-1 ${
                  darkMode ? 'text-[var(--brand-primary)]' : 'text-[#FF5485]'
                }`}>
                  <Gift className="w-4 h-4" />
                  Sponsored by {selectedReward.sponsor}
                </p>
              )}
              
              {/* INTERACTIVE AREA */}
              <div className="mb-6">
                 {redeemState === 'IDLE' && (
                    <div className="space-y-4">
                       <div className={`p-4 text-sm rounded-xl font-semibold ${
                         darkMode 
                           ? 'bg-[var(--brand-peach)]/10 text-[var(--brand-peach)] border border-[var(--brand-peach)]/30' 
                           : 'bg-gradient-to-r from-amber-50 to-amber-100 text-amber-800 border-2 border-amber-200'
                       }`}>
                          ⚠️ Show this screen to the staff before swiping.
                       </div>
                       
                       <SwipeButton 
                          onSuccess={handleRedeem} 
                          text="Slide to Redeem"
                          color="blue"
                       />
                    </div>
                 )}

                 {redeemState === 'SUCCESS' && (
                    <div className="py-6 animate-in fade-in zoom-in duration-300">
                        <div className={`w-20 h-20 text-white rounded-2xl flex items-center justify-center mx-auto mb-4 ${
                          darkMode 
                            ? 'bg-[var(--brand-third)]' 
                            : 'bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-lg'
                        }`}>
                           <Check className="w-10 h-10" />
                        </div>
                        <h4 className={`text-2xl font-bold mb-2 font-heading ${
                          darkMode ? 'text-[var(--brand-third)]' : 'text-emerald-500'
                        }`}>Redeemed!</h4>
                        <p className={`text-sm ${darkMode ? 'text-[var(--brand-light)]/60' : 'text-gray-600'}`}>{feedbackMsg}</p>
                    </div>
                 )}

                 {redeemState === 'ERROR' && (
                    <div className="py-4">
                       <div className={`w-20 h-20 text-white rounded-2xl flex items-center justify-center mx-auto mb-4 ${
                         darkMode 
                           ? 'bg-[var(--brand-red)]' 
                           : 'bg-gradient-to-br from-red-500 to-red-600 shadow-lg'
                       }`}>
                          <span className="text-3xl">✕</span>
                       </div>
                       <p className={`text-xl font-bold mb-2 font-heading ${
                         darkMode ? 'text-[var(--brand-red)]' : 'text-red-500'
                       }`}>Error!</p>
                       <p className={`text-sm mb-4 ${darkMode ? 'text-[var(--brand-light)]/60' : 'text-gray-600'}`}>{feedbackMsg}</p>
                       <button 
                         onClick={() => setRedeemState('IDLE')}
                         className={`px-4 py-2 rounded-xl font-bold text-sm ${
                           darkMode 
                             ? 'bg-[var(--brand-secondary)] text-[var(--brand-light)]' 
                             : 'bg-gradient-to-r from-[#4D4DA4] to-[#6D6DD4] text-white shadow-md'
                         }`}
                       >
                         Try Again
                       </button>
                    </div>
                 )}
              </div>
              
              <button 
                onClick={() => setSelectedReward(null)}
                className={`w-full py-3 rounded-xl font-bold text-sm transition-colors ${
                  darkMode 
                    ? 'bg-[var(--dark-600)] hover:bg-[var(--dark-500)] text-[var(--brand-light)]/80 border border-[var(--dark-400)]' 
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                }`}
              >
                Close
              </button>
           </div>
        </div>
      )}
    </div>
  );
}

