import axios from 'axios';
import Cookies from 'js-cookie';

const API_URL = 'http://localhost:8000/api';

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