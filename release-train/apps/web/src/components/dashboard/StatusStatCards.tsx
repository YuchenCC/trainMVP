import React from 'react';
import { Card, Row, Col, Statistic, Tag } from 'antd';
import { RequirementStatsResponse } from '@release-train/shared';
import { useNavigate } from 'react-router-dom';

interface StatusStatCardsProps {
  stats: RequirementStatsResponse;
}

const StatusStatCards: React.FC<StatusStatCardsProps> = ({ stats }) => {
  const navigate = useNavigate();

  const cardConfigs = [
    {
      title: '草稿',
      subTitle: '待完善·发起评审',
      value: stats.byStatus['DRAFT'] || 0,
      color: '#1890ff',
      status: 'DRAFT',
      bgColor: '#e6f7ff',
      borderColor: '#91caff'
    },
    {
      title: '待评审',
      subTitle: '评审中·待确认',
      value: stats.byStatus['PENDING_REVIEW'] || 0,
      color: '#faad14',
      status: 'PENDING_REVIEW',
      bgColor: '#fff7e6',
      borderColor: '#ffc53d'
    },
    {
      title: '已就绪',
      subTitle: '待纳版·等待上车',
      value: stats.byStatus['READY'] || 0,
      color: '#52c41a',
      status: 'READY',
      bgColor: '#f6ffed',
      borderColor: '#b7eb8f'
    },
    {
      title: '已纳版',
      subTitle: '开发中·已上车',
      value: stats.byStatus['ONBOARDED'] || 0,
      color: '#722ed1',
      status: 'ONBOARDED',
      bgColor: '#f9f0ff',
      borderColor: '#d3adf7'
    },
    {
      title: '已投产',
      subTitle: '已上线·完成交付',
      value: stats.byStatus['RELEASED'] || 0,
      color: '#13c2c2',
      status: 'RELEASED',
      bgColor: '#e6fffb',
      borderColor: '#87e8de'
    }
  ];

  return (
    <Row gutter={16}>
      {cardConfigs.map((config) => (
        <Col span={24 / cardConfigs.length} key={config.title}>
          <Card
            hoverable
            onClick={() => navigate(`/requirements?status=${config.status}`)}
            style={{
              cursor: 'pointer',
              backgroundColor: config.bgColor,
              borderLeft: `4px solid ${config.color}`,
              transition: 'all 0.3s ease',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)'
            }}
            bodyStyle={{ padding: '16px' }}
          >
            <Statistic
              title={config.title}
              value={config.value}
              valueStyle={{ color: config.color, fontSize: '28px', fontWeight: 600 }}
            />
            <div style={{ marginTop: '8px', fontSize: '12px', color: '#8c8c8c' }}>
              {config.subTitle}
            </div>
          </Card>
        </Col>
      ))}
    </Row>
  );
};

export default StatusStatCards;
