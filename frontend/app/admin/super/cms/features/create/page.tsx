'use client';
import { useTranslations } from 'next-intl';
import FeatureForm from '../components/FeatureForm';

export default function CreateFeaturePage() {
  const t = useTranslations('cmsAdmin.features.form');
  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">{t('createTitle')}</h1>
      <FeatureForm />
    </div>
  );
}

