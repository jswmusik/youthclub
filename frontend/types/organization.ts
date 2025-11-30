// frontend/types/organization.ts

export interface OpeningHour {
    id: number;
    weekday: number;
    weekday_display: string;
    week_cycle: string;
    open_time: string;
    close_time: string;
    title: string;
    gender_restriction?: 'ALL' | 'BOYS' | 'GIRLS' | 'OTHER';
    restriction_mode?: 'NONE' | 'AGE' | 'GRADE';
    min_value?: number | null;
    max_value?: number | null;
}

export interface Club {
    id: number;
    name: string;
    municipality: number;
    municipality_name: string;
    description: string;
    email: string;
    phone: string;
    avatar: string | null;
    hero_image: string | null;
    address: string;
    allowed_age_groups: string;
    club_categories: string;
    regular_hours: OpeningHour[];
    terms_and_conditions?: string;
    club_policies?: string;
    latitude?: number | null;
    longitude?: number | null;
}

export interface Group {
    id: number;
    name: string;
    description: string;
    avatar: string | null;
    municipality: number | null;
    municipality_name?: string;
    club: number | null;
    club_name?: string;
    group_type: 'OPEN' | 'APPLICATION' | 'CLOSED';
    target_member_type: 'YOUTH' | 'GUARDIAN';
    is_system_group: boolean;
    system_group_type?: string;
    min_age?: number | null;
    max_age?: number | null;
    grades?: number[];
    genders?: string[];
    interests?: number[];
    interests_details?: Array<{ id: number; name: string }>;
    custom_field_rules?: Record<string, any>;
    member_count: number;
    pending_request_count: number;
    user_status?: 'APPROVED' | 'PENDING' | null; // User's membership status
    created_at: string;
}

