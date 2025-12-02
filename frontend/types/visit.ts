import { User } from './user';
import { Club } from './organization';

export interface VisitSession {
  id: number;
  user: number; // ID
  user_details: User; // Full user object from serializer
  club: number; // ID
  club_name: string;
  club_avatar: string | null;
  check_in_at: string; // ISO Date
  check_out_at: string | null; // ISO Date or null
  method: 'QR_KIOSK' | 'MANUAL_ADMIN' | 'MANUAL_SELF';
  is_guest?: boolean; // True if user's preferred_club != visit club
}

export interface VisitAnalytics {
  total_checkins: number;
  avg_weekly_visits: number;
  avg_duration_minutes: number;
  clubs_visited_count: number;
}

