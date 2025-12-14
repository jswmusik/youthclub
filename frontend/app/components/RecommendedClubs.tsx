'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { fetchClubsByMunicipality, followClub, unfollowClub } from '../../lib/api';
import { getMediaUrl } from '../utils';
import { useAuth } from '../../context/AuthContext';
import api, { API_URL } from '../../lib/api';
import Toast from './Toast';

interface Club {
    id: number;
    name: string;
    description: string;
    avatar?: string | null;
    hero_image?: string | null;
    municipality: number;
    municipality_name: string;
}

export default function RecommendedClubs() {
    const router = useRouter();
    const { user, refreshUser } = useAuth();
    const [clubs, setClubs] = useState<Club[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isFollowing, setIsFollowing] = useState<Record<number, boolean>>({});
    const [toast, setToast] = useState({ message: '', type: 'success' as 'success' | 'error', isVisible: false });

    // Number of clubs to show at once - responsive: 2 on mobile, 3 on desktop
    const [clubsPerView, setClubsPerView] = useState(3);
    
    useEffect(() => {
        const updateClubsPerView = () => {
            if (window.innerWidth < 768) {
                setClubsPerView(2); // Mobile: 2 clubs
            } else {
                setClubsPerView(3); // Desktop: 3 clubs
            }
        };
        
        updateClubsPerView();
        window.addEventListener('resize', updateClubsPerView);
        return () => window.removeEventListener('resize', updateClubsPerView);
    }, []);

    useEffect(() => {
        loadRecommendedClubs();
    }, [user]);

    // Initialize isFollowing state from user's followed_clubs_ids
    useEffect(() => {
        if (user?.followed_clubs_ids) {
            const followingMap: Record<number, boolean> = {};
            user.followed_clubs_ids.forEach((clubId: number) => {
                followingMap[clubId] = true;
            });
            setIsFollowing(followingMap);
        }
    }, [user?.followed_clubs_ids]);

    const loadRecommendedClubs = async () => {
        if (!user?.preferred_club) {
            setLoading(false);
            return;
        }

        try {
            // preferred_club is now an object (from ClubSerializer), not just an ID
            const preferredClub = typeof user.preferred_club === 'object' 
                ? user.preferred_club 
                : null;
            
            if (!preferredClub || !preferredClub.id) {
                setLoading(false);
                return;
            }

            // Get municipality ID from the preferred_club object
            // municipality should be an ID (number), but handle both object and ID cases
            const municipalityId = typeof preferredClub.municipality === 'object' 
                ? preferredClub.municipality.id || preferredClub.municipality
                : preferredClub.municipality;
            
            if (!municipalityId) {
                setLoading(false);
                return;
            }
            
            const response = await fetchClubsByMunicipality(municipalityId);
            const allClubs = response.data.results || response.data || [];
            
            // Filter out user's current club
            const otherClubs = allClubs.filter((club: Club) => club.id !== preferredClub.id);
            
            setClubs(otherClubs);
        } catch (error) {
            console.error('Failed to load recommended clubs:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleFollow = async (clubId: number) => {
        // Optimistic UI Update: Toggle immediately
        const previouslyFollowing = isFollowing[clubId];
        setIsFollowing(prev => ({ ...prev, [clubId]: !previouslyFollowing }));

        try {
            if (previouslyFollowing) {
                // It was true, so now we are UNFOLLOWING
                await unfollowClub(clubId);
                setToast({ message: 'Unfollowed club', type: 'success', isVisible: true });
            } else {
                // It was false/undefined, so now we are FOLLOWING
                await followClub(clubId);
                setToast({ message: 'Following club', type: 'success', isVisible: true });
            }
            
            // Refresh user context to sync the 'followed_clubs_ids' array
            await refreshUser();
            
        } catch (error) {
            console.error("Follow action failed", error);
            setToast({ message: 'Action failed', type: 'error', isVisible: true });
            // Revert UI on error
            setIsFollowing(prev => ({ ...prev, [clubId]: previouslyFollowing }));
        }
    };

    const handlePrevious = () => {
        setCurrentIndex(prev => Math.max(0, prev - clubsPerView));
    };

    const handleNext = () => {
        setCurrentIndex(prev => Math.min(clubs.length - clubsPerView, prev + clubsPerView));
    };

    // Don't show if no clubs or loading
    if (loading || clubs.length === 0) {
        return null;
    }

    const visibleClubs = clubs.slice(currentIndex, currentIndex + clubsPerView);
    const canGoPrevious = currentIndex > 0;
    const canGoNext = currentIndex + clubsPerView < clubs.length;

    return (
        <>
            <div className="bg-[#0a0a0a] rounded-2xl shadow-lg border border-[#262626] p-4 mb-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-gray-200">Recommended Clubs</h3>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handlePrevious}
                            disabled={!canGoPrevious}
                            className={`p-2 rounded-full transition-colors ${
                                canGoPrevious 
                                    ? 'bg-[#050505] hover:bg-[#0f0f0f] text-gray-300 border border-[#262626]' 
                                    : 'bg-[#050505] text-gray-600 cursor-not-allowed border border-[#262626]'
                            }`}
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>
                        <button
                            onClick={handleNext}
                            disabled={!canGoNext}
                            className={`p-2 rounded-full transition-colors ${
                                canGoNext 
                                    ? 'bg-[#050505] hover:bg-[#0f0f0f] text-gray-300 border border-[#262626]' 
                                    : 'bg-[#050505] text-gray-600 cursor-not-allowed border border-[#262626]'
                            }`}
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        </button>
                    </div>
                </div>

                <div className={`grid gap-4 ${clubsPerView === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
                    {visibleClubs.map((club) => (
                        <div 
                            key={club.id} 
                            className="border border-[#262626] rounded-lg overflow-hidden hover:border-[#4D4DA4]/40 transition-all cursor-pointer bg-[#050505]"
                            onClick={() => router.push(`/dashboard/youth/club/${club.id}`)}
                        >
                            {/* Cover Image */}
                            <div className="relative h-32 bg-gradient-to-br from-[#4D4DA4] to-[#FF5485]">
                                {club.hero_image ? (
                                    <img 
                                        src={getMediaUrl(club.hero_image)} 
                                        alt={club.name}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                        <span className="text-white text-2xl font-bold">
                                            {club.name.charAt(0).toUpperCase()}
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* Club Info */}
                            <div className="p-3">
                                <div className="flex items-start gap-2 mb-2">
                                    {club.avatar ? (
                                        <img 
                                            src={getMediaUrl(club.avatar)} 
                                            alt={club.name}
                                            className="w-10 h-10 rounded-full object-cover border-2 border-[#0a0a0a] -mt-6 relative z-10 bg-[#0a0a0a]"
                                        />
                                    ) : (
                                        <div className="w-10 h-10 rounded-full bg-[#4D4DA4] flex items-center justify-center border-2 border-[#0a0a0a] -mt-6 relative z-10">
                                            <span className="text-white font-bold text-sm">
                                                {club.name.charAt(0).toUpperCase()}
                                            </span>
                                        </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-bold text-gray-200 text-sm truncate">{club.name}</h4>
                                        <p className="text-xs text-gray-400 truncate">{club.municipality_name}</p>
                                    </div>
                                </div>

                                {/* Description */}
                                <p className="text-xs text-gray-400 line-clamp-2 mb-3">
                                    {club.description}
                                </p>

                                {/* Follow Button */}
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleFollow(club.id);
                                    }}
                                    className={`w-full py-2 px-4 rounded-lg font-medium text-sm transition-colors ${
                                        isFollowing[club.id]
                                            ? 'bg-[#262626] text-gray-300 hover:bg-[#323235] border border-[#262626]'
                                            : 'bg-[#4D4DA4] text-white hover:bg-[#5D5DB4] shadow-lg shadow-[#4D4DA4]/20'
                                    }`}
                                >
                                    {isFollowing[club.id] ? 'Following' : 'Follow'}
                                </button>
                            </div>
                        </div>
                    ))}
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

