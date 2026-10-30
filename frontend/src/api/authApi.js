import apiClient from './apiClient.js';

export const login = (credentials) => apiClient.post('/auth/login', credentials);
export const register = (data) => apiClient.post('/auth/register', data);
export const requestPasswordReset = (email) => apiClient.post('/auth/forgot-password', { email });
export const resetPassword = (token, password) => apiClient.post(`/auth/reset-password/${token}`, { password });
export const fetchProperties = (params) => apiClient.get('/properties/search', { params });
export const fetchPropertyById = (id) => apiClient.get(`/properties/${id}`);
