import api from './api';

export interface AnalyticsFilter {
  start_date: string; // ISO String
  end_date: string;   // ISO String
  club_id?: number | null;
  // Group takes precedence over all other demographic filters
  group_id?: number | null;
  // Demographics (ignored if group_id is set)
  grades?: number[];
  genders?: string[];
  interests?: number[];
  age_min?: number | null;
  age_max?: number | null;
  // Custom fields: { field_id: value }
  custom_fields?: Record<number, string | null>;
}

export interface TrafficMetrics {
  total_visits: number;
  unique_visitors: number;
  retention_rate: number;
  avg_duration_minutes: number;
  visits_per_member: number;
}

export interface HeatmapPoint {
  weekday: number; // 1-7 (Django standard: 1=Sunday, 2=Monday...)
  hour: number;    // 0-23
  count: number;
}

export interface InventoryMetrics {
  total_loans: number;
  unique_borrowers: number;
  top_items: { item__title: string; item__category__name: string; count: number }[];
  category_distribution: { item__category__name: string; count: number }[];
  dust_collectors?: number;  // Items with 0 loans in period
}

export interface ComparisonData {
  club_id: number;
  club_name: string;
  visits: number;
  unique_users: number;
  new_members: number;
  events_count: number;
  utilization: number;
}

export interface DemographicData {
  gender_split: { legal_gender: string | null; count: number }[];
  grade_distribution: { grade: number; count: number }[];
}

export interface TopEvent {
  id: number;
  title: string;
  start_date: string;
  registration_count: number;
  max_seats: number | null;
}

export interface EventMetrics {
  total_events: number;
  total_registrations: number;
  status_breakdown: { status: string; count: number }[];
  show_up_rate: number;
  avg_capacity_utilization: number;
  top_events: TopEvent[];
}

export interface InterestData {
  interests__name: string | null;
  count: number;
}

export interface GroupComparisonData {
  group_id: number;
  group_name: string;
  club_name: string | null;
  is_municipality_wide: boolean;
  total_members: number;
  total_checkins: number;
  male_count: number;
  female_count: number;
  other_count: number;
  new_members: number;
}

// NEW: Questionnaire Analytics
export interface QuestionnaireParticipation {
  started_count: number;
  completed_count: number;
  not_participated_count: number;
  started_pct: number;
  completed_pct: number;
  not_participated_pct: number;
}

export interface GenderBreakdown {
  male_pct: number;
  female_pct: number;
  other_pct: number;
  male_count: number;
  female_count: number;
  other_count: number;
}

export interface QuestionnaireMetrics {
  total_questionnaires: number;
  participation: QuestionnaireParticipation;
  gender_breakdown: GenderBreakdown;
  total_eligible: number;
  total_responses: number;
}

// NEW: Booking Analytics
export interface TopResource {
  resource_id: number;
  resource_name: string;
  resource_type: 'ROOM' | 'EQUIPMENT';
  count: number;
}

export interface BookingMetrics {
  total_bookings: number;
  gender_breakdown: GenderBreakdown;
  top_resources: TopResource[];
  unique_bookers: number;
}

export interface AnalyticsResponse {
  total_members: number;  // Total members based on current filters
  traffic: TrafficMetrics;
  heatmap: HeatmapPoint[];
  inventory: InventoryMetrics;
  events: EventMetrics;
  network?: { nomad_percentage: number; nomad_count: number } | null;
  comparison?: ComparisonData[];
  group_comparison?: GroupComparisonData[];
  demographics?: DemographicData;
  top_interests?: InterestData[];
  // NEW: Questionnaire and Booking Analytics
  questionnaires?: QuestionnaireMetrics;
  bookings?: BookingMetrics;
}

// Filter options returned by the backend
export interface FilterOptionsGroup {
  id: number;
  name: string;
  group_type: string;
  club_id?: number | null;
  club__name?: string | null;
  municipality__name?: string;
}

export interface FilterOptionsCustomField {
  id: number;
  name: string;
  field_type: string;
  options: string[];
  club_id?: number | null;
  club__name?: string | null;
  municipality__name?: string;
}

export interface FilterOptions {
  clubs: { id: number; name: string; municipality__name?: string }[];
  groups: FilterOptionsGroup[];
  custom_fields: FilterOptionsCustomField[];
  municipality_id: number | null;
}

// AI Report Types
export type AIReportType = 'summary' | 'monthly' | 'trend';
export type AILanguage = 'en' | 'sv' | 'no';
export type AIProvider = 'anthropic' | 'openai';

export interface AIReportRequest {
  user_request: string;
  report_type: AIReportType;
  language: AILanguage;
  provider?: AIProvider;
  filters: AnalyticsFilter;
  visible_sections?: AnalyticsPreferences;  // Optional: Only report on visible sections
}

export interface AIReportResponse {
  success: boolean;
  report: string;
  metadata: {
    provider: string;
    report_type: string;
    language: string;
  };
}

export interface AIProvidersResponse {
  available_providers: AIProvider[];
  default_provider: AIProvider | null;
  is_configured: boolean;
  error?: string;
}

// Analytics Visibility Preferences
export interface AnalyticsPreferences {
  metrics: boolean;
  heatmap: boolean;
  inventory: boolean;
  demographics: boolean;
  interests: boolean;
  insights: boolean;
  questionnaires: boolean;
  bookings: boolean;
  groupComparison: boolean;
  clubComparison: boolean;  // Municipality admin only
  events: boolean;
}

export interface AnalyticsPreferencesResponse {
  preferences: AnalyticsPreferences;
  updated_at: string;
}

export const analyticsApi = {
  getDashboardMetrics: async (filters: AnalyticsFilter) => {
    const response = await api.post<AnalyticsResponse>('/analytics/dashboard/', filters);
    return response.data;
  },
  
  getFilterOptions: async (clubId?: number | null) => {
    const params = clubId ? `?club_id=${clubId}` : '';
    const response = await api.get<FilterOptions>(`/analytics/filter-options/${params}`);
    return response.data;
  },
  
  // AI Report Generation
  generateAIReport: async (request: AIReportRequest) => {
    const response = await api.post<AIReportResponse>('/analytics/ai-report/', request);
    return response.data;
  },
  
  // Get available AI providers
  getAIProviders: async () => {
    const response = await api.get<AIProvidersResponse>('/analytics/ai-providers/');
    return response.data;
  },
  
  // Analytics Preferences
  getPreferences: async () => {
    const response = await api.get<AnalyticsPreferencesResponse>('/analytics/preferences/');
    return response.data;
  },
  
  updatePreferences: async (preferences: Partial<AnalyticsPreferences>) => {
    const response = await api.patch<AnalyticsPreferencesResponse>('/analytics/preferences/', {
      preferences
    });
    return response.data;
  },
  
  setAllPreferences: async (preferences: AnalyticsPreferences) => {
    const response = await api.put<AnalyticsPreferencesResponse>('/analytics/preferences/', {
      preferences
    });
    return response.data;
  },
};

