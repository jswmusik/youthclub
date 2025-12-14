import api from './api';
import { Course, CourseFormData, LearningCategory, ChapterFormData, ContentItemFormData } from '../types/learning';

const BASE_URL = '/learning';

export const learningApi = {
    // --- COURSES ---
    getAllCourses: async () => {
        return api.get<Course[]>(`${BASE_URL}/courses/`);
    },

    getCourse: async (slug: string) => {
        return api.get<Course>(`${BASE_URL}/courses/${slug}/`);
    },

    createCourse: async (data: CourseFormData) => {
        const formData = new FormData();
        Object.entries(data).forEach(([key, value]) => {
            if (value === null || value === undefined || value === '') return;
            
            if (key === 'cover_image') {
                if (value instanceof File) {
                    formData.append(key, value);
                }
                // If string, it's an existing URL, don't send it
            } else if (key === 'visible_to_roles') {
                // Send as JSON string for JSONField or individual items if backend expects list
                // Since Django JSONField handles list automatically if sent as JSON string
                formData.append(key, JSON.stringify(value)); 
            } else {
                formData.append(key, String(value));
            }
        });
        
        return api.post(`${BASE_URL}/courses/`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
    },

    updateCourse: async (slug: string, data: Partial<CourseFormData>) => {
        const formData = new FormData();
        Object.entries(data).forEach(([key, value]) => {
            if (value === null || value === undefined || value === '') return;

            if (key === 'cover_image') {
                if (value instanceof File) {
                    formData.append(key, value);
                }
            } else if (key === 'visible_to_roles') {
                formData.append(key, JSON.stringify(value));
            } else {
                formData.append(key, String(value));
            }
        });

        return api.patch(`${BASE_URL}/courses/${slug}/`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
    },

    deleteCourse: async (slug: string) => {
        return api.delete(`${BASE_URL}/courses/${slug}/`);
    },

    markItemComplete: async (courseSlug: string, itemId: number) => {
        return api.post(`${BASE_URL}/courses/${courseSlug}/mark-item-complete/`, { item_id: itemId });
    },

    // --- CATEGORIES ---
    getCategories: async () => {
        return api.get<LearningCategory[]>(`${BASE_URL}/categories/`);
    },

    createCategory: async (name: string) => {
        return api.post(`${BASE_URL}/categories/`, { name });
    },

    updateCategory: async (id: number, name: string) => {
        return api.patch(`${BASE_URL}/categories/${id}/`, { name });
    },

    deleteCategory: async (id: number) => {
        return api.delete(`${BASE_URL}/categories/${id}/`);
    },

    // --- CHAPTERS ---
    createChapter: async (data: ChapterFormData) => {
        return api.post(`${BASE_URL}/chapters/`, data);
    },

    updateChapter: async (id: number, data: Partial<ChapterFormData>) => {
        return api.patch(`${BASE_URL}/chapters/${id}/`, data);
    },

    deleteChapter: async (id: number) => {
        return api.delete(`${BASE_URL}/chapters/${id}/`);
    },

    reorderChapters: async (courseSlug: string, orderedIds: number[]) => {
        // Backend specific endpoint to bulk update order
        return api.post(`${BASE_URL}/courses/${courseSlug}/reorder_chapters/`, { ordered_ids: orderedIds });
    },

    // --- CONTENT ITEMS ---
    createItem: async (data: ContentItemFormData) => {
        const formData = new FormData();
        const contentType = data.type;
        
        // Always include required fields
        formData.append('chapter', String(data.chapter));
        formData.append('type', contentType);
        formData.append('title', data.title);
        formData.append('order', String(data.order || 0));
        formData.append('estimated_duration', String(data.estimated_duration || 5));
        
        // Only include content fields based on type
        if (contentType === 'VIDEO' && data.video_url) {
            formData.append('video_url', data.video_url);
        }
        
        if (contentType === 'TEXT' && data.text_content) {
            // Sanitize HTML content: remove base64 image data URLs but preserve external URLs
            // ReactQuill embeds images as base64 which can cause issues, but external URLs are fine
            let sanitizedContent = data.text_content;
            
            // Remove base64 image data URLs (data:image/...) but keep external URLs
            sanitizedContent = sanitizedContent.replace(/<img[^>]+src="data:image\/[^"]+"[^>]*>/gi, '');
            // Also handle cases where src might be in single quotes
            sanitizedContent = sanitizedContent.replace(/<img[^>]+src='data:image\/[^']+'[^>]*>/gi, '');
            
            // Ensure external image URLs have proper attributes for display
            sanitizedContent = sanitizedContent.replace(
                /<img([^>]*src="(?!data:)[^"]+"[^>]*)>/gi,
                '<img$1 loading="lazy" alt="">'
            );
            sanitizedContent = sanitizedContent.replace(
                /<img([^>]*src='(?!data:)[^']+'[^>]*)>/gi,
                '<img$1 loading="lazy" alt="">'
            );
            
            // Only append if content is not empty after sanitization
            if (sanitizedContent.trim()) {
                formData.append('text_content', sanitizedContent);
            }
        }
        
        if (contentType === 'FILE' && data.file_upload instanceof File) {
            formData.append('file_upload', data.file_upload);
        }
        
        try {
            return await api.post(`${BASE_URL}/items/`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
        } catch (error: any) {
            // Log detailed error for debugging
            console.error('Create item error:', error);
            if (error.response?.data) {
                console.error('Backend error details:', error.response.data);
            }
            throw error;
        }
    },

    updateItem: async (id: number, data: Partial<ContentItemFormData>) => {
        const formData = new FormData();
        const contentType = data.type;
        
        Object.entries(data).forEach(([key, value]) => {
            if (value === null || value === undefined) return;
            
            // Handle file uploads
            if (key === 'file_upload') {
                if (value instanceof File) formData.append(key, value);
                return;
            }
            
            // Skip empty strings for optional text fields
            if ((key === 'video_url' || key === 'text_content') && value === '') {
                return;
            }
            
            // Sanitize text_content to remove base64 images but preserve external URLs
            if (key === 'text_content' && typeof value === 'string') {
                let sanitizedContent = value;
                // Remove base64 image data URLs but keep external URLs
                sanitizedContent = sanitizedContent.replace(/<img[^>]+src="data:image\/[^"]+"[^>]*>/gi, '');
                sanitizedContent = sanitizedContent.replace(/<img[^>]+src='data:image\/[^']+'[^>]*>/gi, '');
                
                // Ensure external image URLs have proper attributes for display
                sanitizedContent = sanitizedContent.replace(
                    /<img([^>]*src="(?!data:)[^"]+"[^>]*)>/gi,
                    '<img$1 loading="lazy" alt="">'
                );
                sanitizedContent = sanitizedContent.replace(
                    /<img([^>]*src='(?!data:)[^']+'[^>]*)>/gi,
                    '<img$1 loading="lazy" alt="">'
                );
                
                // Only append if content is not empty after sanitization
                if (sanitizedContent.trim()) {
                    formData.append(key, sanitizedContent);
                }
                return;
            }
            
            // Only send content fields that match the type
            if (contentType === 'VIDEO' && (key === 'text_content' || key === 'file_upload')) return;
            if (contentType === 'TEXT' && (key === 'video_url' || key === 'file_upload')) return;
            if (contentType === 'FILE' && (key === 'video_url' || key === 'text_content')) return;
            
            // Append all other values as strings
            formData.append(key, String(value));
        });
        
        try {
            return await api.patch(`${BASE_URL}/items/${id}/`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
        } catch (error: any) {
            // Log detailed error for debugging
            console.error('Update item error:', error);
            if (error.response?.data) {
                console.error('Backend error details:', error.response.data);
            }
            throw error;
        }
    },

    deleteItem: async (id: number) => {
        return api.delete(`${BASE_URL}/items/${id}/`);
    },

    // Reorder items within a chapter
    reorderItems: async (chapterId: number, orderedIds: number[]) => {
        // Update order for each item
        const updates = orderedIds.map((itemId, index) => 
            api.patch(`${BASE_URL}/items/${itemId}/`, { order: index + 1 })
        );
        return Promise.all(updates);
    },

    // --- IMAGE UPLOAD FOR RICH TEXT EDITOR ---
    uploadImage: async (file: File) => {
        const formData = new FormData();
        formData.append('image', file);
        
        const response = await api.post(`${BASE_URL}/upload-image/`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return response.data;
    },

    // --- ANALYTICS ---
    getCourseAnalytics: async (slug: string) => {
        return api.get(`${BASE_URL}/courses/${slug}/analytics/`);
    },

    // --- RATING ---
    rateCourse: async (slug: string, score: number) => {
        return api.post(`${BASE_URL}/courses/${slug}/rate/`, { score });
    }
};