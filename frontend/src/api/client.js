import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:8080' : 'https://trustvault-16f1.onrender.com');

const client = axios.create({
  baseURL: API_BASE_URL,
});

client.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('trustvault_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Clear token and broadcast logout if session expired
      localStorage.removeItem('trustvault_token');
      localStorage.removeItem('trustvault_user');
      if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
        window.location.href = '/login?expired=true';
      }
    }
    return Promise.reject(error);
  }
);

export default client;
