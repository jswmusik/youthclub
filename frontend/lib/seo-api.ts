// frontend/lib/seo-api.ts
import api from './api';
import { 
  Keyword, 
  SwedishLocation, 
  LocalLandingPage, 
  SEOArticle, 
  InternalLink,
  LocationNearbyData 
} from '@/types/seo';

export const seoApi = {
  // Keywords
  getKeywords: async (params?: { status?: string; intent?: string; target_audience?: string; search?: string; page?: number }) => {
    const res = await api.get('/seo/keywords/', { params });
    return res.data;
  },
  
  getKeyword: async (id: number) => {
    const res = await api.get(`/seo/keywords/${id}/`);
    return res.data as Keyword;
  },
  
  createKeyword: async (data: Partial<Keyword>) => {
    const res = await api.post('/seo/keywords/', data);
    return res.data as Keyword;
  },
  
  updateKeyword: async (id: number, data: Partial<Keyword>) => {
    const res = await api.patch(`/seo/keywords/${id}/`, data);
    return res.data as Keyword;
  },
  
  deleteKeyword: async (id: number) => {
    await api.delete(`/seo/keywords/${id}/`);
  },
  
  // Keyword Analysis & Generation
  analyzeKeyword: async (id: number) => {
    const res = await api.get(`/seo/keywords/${id}/analyze/`);
    return res.data;
  },
  
  generatePageFromKeyword: async (id: number) => {
    const res = await api.post(`/seo/keywords/${id}/generate_page/`);
    return res.data;
  },
  
  generateArticleFromKeyword: async (id: number) => {
    const res = await api.post(`/seo/keywords/${id}/generate_article/`);
    return res.data;
  },

  // Swedish Locations
  getLocations: async (params?: { type?: string; region?: string; search?: string; page?: number; page_size?: number }) => {
    const res = await api.get('/seo/locations/', { params });
    return res.data;
  },
  
  getLocation: async (id: number) => {
    const res = await api.get(`/seo/locations/${id}/`);
    return res.data as SwedishLocation;
  },
  
  getLocationNearbyData: async (id: number) => {
    const res = await api.get(`/seo/locations/${id}/nearby/`);
    return res.data as LocationNearbyData;
  },

  // Local Landing Pages
  getLandingPages: async (params?: { status?: string; location?: number; search?: string; page?: number }) => {
    const res = await api.get('/seo/local-pages/', { params });
    return res.data;
  },
  
  getLandingPage: async (slug: string) => {
    const res = await api.get(`/seo/local-pages/${slug}/`);
    return res.data as LocalLandingPage;
  },
  
  getLandingPageBySlug: async (slug: string) => {
    // Alias for getLandingPage - kept for backwards compatibility
    const res = await api.get(`/seo/local-pages/${slug}/`);
    return res.data as LocalLandingPage;
  },
  
  createLandingPage: async (data: Partial<LocalLandingPage>) => {
    const res = await api.post('/seo/local-pages/', data);
    return res.data as LocalLandingPage;
  },
  
  updateLandingPage: async (slug: string, data: Partial<LocalLandingPage>) => {
    const res = await api.patch(`/seo/local-pages/${slug}/`, data);
    return res.data as LocalLandingPage;
  },
  
  deleteLandingPage: async (slug: string) => {
    await api.delete(`/seo/local-pages/${slug}/`);
  },
  
  generateLandingPageContent: async (slug: string, aiProvider?: string) => {
    const res = await api.post(`/seo/local-pages/${slug}/regenerate_content/`, { ai_provider: aiProvider });
    return res.data as LocalLandingPage;
  },
  
  generateHeroImage: async (slug: string, customPrompt?: string) => {
    // DALL-E image generation takes 15-30 seconds, so we need a longer timeout
    const res = await api.post(`/seo/local-pages/${slug}/generate_image/`, 
      customPrompt ? { prompt: customPrompt } : {},
      { timeout: 60000 } // 60 second timeout for image generation
    );
    return res.data;
  },
  
  deleteHeroImage: async (slug: string) => {
    const res = await api.post(`/seo/local-pages/${slug}/delete_image/`);
    return res.data;
  },
  
  uploadHeroImage: async (slug: string, file: File, altText?: string) => {
    const formData = new FormData();
    formData.append('image', file);
    if (altText) {
      formData.append('alt_text', altText);
    }
    const res = await api.post(`/seo/local-pages/${slug}/upload_image/`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },
  
  updateHeroImageAlt: async (slug: string, altText: string) => {
    const res = await api.patch(`/seo/local-pages/${slug}/update_image_alt/`, { alt_text: altText });
    return res.data;
  },
  
  publishLandingPage: async (slug: string) => {
    const res = await api.post(`/seo/local-pages/${slug}/publish/`);
    return res.data as LocalLandingPage;
  },
  
  unpublishLandingPage: async (slug: string) => {
    const res = await api.post(`/seo/local-pages/${slug}/unpublish/`);
    return res.data as LocalLandingPage;
  },

  // SEO Articles
  getArticles: async (params?: { status?: string; target_audience?: string; search?: string; page?: number }) => {
    const res = await api.get('/seo/articles/', { params });
    return res.data;
  },
  
  getArticle: async (id: number) => {
    const res = await api.get(`/seo/articles/${id}/`);
    return res.data as SEOArticle;
  },
  
  getArticleBySlug: async (slug: string) => {
    const res = await api.get('/seo/articles/', { params: { slug } });
    return res.data.results?.[0] as SEOArticle | undefined;
  },
  
  createArticle: async (data: Partial<SEOArticle>) => {
    const res = await api.post('/seo/articles/', data);
    return res.data as SEOArticle;
  },
  
  updateArticle: async (id: number, data: Partial<SEOArticle>) => {
    const res = await api.patch(`/seo/articles/${id}/`, data);
    return res.data as SEOArticle;
  },
  
  deleteArticle: async (slug: string) => {
    await api.delete(`/seo/articles/${slug}/`);
  },
  
  generateArticleDraft: async (slug: string, aiProvider?: string) => {
    const res = await api.post(`/seo/articles/${slug}/regenerate_content/`, { ai_provider: aiProvider }, {
      timeout: 120000, // 2 minute timeout for AI content generation
    });
    return res.data as SEOArticle;
  },
  
  publishArticle: async (slug: string) => {
    const res = await api.post(`/seo/articles/${slug}/publish/`);
    return res.data as SEOArticle;
  },
  
  unpublishArticle: async (slug: string) => {
    const res = await api.post(`/seo/articles/${slug}/unpublish/`);
    return res.data as SEOArticle;
  },
  
  generateArticleImage: async (slug: string, customPrompt?: string) => {
    // DALL-E image generation takes 15-30 seconds
    const res = await api.post(`/seo/articles/${slug}/generate_image/`, 
      customPrompt ? { prompt: customPrompt } : {},
      { timeout: 60000 } // 60 second timeout for image generation
    );
    return res.data;
  },
  
  deleteArticleImage: async (slug: string) => {
    const res = await api.post(`/seo/articles/${slug}/delete_image/`);
    return res.data;
  },
  
  uploadArticleImage: async (slug: string, file: File, altText?: string) => {
    const formData = new FormData();
    formData.append('image', file);
    if (altText) {
      formData.append('alt_text', altText);
    }
    const res = await api.post(`/seo/articles/${slug}/upload_image/`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },
  
  updateArticleImageAlt: async (slug: string, altText: string) => {
    const res = await api.patch(`/seo/articles/${slug}/update_image_alt/`, { alt_text: altText });
    return res.data;
  },

  // Internal Links
  getInternalLinks: async (params?: { is_auto_generated?: boolean; search?: string; page?: number }) => {
    const res = await api.get('/seo/internal-links/', { params });
    return res.data;
  },
  
  createInternalLink: async (data: Partial<InternalLink>) => {
    const res = await api.post('/seo/internal-links/', data);
    return res.data as InternalLink;
  },
  
  deleteInternalLink: async (id: number) => {
    await api.delete(`/seo/internal-links/${id}/`);
  },
  
  generateLinksForLocalPage: async (pageId: number) => {
    const res = await api.post('/seo/internal-links/generate_for_local_page/', { page_id: pageId });
    return res.data as { success: boolean; message: string; links_generated: number; links: any[] };
  },
  
  generateLinksForArticle: async (articleId: number) => {
    const res = await api.post('/seo/internal-links/generate_for_article/', { article_id: articleId });
    return res.data as { success: boolean; message: string; links_generated: number; links: any[] };
  },
  
  generateAllLinks: async () => {
    const res = await api.post('/seo/internal-links/generate_all/');
    return res.data as { 
      success: boolean; 
      message: string; 
      total_links_generated: number;
      local_pages_processed: number;
      articles_processed: number;
    };
  },

  // Dashboard stats
  getDashboardStats: async () => {
    try {
      // Use the dedicated dashboard endpoint
      const res = await api.get('/seo/dashboard/');
      return {
        totalKeywords: res.data.total_keywords || 0,
        totalLocations: res.data.locations_covered || 0,
        totalLandingPages: res.data.total_local_pages || 0,
        publishedLandingPages: res.data.published_local_pages || 0,
        totalArticles: res.data.total_articles || 0,
        publishedArticles: res.data.published_articles || 0,
      };
    } catch (error) {
      console.error('Failed to fetch SEO dashboard stats:', error);
      return {
        totalKeywords: 0,
        totalLocations: 0,
        totalLandingPages: 0,
        publishedLandingPages: 0,
        totalArticles: 0,
        publishedArticles: 0,
      };
    }
  }
};

