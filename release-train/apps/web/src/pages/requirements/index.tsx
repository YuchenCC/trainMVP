import React from 'react';
import { Typography } from 'antd';

const { Title, Paragraph } = Typography;

// ========== 需求列表占位页 ==========
const RequirementsPage: React.FC = () => {
  return (
    <div>
      <Title level={4}>需求池</Title>
      <Paragraph type="secondary">需求管理功能开发中...</Paragraph>
    </div>
  );
};

export default RequirementsPage;
