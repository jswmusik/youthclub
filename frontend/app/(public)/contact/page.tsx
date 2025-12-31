import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import ContactPageClient from './ContactPageClient';

// Backend API URL for server-side fetching
const BACKEND_API_URL = process.env.BACKEND_API_URL || 'http://127.0.0.1:8000/api';

// Fetch contact content for metadata
async function getContactContent() {
  try {
    const res = await fetch(`${BACKEND_API_URL}/cms/contact-content/public/`, {
      cache: 'no-store',
    });
    if (res.ok) {
      return res.json();
    }
  } catch (error) {
    console.error('Failed to fetch contact content for metadata:', error);
  }
  return null;
}

export async function generateMetadata(): Promise<Metadata> {
  const content = await getContactContent();
  const t = await getTranslations('contactPage');
  
  const title = content?.meta_title || t('meta.title');
  const description = content?.meta_description || t('meta.description');
  
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
    },
  };
}

export default function ContactPage() {
  return <ContactPageClient />;
}

