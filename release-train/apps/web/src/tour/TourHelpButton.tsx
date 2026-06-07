// ========== 导览帮助按钮组件 ==========
import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button, Dropdown, message } from 'antd';
import { InfoCircleOutlined, BookOutlined, AppstoreOutlined, UnorderedListOutlined, CalendarOutlined, FileTextOutlined, RobotOutlined } from '@ant-design/icons';
import { useTourStore } from './store';
import type { MenuProps } from 'antd';

// 导览ID到路由的映射
const tourRouteMap: Record<string, { path: string; description: string }> = {
  dashboard: { path: '/dashboard', description: '了解工作台功能' },
  requirements: { path: '/requirements', description: '了解需求管理功能' },
  calendar: { path: '/calendar', description: '了解班次日历功能' },
  'schedule-detail': { path: '/trains/cmpqrlvz80002zbsxqb85tfbv/schedules/cmpqtafju000hzbsxe3vp04t2', description: '了解班次详情功能' },
  'ai-review': { path: '/requirements/new', description: '了解AI审查功能' },
};

export const TourHelpButton: React.FC = () => {
  const { startTour, startFeatureTour, clearCompleted, completedTours, resetProgress } = useTourStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // 模块导览配置
  const moduleTours = [
    {
      id: 'dashboard',
      name: '仪表盘导览',
      icon: <AppstoreOutlined />,
      completed: completedTours.featureTours?.dashboard || false,
    },
    {
      id: 'requirements',
      name: '需求池导览',
      icon: <UnorderedListOutlined />,
      completed: completedTours.featureTours?.requirements || false,
    },
    {
      id: 'ai-review',
      name: 'AI需求审查导览',
      icon: <RobotOutlined />,
      completed: completedTours.featureTours?.['ai-review'] || false,
    },
    {
      id: 'calendar',
      name: '月历视图导览',
      icon: <CalendarOutlined />,
      completed: completedTours.featureTours?.calendar || false,
    },
    {
      id: 'schedule-detail',
      name: 'AI班次导览',
      icon: <FileTextOutlined />,
      completed: completedTours.featureTours?.['schedule-detail'] || false,
    },
  ];

  // 跳转到对应页面并启动导览
  const handleStartTour = (tourId: string) => {
    setDropdownOpen(false);
    const routeInfo = tourRouteMap[tourId];
    
    if (routeInfo) {
      // 获取目标路径（去除查询参数）
      const targetPath = routeInfo.path.split('?')[0];
      const currentPath = location.pathname;
      
      // 如果目标路径和当前路径相同，直接启动导览
      if (targetPath === currentPath) {
        clearCompleted(tourId);
        startFeatureTour(tourId);
        message.success('导览已开始');
      } else {
        // 跳转到对应页面，并带上导览ID参数
        navigate(`${routeInfo.path}?tour=${tourId}`);
        message.success('即将跳转到导览页面');
      }
    } else {
      // 如果没有对应的路由，直接启动导览
      startTour(tourId);
      message.success('导览已开始');
    }
  };

  // 重置导览进度
  const handleResetProgress = () => {
    resetProgress();
    message.success('导览进度已重置');
  };

  // 菜单项
  const menuItems: MenuProps['items'] = [
    ...moduleTours.map((tour) => ({
      key: tour.id,
      label: (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', minWidth: 240 }}>
          <div>
            {tour.icon}
            <span style={{ marginLeft: 8 }}>{tour.name}</span>
          </div>
          {tour.completed && (
            <span style={{ color: '#52c41a', fontSize: 12 }}>
              ✓ 已完成
            </span>
          )}
        </div>
      ),
      onClick: () => handleStartTour(tour.id),
    })),
    { type: 'divider' },
    {
      key: 'reset',
      label: (
        <span>
          <BookOutlined style={{ marginRight: 8 }} />
          重置所有导览进度
        </span>
      ),
      onClick: handleResetProgress,
    },
  ];

  return (
    <Dropdown
      menu={{ items: menuItems }}
      open={dropdownOpen}
      onOpenChange={setDropdownOpen}
      trigger={['click']}
    >
      <Button
        id="help-button"
        type="text"
        icon={<InfoCircleOutlined />}
        style={{ marginLeft: 8 }}
      >
        帮助
      </Button>
    </Dropdown>
  );
};