export interface LearningCategory {
    id: number;
    name: string;
    slug: string;
}

export interface UserProgressSummary {
    status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
    percent_completed: number;
}

export interface Course {
    id: number;
    title: string;
    slug: string;
    description: string;
    cover_image?: string | null;
    category?: number | null;
    category_name?: string;
    visible_to_roles: string[]; // JSON list, e.g. ["MUNICIPALITY_ADMIN"]
    status: 'DRAFT' | 'SCHEDULED' | 'PUBLISHED';
    published_at?: string;
    user_progress?: UserProgressSummary | null;
    rating_avg?: number | null;
    meta_title?: string;
    meta_description?: string;
}

// For creating/updating
export interface CourseFormData {
    title: string;
    description: string;
    category?: number | null;
    visible_to_roles: string[];
    status: 'DRAFT' | 'SCHEDULED' | 'PUBLISHED';
    cover_image?: File | string | null;
}

export type ContentType = 'VIDEO' | 'TEXT' | 'FILE';

export interface ContentItem {
    id: number;
    chapter: number;
    type: ContentType;
    title: string;
    order: number;
    estimated_duration: number; // minutes
    video_url?: string;
    text_content?: string;
    file_upload?: string; // URL when fetching
    is_completed?: boolean;
}

export interface CourseChapter {
    id: number;
    course: number;
    title: string;
    order: number;
    description: string;
    items: ContentItem[];
}

export interface ChapterFormData {
    title: string;
    description?: string;
    order: number;
    course: number;
}

export interface ContentItemFormData {
    chapter: number;
    type: ContentType;
    title: string;
    order: number;
    estimated_duration: number;
    video_url?: string;
    text_content?: string;
    file_upload?: File | null;
}