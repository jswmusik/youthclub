'use client';

import { useState, useEffect, Suspense } from 'react';
import { useParams } from 'next/navigation';
import api from '@/lib/api';
import ArticleForm from '@/app/components/ArticleForm';
import { FileText } from 'lucide-react';

function ArticleFormEditContent() {
  const { id } = useParams() as { id: string };
  const [data, setData] = useState(null);

  useEffect(() => {
    if(id) api.get(`/news/${id}/`).then(res => setData(res.data));
  }, [id]);

  if (!data) {
    return (
      <div className="min-h-screen bg-[var(--dark-900)] py-4 sm:py-8">
        <div className="sm:max-w-4xl sm:mx-auto sm:px-6 px-4">
          <div className="flex items-center justify-center gap-3 py-20">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-purple)] flex items-center justify-center animate-pulse">
              <FileText className="h-5 w-5 text-white" />
            </div>
            <span className="text-[var(--brand-light)]/50">Loading article...</span>
          </div>
        </div>
      </div>
    );
  }

  return <ArticleForm initialData={data} redirectPath="/admin/super/news" />;
}

export default function Page() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[var(--dark-900)] py-4 sm:py-8">
        <div className="sm:max-w-4xl sm:mx-auto sm:px-6 px-4">
          <div className="flex items-center justify-center gap-3 py-20">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-purple)] flex items-center justify-center animate-pulse">
              <FileText className="h-5 w-5 text-white" />
            </div>
            <span className="text-[var(--brand-light)]/50">Loading form...</span>
          </div>
        </div>
      </div>
    }>
      <ArticleFormEditContent />
    </Suspense>
  );
}
