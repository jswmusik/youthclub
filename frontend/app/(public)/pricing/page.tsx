import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import PricingPageClient from './PricingPageClient';

// Backend API URL for server-side fetching
const BACKEND_API_URL = process.env.BACKEND_API_URL || 'http://127.0.0.1:8000/api';

// Fetch pricing content for metadata
async function getPricingContent() {
  try {
    const res = await fetch(`${BACKEND_API_URL}/cms/pricing-content/public/`, {
      cache: 'no-store',
    });
    if (res.ok) {
      return res.json();
    }
  } catch (error) {
    console.error('Failed to fetch pricing content for metadata:', error);
  }
  return null;
}

export async function generateMetadata(): Promise<Metadata> {
  const content = await getPricingContent();
  const t = await getTranslations('pricingPage');
  
  const title = content?.meta_title || t('meta.title');
  const description = content?.meta_description || t('meta.description');
  const ogTitle = content?.og_title || title;
  const ogDescription = content?.og_description || description;
  
  return {
    title,
    description,
    openGraph: {
      title: ogTitle,
      description: ogDescription,
      type: 'website',
      ...(content?.og_image && { images: [{ url: content.og_image }] }),
    },
    twitter: {
      card: 'summary_large_image',
      title: ogTitle,
      description: ogDescription,
    },
    other: content?.ai_description ? {
      'ai-description': content.ai_description,
    } : undefined,
  };
}

export default function PricingPage() {
  return <PricingPageClient />;
}

