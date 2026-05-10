import React from 'react';
import { Typography } from 'antd';

const { Title, Paragraph } = Typography;

// ========== 系统管理占位页 ==========
const SystemsPage: React.FC = () => {
  return (
    <div>
      <Title level={4}>系统管理</Title>
      <Paragraph type="secondary">系统管理功能开发中...</Paragraph>
    </div>
  );
};

export default SystemsPage;
