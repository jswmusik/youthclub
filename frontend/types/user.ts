// frontend/types/user.ts

export interface UserProfile {
    id: number;
    email: string;
    first_name: string;
    last_name: string;
    phone_number?: string;
    avatar?: string;
    preferred_club?: number | { id: number; name: string } | null;
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

