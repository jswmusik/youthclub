'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
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

interface RecommendedClubsProps {
    darkMode?: boolean;
}

export default function RecommendedClubs({ darkMode }: RecommendedClubsProps = {}) {
    const router = useRouter();
    const { user, refreshUser } = useAuth();
    const t = useTranslations('recommended');
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
                setToast({ message: t('unfollowedClub'), type: 'success', isVisible: true });
            } else {
                // It was false/undefined, so now we are FOLLOWING
                await followClub(clubId);
                setToast({ message: t('followingClub'), type: 'success', isVisible: true });
            }
            
            // Refresh user context to sync the 'followed_clubs_ids' array
            await refreshUser();
            
        } catch (error) {
            console.error("Follow action failed", error);
            setToast({ message: t('actionFailed'), type: 'error', isVisible: true });
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
            <div className={`rounded-2xl p-4 mb-6 ${
                darkMode
                    ? 'bg-[var(--dark-700)] border border-[var(--dark-500)]'
                    : 'bg-white shadow-lg border border-gray-200'
            }`}>
                <div className="flex items-center justify-between mb-4">
                    <h3 className={`text-lg font-bold ${
                        darkMode ? 'text-[var(--brand-light)]' : 'text-gray-800'
                    }`}>{t('recommendedClubs')}</h3>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handlePrevious}
                            disabled={!canGoPrevious}
                            className={`p-2 rounded-full transition-colors ${
                                darkMode
                                    ? canGoPrevious 
                                        ? 'bg-[var(--dark-600)] hover:bg-[var(--dark-500)] text-[var(--brand-light)] border border-[var(--dark-500)]' 
                                        : 'bg-[var(--dark-600)] text-[var(--brand-light)]/30 cursor-not-allowed border border-[var(--dark-500)]'
                                    : canGoPrevious 
                                        ? 'bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200' 
                                        : 'bg-gray-50 text-gray-400 cursor-not-allowed border border-gray-200'
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
                                darkMode
                                    ? canGoNext 
                                        ? 'bg-[var(--dark-600)] hover:bg-[var(--dark-500)] text-[var(--brand-light)] border border-[var(--dark-500)]' 
                                        : 'bg-[var(--dark-600)] text-[var(--brand-light)]/30 cursor-not-allowed border border-[var(--dark-500)]'
                                    : canGoNext 
                                        ? 'bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200' 
                                        : 'bg-gray-50 text-gray-400 cursor-not-allowed border border-gray-200'
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
                            className={`rounded-lg overflow-hidden transition-all cursor-pointer ${
                                darkMode
                                    ? 'bg-[var(--dark-600)] border border-[var(--dark-500)] hover:border-[var(--brand-primary)]/40'
                                    : 'border border-gray-200 hover:border-[#4D4DA4]/40 bg-white'
                            }`}
                            onClick={() => router.push(`/dashboard/youth/club/${club.id}`)}
                        >
                            {/* Cover Image */}
                            <div className={`relative h-32 ${
                                darkMode
                                    ? 'bg-gradient-to-br from-[var(--brand-secondary)] to-[var(--brand-primary)]'
                                    : 'bg-gradient-to-br from-[#4D4DA4] to-[#FF5485]'
                            }`}>
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
                                            className={`w-10 h-10 rounded-full object-cover border-2 -mt-6 relative z-10 ${
                                                darkMode
                                                    ? 'border-[var(--dark-600)] bg-[var(--dark-600)]'
                                                    : 'border-white bg-white'
                                            }`}
                                        />
                                    ) : (
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 -mt-6 relative z-10 ${
                                            darkMode
                                                ? 'bg-[var(--brand-secondary)] border-[var(--dark-600)]'
                                                : 'bg-[#4D4DA4] border-white'
                                        }`}>
                                            <span className="text-white font-bold text-sm">
                                                {club.name.charAt(0).toUpperCase()}
                                            </span>
                                        </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <h4 className={`font-bold text-sm truncate ${
                                            darkMode ? 'text-[var(--brand-light)]' : 'text-gray-800'
                                        }`}>{club.name}</h4>
                                        <p className={`text-xs truncate ${
                                            darkMode ? 'text-[var(--brand-light)]/60' : 'text-gray-600'
                                        }`}>{club.municipality_name}</p>
                                    </div>
                                </div>

                                {/* Description */}
                                <p className={`text-xs line-clamp-2 mb-3 ${
                                    darkMode ? 'text-[var(--brand-light)]/60' : 'text-gray-600'
                                }`}>
                                    {club.description}
                                </p>

                                {/* Follow Button */}
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleFollow(club.id);
                                    }}
                                    className={`w-full py-2 px-4 rounded-lg font-medium text-sm transition-colors ${
                                        darkMode
                                            ? isFollowing[club.id]
                                                ? 'bg-[var(--dark-500)] text-[var(--brand-light)]/80 hover:bg-[var(--dark-400)] border border-[var(--dark-400)]'
                                                : 'bg-[var(--brand-primary)] text-[var(--dark-900)] hover:bg-[var(--brand-primary)]/80'
                                            : isFollowing[club.id]
                                                ? 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200'
                                                : 'bg-[#4D4DA4] text-white hover:bg-[#5D5DB4] shadow-lg shadow-[#4D4DA4]/20'
                                    }`}
                                >
                                    {isFollowing[club.id] ? t('following') : t('follow')}
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

