// ========== 新增需求页面 ==========
// 独立路由 /requirements/new，使用 RequirementForm 创建模式
// 创建成功或取消后返回需求列表
import React from 'react';
import { useNavigate } from 'react-router-dom';
import RequirementForm from '../../components/requirements/RequirementForm';

const RequirementCreatePage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <RequirementForm
      mode="create"
      onCancel={() => navigate('/requirements')}
      onSuccess={() => navigate('/requirements')}
    />
  );
};

export default RequirementCreatePage;