import apiClient from './apiClient.js';

export const login = (credentials) => apiClient.post('/auth/login', credentials);
export const register = (data) => apiClient.post('/auth/register', data);
export const fetchProperties = (params) => apiClient.get('/properties/search', { params });
export const fetchPropertyById = (id) => apiClient.get(`/properties/${id}`);
