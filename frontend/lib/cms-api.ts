import api from './api'; // Import your existing API wrapper
import { Page, MenuItem, FeatureShowcase, CookieConsent, PublicMenuResponse } from '@/types/cms';

// Helper type for paginated responses
interface PaginatedResponse<T> {
  results: T[];
  count: number;
  next: string | null;
  previous: string | null;
}

// Helper to extract results from paginated response
const extractResults = <T>(data: T[] | PaginatedResponse<T>): T[] => {
  if (Array.isArray(data)) return data;
  return data.results || [];
};

export const cmsApi = {
  // Pages
  getPages: () => api.get<PaginatedResponse<Page>>('/cms/pages/').then(res => extractResults(res.data)),
  getPage: (slug: string) => api.get<Page>(`/cms/pages/${slug}/`).then(res => res.data),
  // Public page endpoint - only returns published pages
  getPublicPage: (slug: string, lang?: string) => api.get<Page>(`/cms/pages/public/${slug}/${lang ? `?lang=${lang}` : ''}`).then(res => res.data),
  createPage: (data: FormData) => api.post<Page>('/cms/pages/', data, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }).then(res => res.data),
  updatePage: (slug: string, data: FormData) => api.patch<Page>(`/cms/pages/${slug}/`, data, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }).then(res => res.data),
  deletePage: (slug: string) => api.delete(`/cms/pages/${slug}/`),

  // Navigation
  getMenuItems: () => api.get<PaginatedResponse<MenuItem>>('/cms/menu/').then(res => extractResults(res.data)),
  getPublicMenu: (lang?: string) => api.get<PublicMenuResponse>(`/cms/menu/public_menu/${lang ? `?lang=${lang}` : ''}`).then(res => res.data),
  updateMenuItem: (id: number, data: Partial<MenuItem>) => api.patch<MenuItem>(`/cms/menu/${id}/`, data).then(res => res.data),
  createMenuItem: (data: Partial<MenuItem>) => api.post<MenuItem>('/cms/menu/', data).then(res => res.data),
  deleteMenuItem: (id: number) => api.delete(`/cms/menu/${id}/`),

  // Creative Features
  getFeatures: () => api.get<PaginatedResponse<FeatureShowcase>>('/cms/features/').then(res => extractResults(res.data)),
  createFeature: (data: FormData) => api.post<FeatureShowcase>('/cms/features/', data, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }).then(res => res.data),
  updateFeature: (id: number, data: FormData) => api.patch<FeatureShowcase>(`/cms/features/${id}/`, data, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }).then(res => res.data),
  deleteFeature: (id: number) => api.delete(`/cms/features/${id}/`),

  // Cookies
  getCookies: () => api.get<PaginatedResponse<CookieConsent>>('/cms/cookies/').then(res => extractResults(res.data)),
  createCookie: (data: any) => api.post<CookieConsent>('/cms/cookies/', data).then(res => res.data),
  toggleCookieActive: (id: number, isActive: boolean) => api.patch(`/cms/cookies/${id}/`, { is_active: isActive }),
};

