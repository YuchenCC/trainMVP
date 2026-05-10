import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import MainLayout from './layouts/MainLayout';
import LoginPage from './pages/login';
import DashboardPage from './pages/dashboard';
import RequirementsPage from './pages/requirements';
import TrainsPage from './pages/trains';
import SystemsPage from './pages/systems';
import { AuthGuard, GuestGuard } from './components/AuthGuard';

// ========== App根组件 ==========
const App: React.FC = () => {
  return (
    <ConfigProvider locale={zhCN}>
      <BrowserRouter>
        <Routes>
          {/* 登录页：已登录则跳转首页 */}
          <Route
            path="/login"
            element={
              <GuestGuard>
                <LoginPage />
              </GuestGuard>
            }
          />

          {/* 主布局：需要登录 */}
          <Route
            element={
              <AuthGuard>
                <MainLayout />
              </AuthGuard>
            }
          >
            {/* 默认重定向到需求列表 */}
            <Route index element={<Navigate to="/requirements" replace />} />
            <Route path="/requirements" element={<RequirementsPage />} />
            <Route path="/trains" element={<TrainsPage />} />
            <Route path="/systems" element={<SystemsPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
          </Route>

          {/* 404兜底 */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ConfigProvider>
  );
};

export default App;
