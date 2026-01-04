// frontend/lib/seo-schemas.ts
// JSON-LD Schema generators for SEO pages

import { LocalLandingPage, SEOArticle, SwedishLocation, NearbyClub, NearbyEvent } from '@/types/seo';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://ungdomsappen.se';

/**
 * Organization schema for Ungdomsappen
 */
export function generateOrganizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Ungdomsappen',
    url: BASE_URL,
    logo: `${BASE_URL}/logo.png`,
    description: 'Ungdomsappen - Plattformen som kopplar samman ungdomar med fritidsgårdar, aktiviteter och evenemang i hela Sverige.',
    address: {
      '@type': 'PostalAddress',
      addressCountry: 'SE',
    },
    sameAs: [
      'https://www.facebook.com/ungdomsappen',
      'https://www.instagram.com/ungdomsappen',
      'https://www.linkedin.com/company/ungdomsappen',
    ],
  };
}

/**
 * WebSite schema with search action
 */
export function generateWebSiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Ungdomsappen',
    url: BASE_URL,
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${BASE_URL}/search?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
}

/**
 * Local Landing Page schema (LocalBusiness + Place)
 */
export function generateLocalLandingPageSchema(
  page: LocalLandingPage,
  location: SwedishLocation,
  nearbyClubs: NearbyClub[] = []
) {
  const pageUrl = `${BASE_URL}/kommun/${page.slug}`;
  
  const schemas: any[] = [
    // Main page as WebPage
    {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      '@id': pageUrl,
      url: pageUrl,
      name: page.title,
      description: page.meta_description,
      isPartOf: {
        '@type': 'WebSite',
        '@id': BASE_URL,
        name: 'Ungdomsappen',
      },
      about: {
        '@type': 'Place',
        name: location.name,
        address: {
          '@type': 'PostalAddress',
          addressLocality: location.name,
          addressRegion: location.region,
          addressCountry: 'SE',
        },
        geo: {
          '@type': 'GeoCoordinates',
          latitude: location.latitude,
          longitude: location.longitude,
        },
      },
      breadcrumb: {
        '@type': 'BreadcrumbList',
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: 'Hem',
            item: BASE_URL,
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: 'Kommuner',
            item: `${BASE_URL}/kommuner`,
          },
          {
            '@type': 'ListItem',
            position: 3,
            name: location.name,
            item: pageUrl,
          },
        ],
      },
    },
  ];

  // Add LocalBusiness schema for nearby clubs
  if (nearbyClubs.length > 0) {
    const clubSchemas = nearbyClubs.slice(0, 5).map((club) => ({
      '@context': 'https://schema.org',
      '@type': 'LocalBusiness',
      '@id': `${BASE_URL}/${club.municipality_slug}/${club.slug}`,
      name: club.name,
      address: {
        '@type': 'PostalAddress',
        streetAddress: club.address,
        addressLocality: club.municipality_name,
        addressCountry: 'SE',
      },
      geo: {
        '@type': 'GeoCoordinates',
        latitude: club.latitude,
        longitude: club.longitude,
      },
      url: `${BASE_URL}/${club.municipality_slug}/${club.slug}`,
    }));
    
    schemas.push(...clubSchemas);
  }

  return schemas;
}

/**
 * Article schema for SEO articles
 */
export function generateArticleSchema(article: SEOArticle) {
  const articleUrl = `${BASE_URL}/artiklar/${article.slug}`;
  
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    '@id': articleUrl,
    headline: article.title,
    description: article.meta_description || article.excerpt,
    image: article.featured_image ? `${BASE_URL}${article.featured_image}` : `${BASE_URL}/og-default.png`,
    url: articleUrl,
    datePublished: article.published_at,
    dateModified: article.updated_at,
    author: {
      '@type': 'Organization',
      name: 'Ungdomsappen',
      url: BASE_URL,
    },
    publisher: {
      '@type': 'Organization',
      name: 'Ungdomsappen',
      logo: {
        '@type': 'ImageObject',
        url: `${BASE_URL}/logo.png`,
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': articleUrl,
    },
    articleSection: getAudienceSection(article.target_audience),
    breadcrumb: {
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'Hem',
          item: BASE_URL,
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: 'Artiklar',
          item: `${BASE_URL}/artiklar`,
        },
        {
          '@type': 'ListItem',
          position: 3,
          name: article.title,
          item: articleUrl,
        },
      ],
    },
  };
}

/**
 * Event schema for nearby events
 */
export function generateEventSchema(event: NearbyEvent) {
  const eventUrl = `${BASE_URL}/events/${event.slug}`;
  
  return {
    '@context': 'https://schema.org',
    '@type': 'Event',
    '@id': eventUrl,
    name: event.title,
    startDate: event.start_date,
    endDate: event.end_date,
    location: {
      '@type': 'Place',
      name: event.location_name,
      address: {
        '@type': 'PostalAddress',
        addressCountry: 'SE',
      },
      geo: {
        '@type': 'GeoCoordinates',
        latitude: event.latitude,
        longitude: event.longitude,
      },
    },
    organizer: {
      '@type': 'Organization',
      name: event.club_name,
    },
    url: eventUrl,
  };
}

/**
 * ItemList schema for article listings
 */
export function generateArticleListSchema(articles: SEOArticle[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: articles.map((article, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      item: {
        '@type': 'Article',
        url: `${BASE_URL}/artiklar/${article.slug}`,
        headline: article.title,
        description: article.excerpt || article.meta_description,
        image: article.featured_image ? `${BASE_URL}${article.featured_image}` : undefined,
      },
    })),
  };
}

/**
 * ItemList schema for municipality listings
 */
export function generateMunicipalityListSchema(locations: SwedishLocation[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: locations.map((location, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      item: {
        '@type': 'Place',
        url: `${BASE_URL}/kommun/${location.slug}`,
        name: location.name,
        address: {
          '@type': 'PostalAddress',
          addressLocality: location.name,
          addressRegion: location.region,
          addressCountry: 'SE',
        },
      },
    })),
  };
}

/**
 * FAQPage schema for FAQ sections
 */
export function generateFAQSchema(faqs: { question: string; answer: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };
}

// Helper function
function getAudienceSection(audience: string): string {
  switch (audience) {
    case 'YOUTH':
      return 'För ungdomar';
    case 'GUARDIAN':
      return 'För föräldrar';
    case 'MUNICIPALITY':
      return 'För kommuner';
    default:
      return 'Allmänt';
  }
}

/**
 * Component to render JSON-LD schema in head
 */
export function JsonLdScript({ schema }: { schema: object | object[] }) {
  const schemas = Array.isArray(schema) ? schema : [schema];
  
  return (
    <>
      {schemas.map((s, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(s) }}
        />
      ))}
    </>
  );
}



