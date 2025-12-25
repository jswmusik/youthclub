// frontend/types/marketing.ts

export interface SiteSEOSettings {
  page_title: string;
  meta_description: string;
  keywords: string;
  og_title: string;
  og_description: string;
  og_image: string | null;
}

export interface Testimonial {
  id: number;
  author_name: string;
  author_role: string;
  quote: string;
  rating: number;
  is_active: boolean;
  created_at: string;
}

export interface KPIStats {
  members: number;
  events: number;
  checkins: number;
  borrowed: number;
  clubs: number;
  calculated_at: string;
}

export interface PublicEvent {
  id: number;
  title: string;
  description: string;
  slug: string;
  cover_image?: string;
  video_url?: string;
  start_date: string;
  end_date: string;
  is_recurring: boolean;
  recurrence_pattern?: string;
  location_name: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  is_map_visible?: boolean;
  municipality_detail?: {
    id: number;
    name: string;
    avatar?: string;
  };
  club_detail?: {
    id: number;
    name: string;
    avatar?: string;
    email?: string;
    phone?: string;
    address?: string;
    description?: string;
  };
  organizer_name?: string;
  organizer_display_name: string;
  allow_registration: boolean;
  is_registration_open: boolean;
  registration_open_date?: string;
  registration_close_date?: string;
  max_seats: number;
  confirmed_participants_count: number;
  spots_available: number | null;
  is_free: boolean;
  cost?: string;
  images?: Array<{ id: number; image: string; caption?: string }>;
  distance_km?: number;
  meta_description?: string;
  page_title?: string;
  og_title?: string;
  og_description?: string;
  og_image?: string;
  created_at: string;
}

