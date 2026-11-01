import apiClient from './apiClient.js';

export const login = (credentials) => apiClient.post('/auth/login', credentials);
export const register = (data) => apiClient.post('/auth/register', data);
export const requestPasswordReset = (email) => apiClient.post('/auth/forgot-password', { email });
export const resetPassword = (token, password) => apiClient.post(`/auth/reset-password/${token}`, { password });
export const verifyEmail = (email, code) => apiClient.post('/auth/verify-email', { email, code });
export const verifyEmailToken = (token) => apiClient.post('/auth/verify-email', { token });
export const resendVerificationLink = (email) => apiClient.post('/auth/resend-verification', { email });
export const logout = () => apiClient.post('/auth/logout');
export const getProfile = () => apiClient.get('/users/profile');
export const updateProfile = (profile) => apiClient.put('/users/profile', profile);
export const fetchProperties = (params) => apiClient.get('/properties/search', { params });
export const fetchPropertyById = (id) => apiClient.get(`/properties/${id}`);
