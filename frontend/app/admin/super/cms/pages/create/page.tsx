'use client';

import { useSearchParams } from 'next/navigation';
import PageForm from '../components/PageForm';
import { type LanguageCode } from '../../../../components/LanguageSelector';

export default function CreatePage() {
  const searchParams = useSearchParams();
  const langParam = searchParams.get('lang') as LanguageCode | null;
  
  // Pass initial language from URL if provided
  const initialData = langParam ? { language: langParam } : undefined;
  
  return <PageForm initialData={initialData as any} />;
}
