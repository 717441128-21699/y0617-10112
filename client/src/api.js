import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
})

export const userApi = {
  getAll: () => api.get('/users'),
  getById: (id) => api.get(`/users/${id}`),
  login: (name) => api.post('/users/login', { name }),
}

export const activityApi = {
  getAll: (status) => api.get('/activities', { params: status ? { status } : {} }),
  getById: (id) => api.get(`/activities/${id}`),
  create: (data) => api.post('/activities', data),
  update: (id, data) => api.put(`/activities/${id}`, data),
  delete: (id) => api.delete(`/activities/${id}`),
  register: (id, data) => api.post(`/activities/${id}/register`, data),
  checkin: (id, data) => api.post(`/activities/${id}/checkin`, data),
  addExpense: (id, data) => api.post(`/activities/${id}/expenses`, data),
  addReview: (id, data) => api.post(`/activities/${id}/reviews`, data),
  getTeams: (id) => api.get(`/activities/${id}/teams`),
}

export const teamApi = {
  join: (teamId, data) => api.post(`/teams/${teamId}/join`, data),
}

export const expenseApi = {
  delete: (id) => api.delete(`/expenses/${id}`),
}

export const statsApi = {
  getSummary: () => api.get('/stats/summary'),
}

export default api
