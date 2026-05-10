import React from 'react';
import { Typography } from 'antd';

const { Title, Paragraph } = Typography;

// ========== 火车列表占位页 ==========
const TrainsPage: React.FC = () => {
  return (
    <div>
      <Title level={4}>版本火车</Title>
      <Paragraph type="secondary">版本火车管理功能开发中...</Paragraph>
    </div>
  );
};

export default TrainsPage;
