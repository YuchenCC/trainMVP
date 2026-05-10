// ========== Axios HTTP 客户端 ==========
// 统一配置 baseURL、超时、请求/响应拦截器
import axios from 'axios';
import type { ApiResponse } from '@release-train/shared';

// ========== Axios实例 ==========
const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ========== 请求拦截器：自动注入JWT Token ==========
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ========== 响应拦截器：统一错误处理 ==========
api.interceptors.response.use(
  (response) => {
    const data = response.data as ApiResponse;
    if (data.success === false) {
      // 业务错误，抛出给调用方处理
      return Promise.reject(new Error(data.message || '操作失败'));
    }
    return response;
  },
  (error) => {
    if (error.response) {
      const status = error.response.status;
      if (status === 401) {
        // Token过期或无效，清除登录状态并跳转登录页
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      } else if (status === 403) {
        return Promise.reject(new Error('无权限执行此操作'));
      } else {
        const message = error.response.data?.message || '请求失败';
        return Promise.reject(new Error(message));
      }
    }
    return Promise.reject(new Error('网络连接失败'));
  }
);

export default api;
