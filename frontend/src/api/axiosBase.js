import axios from 'axios';

const getApiBaseUrl = () => {
    if (import.meta.env.VITE_API_URL) {
        return import.meta.env.VITE_API_URL;
    }

    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        return 'http://localhost/utiles/api';
    }

    const pathBase = window.location.pathname.split('/').filter(Boolean)[0];
    return pathBase === 'utiles' ? '/utiles/api' : '/api';
};

const getAppBasePath = () => (
    window.location.pathname.startsWith('/utiles') ? '/utiles/' : '/'
);

const api = axios.create({
    baseURL: getApiBaseUrl(),
    timeout: 15000,
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    }
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem('pos_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401 && !error.config?.url?.includes('/login')) {
            localStorage.removeItem('pos_token');
            localStorage.removeItem('pos_user');
            window.location.href = getAppBasePath();
        }
        return Promise.reject(error);
    }
);

export default api;
