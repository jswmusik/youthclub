import api from './api';

export interface AnalyticsFilter {
  start_date: string; // ISO String
  end_date: string;   // ISO String
  club_id?: number | null;
  group_id?: number | null;
  grades?: number[];
  genders?: string[];
  interests?: number[];
  age_min?: number;
  age_max?: number;
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
}

export interface ComparisonData {
  club_name: string;
  visits: number;
  unique_users: number;
  new_members: number;
  utilization: number;
}

export interface DemographicData {
  gender_split: { legal_gender: string | null; count: number }[];
  grade_distribution: { grade: number; count: number }[];
}

export interface AnalyticsResponse {
  traffic: TrafficMetrics;
  heatmap: HeatmapPoint[];
  inventory: InventoryMetrics;
  events: any; // Add specific types as needed
  network?: { nomad_percentage: number; nomad_count: number } | null;
  comparison?: ComparisonData[]; // Optional because it might not exist for single club view
  demographics?: DemographicData;
}

export const analyticsApi = {
  getDashboardMetrics: async (filters: AnalyticsFilter) => {
    const response = await api.post<AnalyticsResponse>('/analytics/dashboard/', filters);
    return response.data;
  },
};

