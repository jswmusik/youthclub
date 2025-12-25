'use client';

import { useState, useEffect, Suspense } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { Tag } from 'lucide-react';
import api from '@/lib/api';
import TagForm from '@/app/components/TagForm';

function TagEditPageContent() {
  const { id } = useParams() as { id: string };
  const searchParams = useSearchParams();
  const [data, setData] = useState(null);

  useEffect(() => {
    if(id) api.get(`/news_tags/${id}/`).then(res => setData(res.data));
  }, [id]);

  if (!data) return (
    <div className="py-4 sm:py-6 md:py-8 px-4 sm:px-0">
      <div className="sm:max-w-3xl sm:mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-purple)] flex items-center justify-center animate-pulse">
            <Tag className="w-6 h-6 text-white" />
          </div>
          <div className="space-y-2">
            <div className="h-7 w-40 bg-[var(--dark-700)] rounded-lg animate-pulse" />
            <div className="h-4 w-56 bg-[var(--dark-700)] rounded-lg animate-pulse" />
          </div>
        </div>
        <div className="bg-[var(--dark-800)] rounded-2xl p-6 space-y-4">
          <div className="h-10 bg-[var(--dark-700)] rounded-xl animate-pulse" />
          <div className="h-10 bg-[var(--dark-700)] rounded-xl animate-pulse" />
        </div>
      </div>
    </div>
  );

  const redirectPathWithParams = `/admin/super/news/tags?${searchParams.toString()}`;

  return (
    <div className="py-4 sm:py-6 md:py-8 px-0">
      <TagForm initialData={data} redirectPath={redirectPathWithParams} />
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={
      <div className="py-4 sm:py-6 md:py-8 px-4 sm:px-0">
        <div className="sm:max-w-3xl sm:mx-auto">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-purple)] flex items-center justify-center animate-pulse">
              <Tag className="w-6 h-6 text-white" />
            </div>
            <div className="space-y-2">
              <div className="h-7 w-40 bg-[var(--dark-700)] rounded-lg animate-pulse" />
              <div className="h-4 w-56 bg-[var(--dark-700)] rounded-lg animate-pulse" />
            </div>
          </div>
          <div className="bg-[var(--dark-800)] rounded-2xl p-6 space-y-4">
            <div className="h-10 bg-[var(--dark-700)] rounded-xl animate-pulse" />
            <div className="h-10 bg-[var(--dark-700)] rounded-xl animate-pulse" />
          </div>
        </div>
      </div>
    }>
      <TagEditPageContent />
    </Suspense>
  );
}

