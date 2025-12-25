'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import PageForm from '../../components/PageForm';
import { cmsApi } from '@/lib/cms-api';
import { Page } from '@/types/cms';
import { Loader2 } from 'lucide-react';

export default function EditPage() {
  const { slug } = useParams();
  const [page, setPage] = useState<Page | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadPage() {
      if (!slug) return;
      try {
        const slugStr = Array.isArray(slug) ? slug[0] : slug;
        const data = await cmsApi.getPage(slugStr);
        setPage(data);
      } catch (error) {
        console.error("Failed to fetch page", error);
      } finally {
        setLoading(false);
      }
    }
    loadPage();
  }, [slug]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--brand-primary)]" />
          <span className="text-[var(--brand-light)]/50 text-sm">Loading page...</span>
        </div>
      </div>
    );
  }

  if (!page) {
    return (
      <div className="text-center py-16 bg-[var(--dark-800)] rounded-xl border border-[var(--dark-600)]">
        <p className="text-[var(--brand-light)]/50">Page not found</p>
      </div>
    );
  }

  return <PageForm initialData={page} isEditing={true} />;
}
