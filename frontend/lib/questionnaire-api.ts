import api from './api';

// Types
export interface Questionnaire {
  id: number;
  title: string;
  description: string;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  admin_level: 'SUPER_ADMIN' | 'MUNICIPALITY_ADMIN' | 'CLUB_ADMIN';
  start_date: string;
  expiration_date: string;
  is_anonymous: boolean;
  municipality?: number;
  club?: number;
  benefit_limit?: number;
  questions?: any[];
  rewards?: any[];
}

// Endpoints
export const questionnaireApi = {
  // --- Admin Management ---
  
  // List all questionnaires (filters applied via query params)
  list: (params?: URLSearchParams) => {
    const queryString = params ? `?${params.toString()}` : '';
    return api.get(`/questionnaires/manage/${queryString}`);
  },

  // Get single detail
  get: (id: number | string) => 
    api.get(`/questionnaires/manage/${id}/`),

  // Create new (Metadata only or full structure)
  create: (data: Partial<Questionnaire>) => 
    api.post('/questionnaires/manage/', data),

  // Update
  update: (id: number | string, data: Partial<Questionnaire>) => 
    api.patch(`/questionnaires/manage/${id}/`, data),

  // Delete
  delete: (id: number | string) => 
    api.delete(`/questionnaires/manage/${id}/`),

  // Get Analytics for a specific questionnaire
  getAnalytics: (id: number | string) => 
    api.get(`/questionnaires/manage/${id}/analytics/`),
  
  // Get Summary Analytics (for manager page)
  getSummaryAnalytics: () => 
    api.get('/questionnaires/manage/summary_analytics/'),
  
  // Download PDF for a response
  downloadResponsePdf: (questionnaireId: number | string, responseId: number | string) => 
    api.get(`/questionnaires/manage/${questionnaireId}/download_response_pdf/?response_id=${responseId}`, {
      responseType: 'blob', // Important: Treat response as binary file
    }),
    
  // --- User/Feed ---
  getFeed: (params?: URLSearchParams) => {
    const queryString = params ? `?${params.toString()}` : '';
    return api.get(`/questionnaires/feed/${queryString}`);
  },
  getFeedDetail: (id: number | string) => api.get(`/questionnaires/feed/${id}/`),
  saveAnswers: (id: number | string, answers: any[]) => 
    api.post(`/questionnaires/feed/${id}/save_answers/`, { answers }),
  submitResponse: (data: { questionnaire_id: number; answers: any[] }) => 
    api.post('/questionnaires/feed/submit/', data),
};

