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
        <div className="bg-[#0a0a0a] rounded-2xl shadow-lg border border-[#262626] p-6 mb-6 relative">
            
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h3 className="text-lg font-bold text-gray-200 flex items-center gap-2">
                        <svg className="w-5 h-5 text-[#FF5485]" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
                        </svg>
                        Groups for You
                    </h3>
                    <p className="text-xs text-gray-400 mt-1">Based on your age, interests & club</p>
                </div>

                {/* Navigation Arrows (Only if more than 2) */}
                {showArrows && (
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
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M15 19l-7-7 7-7"/>
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
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M9 5l7 7-7 7"/>
                            </svg>
                        </button>
                    </div>
                )}
            </div>

            {/* Grid Content */}
            <div className="grid grid-cols-2 gap-4">
                {visibleGroups.map((group) => (
                    <div 
                        key={group.id}
                        onClick={() => router.push(`/dashboard/youth/groups/${group.id}`)}
                        className="bg-[#050505] rounded-xl hover:border-[#4D4DA4]/40 transition-all cursor-pointer overflow-hidden border border-[#262626] group flex flex-col h-full"
                    >
                        {/* Header Image Area */}
                        <div className="h-24 bg-black relative">
                            {group.background_image ? (
                                <img 
                                    src={getMediaUrl(group.background_image) || ''} 
                                    alt="" 
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="w-full h-full bg-gradient-to-r from-[#4D4DA4] to-[#FF5485]" />
                            )}
                            
                            {/* Type Badge */}
                            <div className="absolute top-2 right-2">
                                <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wide text-white ${
                                    group.group_type === 'OPEN' ? 'bg-emerald-500/90' : 'bg-[#4D4DA4]/90'
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
                                        className="w-12 h-12 rounded-xl object-cover border-2 border-[#0a0a0a] shadow-sm bg-[#0a0a0a]"
                                        alt=""
                                    />
                                ) : (
                                    <div className="w-12 h-12 rounded-xl bg-[#4D4DA4] border-2 border-[#0a0a0a] shadow-sm flex items-center justify-center text-white font-bold text-lg">
                                        {group.name.charAt(0)}
                                    </div>
                                )}
                            </div>

                            <h4 className="font-bold text-gray-200 line-clamp-1 group-hover:text-[#6D6DD4] transition-colors">
                                {group.name}
                            </h4>
                            <p className="text-xs text-gray-400 line-clamp-2 mt-1 mb-3 flex-1">
                                {group.description || 'No description available.'}
                            </p>

                            <button className="w-full py-2 bg-[#262626] hover:bg-[#4D4DA4] hover:text-white text-gray-300 text-sm font-medium rounded-lg transition-colors border border-[#262626] hover:border-[#4D4DA4]">
                                View Group
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

