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
api.interceptors.request.use((config) => {
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