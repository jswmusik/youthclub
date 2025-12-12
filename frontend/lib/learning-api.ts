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
            if (value === null || value === undefined) return;
            
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
            if (value === null || value === undefined) return;

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
        return api.post(`${BASE_URL}/courses/${courseSlug}/mark_item_complete/`, { item_id: itemId });
    },

    // --- CATEGORIES ---
    getCategories: async () => {
        return api.get<LearningCategory[]>(`${BASE_URL}/categories/`);
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
        Object.entries(data).forEach(([key, value]) => {
            if (value === null || value === undefined) return;
            if (key === 'file_upload' && value instanceof File) {
                formData.append(key, value);
            } else {
                formData.append(key, String(value));
            }
        });
        return api.post(`${BASE_URL}/items/`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
    },

    updateItem: async (id: number, data: Partial<ContentItemFormData>) => {
        const formData = new FormData();
        Object.entries(data).forEach(([key, value]) => {
            if (value === null || value === undefined) return;
            if (key === 'file_upload') {
                if (value instanceof File) formData.append(key, value);
            } else {
                formData.append(key, String(value));
            }
        });
        return api.patch(`${BASE_URL}/items/${id}/`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
    },

    deleteItem: async (id: number) => {
        return api.delete(`${BASE_URL}/items/${id}/`);
    }
};