'use client';

import { useState } from 'react';
import { getMediaUrl } from '@/app/utils';
import api from '@/lib/api';
import { useRouter } from 'next/navigation';
import SwipeButton from '@/app/components/ui/SwipeButton';

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

export default function WalletGrid({ user }: { user: any }) {
  const router = useRouter();
  const rewards: Reward[] = user.my_rewards || [];
  const [selectedReward, setSelectedReward] = useState<Reward | null>(null);
  
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
        <h3 className="text-lg font-bold text-gray-200 flex items-center gap-2">
          <svg className="w-5 h-5 text-emerald-400" fill="currentColor" viewBox="0 0 24 24"><path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          My Wallet
        </h3>
        <span className="text-xs font-medium text-gray-400">
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
                  relative border rounded-xl overflow-hidden transition-all duration-200
                  ${active 
                    ? 'bg-[#050505] border-[#262626] shadow-sm hover:shadow-md cursor-pointer hover:border-[#4D4DA4]/40' 
                    : 'bg-[#0a0a0a] border-[#262626] opacity-70'}
                `}
              >
                {/* Image Section */}
                <div className="h-32 bg-black relative">
                  {reward.reward_image ? (
                    <img 
                      src={getMediaUrl(reward.reward_image)} 
                      alt={reward.reward_name} 
                      className={`w-full h-full object-cover ${!active ? 'grayscale' : ''}`} 
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-emerald-500 to-[#4D4DA4]">
                      <span className="text-4xl">🎁</span>
                    </div>
                  )}
                  
                  {/* Status Badge */}
                  <div className="absolute top-2 right-2">
                    {reward.is_redeemed && (
                      <span className="bg-[#0a0a0a] text-gray-300 border border-[#262626] text-xs font-bold px-2 py-1 rounded">USED</span>
                    )}
                    {expired && !reward.is_redeemed && (
                      <span className="bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-bold px-2 py-1 rounded">EXPIRED</span>
                    )}
                  </div>
                </div>

                {/* Ticket "Punch" Holes (Visual Flair) */}
                <div className="absolute top-32 -left-2 w-4 h-4 bg-[#050505] rounded-full" />
                <div className="absolute top-32 -right-2 w-4 h-4 bg-[#050505] rounded-full" />
                <div className="border-t border-dashed border-[#262626] my-0" />

                {/* Content Section */}
                <div className="p-4">
                  <h4 className="font-bold text-gray-200 line-clamp-1">{reward.reward_name}</h4>
                  <p className="text-xs text-gray-400 mt-1 line-clamp-2">{reward.description}</p>
                  
                  {reward.sponsor && (
                     <p className="text-xs text-[#6D6DD4] mt-2 font-medium">Sponsored by {reward.sponsor}</p>
                  )}

                  {active && (
                    <div className="mt-3 w-full py-1.5 bg-[#4D4DA4]/20 text-[#6D6DD4] border border-[#4D4DA4]/30 text-xs font-bold rounded-lg text-center">
                      Tap to Redeem
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-10 bg-[#050505] rounded-xl border border-dashed border-[#262626]">
           <div className="text-4xl mb-3">🎟️</div>
           <p className="text-gray-400 font-medium">Your wallet is empty.</p>
           <p className="text-sm text-gray-500">Join events and club activities to earn rewards!</p>
        </div>
      )}

      {/* REDEMPTION MODAL */}
      {selectedReward && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setSelectedReward(null)}>
           <div className="bg-[#050505] rounded-2xl max-w-sm w-full p-6 text-center relative overflow-hidden border border-[#262626]" onClick={e => e.stopPropagation()}>
              
              {/* Header Image */}
              <div className="w-20 h-20 mx-auto bg-[#0a0a0a] rounded-full flex items-center justify-center mb-4 overflow-hidden border-4 border-[#050505] shadow-lg -mt-10">
                 {selectedReward.reward_image ? (
                    <img src={getMediaUrl(selectedReward.reward_image)} className="w-full h-full object-cover" />
                 ) : (
                    <span className="text-3xl">🎁</span>
                 )}
              </div>

              <h3 className="text-xl font-bold text-gray-200 mb-1">{selectedReward.reward_name}</h3>
              <p className="text-sm text-gray-400 mb-6 px-4">{selectedReward.description}</p>
              
              {/* INTERACTIVE AREA */}
              <div className="mb-6">
                 {redeemState === 'IDLE' && (
                    <div className="space-y-3">
                       <div className="p-3 bg-yellow-500/20 text-yellow-400 text-xs rounded-lg border border-yellow-500/30">
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
                    <div className="py-4 animate-in fade-in zoom-in duration-300">
                        <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full flex items-center justify-center mx-auto mb-3">
                           <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" /></svg>
                        </div>
                        <h4 className="text-lg font-bold text-emerald-400">Redeemed!</h4>
                        <p className="text-xs text-gray-400 mt-1">{feedbackMsg}</p>
                    </div>
                 )}

                 {redeemState === 'ERROR' && (
                    <div className="py-2 text-red-400">
                       <p className="text-sm font-bold">Error!</p>
                       <p className="text-xs">{feedbackMsg}</p>
                       <button 
                         onClick={() => setRedeemState('IDLE')}
                         className="mt-2 text-xs underline"
                       >
                         Try Again
                       </button>
                    </div>
                 )}
              </div>
              
              <button 
                onClick={() => setSelectedReward(null)}
                className="w-full py-2 border border-[#262626] rounded-lg text-gray-300 font-medium hover:bg-[#0a0a0a] text-sm"
              >
                Close
              </button>
           </div>
        </div>
      )}
    </div>
  );
}

