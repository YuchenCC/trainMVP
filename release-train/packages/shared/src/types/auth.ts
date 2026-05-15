// ========== 认证相关类型定义 ==========
import { Role } from '../constants';

// 登录请求参数
export interface LoginRequest {
  username: string;
  password: string;
}

// 登录响应数据
export interface LoginResponse {
  token: string;
  user: SafeUser;
}

// 安全用户信息（API 响应中不包含 password、ssoId 等敏感字段）
export interface SafeUser {
  id: string;
  username: string;
  displayName: string;
  email: string;
  role: Role;
  systemIds: string[];
}

// JWT Token 载荷结构
export interface JwtPayload {
  sub: string;       // 用户ID
  username: string;  // 用户名
  role: Role;        // 角色
  jti?: string;      // Token唯一标识（用于吊销）
  iat?: number;      // 签发时间
  exp?: number;      // 过期时间
}
