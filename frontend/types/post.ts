export interface PostImage {
    id: number;
    image: string;
    order: number;
}

export interface Post {
    id: number;
    title: string;
    content: string;
    post_type: 'TEXT' | 'IMAGE' | 'VIDEO';
    video_url?: string;
    
    // Distribution / Scope
    is_global: boolean;
    target_municipalities: number[];
    target_clubs: number[];
    
    // Status & Scheduling
    status: 'DRAFT' | 'SCHEDULED' | 'PUBLISHED' | 'ARCHIVED';
    published_at?: string; 
    visibility_end_date?: string; 
    is_pinned: boolean;

    // Targeting (Audience)
    target_member_type: 'YOUTH' | 'GUARDIAN' | 'BOTH';
    target_groups: number[];
    target_interests: number[];
    target_genders: string[];
    target_grades: number[];
    target_min_age?: number;
    target_max_age?: number;
    target_custom_fields?: Record<string, any>;

    // Settings
    allow_comments: boolean;
    require_moderation: boolean;
    limit_comments_per_user: number;
    allow_replies: boolean;
    send_push_notification: boolean;
    push_title?: string;
    push_message?: string;

    // Metrics
    view_count: number;
    comment_count: number;

    // Relations
    author?: {
        id: number;
        first_name: string;
        last_name: string;
    };
    images: PostImage[];
    created_at: string;
}
