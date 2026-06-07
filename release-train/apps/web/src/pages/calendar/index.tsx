import React, { useRef, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import CalendarView from '../../components/dashboard/CalendarView';
import { useTourStore } from '../../tour/store';

const CalendarPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const { startFeatureTour, checkShouldShowFeatureTour, isActive, clearCompleted } = useTourStore();
  
  // 使用ref避免重复触发
  const hasProcessedTour = useRef(false);

  // 页面首次访问或从帮助按钮跳转时触发导览
  useEffect(() => {
    const timer = setTimeout(() => {
      // 避免重复处理
      if (hasProcessedTour.current) {
        return;
      }
      
      // 检查URL参数是否指定了要启动的导览
      const tourParam = searchParams.get('tour');
      
      // 如果导览已经激活，不要重复启动
      if (isActive) {
        // 如果URL参数还在，清除它并标记已处理
        if (tourParam === 'calendar') {
          window.history.replaceState({}, '', window.location.pathname);
          hasProcessedTour.current = true;
        }
        return;
      }
      
      // 如果URL参数指定了导览，则强制启动（即使已完成）
      if (tourParam === 'calendar') {
        // 标记已处理
        hasProcessedTour.current = true;
        // 清除已完成标记
        clearCompleted('calendar');
        // 启动导览
        startFeatureTour('calendar');
        // 立即清除URL参数，避免退出导览后再次启动
        window.history.replaceState({}, '', window.location.pathname);
      } else if (checkShouldShowFeatureTour('calendar')) {
        // 否则检查是否应该自动启动（首次访问）
        startFeatureTour('calendar');
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [isActive, checkShouldShowFeatureTour, startFeatureTour, searchParams, clearCompleted]);

  return <CalendarView />;
};

export default CalendarPage;
