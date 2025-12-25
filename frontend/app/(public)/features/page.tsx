import { Metadata } from 'next';
import ClientFeaturesPage from './ClientFeaturesPage';

// Server Component (if your api wrapper supports it, otherwise use 'use client')
export const metadata: Metadata = {
  title: 'Our Features - Ungdomsappen',
  description: 'Explore the creative features of our platform.',
};

// If cmsApi is client-side only, you might need to make this a Client Component
// or fetch using standard fetch() here. I will assume client fetch for simplicity.

export default function FeaturesPage() {
  return <ClientFeaturesPage />;
}

