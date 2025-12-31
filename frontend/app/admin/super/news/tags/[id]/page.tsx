'use client';

import { useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import api from '@/lib/api';

export default function Page() {
  const { id } = useParams() as { id: string };
  const [tag, setTag] = useState<any>(null);

  useEffect(() => {
    if(id) api.get(`/news_tags/${id}/`).then(res => setTag(res.data));
  }, [id]);

  if (!tag) return <div className="p-8">Loading...</div>;

  return (
    <div className="p-8">
      <div className="mb-4">
        <BackButton href="/admin/super/news/tags" label="Back" />
      </div>
      <h1 className="text-3xl font-bold">{tag.name}</h1>
      <p className="text-gray-600 font-mono mt-2">{tag.slug}</p>
    </div>
  );
}

