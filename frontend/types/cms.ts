export interface TableOfContentsItem {
  title: string;
  anchor: string;
}

export interface Page {
  id: number;
  title: string;
  slug: string;
  page_type: 'standard' | 'creative';
  content: string;
  excerpt?: string;
  hero_tagline?: string; // Sub-hero tagline displayed below the title
  hero_image?: string | null;
  show_hero: boolean;
  // Table of contents
  table_of_contents?: TableOfContentsItem[] | null;
  show_toc: boolean;
  // Author info
  author_name?: string;
  author_title?: string;
  author_image?: string | null;
  // Features for creative pages
  features?: number[];           // Feature IDs (for reference)
  features_data?: FeatureShowcase[];  // Full feature data (read-only from API)
  // SEO
  meta_title: string;
  meta_description: string;
  og_title: string;
  og_image?: string | null;
  ai_description: string;
  is_published: boolean;
  updated_at: string;
  created_at?: string;
}

export interface MenuItem {
  id: number;
  label: string;
  page?: number | null; // ID of the linked page
  page_slug?: string;   // Read-only from serializer
  external_url?: string;
  location: 'header' | 'footer' | 'community_footer' | 'none';
  parent?: number | null;
  order: number;
}

// Response from the public menu endpoint
export interface PublicMenuResponse {
  header: MenuItem[];
  footer: MenuItem[];
  community_footer: MenuItem[];
}

export interface FeatureShowcase {
  id: number;
  title: string;
  description: string;
  media: string; // URL
  media_type: 'image' | 'video' | 'lottie';
  alt_text: string;
  layout: 'left' | 'right' | 'grid';
  animation_type: string;
  order: number;
  is_active: boolean;
}

export interface CookieConsent {
  id: number;
  version: string;
  title: string;
  description: string;
  policy_text: string;
  is_active: boolean;
  created_at: string;
}
