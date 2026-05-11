import type { ApiResponse, LoginRequest, LoginResponse, SafeUser } from '@release-train/shared';
import api from './api';

export async function loginApi(body: LoginRequest): Promise<LoginResponse> {
  const { data } = await api.post<ApiResponse<LoginResponse>>('/auth/login', body);
  if (!data.data) {
    throw new Error(data.message || '登录失败');
  }
  return data.data;
}

export async function getCurrentUserApi(): Promise<SafeUser> {
  const { data } = await api.get<ApiResponse<SafeUser>>('/auth/me');
  if (!data.data) {
    throw new Error(data.message || '获取当前用户失败');
  }
  return data.data;
}
