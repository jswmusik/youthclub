'use client';

import { useParams } from 'next/navigation';
import NewsArticleReader from '../../../../components/NewsArticleReader';

export default function ClubAdminArticlePage() {
  const params = useParams();
  const id = params?.id as string;

  return (
    <NewsArticleReader 
      articleId={id} 
      backLink="/admin/club/news-feed" 
    />
  );
}

