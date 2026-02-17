// frontend/types/booking.ts

import { User } from './user';
import { Club } from './organization';

/**
 * Resource types for booking resources
 */
export enum ResourceType {
    ROOM = 'ROOM',
    EQUIPMENT = 'EQUIPMENT',
}

/**
 * User scope - who can access/book the resource
 */
export enum UserScope {
    CLUB = 'CLUB',
    MUNICIPALITY = 'MUNICIPALITY',
    GLOBAL = 'GLOBAL',
    GROUP = 'GROUP',
}

/**
 * Week cycle for recurring schedules
 */
export enum WeekCycle {
    ALL = 'ALL',
    ODD = 'ODD',
    EVEN = 'EVEN',
}

/**
 * Booking status
 */
export enum BookingStatus {
    PENDING = 'PENDING',
    APPROVED = 'APPROVED',
    REJECTED = 'REJECTED',
    CANCELLED = 'CANCELLED',
}

/**
 * Recurring booking type
 */
export enum RecurringType {
    FOREVER = 'FOREVER',
    WEEKS = 'WEEKS',
}

/**
 * Schedule slot for a booking resource
 */
export interface BookingSchedule {
    id: number;
    resource: number;
    weekday: 1 | 2 | 3 | 4 | 5 | 6 | 7; // 1=Monday, 7=Sunday
    week_cycle: WeekCycle | 'ALL' | 'ODD' | 'EVEN';
    start_time: string; // HH:MM format
    end_time: string; // HH:MM format
}

/**
 * Group reference (simplified)
 */
export interface GroupReference {
    id: number;
    name: string;
}

/**
 * Booking resource (room, equipment, etc.)
 */
export interface BookingResource {
    id: number;
    club: number | Club;
    club_name?: string;
    
    // Basic Info
    name: string;
    description: string;
    image?: string | null;
    resource_type: ResourceType | 'ROOM' | 'EQUIPMENT';
    
    // Access Rules
    requires_training: boolean;
    qualification_group?: number | GroupReference | null;
    qualification_group_name?: string;
    max_participants: number;
    
    // Configuration / Limits
    allowed_user_scope: UserScope | 'CLUB' | 'MUNICIPALITY' | 'GLOBAL' | 'GROUP';
    allowed_group?: number | GroupReference | null;
    group_name?: string;
    auto_approve: boolean;
    booking_window_weeks: number;
    max_bookings_per_user_per_week: number; // 0 means unlimited
    
    is_active: boolean;
    created_at: string;
    updated_at: string;
    
    // Nested schedules (when included)
    schedules?: BookingSchedule[];
}

/**
 * Participant in a booking
 */
export interface BookingParticipant {
    id: number;
    name: string;
    user?: number | null;
}

/**
 * User detail for booking (simplified user info)
 */
export interface BookingUserDetail {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
    avatar?: string | null;
}

/**
 * Booking record
 */
export interface Booking {
    id: number;
    user: number;
    user_detail?: BookingUserDetail;
    resource: number;
    resource_name?: string;
    club_name?: string;
    
    // Time
    start_time: string; // ISO datetime string
    end_time: string; // ISO datetime string
    
    status: BookingStatus | 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
    internal_notes?: string;
    
    // Participants
    participants?: BookingParticipant[];
    
    // Recurring booking fields
    is_recurring: boolean;
    parent_booking?: number | null;
    recurring_type?: RecurringType | 'FOREVER' | 'WEEKS' | null;
    recurring_weeks?: number | null;
    recurring_end_date?: string | null; // ISO datetime string
    
    created_at: string;
    updated_at?: string;
}

/**
 * Available time slot returned from availability API
 */
export interface AvailableSlot {
    start: string; // ISO datetime string
    end: string; // ISO datetime string
    title?: string;
}

/**
 * Payload for creating a new booking
 */
export interface CreateBookingPayload {
    resource: number;
    start_time: string; // ISO datetime string
    end_time: string; // ISO datetime string
    participants?: string[]; // Names of additional participants
    target_user_id?: number; // Admin-only: book for another user
    is_recurring?: boolean;
    recurring_type?: RecurringType | 'FOREVER' | 'WEEKS';
    recurring_weeks?: number;
}

/**
 * Payload for booking actions (approve, reject, cancel)
 */
export interface BookingActionPayload {
    notes?: string;
    cancel_series?: boolean; // For recurring bookings
}

/**
 * Form data for creating/editing a booking resource
 */
export interface BookingResourceFormData {
    club: number | string;
    name: string;
    description: string;
    resource_type: ResourceType | 'ROOM' | 'EQUIPMENT';
    max_participants: number;
    booking_window_weeks: number;
    max_bookings_per_user_per_week: number;
    allowed_user_scope?: UserScope | 'CLUB' | 'MUNICIPALITY' | 'GLOBAL' | 'GROUP';
    allowed_group?: number | string | null;
    requires_training?: boolean;
    qualification_group?: number | string | null;
    auto_approve?: boolean;
    is_active?: boolean;
}

/**
 * Form data for creating/editing a schedule slot
 */
export interface BookingScheduleFormData {
    resource: number;
    weekday: 1 | 2 | 3 | 4 | 5 | 6 | 7;
    start_time: string;
    end_time: string;
    week_cycle?: WeekCycle | 'ALL' | 'ODD' | 'EVEN';
}








