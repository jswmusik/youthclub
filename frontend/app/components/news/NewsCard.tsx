'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { NewsArticle } from '../../../types/news';
import { getMediaUrl } from '../../utils';

interface Props {
    article: NewsArticle;
    darkMode?: boolean;
    basePath?: string; // Base path for the news detail link (e.g., '/dashboard/guardian/news' or '/dashboard/youth/news')
}

export default function NewsCard({ article, darkMode = false, basePath = '/dashboard/youth/news' }: Props) {
    const t = useTranslations('news');
    const heroImageUrl = article.hero_image ? getMediaUrl(article.hero_image) : null;

    return (
        <Link 
            href={`${basePath}/${article.id}`} 
            className={`flex flex-col sm:rounded-xl overflow-hidden h-full transition-all group ${
                darkMode 
                    ? 'bg-[var(--dark-800)] border-y sm:border border-[var(--dark-600)] hover:border-[var(--brand-primary)]/30' 
                    : 'bg-white shadow-sm hover:shadow-md border border-gray-100'
            }`}
        >
            {/* Image */}
            <div className={`h-48 w-full relative ${darkMode ? 'bg-[var(--dark-700)]' : 'bg-gray-200'}`}>
                {heroImageUrl ? (
                    <img 
                        src={heroImageUrl} 
                        alt={article.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                ) : (
                    <div className={`w-full h-full flex items-center justify-center ${
                        darkMode 
                            ? 'bg-gradient-to-br from-[var(--brand-purple)] to-[var(--brand-primary)]' 
                            : 'bg-indigo-50 text-indigo-200'
                    }`}>
                        <svg className={`w-12 h-12 ${darkMode ? 'text-white/30' : ''}`} fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                        </svg>
                    </div>
                )}
                {/* Date Badge */}
                <div className={`absolute top-3 right-3 backdrop-blur text-xs font-bold px-2 py-1 rounded shadow-sm ${
                    darkMode 
                        ? 'bg-[var(--dark-900)]/80 text-[var(--brand-light)]' 
                        : 'bg-white/90 text-gray-600'
                }`}>
                    {new Date(article.published_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </div>
            </div>

            {/* Content */}
            <div className="p-5 flex-1 flex flex-col">
                <div className="flex flex-wrap gap-2 mb-3">
                    {article.tags_details.slice(0, 2).map(tag => (
                        <span 
                            key={tag.id} 
                            className={`text-xs font-medium px-2 py-0.5 rounded ${
                                darkMode 
                                    ? 'text-[var(--brand-primary)] bg-[var(--brand-primary)]/10' 
                                    : 'text-blue-600 bg-blue-50'
                            }`}
                        >
                            {tag.name}
                        </span>
                    ))}
                </div>
                
                <h3 className={`font-bold text-lg mb-2 line-clamp-2 leading-tight ${
                    darkMode ? 'text-[var(--brand-light)]' : 'text-gray-800'
                }`}>
                    {article.title}
                </h3>
                
                <p className={`text-sm line-clamp-3 mb-4 flex-1 ${
                    darkMode ? 'text-[var(--brand-light)]/60' : 'text-gray-500'
                }`}>
                    {article.excerpt}
                </p>
                
                <div className={`pt-4 border-t flex items-center justify-between text-xs ${
                    darkMode 
                        ? 'border-[var(--dark-600)] text-[var(--brand-light)]/40' 
                        : 'border-gray-50 text-gray-400'
                }`}>
                    <span>{article.author_name}</span>
                    <span className={`font-medium flex items-center gap-1 group-hover:translate-x-1 transition-transform ${
                        darkMode ? 'text-[var(--brand-primary)]' : 'text-blue-500'
                    }`}>
                        {t('readMore')}
                    </span>
                </div>
            </div>
        </Link>
    );
}
