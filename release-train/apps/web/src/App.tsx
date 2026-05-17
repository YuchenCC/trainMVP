import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import MainLayout from './layouts/MainLayout';
import LoginPage from './pages/login';
import DashboardPage from './pages/dashboard';
import RequirementsPage from './pages/requirements';
import RequirementCreatePage from './pages/requirements/create';
import RequirementDetailPage from './pages/requirements/detail';
import RequirementEditPage from './pages/requirements/edit';
import TrainsPage from './pages/trains';
import TrainCreatePage from './pages/trains/create';
import TrainDetailPage from './pages/trains/[id]';
import TrainEditPage from './pages/trains/edit';
import SchedulesPage from './pages/trains/schedules';
import ScheduleDetailPage from './pages/trains/schedule-detail';
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
            {/* 默认重定向到班次列表 */}
            <Route index element={<Navigate to="/trains" replace />} />

            {/* 需求池模块 */}
            <Route path="/requirements" element={<RequirementsPage />} />
            <Route path="/requirements/new" element={<RequirementCreatePage />} />
            <Route path="/requirements/:id" element={<RequirementDetailPage />} />
            <Route path="/requirements/:id/edit" element={<RequirementEditPage />} />

            {/* 版本火车模块 */}
            <Route path="/trains" element={<SchedulesPage />} />
            <Route path="/trains/list" element={<TrainsPage />} />
            <Route path="/trains/new" element={<TrainCreatePage />} />
            <Route path="/trains/:trainId/schedules/:scheduleId" element={<ScheduleDetailPage />} />
            <Route path="/trains/:id" element={<TrainDetailPage />} />
            <Route path="/trains/:id/edit" element={<TrainEditPage />} />

            {/* 其他模块 */}
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
