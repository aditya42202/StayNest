import axios from 'axios';
import store from '../store/store.js';
import { logout, tokenRefreshed } from '../store/authSlice.js';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' }
});

let refreshPromise;

const isAuthRequest = (url = '') => (
  /\/auth\/(login|register|refresh|logout|forgot-password|reset-password|verify-email|resend-verification|google)/.test(url)
);

apiClient.interceptors.request.use((config) => {
  const token = window.sessionStorage.getItem('staynest_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (
      error.response?.status !== 401
      || !originalRequest
      || originalRequest._retry
      || isAuthRequest(originalRequest.url)
    ) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;
    if (!refreshPromise) {
      refreshPromise = apiClient.post('/auth/refresh')
        .then(({ data }) => {
          if (!data.token) {
            throw new Error('Session refresh did not return an access token');
          }
          store.dispatch(tokenRefreshed(data.token));
          return data.token;
        })
        .finally(() => {
          refreshPromise = undefined;
        });
    }

    try {
      const token = await refreshPromise;
      originalRequest.headers = originalRequest.headers || {};
      originalRequest.headers.Authorization = `Bearer ${token}`;
      return apiClient(originalRequest);
    } catch (refreshError) {
      store.dispatch(logout());
      return Promise.reject(refreshError);
    }
  }
);

export default apiClient;
