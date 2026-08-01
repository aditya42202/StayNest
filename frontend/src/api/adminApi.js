import apiClient from './apiClient.js';

export const getAdminDashboard = () => apiClient.get('/admin/dashboard');
export const getAllUsers = () => apiClient.get('/admin/users');
export const getAllProperties = () => apiClient.get('/admin/properties');
export const verifyProperty = (id, verified) => apiClient.put(`/admin/properties/${id}/verify`, { verified });
