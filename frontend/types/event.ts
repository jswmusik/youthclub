// frontend/types/event.ts

import { User } from './user';
import { Club, Municipality } from './organization';

export enum EventStatus {
    DRAFT = 'DRAFT',
    SCHEDULED = 'SCHEDULED',
    PUBLISHED = 'PUBLISHED',
    CANCELLED = 'CANCELLED',
    ARCHIVED = 'ARCHIVED',
}

export enum TargetAudience {
    YOUTH = 'YOUTH',
    GUARDIAN = 'GUARDIAN',
    BOTH = 'BOTH',
}

export interface Event {
    id: number;
    title: string;
    description: string;
    cover_image?: string;
    video_url?: string;
    cost?: string; // Decimal comes as string from API usually, or number
    
    municipality: number | Municipality;
    municipality_detail?: Municipality;
    club?: number | Club;
    club_detail?: Club;
    organizer_name?: string;
    
    status: EventStatus;
    scheduled_publish_date?: string;
    
    start_date: string;
    end_date: string;
    is_recurring: boolean;
    recurrence_pattern?: 'NONE' | 'DAILY' | 'WEEKLY' | 'MONTHLY';
    recurrence_end_date?: string; // Date string format
    parent_event?: number | null; // ID of parent event if this is a recurring instance
    
    location_name: string;
    address?: string;
    latitude?: number;
    longitude?: number;
    is_map_visible?: boolean;
    
    // Visibility
    is_global: boolean;
    target_audience: TargetAudience;
    target_groups: number[]; // IDs of groups
    target_groups_details?: Array<{
        id: number;
        name: string;
        description?: string;
    }>;
    target_genders: string[];
    target_min_age?: number;
    target_max_age?: number;
    target_grades: number[];
    target_interests: number[];
    
    // Registration
    allow_registration: boolean;
    requires_verified_account: boolean;
    requires_guardian_approval: boolean;
    requires_admin_approval: boolean;
    registration_open_date?: string;
    registration_close_date?: string;
    
    // Capacity
    max_seats: number;
    max_waitlist: number;
    enable_tickets: boolean;
    
    // Notifications
    send_reminders: boolean;
    custom_welcome_message?: string;
    
    // SEO Settings
    slug: string;
    meta_description?: string;
    meta_tags?: string;
    page_title?: string;
    
    // Social Media Meta Data (Open Graph)
    og_title?: string;
    og_description?: string;
    og_image?: string;
    
    // Twitter Card Meta Data
    twitter_card_type?: 'summary' | 'summary_large_image';
    twitter_title?: string;
    twitter_description?: string;
    twitter_image?: string;
    
    // Stats (Read only)
    confirmed_participants_count: number;
    waitlist_count: number;
}

export enum RegistrationStatus {
    PENDING_GUARDIAN = 'PENDING_GUARDIAN',
    PENDING_ADMIN = 'PENDING_ADMIN',
    APPROVED = 'APPROVED',
    WAITLIST = 'WAITLIST',
    REJECTED = 'REJECTED',
    CANCELLED = 'CANCELLED',
    ATTENDED = 'ATTENDED',
}

export interface EventRegistration {
    id: number;
    event: number;
    user: number;
    status: RegistrationStatus;
    user_detail?: {
        id: number;
        first_name: string;
        last_name: string;
        email: string;
        avatar?: string | null;
        legal_gender?: string;
    };
    ticket?: {
        id: number;
        ticket_code: string;
        is_active: boolean;
        checked_in_at?: string | null;
    };
    approved_by?: number | null;
    approval_date?: string | null;
    created_at: string;
    updated_at: string;
}

