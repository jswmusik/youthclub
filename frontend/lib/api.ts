import axios from 'axios';
import Cookies from 'js-cookie';

const API_URL = 'http://localhost:8000/api';

// Export for use in other files
export { API_URL };

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor: Automatically add the Token to every request
api.interceptors.request.use((config: any) => {
  // Public endpoints that don't require authentication
  const publicEndpoints = [
    '/custom-fields/public/',
    '/register/youth/',
    '/register/check-guardian/',
    '/municipalities/',
    '/interests/',
  ];
  
  // Get URL path without query parameters
  const relativeUrl = config.url || '';
  const urlPath = relativeUrl.split('?')[0]; // Remove query string
  const fullUrl = (config.baseURL || '') + relativeUrl;
  const fullUrlPath = fullUrl.split('?')[0];
  
  // Check if this is a public endpoint
  const isPublicEndpoint = publicEndpoints.some(endpoint => 
    urlPath.includes(endpoint) || fullUrlPath.includes(endpoint)
  ) || config.skipAuth;
  
  // Skip authentication for public endpoints
  if (isPublicEndpoint) {
    // Explicitly remove Authorization header if it exists
    if (config.headers) {
      delete config.headers.Authorization;
    }
    console.log('[API] Skipping auth for public endpoint:', urlPath);
    return config;
  }
  
  const token = Cookies.get('access_token');
  if (token) {
    config.headers.Authorization = `JWT ${token}`;
  }
  return config;
});

// Interceptor: Handle errors (like if token expires)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // If token is invalid, logout (optional: add refresh logic later)
      Cookies.remove('access_token');
      Cookies.remove('refresh_token');
      // window.location.href = '/login'; // Optional: Force redirect
    }
    return Promise.reject(error);
  }
);

export default api;

// Post feed and reactions
export const fetchYouthFeed = async (page = 1) => {
  return api.get(`/posts/feed/?page=${page}`);
};

export const addPostReaction = async (postId: number, reactionType: string = 'LIKE') => {
  if (!postId) {
    throw new Error('Post ID is required');
  }
  const url = `/posts/${postId}/react/`;
  const fullUrl = `${API_URL}${url}`;
  console.log('Adding reaction:', {
    url,
    fullUrl,
    postId,
    reactionType,
    baseURL: api.defaults.baseURL
  });
  try {
    const response = await api.post(url, { reaction_type: reactionType });
    return response;
  } catch (error: any) {
    console.error('Add reaction error - Full error object:', error);
    console.error('Error response:', error.response);
    console.error('Error config:', error.config);
    console.error('Error details:', {
      url,
      fullUrl,
      postId,
      reactionType,
      status: error?.response?.status,
      statusText: error?.response?.statusText,
      data: error?.response?.data,
      message: error?.message,
      requestUrl: error?.config?.url,
      requestBaseURL: error?.config?.baseURL
    });
    throw error;
  }
};

export const updatePostReaction = async (postId: number, reactionType: string) => {
  if (!postId) {
    throw new Error('Post ID is required');
  }
  const url = `/posts/${postId}/react/`;
  console.log('Updating reaction - URL:', url, 'Type:', reactionType);
  return api.put(url, { reaction_type: reactionType });
};

export const removePostReaction = async (postId: number, reactionType?: string) => {
  if (!postId) {
    throw new Error('Post ID is required');
  }
  const url = `/posts/${postId}/react/`;
  console.log('Removing reaction - URL:', url, 'Type:', reactionType);
  if (reactionType) {
    return api.delete(url, { data: { reaction_type: reactionType } });
  }
  return api.delete(url);
};

// Legacy functions for backward compatibility
export const togglePostLike = async (postId: number) => {
  return addPostReaction(postId, 'LIKE');
};

export const unlikePost = async (postId: number) => {
  return removePostReaction(postId);
};

// Comments
export const fetchPostComments = async (postId: number) => {
  return api.get(`/post-comments/?post_id=${postId}`);
};

export const createPostComment = async (postId: number, content: string, parentId?: number) => {
  const data: any = { post: postId, content };
  if (parentId) {
    data.parent = parentId;
  }
  return api.post('/post-comments/', data);
};

export const deletePostComment = async (commentId: number) => {
  return api.delete(`/post-comments/${commentId}/`);
};

// Clubs
export const fetchClubsByMunicipality = async (municipalityId: number) => {
  return api.get(`/clubs/?municipality=${municipalityId}`);
};

// --- USER PROFILE ENDPOINTS ---

/**
 * Updates the current user's profile.
 * Automatically handles file uploads (FormData) if images are present.
 */
export const updateUserProfile = async (data: { 
  first_name?: string;
  last_name?: string; 
  nickname?: string;
  phone_number?: string;
  mood_status?: string;
  avatar?: File;            // Expect a File object for uploads
  background_image?: File;  // Expect a File object for uploads
  preferred_language?: string;
  date_of_birth?: string;   // ISO date string (YYYY-MM-DD)
  grade?: number | null;
  legal_gender?: string;
  preferred_gender?: string;
  notification_email_enabled?: boolean;
}) => {
  const formData = new FormData();

  Object.entries(data).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      // Handle different value types for FormData
      if (value instanceof File || value instanceof Blob) {
        formData.append(key, value);
      } else if (typeof value === 'boolean') {
        formData.append(key, value.toString());
      } else {
        formData.append(key, value as string);
      }
    }
  });

  // We use PATCH to only update the fields we send
  return api.patch('/auth/users/me/', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};

// --- TIMELINE / ACTIVITY ENDPOINTS ---

/**
 * Fetches posts the user has interacted with (Liked or Commented).
 * Uses the /posts/interactions/ endpoint.
 */
export const fetchUserActivityFeed = async (page = 1) => {
    return api.get(`/posts/interactions/?page=${page}`); 
};

// --- YOUTH GUARDIANS MANAGEMENT ---

export const fetchMyGuardians = () => api.get('/youth/guardians/');

export const inviteGuardian = (data: {
    email: string;
    first_name: string;
    last_name: string;
    relationship_type: string;
    is_primary_guardian: boolean;
    phone_number?: string;
    legal_gender?: string;
}) => api.post('/youth/guardians/', data);

export const removeGuardianLink = (linkId: number) => api.delete(`/youth/guardians/${linkId}/`);

// --- ADMIN GUARDIAN RELATIONSHIP MANAGEMENT ---
export const fetchGuardianRelationships = async (params?: { guardian_id?: number; youth_id?: number; status?: string }) => {
    const queryParams = new URLSearchParams();
    if (params?.guardian_id) queryParams.append('guardian', params.guardian_id.toString());
    if (params?.youth_id) queryParams.append('youth', params.youth_id.toString());
    if (params?.status) queryParams.append('status', params.status);
    const query = queryParams.toString();
    return api.get(`/admin/guardian-relationships/${query ? `?${query}` : ''}`);
};

export const verifyGuardianRelationship = async (linkId: number) => {
    return api.post(`/admin/guardian-relationships/${linkId}/verify/`);
};

export const rejectGuardianRelationship = async (linkId: number) => {
    return api.post(`/admin/guardian-relationships/${linkId}/reject/`);
};

export const resetGuardianRelationship = async (linkId: number) => {
    return api.post(`/admin/guardian-relationships/${linkId}/reset/`);
};

// --- ADMIN USER MANAGEMENT ---

/**
 * Admin Create Youth
 * Creates a new youth user with support for file uploads and arrays.
 */
export const createYouth = async (data: any) => {
  const formData = new FormData();

  Object.keys(data).forEach(key => {
    const value = data[key];

    if (value !== null && value !== undefined) {
      if (key === 'interests' || key === 'guardians') {
        // Handle arrays - DRF ListField expects multiple keys: interests=1&interests=2
        if (Array.isArray(value)) {
          value.forEach(v => formData.append(key, v));
        }
      } else {
        formData.append(key, value);
      }
    }
  });

  return api.post('/users/users/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

/**
 * Admin Update Youth
 * Updates an existing youth user with support for file uploads and arrays.
 * Skips string values for image fields (existing URLs) - only sends File objects.
 */
/**
 * Save custom field values for the current user
 */
export const saveCustomFieldValues = async (values: Record<string, any>) => {
  return api.post('/custom-fields/save_values/', values);
};

export const updateYouth = async (id: number, data: any) => {
  const formData = new FormData();

  Object.keys(data).forEach(key => {
    const value = data[key];

    if (value !== null && value !== undefined) {
      // If updating images, only append if it's a File object (new upload)
      // If it is a string (existing URL), skip it - backend will keep existing image
      if ((key === 'avatar' || key === 'background_image') && typeof value === 'string') {
        return; 
      }

      if (key === 'interests' || key === 'guardians') {
        // Handle arrays - DRF ListField expects multiple keys
        if (Array.isArray(value)) {
          value.forEach(v => formData.append(key, v));
        }
      } else {
        formData.append(key, value);
      }
    }
  });

  return api.patch(`/users/users/${id}/`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

// --- Notification API ---

export const fetchNotifications = (categoryFilter: string = 'ALL') => {
    // If filter is ALL, don't send a param, otherwise send ?category=X
    const query = categoryFilter !== 'ALL' ? `?category=${categoryFilter}` : '';
    return api.get(`/notifications/${query}`);
};

export const fetchUnreadNotificationCount = () => {
    return api.get('/notifications/unread_count/');
};

export const markNotificationRead = (id: number) => {
    return api.post(`/notifications/${id}/mark_read/`);
};

export const markAllNotificationsRead = () => {
    return api.post('/notifications/mark_all_read/');
};

export const deleteNotification = (id: number) => {
    return api.delete(`/notifications/${id}/`);
};

// --- NEWS ENDPOINTS ---

export const fetchNews = async (page = 1, tagId?: number | null, search?: string) => {
    let url = `/news/?page=${page}`;
    if (tagId) url += `&tag=${tagId}`;
    if (search) url += `&search=${encodeURIComponent(search)}`;
    // We exclude the hero from the main list so it doesn't appear twice
    url += '&exclude_hero=true';
    return api.get(url);
};

export const fetchHeroNews = async () => {
    // Returns 200 with object or 200 with null (if no hero)
    return api.get('/news/hero/');
};

export const fetchNewsDetail = async (id: number) => {
    return api.get(`/news/${id}/`);
};

export const fetchNewsTags = async () => {
    return api.get('/news_tags/');
};

// --- CLUB FOLLOWING ---

export const followClub = async (clubId: number | string) => {
  const response = await api.post(`/clubs/${clubId}/follow/`);
  return response.data;
};

export const unfollowClub = async (clubId: number | string) => {
  const response = await api.post(`/clubs/${clubId}/unfollow/`);
  return response.data;
};

export const getClubFollowers = async (clubId: number | string) => {
  const response = await api.get(`/clubs/${clubId}/followers/`);
  return response.data;
};

export const removeClubFollower = async (clubId: number | string, userId: number) => {
  const response = await api.post(`/clubs/${clubId}/remove_follower/`, { user_id: userId });
  return response.data;
};