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
      // 业务错误（HTTP 200 + success:false）：角色权限、参数校验、唯一/重复、业务规则等
      // 直接抛出给调用方处理，message 已包含中文提示
      return Promise.reject(new Error(data.message || '操作失败'));
    }
    return response;
  },
  (error) => {
    if (error.response) {
      const status = error.response.status;
      if (status === 401) {
        // 技术错误：Token过期或无效，清除登录状态并跳转登录页
        // 如果已在登录页则不跳转，避免重复刷新
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      } else if (status === 403) {
        // 技术错误：IP访问拒绝等基础设施层拦截
        return Promise.reject(new Error('访问被拒绝'));
      } else {
        // 其他技术错误（404/429/500）：取后端返回的 message
        const message = error.response.data?.message || '请求失败';
        return Promise.reject(new Error(message));
      }
    }
    return Promise.reject(new Error('网络连接失败'));
  }
);

export default api;
