// frontend/app/(public)/[municipalitySlug]/events/page.tsx
import { Metadata } from 'next';
import EventsListClient from '../../events/EventsListClient';

interface PageProps {
  params: Promise<{ municipalitySlug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

// Generate metadata dynamically
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const municipalityName = resolvedParams.municipalitySlug
    .replace(/-/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase());
  
  return {
    title: `Evenemang i ${municipalityName} | Ungdomsappen`,
    description: `Se vad som händer för unga i ${municipalityName}. Hitta aktiviteter, evenemang och fritidsgårdar nära dig.`,
  };
}

export default async function MunicipalityEventsPage({ params, searchParams }: PageProps) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  
  const municipalityName = resolvedParams.municipalitySlug
    .replace(/-/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase());

  return (
    <div className="min-h-screen bg-[var(--dark-900)] pt-24 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-[var(--brand-light)] font-heading mb-2">
            Aktiviteter i {municipalityName}
          </h1>
          <p className="text-[var(--brand-light)]/60 text-lg">
            Här hittar du allt som händer i din kommun just nu.
          </p>
        </div>
        
        {/* Pass the slug filter to the client list component */}
        <EventsListClient 
          initialFilters={{ 
            municipality_slug: resolvedParams.municipalitySlug,
            ...resolvedSearchParams 
          }} 
        />
      </div>
    </div>
  );
}

