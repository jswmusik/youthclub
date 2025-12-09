// frontend/types/user.ts

export interface UserProfile {
    id: number;
    email: string;
    first_name: string;
    last_name: string;
    nickname?: string;
    phone_number?: string;
    avatar?: string;
    avatar_url?: string | null;
    role?: string;
    preferred_club?: number | { id: number; name: string } | null;
    club?: {
        id: number;
        name: string;
        municipality?: string | null;
        is_in_youth_municipality?: boolean;
        is_followed?: boolean;
    };
    municipality?: {
        id: number;
        name: string;
    };
    // ... other fields
}

// Alias for compatibility
export type User = UserProfile;

export interface GuardianLink {
    id: number; // ID of the Link, not the user
    guardian: UserProfile;
    relationship_type: 'MOTHER' | 'FATHER' | 'GUARDIAN' | 'SIBLING' | 'OTHER';
    is_primary_guardian: boolean;
    status: 'PENDING' | 'ACTIVE' | 'REJECTED'; // mapped from backend
    created_at: string;
}

