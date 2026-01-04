// frontend/types/seo.ts

export interface Keyword {
  id: number;
  keyword: string;
  slug: string;
  search_volume: number | null;
  difficulty: number | null;
  intent: 'INFORMATIONAL' | 'NAVIGATIONAL' | 'TRANSACTIONAL' | 'LOCAL';
  status: 'ACTIVE' | 'PAUSED' | 'ARCHIVED';
  target_audience: 'YOUTH' | 'GUARDIAN' | 'MUNICIPALITY' | 'GENERAL';
  current_ranking: number | null;
  last_rank_check: string | null;
  source: string;
  external_id: string;
  notes?: string;
  // New fields for content generation
  has_content: boolean;
  content_status: string;
  generated_page_slug: string | null;
  generated_article_slug: string | null;
  detected_location_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface SwedishLocation {
  id: number;
  name: string;
  name_genitive: string;
  slug: string;
  location_type: 'MUNICIPALITY' | 'CITY' | 'REGION';
  scb_code: string;
  latitude: number;
  longitude: number;
  population: number | null;
  region: string;
  linked_municipality: {
    id: number;
    name: string;
    slug: string;
  } | null;
  seo_priority: number;
  has_landing_page: boolean;
  created_at: string;
  updated_at: string;
}

export interface LocalLandingPage {
  id: number;
  location: SwedishLocation | number;
  slug: string;
  primary_keyword: Keyword | number | null;
  secondary_keywords: Keyword[] | number[];
  title: string;
  meta_description: string;
  h1_title: string;
  hero_tagline: string;
  intro_content: string;
  main_content: string;
  cta_content: string;
  // SEO Fields
  focus_keyphrase: string;
  // Hero Image
  hero_image: string | null;
  hero_image_alt: string;
  // Open Graph
  og_title: string;
  og_description: string;
  og_image: string | null;
  // Twitter Card
  twitter_card: 'summary' | 'summary_large_image';
  twitter_title: string;
  twitter_description: string;
  twitter_image: string | null;
  // FAQ Schema
  faq_items: Array<{ question: string; answer: string }>;
  // Content metrics
  word_count: number;
  reading_time_minutes: number;
  // Display options
  show_nearby_clubs: boolean;
  show_nearby_events: boolean;
  show_platform_stats: boolean;
  show_testimonials: boolean;
  canonical_url: string;
  status: 'DRAFT' | 'REVIEW' | 'PUBLISHED' | 'ARCHIVED';
  published_at: string | null;
  published_by: number | null;
  ai_generated_at: string | null;
  ai_model_used: string;
  generation_prompt_hash: string;
  created_at: string;
  updated_at: string;
}

export interface SEOArticle {
  id: number;
  target_keyword: Keyword | number | null;
  target_keyword_text?: string;
  target_audience: 'YOUTH' | 'GUARDIAN' | 'MUNICIPALITY' | 'GENERAL';
  title: string;
  h1_title: string;
  slug: string;
  meta_description: string;
  content: string;
  excerpt: string;
  featured_image: string | null;
  featured_image_alt: string;
  og_title: string;
  og_description: string;
  related_articles: SEOArticle[] | number[];
  linked_clubs: number[];
  linked_events: number[];
  status: 'IDEA' | 'OUTLINE' | 'DRAFTING' | 'REVIEW' | 'APPROVED' | 'PUBLISHED' | 'ARCHIVED';
  published_at: string | null;
  ai_draft: string;
  created_at: string;
  updated_at: string;
}

export interface InternalLink {
  id: number;
  source_url: string;
  target_url: string;
  source_page_type?: string;
  target_page_type?: string;
  anchor_text: string;
  link_type?: string;
  is_auto_generated: boolean;
  is_active?: boolean;
  link_strength: number;
  created_at: string;
  updated_at?: string;
}

export interface SEOCampaign {
  id: number;
  name: string;
  description: string;
  target_keywords: Keyword[] | number[];
  target_locations: SwedishLocation[] | number[];
  target_audience: 'YOUTH' | 'GUARDIAN' | 'MUNICIPALITY' | 'GENERAL';
  status: 'PLANNING' | 'ACTIVE' | 'PAUSED' | 'COMPLETED';
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  updated_at: string;
}

// API Response types
export interface NearbyClub {
  id: number;
  name: string;
  slug: string;
  address: string;
  municipality_name: string;
  municipality_slug: string;
  latitude: number;
  longitude: number;
  distance_km: number;
}

export interface NearbyEvent {
  id: number;
  title: string;
  slug: string;
  start_date: string;
  end_date: string;
  location_name: string;
  club_name: string;
  latitude: number;
  longitude: number;
  distance_km: number;
}

export interface LocalStats {
  period: string;
  total_visits: number;
  total_members: number;
  total_events: number;
  unique_visitors: number;
  avg_daily_visits: number;
  growth_percentage: number;
}

export interface LocationNearbyData {
  location: SwedishLocation;
  nearby_clubs: NearbyClub[];
  nearby_events: NearbyEvent[];
  local_stats: LocalStats;
}

