import apiClient from './apiClient.js';

export const getOwnerDashboard = () => apiClient.get('/owner/dashboard');
export const getOwnerProperties = () => apiClient.get('/owner/properties');
export const getOwnerBookingRequests = () => apiClient.get('/owner/booking-requests');
export const getOwnerBookings = () => apiClient.get('/owner/bookings');
export const verifyBookingRequest = (id, status, dates = {}) => apiClient.put(`/owner/booking-requests/${id}`, { status, ...dates });
