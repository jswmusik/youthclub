import Link from 'next/link';
import { NewsArticle } from '../../../types/news';
import { getMediaUrl } from '../../utils';

interface Props {
    article: NewsArticle;
}

export default function NewsCard({ article }: Props) {
    const heroImageUrl = article.hero_image ? getMediaUrl(article.hero_image) : null;

    return (
        <Link href={`/dashboard/youth/news/${article.id}`} className="flex flex-col bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow overflow-hidden h-full border border-gray-100">
            {/* Image */}
            <div className="h-48 bg-gray-200 w-full relative">
                {heroImageUrl ? (
                    <img 
                        src={heroImageUrl} 
                        alt={article.title}
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-indigo-50 text-indigo-200">
                        <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                        </svg>
                    </div>
                )}
                {/* Date Badge */}
                <div className="absolute top-3 right-3 bg-white/90 backdrop-blur text-xs font-bold px-2 py-1 rounded shadow-sm text-gray-600">
                    {new Date(article.published_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </div>
            </div>

            {/* Content */}
            <div className="p-5 flex-1 flex flex-col">
                <div className="flex flex-wrap gap-2 mb-3">
                    {article.tags_details.slice(0, 2).map(tag => (
                        <span key={tag.id} className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                            {tag.name}
                        </span>
                    ))}
                </div>
                
                <h3 className="font-bold text-lg text-gray-800 mb-2 line-clamp-2 leading-tight">
                    {article.title}
                </h3>
                
                <p className="text-gray-500 text-sm line-clamp-3 mb-4 flex-1">
                    {article.excerpt}
                </p>
                
                <div className="pt-4 border-t border-gray-50 flex items-center justify-between text-xs text-gray-400">
                    <span>{article.author_name}</span>
                    <span className="group-hover:translate-x-1 transition-transform text-blue-500 font-medium flex items-center gap-1">
                        Read more →
                    </span>
                </div>
            </div>
        </Link>
    );
}

