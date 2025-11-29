'use client';

import { useState, useEffect, Suspense } from 'react';
import { useParams } from 'next/navigation';
import api from '@/lib/api';
import ArticleForm from '@/app/components/ArticleForm';

function ArticleFormEditContent() {
  const { id } = useParams() as { id: string };
  const [data, setData] = useState(null);

  useEffect(() => {
    if(id) api.get(`/news/${id}/`).then(res => setData(res.data));
  }, [id]);

  if (!data) return <div className="p-8">Loading...</div>;

  return (
    <div className="p-8">
      <ArticleForm initialData={data} redirectPath="/admin/super/news" />
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div className="p-8"><div className="p-12 text-center text-gray-500">Loading...</div></div>}>
      <ArticleFormEditContent />
    </Suspense>
  );
}

