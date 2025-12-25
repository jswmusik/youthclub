import Link from 'next/link';
import { NewsArticle } from '../../../types/news';
import { getMediaUrl } from '../../utils';

interface Props {
    article: NewsArticle;
    darkMode?: boolean;
}

export default function NewsHero({ article, darkMode = false }: Props) {
    const heroImageUrl = article.hero_image ? getMediaUrl(article.hero_image) : null;

    return (
        <div className={`relative w-full h-80 sm:h-96 sm:rounded-2xl overflow-hidden mb-8 group cursor-pointer ${
            darkMode ? 'border-y sm:border border-[var(--dark-600)]' : 'shadow-xl sm:rounded-xl'
        }`}>
            <Link href={`/dashboard/youth/news/${article.id}`}>
                {/* Background Image with Overlay */}
                <div 
                    className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
                    style={{ 
                        backgroundImage: heroImageUrl 
                            ? `url(${heroImageUrl})` 
                            : darkMode 
                                ? 'linear-gradient(to right, var(--brand-purple), var(--brand-primary))' 
                                : 'linear-gradient(to right, #4F46E5, #9333EA)'
                    }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent" />

                {/* Content */}
                <div className="absolute bottom-0 left-0 p-6 sm:p-8 w-full md:w-2/3 text-white">
                    <div className="flex flex-wrap gap-2 mb-3">
                        <span className={`px-3 py-1 text-xs font-bold rounded-full uppercase tracking-wider ${
                            darkMode 
                                ? 'bg-[var(--brand-primary)] text-[var(--dark-900)]' 
                                : 'bg-blue-600 text-white'
                        }`}>
                            Featured
                        </span>
                        {article.tags_details.slice(0, 2).map(tag => (
                            <span 
                                key={tag.id} 
                                className="px-3 py-1 bg-white/20 backdrop-blur-sm text-xs font-medium rounded-full"
                            >
                                {tag.name}
                            </span>
                        ))}
                    </div>
                    <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3 leading-tight text-white font-heading">
                        {article.title}
                    </h2>
                    <p className="text-gray-200 line-clamp-2 md:line-clamp-3 text-base sm:text-lg mb-4">
                        {article.excerpt}
                    </p>
                    <span className="text-sm text-gray-400">
                        {new Date(article.published_at).toLocaleDateString()} • By {article.author_name}
                    </span>
                </div>
            </Link>
        </div>
    );
}
