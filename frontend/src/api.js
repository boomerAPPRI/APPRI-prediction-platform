import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';

export function getAuthHeaders() {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export const api = {
  register(data) {
    return axios.post(`${API_BASE}/api/auth/register`, data);
  },
  login(data) {
    return axios.post(`${API_BASE}/api/auth/login`, data);
  },
  me() {
    return axios.get(`${API_BASE}/api/me`, { headers: getAuthHeaders() });
  },
  listQuestions() {
    return axios.get(`${API_BASE}/api/questions`);
  },
  getQuestion(id) {
    return axios.get(`${API_BASE}/api/questions/${id}`);
  },
  createQuestion(data) {
    return axios.post(`${API_BASE}/api/questions`, data, {
      headers: getAuthHeaders(),
    });
  },
  placeBet(id, data) {
    return axios.post(`${API_BASE}/api/questions/${id}/bets`, data, {
      headers: getAuthHeaders(),
    });
  },
};
