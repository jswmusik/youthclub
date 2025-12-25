// frontend/app/(public)/events/[slug]/page.tsx
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import EventDetailClient from './EventDetailClient';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://192.168.1.208:8000/api';

interface PageProps {
  params: Promise<{ slug: string }>;
}

// Fetch event data
async function getEvent(slug: string) {
  try {
    const res = await fetch(`${API_URL}/public/events/${slug}/`, {
      next: { revalidate: 60 }, // Revalidate every minute
    });
    
    if (!res.ok) {
      return null;
    }
    
    return res.json();
  } catch (error) {
    console.error('Failed to fetch event:', error);
    return null;
  }
}

// Generate dynamic metadata for SEO
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const event = await getEvent(slug);
  
  if (!event) {
    return {
      title: 'Event hittades inte | Ungdomsappen',
    };
  }

  const title = event.page_title || `${event.title} | Ungdomsappen`;
  const description = event.meta_description || event.description?.slice(0, 160) || 
    `Anmäl dig till ${event.title} hos ${event.organizer_display_name}`;
  
  // Get image URL
  const imageUrl = event.og_image || event.cover_image || null;

  return {
    title,
    description,
    openGraph: {
      title: event.og_title || title,
      description: event.og_description || description,
      images: imageUrl ? [imageUrl] : [],
      type: 'website',
      locale: 'sv_SE',
    },
    twitter: {
      card: 'summary_large_image',
      title: event.og_title || title,
      description: event.og_description || description,
      images: imageUrl ? [imageUrl] : [],
    },
  };
}

// Generate JSON-LD structured data for Google Events rich snippets
function generateEventJsonLd(event: any) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: event.title,
    description: event.description?.replace(/<[^>]*>/g, '').slice(0, 500), // Strip HTML
    startDate: event.start_date,
    endDate: event.end_date,
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    location: {
      '@type': 'Place',
      name: event.location_name,
      address: {
        '@type': 'PostalAddress',
        streetAddress: event.address || event.location_name,
      },
      ...(event.latitude && event.longitude && {
        geo: {
          '@type': 'GeoCoordinates',
          latitude: event.latitude,
          longitude: event.longitude,
        },
      }),
    },
    organizer: {
      '@type': 'Organization',
      name: event.organizer_display_name,
      ...(event.club_detail?.email && { email: event.club_detail.email }),
    },
    ...(event.cover_image && {
      image: [event.cover_image],
    }),
    ...(event.is_free ? {
      isAccessibleForFree: true,
    } : event.cost && {
      offers: {
        '@type': 'Offer',
        price: event.cost,
        priceCurrency: 'SEK',
        availability: event.is_registration_open 
          ? 'https://schema.org/InStock' 
          : 'https://schema.org/SoldOut',
      },
    }),
  };

  return jsonLd;
}

export default async function PublicEventPage({ params }: PageProps) {
  const { slug } = await params;
  const event = await getEvent(slug);

  if (!event) {
    notFound();
  }

  const jsonLd = generateEventJsonLd(event);

  return (
    <>
      {/* JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      
      {/* Client Component for Interactive Elements */}
      <EventDetailClient event={event} />
    </>
  );
}

