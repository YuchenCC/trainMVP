// ========== 导览提供者组件 ==========
import React from 'react';
import { Joyride, type Locale, type EventHandler, type Controls } from 'react-joyride';
import { useTourStore } from './store';
import { generalTour, baTour, pmTour, trainAdminTour, dashboardTour, requirementsTour, calendarTour, trainsTour, scheduleDetailTour, aiReviewTour } from './config';

// 中文 locale
const chineseLocale: Locale = {
  back: '上一步',
  close: '关闭',
  last: '完成',
  next: '下一步',
  skip: '退出导览',
};

interface TourProviderProps {
  children: React.ReactNode;
}

export const TourProvider: React.FC<TourProviderProps> = ({ children }) => {
  const {
    isActive,
    currentTourId,
    skipTour,
    endTour,
  } = useTourStore();

  // 处理joyride回调
  const handleJoyrideCallback: EventHandler = (data, controls) => {
    console.log('Joyride event:', data);
    const { action, type } = data;
    
    if (action === 'skip' || action === 'close') {
      console.log('Skipping tour:', currentTourId);
      skipTour();
    } else if (type === 'tour:end') {
      console.log('Tour ended:', currentTourId);
      endTour();
    }
  };

  // 获取当前导览配置
  const getCurrentTourSteps = () => {
    switch (currentTourId) {
      case 'general':
        return generalTour.steps;
      case 'ba':
        return baTour.steps;
      case 'pm':
        return pmTour.steps;
      case 'train-admin':
        return trainAdminTour.steps;
      case 'dashboard':
        return dashboardTour.steps;
      case 'requirements':
        return requirementsTour.steps;
      case 'ai-review':
        return aiReviewTour.steps;
      case 'calendar':
        return calendarTour.steps;
      case 'trains':
        return trainsTour.steps;
      case 'schedule-detail':
        return scheduleDetailTour.steps;
      default:
        return [];
    }
  };

  return (
    <>
      {children}
      <Joyride
        steps={getCurrentTourSteps()}
        run={isActive}
        locale={chineseLocale}
        onEvent={handleJoyrideCallback}
        continuous
        options={{
          buttons: ['back', 'primary', 'skip'],
        }}
        scrollToFirstStep
      />
    </>
  );
};