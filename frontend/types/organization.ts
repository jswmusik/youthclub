// frontend/types/organization.ts

export interface OpeningHour {
    id: number;
    weekday: number;
    weekday_display: string;
    week_cycle: string;
    open_time: string;
    close_time: string;
    title: string;
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
}

