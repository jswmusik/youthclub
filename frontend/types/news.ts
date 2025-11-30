export interface NewsTag {
    id: number;
    name: string;
    slug: string;
}

export interface NewsArticle {
    id: number;
    title: string;
    excerpt: string;
    content: string; // HTML content from WYSIWYG
    hero_image: string | null;
    author_name: string;
    tags_details: NewsTag[];
    published_at: string;
    updated_at: string;
    is_hero: boolean;
    view_count?: number;
}

export interface NewsResponse {
    count: number;
    next: string | null;
    previous: string | null;
    results: NewsArticle[];
}

