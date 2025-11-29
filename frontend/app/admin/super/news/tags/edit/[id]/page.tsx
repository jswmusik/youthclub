'use client';

import { useState, useEffect, Suspense } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import api from '@/lib/api';
import TagForm from '@/app/components/TagForm';

function TagEditPageContent() {
  const { id } = useParams() as { id: string };
  const searchParams = useSearchParams();
  const [data, setData] = useState(null);

  useEffect(() => {
    if(id) api.get(`/news_tags/${id}/`).then(res => setData(res.data));
  }, [id]);

  if (!data) return <div className="p-8">Loading...</div>;

  const redirectPathWithParams = `/admin/super/news/tags?${searchParams.toString()}`;

  return (
    <div className="p-8">
      <TagForm initialData={data} redirectPath={redirectPathWithParams} />
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div className="p-8">Loading...</div>}>
      <TagEditPageContent />
    </Suspense>
  );
}

