'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import NavBar from '@/app/components/NavBar';
import { fetchNewsDetail } from '@/lib/api';
import { NewsArticle } from '@/types/news';
import { getMediaUrl } from '@/app/utils';

export default function NewsDetailPage() {
    const { id } = useParams();
    const router = useRouter();
    const [article, setArticle] = useState<NewsArticle | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!id) return;
        
        const loadArticle = async () => {
            try {
                const res = await fetchNewsDetail(Number(id));
                setArticle(res.data);
            } catch (err) {
                console.error("Failed to load article", err);
                // Simple error handling
            } finally {
                setLoading(false);
            }
        };
        loadArticle();
    }, [id]);

    if (loading) return (
        <div className="min-h-screen bg-gray-50">
            <NavBar />
            <div className="p-10 text-center">Loading...</div>
        </div>
    );

    if (!article) return (
        <div className="min-h-screen bg-gray-50">
            <NavBar />
            <div className="p-10 text-center">Article not found</div>
        </div>
    );

    const heroImageUrl = article.hero_image ? getMediaUrl(article.hero_image) : null;

    // Helper function to get initials from author name
    const getInitials = (name: string): string => {
        if (!name) return 'A';
        const parts = name.trim().split(/\s+/);
        if (parts.length >= 2) {
            return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
        }
        return name.charAt(0).toUpperCase();
    };

    const authorInitials = getInitials(article.author_name);

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            <NavBar />
            
            {/* Hero Image Header */}
            <div className="w-full h-[400px] relative bg-gray-900">
                {heroImageUrl && (
                    <img 
                        src={heroImageUrl} 
                        className="w-full h-full object-cover opacity-60" 
                        alt={article.title}
                    />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-gray-50 to-transparent" />
            </div>

            {/* Content Container - Same width for title, tags, and article */}
            <div className="max-w-4xl mx-auto px-4 lg:px-8 -mt-48 relative z-10">
                {/* Title, Tags, and Back Link Section */}
                <div className="mb-6">
                    <button 
                        onClick={() => router.push('/dashboard/youth/news')}
                        className="mb-6 px-4 py-2 bg-white/90 backdrop-blur hover:bg-white text-gray-700 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 w-fit shadow-sm"
                    >
                        ← Back to News
                    </button>
                    
                    <div className="flex flex-wrap gap-2 mb-4">
                        {article.tags_details.map(tag => (
                            <span key={tag.id} className="px-3 py-1 bg-blue-600 text-white text-xs font-bold rounded-full">
                                {tag.name}
                            </span>
                        ))}
                    </div>
                    <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4 leading-tight">
                        {article.title}
                    </h1>
                </div>

                {/* Article Content */}
                <article className="bg-white rounded-2xl shadow-xl p-8 md:p-12">
                    {/* Metadata Header */}
                    <div className="flex items-center justify-between border-b border-gray-100 pb-8 mb-8">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm">
                                {authorInitials}
                            </div>
                            <div>
                                <p className="text-sm font-bold text-gray-900">{article.author_name}</p>
                                <p className="text-xs text-gray-500">
                                    Published {new Date(article.published_at).toLocaleDateString()}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Content */}
                    <div 
                        className="news-content"
                        dangerouslySetInnerHTML={{ __html: article.content }} 
                    />
                </article>
            </div>
        </div>
    );
}

