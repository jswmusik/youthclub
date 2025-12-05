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
    club?: number | Club;
    organizer_name?: string;
    
    status: EventStatus;
    
    start_date: string;
    end_date: string;
    is_recurring: boolean;
    recurrence_pattern?: 'NONE' | 'DAILY' | 'WEEKLY' | 'MONTHLY';
    
    location_name: string;
    address?: string;
    latitude?: number;
    longitude?: number;
    
    // Visibility
    is_global: boolean;
    target_audience: TargetAudience;
    target_groups: number[]; // IDs of groups
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

