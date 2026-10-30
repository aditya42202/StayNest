import apiClient from './apiClient.js';

export const getAdminDashboard = () => apiClient.get('/admin/dashboard');
export const getAllUsers = () => apiClient.get('/admin/users');
export const getAllProperties = () => apiClient.get('/admin/properties');
export const getAllBookings = () => apiClient.get('/admin/bookings');
export const verifyProperty = (id, verified) => apiClient.put(`/admin/properties/${id}/verify`, { verified });
export const getOwnerListingRequests = () => apiClient.get('/admin/owner-listing-requests');
export const approveOwnerListingRequest = (id) => apiClient.post(`/admin/owner-listing-requests/${id}/approve`);
export const rejectOwnerListingRequest = (id) => apiClient.post(`/admin/owner-listing-requests/${id}/reject`);
