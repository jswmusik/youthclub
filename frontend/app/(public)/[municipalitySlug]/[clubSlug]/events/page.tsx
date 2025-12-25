// frontend/app/(public)/[municipalitySlug]/[clubSlug]/events/page.tsx
import { Metadata } from 'next';
import EventsListClient from '../../../events/EventsListClient';

interface PageProps {
  params: Promise<{ municipalitySlug: string; clubSlug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

// Generate metadata dynamically
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const clubName = resolvedParams.clubSlug
    .replace(/-/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase());
  const municipalityName = resolvedParams.municipalitySlug
    .replace(/-/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase());
  
  return {
    title: `Evenemang på ${clubName} | Ungdomsappen`,
    description: `Se vad som händer på ${clubName} i ${municipalityName}. Hitta aktiviteter och evenemang.`,
  };
}

export default async function ClubEventsPage({ params, searchParams }: PageProps) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  
  const clubName = resolvedParams.clubSlug
    .replace(/-/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase());
  const municipalityName = resolvedParams.municipalitySlug
    .replace(/-/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase());

  return (
    <div className="min-h-screen bg-[var(--dark-900)] pt-24 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <p className="text-[var(--brand-primary)] text-sm font-medium mb-1">
            {municipalityName}
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold text-[var(--brand-light)] font-heading mb-2">
            Aktiviteter på {clubName}
          </h1>
          <p className="text-[var(--brand-light)]/60 text-lg">
            Upptäck vad som händer på denna fritidsgård.
          </p>
        </div>
        
        {/* Pass the slug filters to the client list component */}
        <EventsListClient 
          initialFilters={{ 
            municipality_slug: resolvedParams.municipalitySlug,
            club_slug: resolvedParams.clubSlug,
            ...resolvedSearchParams 
          }} 
        />
      </div>
    </div>
  );
}

