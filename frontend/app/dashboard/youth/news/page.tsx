'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import NavBar from '@/app/components/NavBar';
import YouthSidebar from '@/app/components/youth/YouthSidebar';
import { NewsPageSkeleton } from '@/app/components/ui/Skeleton';
import YouthFooter from '@/app/components/youth/YouthFooter';
import { fetchNews, fetchHeroNews, fetchNewsTags } from '@/lib/api';
import { NewsArticle, NewsTag } from '@/types/news';
import NewsHero from '@/app/components/news/NewsHero';
import NewsCard from '@/app/components/news/NewsCard';
import { Search, X, Newspaper } from 'lucide-react';

// Minimum skeleton display time (in ms) for better UX
const MIN_LOADING_TIME = 400;

export default function YouthNewsPage() {
    const pathname = usePathname();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [heroArticle, setHeroArticle] = useState<NewsArticle | null>(null);
    const [articles, setArticles] = useState<NewsArticle[]>([]);
    const [tags, setTags] = useState<NewsTag[]>([]);
    
    // Filter States
    const [selectedTag, setSelectedTag] = useState<number | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchInput, setSearchInput] = useState('');
    
    // Pagination States
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [minLoadingComplete, setMinLoadingComplete] = useState(false);

    // Minimum loading time for skeleton display
    useEffect(() => {
        const timer = setTimeout(() => {
            setMinLoadingComplete(true);
        }, MIN_LOADING_TIME);
        return () => clearTimeout(timer);
    }, []);

    // Initial Load
    useEffect(() => {
        const init = async () => {
            try {
                const [heroRes, tagsRes] = await Promise.all([
                    fetchHeroNews(),
                    fetchNewsTags()
                ]);
                setHeroArticle(heroRes.data);
                setTags(tagsRes.data.results || tagsRes.data);
                
                // Fetch first page of list
                await loadNews(1, null, '');
            } catch (err) {
                console.error("Failed to load news data", err);
            } finally {
                setLoading(false);
            }
        };
        init();
    }, []);

    // Fetch List Logic
    const loadNews = async (pageNum: number, tag: number | null, search: string, append = false) => {
        try {
            if (append) setLoadingMore(true);
            
            const res = await fetchNews(pageNum, tag, search);
            const newResults = res.data.results || [];
            
            if (append) {
                setArticles(prev => [...prev, ...newResults]);
            } else {
                setArticles(newResults);
            }
            
            setHasMore(!!res.data.next);
        } catch (err) {
            console.error("Error fetching news list", err);
        } finally {
            setLoadingMore(false);
        }
    };

    // Filter Handlers
    const handleTagSelect = (tagId: number | null) => {
        setSelectedTag(tagId);
        setPage(1);
        setArticles([]);
        setLoading(true);
        loadNews(1, tagId, searchQuery).then(() => setLoading(false));
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setSearchQuery(searchInput);
        setPage(1);
        setArticles([]);
        setLoading(true);
        loadNews(1, selectedTag, searchInput).then(() => setLoading(false));
    };

    const clearFilters = () => {
        setSelectedTag(null);
        setSearchQuery('');
        setSearchInput('');
        setPage(1);
        setArticles([]);
        setLoading(true);
        loadNews(1, null, '').then(() => setLoading(false));
    };

    // Load More Handler
    const handleLoadMore = () => {
        const nextPage = page + 1;
        setPage(nextPage);
        loadNews(nextPage, selectedTag, searchQuery, true);
    };

    const hasActiveFilters = selectedTag !== null || searchQuery !== '';
    
    // Show skeleton while loading (with minimum display time)
    const showSkeleton = loading || !minLoadingComplete;

    return (
        <div className="min-h-screen bg-[var(--dark-900)]">
            <NavBar 
                darkMode={true} 
                showBackButton={true}
                onMenuToggle={() => setIsSidebarOpen(true)}
            />
            
            {/* Mobile Sidebar Overlay */}
            <div 
                className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden transition-opacity duration-300 ${
                    isSidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
                }`}
                onClick={() => setIsSidebarOpen(false)}
            />
            
            {/* Mobile Sidebar */}
            <aside 
                className={`fixed top-0 left-0 h-screen w-64 z-50 bg-[var(--dark-800)] border-r border-[var(--dark-600)] transform transition-transform duration-300 md:hidden ${
                    isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
                }`}
            >
                <div className="flex items-center justify-between p-4 border-b border-[var(--dark-600)]">
                    <h1 className="text-xl font-bold text-[var(--brand-light)] font-heading">Menu</h1>
                    <button
                        onClick={() => setIsSidebarOpen(false)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg text-[var(--brand-light)]/60 hover:bg-[var(--dark-700)] hover:text-[var(--brand-light)]"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <div className="p-4 overflow-y-auto h-[calc(100vh-64px)]">
                    <YouthSidebar activePath={pathname} darkMode={true} />
                </div>
            </aside>
            
            {/* Main Layout */}
            <div className="pt-14 sm:pt-16">
                <div className="max-w-7xl mx-auto px-0 sm:px-4 md:px-6 relative">
                    {/* Desktop Sidebar - Fixed position aligned with container */}
                    <aside className="hidden md:block fixed top-16 w-56 h-[calc(100vh-4rem)] overflow-y-auto py-4 bg-[var(--dark-900)] z-30" style={{ left: 'max(1rem, calc((100vw - 80rem) / 2 + 1.5rem))' }}>
                        <YouthSidebar activePath={pathname} darkMode={true} />
                    </aside>
                    
                    {/* Content wrapper with left margin for sidebar */}
                    <div className="md:ml-60">
                        <main className="p-0 sm:p-4 md:p-6 pb-24 md:pb-6">
                            {showSkeleton ? (
                                <NewsPageSkeleton />
                            ) : (
                                <>
                                    {/* Header */}
                                    <div className="mb-6 px-4 sm:px-0 pt-4 sm:pt-0">
                                        <div className="flex items-center gap-3 mb-1">
                                            <Newspaper className="w-6 h-6 sm:w-7 sm:h-7 text-[var(--brand-primary)]" />
                                            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[var(--brand-light)] font-heading">
                                                News & Updates
                                            </h1>
                                        </div>
                                        <p className="text-[var(--brand-light)]/60 pl-9 sm:pl-10">
                                            Latest stories from your club and municipality
                                        </p>
                                    </div>

                                    {/* Filters Section */}
                                    <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] p-4 mb-6">
                                {/* Search Bar */}
                                <form onSubmit={handleSearch} className="mb-4">
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--brand-light)]/40" />
                                        <input 
                                            type="text" 
                                            placeholder="Search news..." 
                                            className="w-full pl-10 pr-4 py-3 bg-[var(--dark-700)] border border-[var(--dark-500)] rounded-xl text-[var(--brand-light)] placeholder-[var(--brand-light)]/40 focus:ring-2 focus:ring-[var(--brand-primary)]/50 focus:border-[var(--brand-primary)] outline-none transition-all"
                                            value={searchInput}
                                            onChange={(e) => setSearchInput(e.target.value)}
                                        />
                                        {searchInput && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setSearchInput('');
                                                    if (searchQuery) {
                                                        setSearchQuery('');
                                                        setPage(1);
                                                        setArticles([]);
                                                        setLoading(true);
                                                        loadNews(1, selectedTag, '').then(() => setLoading(false));
                                                    }
                                                }}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--brand-light)]/40 hover:text-[var(--brand-light)]"
                                            >
                                                <X className="w-5 h-5" />
                                            </button>
                                        )}
                                    </div>
                                </form>

                                {/* Tags Filter */}
                                <div className="flex flex-wrap gap-2">
                                    <button
                                        onClick={() => handleTagSelect(null)}
                                        className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                                            selectedTag === null 
                                                ? 'bg-[var(--brand-primary)] text-[var(--dark-900)]' 
                                                : 'bg-[var(--dark-700)] text-[var(--brand-light)]/70 hover:bg-[var(--dark-600)] border border-[var(--dark-500)]'
                                        }`}
                                    >
                                        All Stories
                                    </button>
                                    {tags.map(tag => (
                                        <button
                                            key={tag.id}
                                            onClick={() => handleTagSelect(tag.id)}
                                            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                                                selectedTag === tag.id 
                                                    ? 'bg-[var(--brand-primary)] text-[var(--dark-900)]' 
                                                    : 'bg-[var(--dark-700)] text-[var(--brand-light)]/70 hover:bg-[var(--dark-600)] border border-[var(--dark-500)]'
                                            }`}
                                        >
                                            {tag.name}
                                        </button>
                                    ))}
                                </div>

                                {/* Clear Filters */}
                                {hasActiveFilters && (
                                    <div className="mt-4 pt-4 border-t border-[var(--dark-600)]">
                                        <button
                                            onClick={clearFilters}
                                            className="text-sm text-[var(--brand-primary)] hover:text-[var(--brand-primary)]/80 font-medium flex items-center gap-1"
                                        >
                                            <X className="w-4 h-4" />
                                            Clear all filters
                                        </button>
                                    </div>
                                )}
                            </div>

                                    {/* Hero Section - Only show if no filters active & hero exists */}
                                    {!selectedTag && !searchQuery && heroArticle && (
                                        <NewsHero article={heroArticle} darkMode={true} />
                                    )}

                                    {/* News Grid */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
                                        {articles.map(article => (
                                            <NewsCard key={article.id} article={article} darkMode={true} />
                                        ))}
                                    </div>

                                    {/* Empty State */}
                                    {articles.length === 0 && (
                                        <div className="text-center py-20 bg-[var(--dark-800)] rounded-none sm:rounded-xl border-y sm:border border-[var(--dark-600)]">
                                            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[var(--dark-700)] mb-4">
                                                <Newspaper className="w-8 h-8 text-[var(--brand-light)]/40" />
                                            </div>
                                            <p className="text-[var(--brand-light)]/60 text-lg">No news articles found.</p>
                                            {hasActiveFilters && (
                                                <button
                                                    onClick={clearFilters}
                                                    className="mt-4 text-[var(--brand-primary)] hover:underline"
                                                >
                                                    Clear filters and try again
                                                </button>
                                            )}
                                        </div>
                                    )}

                                    {/* Load More */}
                                    {hasMore && articles.length > 0 && (
                                        <div className="mt-10 text-center">
                                            <button 
                                                onClick={handleLoadMore}
                                                disabled={loadingMore}
                                                className="px-8 py-3 bg-[var(--dark-800)] border border-[var(--dark-600)] text-[var(--brand-light)] font-medium rounded-xl hover:bg-[var(--dark-700)] hover:border-[var(--brand-primary)]/30 transition-all disabled:opacity-50"
                                            >
                                                {loadingMore ? (
                                                    <span className="flex items-center gap-2">
                                                        <div className="w-4 h-4 border-2 border-[var(--brand-primary)]/20 border-t-[var(--brand-primary)] rounded-full animate-spin"></div>
                                                        Loading...
                                                    </span>
                                                ) : (
                                                    'Load More News'
                                                )}
                                            </button>
                                        </div>
                                    )}
                                </>
                            )}
                        </main>
                    </div>
                </div>
            </div>
            
            {/* Footer */}
            <YouthFooter />
        </div>
    );
}
