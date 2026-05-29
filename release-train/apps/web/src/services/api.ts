// ========== Axios HTTP 客户端 ==========
// 统一配置 baseURL、超时、请求/响应拦截器
import axios from 'axios';
import type { ApiResponse } from '@release-train/shared';

// ========== Axios实例 ==========
const api = axios.create({
  baseURL: '/api',
  timeout: 180000, // 全局超时3分钟（AI审查等长耗时请求单独设更长超时）
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
// 后端所有响应统一 HTTP 200，通过 success 字段区分成功/失败
api.interceptors.response.use(
  (response) => {
    const data = response.data as ApiResponse;
    if (data.success === false) {
      // 认证失效：清除登录状态并跳转登录页
      if (data.code === 'UNAUTHORIZED') {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }
      // 构造带 code 的 Error 对象，保留业务错误码供调用方区分处理
      const bizError = new Error(data.message || '操作失败') as any;
      bizError.code = data.code;
      bizError.isBusinessError = true;
      return Promise.reject(bizError);
    }
    return response;
  },
  (error) => {
    // 仅处理网络错误（无响应），后端所有错误均走 HTTP 200
    if (!error.response) {
      if (error.code === 'ECONNABORTED') {
        return Promise.reject(new Error('请求超时，请稍后重试'));
      }
      return Promise.reject(new Error('网络连接失败'));
    }
    // 兜底：万一有非 200 响应（如网关层），取后端返回的 message
    const message = error.response.data?.message || '请求失败';
    return Promise.reject(new Error(message));
  }
);

export default api;
