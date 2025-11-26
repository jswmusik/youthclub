'use client';

import Link from 'next/link';
import NewsArchive from '../../../../components/NewsArchive';

export default function MunicipalityAdminNewsArchive() {
  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8 flex items-center gap-4">
        <Link 
          href="/admin/municipality/news-feed"
          className="p-2 rounded-full bg-white shadow-sm border border-gray-200 text-gray-500 hover:text-blue-600 transition"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">News Archive</h1>
          <p className="text-gray-500">Browse all published articles.</p>
        </div>
      </div>
      
      {/* Pass the base path and publishedOnly flag so cards link correctly and filtering works */}
      <NewsArchive basePath="/admin/municipality/news-feed" publishedOnly={true} />
    </div>
  );
}

