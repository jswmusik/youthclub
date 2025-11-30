'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { fetchClubsByMunicipality } from '../../lib/api';
import { getMediaUrl } from '../utils';
import { useAuth } from '../../context/AuthContext';
import api, { API_URL } from '../../lib/api';

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
    const { user } = useAuth();
    const [clubs, setClubs] = useState<Club[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isFollowing, setIsFollowing] = useState<Record<number, boolean>>({});

    // Number of clubs to show at once
    const CLUBS_PER_VIEW = 3;

    useEffect(() => {
        loadRecommendedClubs();
    }, [user]);

    const loadRecommendedClubs = async () => {
        if (!user?.preferred_club) {
            setLoading(false);
            return;
        }

        try {
            // Get user's club to get municipality
            const userClubRes = await api.get(`/clubs/${user.preferred_club}/`);
            const userClub = userClubRes.data;
            
            if (!userClub.municipality) {
                setLoading(false);
                return;
            }

            // Fetch all clubs in the same municipality
            const response = await fetchClubsByMunicipality(userClub.municipality);
            const allClubs = response.data.results || response.data || [];
            
            // Filter out user's current club
            const otherClubs = allClubs.filter((club: Club) => club.id !== user.preferred_club);
            
            setClubs(otherClubs);
        } catch (error) {
            console.error('Failed to load recommended clubs:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleFollow = (clubId: number) => {
        setIsFollowing(prev => ({ ...prev, [clubId]: !prev[clubId] }));
        // TODO: Implement actual follow functionality
    };

    const handlePrevious = () => {
        setCurrentIndex(prev => Math.max(0, prev - CLUBS_PER_VIEW));
    };

    const handleNext = () => {
        setCurrentIndex(prev => Math.min(clubs.length - CLUBS_PER_VIEW, prev + CLUBS_PER_VIEW));
    };

    // Don't show if no clubs or loading
    if (loading || clubs.length === 0) {
        return null;
    }

    const visibleClubs = clubs.slice(currentIndex, currentIndex + CLUBS_PER_VIEW);
    const canGoPrevious = currentIndex > 0;
    const canGoNext = currentIndex + CLUBS_PER_VIEW < clubs.length;

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 mb-6">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900">Recommended Clubs</h3>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handlePrevious}
                        disabled={!canGoPrevious}
                        className={`p-2 rounded-full transition-colors ${
                            canGoPrevious 
                                ? 'bg-gray-100 hover:bg-gray-200 text-gray-700' 
                                : 'bg-gray-50 text-gray-300 cursor-not-allowed'
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
                                ? 'bg-gray-100 hover:bg-gray-200 text-gray-700' 
                                : 'bg-gray-50 text-gray-300 cursor-not-allowed'
                        }`}
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {visibleClubs.map((club) => (
                    <div 
                        key={club.id} 
                        className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
                        onClick={() => router.push(`/dashboard/youth/clubs/${club.id}`)}
                    >
                        {/* Cover Image */}
                        <div className="relative h-32 bg-gradient-to-br from-blue-500 to-purple-600">
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
                                        className="w-10 h-10 rounded-full object-cover border-2 border-white -mt-6 relative z-10 bg-white"
                                    />
                                ) : (
                                    <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center border-2 border-white -mt-6 relative z-10">
                                        <span className="text-white font-bold text-sm">
                                            {club.name.charAt(0).toUpperCase()}
                                        </span>
                                    </div>
                                )}
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-bold text-gray-900 text-sm truncate">{club.name}</h4>
                                    <p className="text-xs text-gray-500 truncate">{club.municipality_name}</p>
                                </div>
                            </div>

                            {/* Description */}
                            <p className="text-xs text-gray-600 line-clamp-2 mb-3">
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
                                        ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                        : 'bg-blue-600 text-white hover:bg-blue-700'
                                }`}
                            >
                                {isFollowing[club.id] ? 'Following' : 'Follow'}
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

