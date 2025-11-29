'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import api from '../../lib/api';
import { getMediaUrl } from '../../app/utils';

interface ArticleDetailProps {
  articleId: string;
  basePath: string;
}

export default function ArticleDetailView({ articleId, basePath }: ArticleDetailProps) {
  const searchParams = useSearchParams();
  const [article, setArticle] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/news/${articleId}/`).then(res => {
      setArticle(res.data);
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setLoading(false);
    });
  }, [articleId]);

  const buildUrlWithPage = (path: string) => {
    const params = new URLSearchParams();
    const page = searchParams.get('page');
    const search = searchParams.get('search');
    
    if (page && page !== '1') params.set('page', page);
    if (search) params.set('search', search);
    
    const queryString = params.toString();
    return queryString ? `${path}?${queryString}` : path;
  };

  if (loading) return <div className="p-10 text-center text-gray-500">Loading article...</div>;
  if (!article) return <div className="p-10 text-center text-red-500">Article not found.</div>;

  return (
    <div className="max-w-4xl mx-auto pb-20">
      {/* Navigation */}
      <div className="mb-6 flex justify-between items-center">
        <Link href={buildUrlWithPage(basePath)} className="text-gray-500 hover:text-gray-900 font-semibold transition flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          Back to List
        </Link>
        <Link href={buildUrlWithPage(`${basePath}/edit/${article.id}`)} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-700 transition">
          Edit Article
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
            {article.is_hero && (
              <div className="absolute top-4 right-4 bg-yellow-400 text-yellow-900 px-3 py-1 rounded-full text-xs font-bold shadow">
                HERO ARTICLE
              </div>
            )}
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
            <span>•</span>
            <span className={`px-2 py-1 rounded text-xs font-bold ${article.is_published ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
              {article.is_published ? 'PUBLISHED' : 'DRAFT'}
            </span>
            
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
      
      {/* Admin Info Section */}
      <div className="mt-6 bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-bold text-gray-800 mb-2">Targeting</h3>
        <p className="text-gray-600">
          {article.target_roles.includes("ALL") 
            ? "Visible to Everyone" 
            : `Targeted Roles: ${article.target_roles.join(', ')}`
          }
        </p>
      </div>
    </div>
  );
}