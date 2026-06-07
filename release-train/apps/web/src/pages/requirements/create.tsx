// ========== 新增需求页面 ==========
// 独立路由 /requirements/new，使用 RequirementForm 创建模式
// 创建成功或取消后返回需求列表
import React, { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import RequirementForm from '../../components/requirements/RequirementForm';
import { useTourStore } from '../../tour/store';

const RequirementCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { startFeatureTour, clearCompleted, isActive } = useTourStore();
  const hasProcessedTour = useRef(false);

  // 处理导览参数
  useEffect(() => {
    const timer = setTimeout(() => {
      if (hasProcessedTour.current) {
        return;
      }

      const tourParam = searchParams.get('tour');
      
      if (isActive) {
        if (tourParam === 'ai-review') {
          window.history.replaceState({}, '', window.location.pathname);
          hasProcessedTour.current = true;
        }
        return;
      }

      if (tourParam === 'ai-review') {
        hasProcessedTour.current = true;
        clearCompleted('ai-review');
        startFeatureTour('ai-review');
        window.history.replaceState({}, '', window.location.pathname);
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [isActive, startFeatureTour, searchParams, clearCompleted]);

  return (
    <RequirementForm
      mode="create"
      onCancel={() => navigate('/requirements')}
      onSuccess={() => navigate('/requirements')}
    />
  );
};

export default RequirementCreatePage;