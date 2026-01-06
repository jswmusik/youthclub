'use client';
import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import FeatureForm from '../components/FeatureForm';
import { type LanguageCode } from '../../../components/LanguageSelector';

export default function CreateFeaturePage() {
  const t = useTranslations('cmsAdmin.features.form');
  const searchParams = useSearchParams();
  const initialLanguage = (searchParams.get('lang') as LanguageCode) || 'sv';
  
  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">{t('createTitle')}</h1>
      <FeatureForm initialLanguage={initialLanguage} />
    </div>
  );
}

