import React from 'react';
import { Card, Row, Col, Statistic } from 'antd';
import { RequirementStatsResponse } from '@release-train/shared';

interface StatusStatCardsProps {
  stats: RequirementStatsResponse;
}

const StatusStatCards: React.FC<StatusStatCardsProps> = ({ stats }) => {
  return (
    <Row gutter={16}>
      <Col span={6}>
        <Card>
          <Statistic title="总需求数" value={stats.total} />
        </Card>
      </Col>
      <Col span={6}>
        <Card>
          <Statistic title="活跃需求" value={stats.activeCount} valueStyle={{ color: '#3f8600' }} />
        </Card>
      </Col>
      <Col span={6}>
        <Card>
          <Statistic 
            title="草稿" 
            value={stats.byStatus['DRAFT'] || 0} 
            valueStyle={{ color: '#1890ff' }} 
          />
        </Card>
      </Col>
      <Col span={6}>
        <Card>
          <Statistic 
            title="待评审" 
            value={stats.byStatus['PENDING_REVIEW'] || 0} 
            valueStyle={{ color: '#faad14' }} 
          />
        </Card>
      </Col>
    </Row>
  );
};

export default StatusStatCards;
