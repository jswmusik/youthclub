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