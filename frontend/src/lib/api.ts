import axios from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Auth API
export const authAPI = {
  register: (data: any) => api.post('/api/auth/register', data),
  login: (data: any) => api.post('/api/auth/login', data),
  sendOTP: (data: any) => api.post('/api/auth/send-otp', data),
  verifyOTP: (data: any) => api.post('/api/auth/verify-otp', data),
  getProfile: () => api.get('/api/auth/me'),
}

// Search API
export const searchAPI = {
  search: (params: any) => api.get('/api/search', { params }),
  autocomplete: (params: any) => api.get('/api/search/autocomplete', { params }),
}

// Submissions API
export const submissionsAPI = {
  create: (data: any) => api.post('/api/submissions', data),
  getMySubmissions: (params: any) => api.get('/api/submissions/my-submissions', { params }),
  getSubmission: (id: string) => api.get(`/api/submissions/${id}`),
  uploadImages: (id: string, data: any) => api.post(`/api/submissions/${id}/images`, data),
  getStats: () => api.get('/api/submissions/stats/summary'),
}