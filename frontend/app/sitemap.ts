// frontend/app/sitemap.ts
import { MetadataRoute } from 'next';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://ungdomsappen.se';
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${BASE_URL}/kommuner`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/artiklar`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/priser`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/kontakt`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.6,
    },
  ];

  // Fetch dynamic pages from API
  let localPages: MetadataRoute.Sitemap = [];
  let articles: MetadataRoute.Sitemap = [];
  let locations: MetadataRoute.Sitemap = [];

  try {
    // Fetch published local landing pages
    const localPagesRes = await fetch(`${API_URL}/api/seo/public/local-pages/`, {
      next: { revalidate: 3600 }, // Cache for 1 hour
    });
    if (localPagesRes.ok) {
      const localPagesData = await localPagesRes.json();
      localPages = (localPagesData || []).map((page: any) => ({
        url: `${BASE_URL}/kommun/${page.slug}`,
        lastModified: new Date(page.updated_at || new Date()),
        changeFrequency: 'weekly' as const,
        priority: 0.8,
      }));
    }
  } catch (error) {
    console.error('Failed to fetch local pages for sitemap:', error);
  }

  try {
    // Fetch published articles
    const articlesRes = await fetch(`${API_URL}/api/seo/public/articles/`, {
      next: { revalidate: 3600 },
    });
    if (articlesRes.ok) {
      const articlesData = await articlesRes.json();
      articles = (articlesData || []).map((article: any) => ({
        url: `${BASE_URL}/artiklar/${article.slug}`,
        lastModified: new Date(article.updated_at || new Date()),
        changeFrequency: 'monthly' as const,
        priority: 0.7,
      }));
    }
  } catch (error) {
    console.error('Failed to fetch articles for sitemap:', error);
  }

  try {
    // Fetch all Swedish locations (municipalities)
    const locationsRes = await fetch(`${API_URL}/api/seo/locations/?type=MUNICIPALITY&page_size=300`, {
      next: { revalidate: 86400 }, // Cache for 24 hours
    });
    if (locationsRes.ok) {
      const locationsData = await locationsRes.json();
      locations = ((locationsData.results || locationsData) || []).map((location: any) => ({
        url: `${BASE_URL}/kommun/${location.slug}`,
        lastModified: new Date(location.updated_at || new Date()),
        changeFrequency: 'monthly' as const,
        priority: 0.6,
      }));
    }
  } catch (error) {
    console.error('Failed to fetch locations for sitemap:', error);
  }

  // Combine all pages, removing duplicates (local pages take priority over locations)
  const localPageUrls = new Set(localPages.map(p => p.url));
  const filteredLocations = locations.filter(l => !localPageUrls.has(l.url));

  return [...staticPages, ...localPages, ...articles, ...filteredLocations];
}

