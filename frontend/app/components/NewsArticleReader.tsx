'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import api from '../../lib/api';
import { getMediaUrl } from '../../app/utils';

interface NewsArticleReaderProps {
  articleId: string;
  backLink: string; // Where the "Back" button goes
}

export default function NewsArticleReader({ articleId, backLink }: NewsArticleReaderProps) {
  const [article, setArticle] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchArticle = async () => {
      try {
        const res = await api.get(`/news/${articleId}/`);
        setArticle(res.data);
      } catch (err: any) {
        setError('Article not found or access denied.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    if (articleId) fetchArticle();
  }, [articleId]);

  if (loading) return <div className="p-10 text-center text-gray-500">Loading article...</div>;
  
  if (error || !article) {
    return (
      <div className="p-10">
        <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-4">{error}</div>
        <Link href={backLink} className="text-blue-600 hover:underline">← Go Back</Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto pb-20">
      {/* Navigation */}
      <div className="mb-6">
        <Link href={backLink} className="text-gray-500 hover:text-gray-900 font-semibold transition flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          Back to Feed
        </Link>
      </div>

      <article className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Hero Image */}
        {article.hero_image && (
          <div className="h-64 md:h-96 w-full relative bg-gray-100">
            <img 
              src={getMediaUrl(article.hero_image) || ''} 
              alt={article.title} 
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            <div className="absolute bottom-0 left-0 p-8">
               <h1 className="text-3xl md:text-5xl font-bold text-white leading-tight text-shadow-md">
                {article.title}
              </h1>
            </div>
          </div>
        )}

        <div className="p-8 md:p-12">
          {/* No hero image fallback title */}
          {!article.hero_image && (
             <h1 className="text-4xl font-bold text-gray-900 mb-8">{article.title}</h1>
          )}

          {/* Meta Data */}
          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 mb-8 border-b border-gray-100 pb-8">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold">
                {article.author_name?.charAt(0) || 'A'}
              </div>
              <span className="font-medium text-gray-900">{article.author_name}</span>
            </div>
            <span>•</span>
            <span>{new Date(article.published_at).toLocaleDateString()}</span>
            
            <div className="ml-auto flex gap-2">
              {article.tags_details?.map((tag: any) => (
                <span key={tag.id} className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs font-bold uppercase">
                  {tag.name}
                </span>
              ))}
            </div>
          </div>

          {/* Main Content - HTML Rendered Here */}
          <div 
            className="news-content"
            dangerouslySetInnerHTML={{ __html: article.content }} 
          />
        </div>
      </article>
    </div>
  );
}