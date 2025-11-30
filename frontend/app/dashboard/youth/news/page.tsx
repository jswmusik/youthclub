'use client';

import { useState, useEffect } from 'react';
import NavBar from '@/app/components/NavBar';
import { fetchNews, fetchHeroNews, fetchNewsTags } from '@/lib/api';
import { NewsArticle, NewsTag } from '@/types/news';
import NewsHero from '@/app/components/news/NewsHero';
import NewsCard from '@/app/components/news/NewsCard';
import NewsSidebar from '@/app/components/news/NewsSidebar';

export default function YouthNewsPage() {
    const [heroArticle, setHeroArticle] = useState<NewsArticle | null>(null);
    const [articles, setArticles] = useState<NewsArticle[]>([]);
    const [tags, setTags] = useState<NewsTag[]>([]);
    
    // Filter States
    const [selectedTag, setSelectedTag] = useState<number | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    
    // Pagination States
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);

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

    const handleSearch = (query: string) => {
        setSearchQuery(query);
        setPage(1);
        setArticles([]);
        setLoading(true);
        loadNews(1, selectedTag, query).then(() => setLoading(false));
    };

    // Load More Handler
    const handleLoadMore = () => {
        const nextPage = page + 1;
        setPage(nextPage);
        loadNews(nextPage, selectedTag, searchQuery, true);
    };

    return (
        <div className="min-h-screen bg-gray-100">
            <NavBar />
            
            <div className="max-w-7xl mx-auto p-4 lg:p-8">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">Club News & Events</h1>
                    <p className="text-gray-500 mt-1">Updates from your club and municipality</p>
                </div>

                <div className="flex flex-col lg:flex-row gap-8">
                    
                    {/* LEFT COLUMN: Sidebar (Filters) */}
                    <aside className="lg:w-1/4">
                        <NewsSidebar 
                            tags={tags}
                            selectedTag={selectedTag}
                            onSelectTag={handleTagSelect}
                            onSearch={handleSearch}
                        />
                    </aside>

                    {/* RIGHT COLUMN: Feed */}
                    <main className="lg:w-3/4 flex-1">
                        
                        {/* Hero Section - Only show if no filters active & hero exists */}
                        {!loading && !selectedTag && !searchQuery && heroArticle && (
                            <NewsHero article={heroArticle} />
                        )}

                        {/* Loading State */}
                        {loading && (
                            <div className="text-center py-20">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                                <p className="mt-4 text-gray-500">Loading latest news...</p>
                            </div>
                        )}

                        {/* News Grid */}
                        {!loading && (
                            <>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {articles.map(article => (
                                        <NewsCard key={article.id} article={article} />
                                    ))}
                                </div>

                                {/* Empty State */}
                                {articles.length === 0 && (
                                    <div className="text-center py-20 bg-white rounded-xl border border-dashed">
                                        <p className="text-gray-500">No news articles found.</p>
                                    </div>
                                )}

                                {/* Load More / Infinite Scroll Trigger */}
                                {hasMore && articles.length > 0 && (
                                    <div className="mt-10 text-center">
                                        <button 
                                            onClick={handleLoadMore}
                                            disabled={loadingMore}
                                            className="px-8 py-3 bg-white border border-gray-300 text-gray-700 font-medium rounded-full shadow-sm hover:bg-gray-50 hover:text-blue-600 transition-all disabled:opacity-50"
                                        >
                                            {loadingMore ? 'Loading...' : 'Load More News'}
                                        </button>
                                    </div>
                                )}
                            </>
                        )}
                    </main>
                </div>
            </div>
        </div>
    );
}

