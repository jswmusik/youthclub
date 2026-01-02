'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter, usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useTheme } from 'next-themes';
import NavBar from '@/app/components/NavBar';
import YouthSidebar from '@/app/components/youth/YouthSidebar';
import { fetchNewsDetail } from '@/lib/api';
import { sanitizeHtml } from '@/lib/sanitize';
import { NewsArticle } from '@/types/news';
import { getMediaUrl } from '@/app/utils';
import { ArrowLeft, Calendar, User, Clock, Share2, X } from 'lucide-react';

export default function NewsDetailPage() {
    const t = useTranslations('news');
    const tNav = useTranslations('nav');
    const { id } = useParams();
    const router = useRouter();
    const pathname = usePathname();
    const { theme } = useTheme();
    const [mounted, setMounted] = useState(false);
    const [article, setArticle] = useState<NewsArticle | null>(null);
    const [loading, setLoading] = useState(true);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    
    // Theme detection
    useEffect(() => {
        setMounted(true);
    }, []);
    const darkMode = !mounted || theme === 'dark';

    useEffect(() => {
        if (!id) return;
        
        const loadArticle = async () => {
            try {
                const res = await fetchNewsDetail(Number(id));
                setArticle(res.data);
            } catch (err) {
                console.error("Failed to load article", err);
            } finally {
                setLoading(false);
            }
        };
        loadArticle();
    }, [id]);

    // Helper function to get initials from author name
    const getInitials = (name: string): string => {
        if (!name) return 'A';
        const parts = name.trim().split(/\s+/);
        if (parts.length >= 2) {
            return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
        }
        return name.charAt(0).toUpperCase();
    };

    // Format reading time estimate
    const getReadingTime = (content: string): number => {
        const wordsPerMinute = 200;
        const wordCount = content.replace(/<[^>]*>/g, '').split(/\s+/).length;
        return Math.max(1, Math.ceil(wordCount / wordsPerMinute));
    };

    if (loading) return (
        <div className={`min-h-screen ${darkMode ? 'bg-[var(--dark-800)]' : 'bg-white'}`}>
            <NavBar showBackButton={true} onMenuToggle={() => setIsSidebarOpen(true)} />
            <div className="pt-14 sm:pt-16 flex items-center justify-center min-h-[50vh]">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-[var(--brand-primary)]/20 border-t-[var(--brand-primary)] rounded-full animate-spin mx-auto"></div>
                    <p className={`mt-4 ${darkMode ? 'text-[var(--brand-light)]/60' : 'text-gray-500'}`}>{t('loadingArticle')}</p>
                </div>
            </div>
        </div>
    );

    if (!article) return (
        <div className={`min-h-screen ${darkMode ? 'bg-[var(--dark-800)]' : 'bg-white'}`}>
            <NavBar showBackButton={true} onMenuToggle={() => setIsSidebarOpen(true)} />
            <div className="pt-14 sm:pt-16 flex items-center justify-center min-h-[50vh]">
                <div className="text-center">
                    <p className={`text-lg ${darkMode ? 'text-[var(--brand-light)]/60' : 'text-gray-500'}`}>{t('articleNotFound')}</p>
                    <button
                        onClick={() => router.push('/dashboard/youth/news')}
                        className={`mt-4 hover:underline ${darkMode ? 'text-[var(--brand-primary)]' : 'text-[#4D4DA4]'}`}
                    >
                        {t('backToNews')}
                    </button>
                </div>
            </div>
        </div>
    );

    const heroImageUrl = article.hero_image ? getMediaUrl(article.hero_image) : null;
    const authorInitials = getInitials(article.author_name);
    const readingTime = getReadingTime(article.content);

    return (
        <div className={`min-h-screen ${darkMode ? 'bg-[var(--dark-800)]' : 'bg-white'}`}>
            <NavBar 
                showBackButton={true} 
                onMenuToggle={() => setIsSidebarOpen(true)}
                hideBottomNavOnMobile={true}
            />
            
            {/* Mobile Sidebar Overlay */}
            {isSidebarOpen && (
                <div className="fixed inset-0 z-50 lg:hidden">
                    <div 
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        onClick={() => setIsSidebarOpen(false)}
                    />
                    <div className={`absolute left-0 top-0 bottom-0 w-72 border-r p-4 overflow-y-auto ${
                        darkMode ? 'bg-[var(--dark-800)] border-[var(--dark-600)]' : 'bg-white border-gray-200'
                    }`}>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className={`text-lg font-bold ${darkMode ? 'text-[var(--brand-light)]' : 'text-gray-900'}`}>{tNav('menu')}</h2>
                            <button
                                onClick={() => setIsSidebarOpen(false)}
                                className={`p-2 ${darkMode ? 'hover:bg-[var(--dark-700)] text-[var(--brand-light)]/60' : 'hover:bg-gray-100 text-gray-500'}`}
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <YouthSidebar activePath={pathname} />
                    </div>
                </div>
            )}
            
            {/* Hero Image - Full Width, No Rounded Corners */}
            <div className={`w-full h-[50vh] sm:h-[60vh] relative ${darkMode ? 'bg-[var(--dark-800)]' : 'bg-[#EBEBFE]'}`}>
                {heroImageUrl ? (
                    <img 
                        src={heroImageUrl} 
                        className="w-full h-full object-cover" 
                        alt={article.title}
                    />
                ) : (
                    <div className="w-full h-full bg-gradient-to-br from-[var(--brand-purple)] to-[var(--brand-primary)]" />
                )}
                {/* Gradient Overlay */}
                <div className={`absolute inset-0 bg-gradient-to-t ${
                    darkMode ? 'from-[var(--dark-800)] via-[var(--dark-800)]/50' : 'from-white via-white/50'
                } to-transparent`} />
                
                {/* Back Button - Positioned on Hero */}
                <button 
                    onClick={() => router.push('/dashboard/youth/news')}
                    className={`absolute top-20 sm:top-24 left-4 sm:left-8 flex items-center gap-2 px-4 py-2 backdrop-blur-sm text-sm font-medium transition-all ${
                        darkMode 
                            ? 'bg-[var(--dark-800)]/80 text-[var(--brand-light)] hover:bg-[var(--dark-800)]' 
                            : 'bg-white/80 text-gray-700 hover:bg-white'
                    }`}
                >
                    <ArrowLeft className="w-4 h-4" />
                    {t('backToNews')}
                </button>
            </div>

            {/* Content Area */}
            <div className="relative -mt-32 sm:-mt-40 z-10">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                    
                    {/* Tags */}
                    <div className="flex flex-wrap gap-2 mb-4">
                        {article.tags_details.map(tag => (
                            <span 
                                key={tag.id} 
                                className="px-3 py-1 bg-[var(--brand-primary)] text-[var(--dark-900)] text-xs font-bold uppercase tracking-wide"
                            >
                                {tag.name}
                            </span>
                        ))}
                    </div>
                    
                    {/* Title */}
                    <h1 className={`text-3xl sm:text-4xl md:text-5xl font-bold mb-6 leading-tight font-heading ${
                        darkMode ? 'text-[var(--brand-light)]' : 'text-gray-900'
                    }`}>
                        {article.title}
                    </h1>

                    {/* Metadata Row */}
                    <div className={`flex flex-wrap items-center gap-4 sm:gap-6 py-6 border-y mb-8 ${
                        darkMode ? 'border-[var(--dark-600)]' : 'border-gray-200'
                    }`}>
                        {/* Author */}
                        <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 flex items-center justify-center font-bold text-sm ${
                                darkMode ? 'bg-[var(--brand-primary)]/20 text-[var(--brand-primary)]' : 'bg-[#4D4DA4]/10 text-[#4D4DA4]'
                            }`}>
                                {authorInitials}
                            </div>
                            <div>
                                <p className={`text-sm font-semibold ${darkMode ? 'text-[var(--brand-light)]' : 'text-gray-900'}`}>{article.author_name}</p>
                                <p className={`text-xs ${darkMode ? 'text-[var(--brand-light)]/50' : 'text-gray-500'}`}>{t('author')}</p>
                            </div>
                        </div>

                        {/* Divider */}
                        <div className={`hidden sm:block w-px h-10 ${darkMode ? 'bg-[var(--dark-600)]' : 'bg-gray-200'}`} />

                        {/* Date */}
                        <div className={`flex items-center gap-2 ${darkMode ? 'text-[var(--brand-light)]/60' : 'text-gray-600'}`}>
                            <Calendar className="w-4 h-4" />
                            <span className="text-sm">
                                {new Date(article.published_at).toLocaleDateString('en-US', {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric'
                                })}
                            </span>
                        </div>

                        {/* Reading Time */}
                        <div className={`flex items-center gap-2 ${darkMode ? 'text-[var(--brand-light)]/60' : 'text-gray-600'}`}>
                            <Clock className="w-4 h-4" />
                            <span className="text-sm">{readingTime} {t('minRead')}</span>
                        </div>
                    </div>

                    {/* Excerpt/Lead */}
                    {article.excerpt && (
                        <p className={`text-lg sm:text-xl leading-relaxed mb-8 font-medium ${
                            darkMode ? 'text-[var(--brand-light)]/80' : 'text-gray-700'
                        }`}>
                            {article.excerpt}
                        </p>
                    )}

                    {/* Article Content */}
                    <div 
                        className={`prose prose-lg max-w-none ${darkMode ? 'news-content-dark' : 'news-content-light prose-gray'}`}
                        dangerouslySetInnerHTML={{ __html: sanitizeHtml(article.content) }} 
                    />

                    {/* Footer */}
                    <div className={`mt-12 pt-8 border-t ${darkMode ? 'border-[var(--dark-600)]' : 'border-gray-200'}`}>
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                            {/* Tags again for easy navigation */}
                            <div className="flex flex-wrap gap-2">
                                {article.tags_details.map(tag => (
                                    <span 
                                        key={tag.id} 
                                        className={`px-3 py-1 text-xs font-medium border ${
                                            darkMode 
                                                ? 'bg-[var(--dark-700)] text-[var(--brand-light)]/70 border-[var(--dark-600)]'
                                                : 'bg-[#EBEBFE] text-gray-600 border-[#4D4DA4]/15'
                                        }`}
                                    >
                                        {tag.name}
                                    </span>
                                ))}
                            </div>

                            {/* Back to News */}
                            <button
                                onClick={() => router.push('/dashboard/youth/news')}
                                className={`flex items-center gap-2 font-medium text-sm transition-colors ${
                                    darkMode ? 'text-[var(--brand-primary)] hover:text-[var(--brand-primary)]/80' : 'text-[#4D4DA4] hover:text-[#4D4DA4]/80'
                                }`}
                            >
                                <ArrowLeft className="w-4 h-4" />
                                {t('backToAllNews')}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Spacing */}
            <div className="h-24 md:h-12" />
        </div>
    );
}
