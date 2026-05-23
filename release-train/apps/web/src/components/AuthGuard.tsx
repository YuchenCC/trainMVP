// ========== 路由守卫组件 ==========
// AuthGuard：保护需要登录的页面，未登录重定向到登录页
// GuestGuard：保护仅限游客的页面（如登录页），已登录重定向到首页
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../stores/auth';

// ========== 路由守卫：未登录重定向到登录页 ==========
interface AuthGuardProps {
  children: React.ReactNode;
}

export const AuthGuard: React.FC<AuthGuardProps> = ({ children }) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

// ========== 游客守卫：已登录重定向到首页 ==========
export const GuestGuard: React.FC<AuthGuardProps> = ({ children }) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};
