import axios from 'axios';

const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:5000/api';

// Create axios instance
export const authApi = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token 
authApi.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
authApi.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// API endpoints
export const api = {
  // Auth
  auth: {
    login: (email: string, password: string) =>
      authApi.post('/auth/login', { email, password }),
    register: (userData: any) => authApi.post('/auth/register', userData),
    forgotPassword: (email: string) => authApi.post('/auth/forgot-password', { email }),
    resetPassword: (payload: { email: string; code: string; newPassword: string }) => authApi.post('/auth/reset-password', payload),
    me: () => authApi.get('/auth/me'),
    updateProfile: (data: any) => authApi.put('/auth/profile', data),
  },

  // Vehicles
  vehicles: {
    getAll: () => authApi.get('/vehicles'),
    getVehicles: () => authApi.get('/vehicles'),
    create: (data: any) => authApi.post('/vehicles', data),
    update: (id: number, data: any) => authApi.put(`/vehicles/${id}`, data),
    delete: (id: number) => authApi.delete(`/vehicles/${id}`),
  },

  // Parking
  parking: {
    getSpaces: () => authApi.get('/parking/spaces'),
    getSpace: (id: number) => authApi.get(`/parking/spaces/${id}`),
    getAvailable: () => authApi.get('/parking/available'),
    getStats: () => authApi.get('/parking/stats'),
    updateStatus: (id: number, status: string) =>
      authApi.put(`/parking/spaces/${id}/status`, { status }),
    updateSpaceStatus: (id: number, status: string) =>
      authApi.put(`/parking/spaces/${id}/status`, { status }),
  },

  // Reservations
  reservations: {
    getAll: () => authApi.get('/reservations'),
    getActive: () => authApi.get('/reservations/active'),
    create: (data: any) => authApi.post('/reservations', data),
    createReservation: (data: any) => authApi.post('/reservations', data),
    cancel: (id: number) => authApi.put(`/reservations/${id}/cancel`),
    complete: (id: number) => authApi.put(`/reservations/${id}/complete`),
    getTodaySchedule: () => authApi.get('/reservations/schedules/today'),
  },

  // Admin
  admin: {
    getDashboard: () => authApi.get('/admin/dashboard'),
    getUsers: () => authApi.get('/admin/users'),
    createUser: (data: any) => authApi.post('/admin/users', data),
    updateUser: (id: number, data: any) => authApi.put(`/admin/users/${id}`, data),
    deleteUser: (id: number) => authApi.delete(`/admin/users/${id}`),
    getReservations: (params?: any) => authApi.get('/admin/reservations', { params }),
  },

  // LPR (kept minimal for compile-time compatibility of LPRManagement.tsx)
  lpr: {
    getImage: (filename: string) => `${API_BASE_URL}/lpr/images/${filename}`,
    createRecord: (data: any) => authApi.post('/lpr/records', data),
    getRecords: (params?: any) => authApi.get('/lpr/records', { params }),
  },

  // Security
  security: {
    searchClients: (query: string) => authApi.get('/security/clients', { params: { query } }),
    getUserVehicles: (userId: number) => authApi.get(`/security/users/${userId}/vehicles`),
    createClientWithVehicleReservation: (data: any) => authApi.post('/security/clients/with-vehicle-reservation', data),
    // LPR endpoints (backend mounted under /lpr)
    getLPRRecords: (params?: any) => authApi.get('/lpr/records', { params }),
    getLPRRecord: (id: number) => authApi.get(`/lpr/records/${id}`),
    getLPRMatch: (id: number) => authApi.get(`/lpr/records/${id}/match`),
    processLPRRecord: (id: number, data: any) =>
      authApi.put(`/lpr/records/${id}/process`, data),
    searchUsers: (query: string) => authApi.get('/lpr/search-users', { params: { query } }),
    getSpaceDetails: (id: number) => authApi.get(`/security/parking/spaces/${id}/details`),
    updateSpaceStatus: (id: number, status: string, notes?: string) =>
      authApi.put(`/security/parking/spaces/${id}/status`, { status, notes }),
    liberateSpace: (id: number, reason?: string, notes?: string) =>
      authApi.post(`/security/parking/spaces/${id}/liberate`, { reason, notes }),
    // Nuevos endpoints para LPR
    getVehicles: () => authApi.get('/security/vehicles'),
    getReservations: () => authApi.get('/security/reservations'),
    createUser: (data: any) => authApi.post('/security/users', data),
    createVehicle: (data: any) => authApi.post('/security/vehicles', data),
    createReservation: (data: any) => authApi.post('/security/reservations', data),
  },
  
  // PDF generation (simplified to text file)
  pdf: {
    generateUserCredentials: (userId: number) => 
      authApi.get(`/pdf/user-credentials/${userId}`, { responseType: 'blob' }),
    downloadUserCredentials: async (userId: number) => {
      const response = await authApi.get(`/pdf/user-credentials/${userId}`, { responseType: 'blob' });
      const blob = new Blob([response.data], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `credenciales-usuario-${userId}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    },
  },
};
