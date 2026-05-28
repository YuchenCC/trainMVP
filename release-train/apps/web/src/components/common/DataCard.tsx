// ========== 数据卡片 ==========
// 对 Ant Design Card 做轻封装，统一白底、边框和紧凑表格容器样式。
import React from 'react';
import { Card } from 'antd';
import type { CardProps } from 'antd';

interface DataCardProps extends CardProps {
  tableCard?: boolean;
}

const DataCard: React.FC<DataCardProps> = ({ tableCard = false, className, ...props }) => (
  <Card
    {...props}
    className={[className, 'rt-data-card', tableCard ? 'rt-table-card' : ''].filter(Boolean).join(' ')}
  />
);

export default DataCard;
