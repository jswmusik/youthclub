'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
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

interface RecommendedGroupsProps {
    darkMode?: boolean;
}

export default function RecommendedGroups({ darkMode }: RecommendedGroupsProps = {}) {
    const router = useRouter();
    const t = useTranslations('recommended');
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
        <div className={`rounded-2xl p-6 mb-6 relative ${
            darkMode
                ? 'bg-[var(--dark-700)] border border-[var(--dark-500)]'
                : 'bg-white shadow-lg border border-gray-200'
        }`}>
            
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h3 className={`text-lg font-bold flex items-center gap-2 ${
                        darkMode ? 'text-[var(--brand-light)]' : 'text-gray-800'
                    }`}>
                        <svg className={`w-5 h-5 ${
                            darkMode ? 'text-[var(--brand-primary)]' : 'text-[#FF5485]'
                        }`} fill="currentColor" viewBox="0 0 24 24">
                            <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
                        </svg>
                        {t('groupsForYou')}
                    </h3>
                    <p className={`text-xs mt-1 ${
                        darkMode ? 'text-[var(--brand-light)]/60' : 'text-gray-600'
                    }`}>{t('basedOnAgeInterests')}</p>
                </div>

                {/* Navigation Arrows (Only if more than 2) */}
                {showArrows && (
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
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M15 19l-7-7 7-7"/>
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
                        className={`rounded-xl transition-all cursor-pointer overflow-hidden group flex flex-col h-full ${
                            darkMode
                                ? 'bg-[var(--dark-600)] border border-[var(--dark-500)] hover:border-[var(--brand-primary)]/40'
                                : 'bg-white border border-gray-200 hover:border-[#4D4DA4]/40'
                        }`}
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
                                <div className={`w-full h-full ${
                                    darkMode
                                        ? 'bg-gradient-to-r from-[var(--brand-secondary)] to-[var(--brand-primary)]'
                                        : 'bg-gradient-to-r from-[#4D4DA4] to-[#FF5485]'
                                }`} />
                            )}
                            
                            {/* Type Badge */}
                            <div className="absolute top-2 right-2">
                                <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wide ${
                                    darkMode
                                        ? group.group_type === 'OPEN' 
                                            ? 'bg-[var(--brand-third)] text-[var(--dark-900)]' 
                                            : 'bg-[var(--brand-purple)] text-[var(--dark-900)]'
                                        : group.group_type === 'OPEN' 
                                            ? 'bg-emerald-500/90 text-white' 
                                            : 'bg-[#4D4DA4]/90 text-white'
                                }`}>
                                    {group.group_type === 'OPEN' ? t('joinNow') : t('apply')}
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
                                        className={`w-12 h-12 rounded-xl object-cover border-2 ${
                                            darkMode
                                                ? 'border-[var(--dark-600)] bg-[var(--dark-600)]'
                                                : 'border-white shadow-sm bg-white'
                                        }`}
                                        alt=""
                                    />
                                ) : (
                                    <div className={`w-12 h-12 rounded-xl border-2 flex items-center justify-center text-white font-bold text-lg ${
                                        darkMode
                                            ? 'bg-[var(--brand-secondary)] border-[var(--dark-600)]'
                                            : 'bg-[#4D4DA4] border-white shadow-sm'
                                    }`}>
                                        {group.name.charAt(0)}
                                    </div>
                                )}
                            </div>

                            <h4 className={`font-bold line-clamp-1 transition-colors ${
                                darkMode
                                    ? 'text-[var(--brand-light)] group-hover:text-[var(--brand-primary)]'
                                    : 'text-gray-800 group-hover:text-[#6D6DD4]'
                            }`}>
                                {group.name}
                            </h4>
                            <p className={`text-xs line-clamp-2 mt-1 mb-3 flex-1 ${
                                darkMode ? 'text-[var(--brand-light)]/60' : 'text-gray-600'
                            }`}>
                                {group.description || t('noDescriptionAvailable')}
                            </p>

                            <button className={`w-full py-2 text-sm font-medium rounded-lg transition-colors ${
                                darkMode
                                    ? 'bg-[var(--dark-500)] hover:bg-[var(--brand-primary)] hover:text-[var(--dark-900)] text-[var(--brand-light)]/80 border border-[var(--dark-400)] hover:border-[var(--brand-primary)]'
                                    : 'bg-gray-100 hover:bg-[#4D4DA4] hover:text-white text-gray-700 border border-gray-200 hover:border-[#4D4DA4]'
                            }`}>
                                {t('viewGroup')}
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

