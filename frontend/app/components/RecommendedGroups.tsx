'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { fetchRecommendedGroups } from '../../lib/api';
import { getMediaUrl } from '../utils';

interface Group {
    id: number;
    name: string;
    description: string;
    avatar?: string | null;
    background_image?: string | null;
    group_type: 'OPEN' | 'APPLICATION' | 'CLOSED';
    municipality?: number;
    club?: number;
}

export default function RecommendedGroups() {
    const router = useRouter();
    const [groups, setGroups] = useState<Group[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentIndex, setCurrentIndex] = useState(0);

    // Show max 2 items at a time
    const ITEMS_PER_VIEW = 2;

    // Fisher-Yates shuffle algorithm for randomizing array order
    const shuffleArray = <T,>(array: T[]): T[] => {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    };

    useEffect(() => {
        loadGroups();
    }, []);

    const loadGroups = async () => {
        try {
            const response = await fetchRecommendedGroups();
            const groupsData = response.data || [];
            // Randomize the order of groups on the client side
            const shuffledGroups = shuffleArray(groupsData);
            setGroups(shuffledGroups);
        } catch (error) {
            console.error('Failed to load recommended groups:', error);
        } finally {
            setLoading(false);
        }
    };

    const handlePrevious = () => {
        setCurrentIndex(prev => Math.max(0, prev - 1)); // Scroll one by one for smoother feel
    };

    const handleNext = () => {
        // Stop when the last item is visible on the right
        setCurrentIndex(prev => Math.min(groups.length - ITEMS_PER_VIEW, prev + 1));
    };

    if (loading || groups.length === 0) {
        return null;
    }

    // Determine visible groups based on index
    // If we only have 1 group, visibleGroups will just be length 1
    const visibleGroups = groups.slice(currentIndex, currentIndex + ITEMS_PER_VIEW);
    
    // Check navigation limits
    const canGoPrevious = currentIndex > 0;
    const canGoNext = currentIndex + ITEMS_PER_VIEW < groups.length;
    const showArrows = groups.length > ITEMS_PER_VIEW;

    return (
        <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-2xl p-6 mb-6 border border-indigo-100 relative">
            
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        <span>🌟</span> Groups for You
                    </h3>
                    <p className="text-xs text-gray-500 mt-1">Based on your age, interests & club</p>
                </div>

                {/* Navigation Arrows (Only if more than 2) */}
                {showArrows && (
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handlePrevious}
                            disabled={!canGoPrevious}
                            className={`p-2 rounded-full transition-colors ${
                                canGoPrevious 
                                    ? 'bg-white text-indigo-600 shadow-sm hover:bg-indigo-50' 
                                    : 'bg-transparent text-gray-300 cursor-not-allowed'
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
                                    ? 'bg-white text-indigo-600 shadow-sm hover:bg-indigo-50' 
                                    : 'bg-transparent text-gray-300 cursor-not-allowed'
                            }`}
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        </button>
                    </div>
                )}
            </div>

            {/* Grid Content */}
            <div className={`grid grid-cols-1 ${groups.length > 1 ? 'md:grid-cols-2' : 'md:grid-cols-1'} gap-4`}>
                {visibleGroups.map((group) => (
                    <div 
                        key={group.id}
                        onClick={() => router.push(`/dashboard/youth/groups/${group.id}`)}
                        className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all cursor-pointer overflow-hidden border border-gray-100 group flex flex-col h-full"
                    >
                        {/* Header Image Area */}
                        <div className="h-24 bg-gray-200 relative">
                            {group.background_image ? (
                                <img 
                                    src={getMediaUrl(group.background_image) || ''} 
                                    alt="" 
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="w-full h-full bg-gradient-to-r from-indigo-400 to-purple-500" />
                            )}
                            
                            {/* Type Badge */}
                            <div className="absolute top-2 right-2">
                                <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wide text-white ${
                                    group.group_type === 'OPEN' ? 'bg-emerald-500/90' : 'bg-blue-500/90'
                                }`}>
                                    {group.group_type === 'OPEN' ? 'Join Now' : 'Apply'}
                                </span>
                            </div>
                        </div>

                        {/* Body */}
                        <div className="p-4 flex-1 flex flex-col relative">
                            {/* Avatar (Overlapping) */}
                            <div className="-mt-10 mb-2">
                                {group.avatar ? (
                                    <img 
                                        src={getMediaUrl(group.avatar) || ''} 
                                        className="w-12 h-12 rounded-xl object-cover border-2 border-white shadow-sm bg-white"
                                        alt=""
                                    />
                                ) : (
                                    <div className="w-12 h-12 rounded-xl bg-indigo-600 border-2 border-white shadow-sm flex items-center justify-center text-white font-bold text-lg">
                                        {group.name.charAt(0)}
                                    </div>
                                )}
                            </div>

                            <h4 className="font-bold text-gray-900 line-clamp-1 group-hover:text-indigo-600 transition-colors">
                                {group.name}
                            </h4>
                            <p className="text-xs text-gray-500 line-clamp-2 mt-1 mb-3 flex-1">
                                {group.description || 'No description available.'}
                            </p>

                            <button className="w-full py-2 bg-gray-50 hover:bg-indigo-600 hover:text-white text-gray-700 text-sm font-medium rounded-lg transition-colors">
                                View Group
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

