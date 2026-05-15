// ========== 需求详情页面（US1.2 预留） ==========
// 路由 /requirements/:id，展示需求完整信息
// 当前为占位页面，US1.2 设计完成后实现
import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, Result } from 'antd';

const RequirementDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  return (
    <Result
      status="info"
      title="需求详情"
      subTitle={`需求 ID: ${id} — 功能开发中，将在 US1.2 实现`}
      extra={
        <Button type="primary" onClick={() => navigate('/requirements')}>
          返回需求列表
        </Button>
      }
    />
  );
};

export default RequirementDetailPage;