import React from 'react';
import { Typography } from 'antd';

const { Title, Paragraph } = Typography;

// ========== 仪表盘占位页 ==========
const DashboardPage: React.FC = () => {
  return (
    <div>
      <Title level={4}>仪表盘</Title>
      <Paragraph type="secondary">
        欢迎使用版本火车需求管理系统，功能开发中...
      </Paragraph>
    </div>
  );
};

export default DashboardPage;
