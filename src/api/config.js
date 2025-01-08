import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${import.meta.env.VITE_API_KEY}`,
    'X-API-Key': import.meta.env.VITE_API_KEY
  },
  validateStatus: function (status) {
    return status >= 200 && status < 500;
  }
});

// 添加请求拦截器
api.interceptors.request.use(
  config => {
    // 确保每个请求都带有最新的认证信息
    config.headers['Authorization'] = `Bearer ${import.meta.env.VITE_API_KEY}`;
    config.headers['X-API-Key'] = import.meta.env.VITE_API_KEY;
    return config;
  },
  error => {
    return Promise.reject(error);
  }
);

// 添加响应拦截器
api.interceptors.response.use(
  response => {
    return response;
  },
  error => {
    if (error.response && error.response.status === 401) {
      console.error('认证失败:', error.response.data);
    }
    return Promise.reject(error);
  }
);

export default api; 