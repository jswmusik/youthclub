'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import NewsArchive from '../../../../components/NewsArchive';

export default function SuperAdminNewsArchive() {
  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8 flex items-center gap-4">
        <Link href="/admin/super/news-feed">
          <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            Back to Feed
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#121213]">News Archive</h1>
          <p className="text-sm text-muted-foreground mt-1">Browse all published articles.</p>
        </div>
      </div>
      
      {/* Pass the base path and publishedOnly flag so only published articles assigned to ALL or SUPER_ADMIN are shown */}
      <NewsArchive basePath="/admin/super/news-feed" publishedOnly={true} />
    </div>
  );
}