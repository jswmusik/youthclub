'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter, usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
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
    const [article, setArticle] = useState<NewsArticle | null>(null);
    const [loading, setLoading] = useState(true);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

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
        <div className="min-h-screen bg-[var(--dark-800)]">
            <NavBar darkMode={true} showBackButton={true} onMenuToggle={() => setIsSidebarOpen(true)} />
            <div className="pt-14 sm:pt-16 flex items-center justify-center min-h-[50vh]">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-[var(--brand-primary)]/20 border-t-[var(--brand-primary)] rounded-full animate-spin mx-auto"></div>
                    <p className="mt-4 text-[var(--brand-light)]/60">{t('loadingArticle')}</p>
                </div>
            </div>
        </div>
    );

    if (!article) return (
        <div className="min-h-screen bg-[var(--dark-800)]">
            <NavBar darkMode={true} showBackButton={true} onMenuToggle={() => setIsSidebarOpen(true)} />
            <div className="pt-14 sm:pt-16 flex items-center justify-center min-h-[50vh]">
                <div className="text-center">
                    <p className="text-[var(--brand-light)]/60 text-lg">{t('articleNotFound')}</p>
                    <button
                        onClick={() => router.push('/dashboard/youth/news')}
                        className="mt-4 text-[var(--brand-primary)] hover:underline"
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
        <div className="min-h-screen bg-[var(--dark-800)]">
            <NavBar 
                darkMode={true} 
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
                    <div className="absolute left-0 top-0 bottom-0 w-72 bg-[var(--dark-800)] border-r border-[var(--dark-600)] p-4 overflow-y-auto">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-bold text-[var(--brand-light)]">{tNav('menu')}</h2>
                            <button
                                onClick={() => setIsSidebarOpen(false)}
                                className="p-2 hover:bg-[var(--dark-700)] text-[var(--brand-light)]/60"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <YouthSidebar activePath={pathname} darkMode={true} />
                    </div>
                </div>
            )}
            
            {/* Hero Image - Full Width, No Rounded Corners */}
            <div className="w-full h-[50vh] sm:h-[60vh] relative bg-[var(--dark-800)]">
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
                <div className="absolute inset-0 bg-gradient-to-t from-[var(--dark-800)] via-[var(--dark-800)]/50 to-transparent" />
                
                {/* Back Button - Positioned on Hero */}
                <button 
                    onClick={() => router.push('/dashboard/youth/news')}
                    className="absolute top-20 sm:top-24 left-4 sm:left-8 flex items-center gap-2 px-4 py-2 bg-[var(--dark-800)]/80 backdrop-blur-sm text-[var(--brand-light)] text-sm font-medium transition-all hover:bg-[var(--dark-800)]"
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
                    <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-[var(--brand-light)] mb-6 leading-tight font-heading">
                        {article.title}
                    </h1>

                    {/* Metadata Row */}
                    <div className="flex flex-wrap items-center gap-4 sm:gap-6 py-6 border-y border-[var(--dark-600)] mb-8">
                        {/* Author */}
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-[var(--brand-primary)]/20 flex items-center justify-center text-[var(--brand-primary)] font-bold text-sm">
                                {authorInitials}
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-[var(--brand-light)]">{article.author_name}</p>
                                <p className="text-xs text-[var(--brand-light)]/50">{t('author')}</p>
                            </div>
                        </div>

                        {/* Divider */}
                        <div className="hidden sm:block w-px h-10 bg-[var(--dark-600)]" />

                        {/* Date */}
                        <div className="flex items-center gap-2 text-[var(--brand-light)]/60">
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
                        <div className="flex items-center gap-2 text-[var(--brand-light)]/60">
                            <Clock className="w-4 h-4" />
                            <span className="text-sm">{readingTime} {t('minRead')}</span>
                        </div>
                    </div>

                    {/* Excerpt/Lead */}
                    {article.excerpt && (
                        <p className="text-lg sm:text-xl text-[var(--brand-light)]/80 leading-relaxed mb-8 font-medium">
                            {article.excerpt}
                        </p>
                    )}

                    {/* Article Content */}
                    <div 
                        className="news-content-dark prose prose-lg max-w-none"
                        dangerouslySetInnerHTML={{ __html: sanitizeHtml(article.content) }} 
                    />

                    {/* Footer */}
                    <div className="mt-12 pt-8 border-t border-[var(--dark-600)]">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                            {/* Tags again for easy navigation */}
                            <div className="flex flex-wrap gap-2">
                                {article.tags_details.map(tag => (
                                    <span 
                                        key={tag.id} 
                                        className="px-3 py-1 bg-[var(--dark-700)] text-[var(--brand-light)]/70 text-xs font-medium border border-[var(--dark-600)]"
                                    >
                                        {tag.name}
                                    </span>
                                ))}
                            </div>

                            {/* Back to News */}
                            <button
                                onClick={() => router.push('/dashboard/youth/news')}
                                className="flex items-center gap-2 text-[var(--brand-primary)] hover:text-[var(--brand-primary)]/80 font-medium text-sm transition-colors"
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
