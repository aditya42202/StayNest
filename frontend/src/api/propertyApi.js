import apiClient from './apiClient.js';

export const searchProperties = (params) => apiClient.get('/properties/search', { params });
export const getFeaturedProperties = () => apiClient.get('/properties/featured');
export const getProperty = (id) => apiClient.get(`/properties/${id}`);
export const createProperty = (data) => apiClient.post('/properties', data);
export const updateProperty = (id, data) => apiClient.put(`/properties/${id}`, data);
export const deleteProperty = (id) => apiClient.delete(`/properties/${id}`);
