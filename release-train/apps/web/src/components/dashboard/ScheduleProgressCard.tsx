import React from 'react';
import { Card, Progress, Tag, Typography, Row, Col } from 'antd';
import { ScheduleProgressItem } from '@release-train/shared';

const { Text, Title } = Typography;

interface ScheduleProgressCardProps {
  schedules: ScheduleProgressItem[];
}

const ScheduleProgressCard: React.FC<ScheduleProgressCardProps> = ({ schedules }) => {
  const getPhaseColor = (phase: string) => {
    switch (phase) {
      case 'planning': return 'blue';
      case 'testing': return 'orange';
      case 'pre-release': return 'green';
      case 'released': return 'default';
      default: return 'default';
    }
  };

  const getPhaseText = (phase: string) => {
    switch (phase) {
      case 'planning': return '计划中';
      case 'testing': return '测试中';
      case 'pre-release': return '待投产';
      case 'released': return '已投产';
      default: return phase;
    }
  };

  return (
    <Card title="版本火车班次进度">
      <Row gutter={[16, 16]}>
        {schedules.map(schedule => (
          <Col span={12} key={schedule.id}>
            <Card
              type="inner"
              title={
                <Row justify="space-between" align="middle">
                  <Text strong>{schedule.trainName} - v{schedule.version}</Text>
                  <Tag color={getPhaseColor(schedule.currentPhase)}>
                    {getPhaseText(schedule.currentPhase)}
                  </Tag>
                </Row>
              }
            >
              <Progress
                percent={schedule.progress}
                status={schedule.currentPhase === 'released' ? 'success' : 'active'}
              />
              <div style={{ marginTop: 8 }}>
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  开始: {new Date(schedule.startDate).toLocaleDateString()}
                  {schedule.releaseDate && (
                    <> | 投产: {new Date(schedule.releaseDate).toLocaleDateString()}</>
                  )}
                </Text>
              </div>
            </Card>
          </Col>
        ))}
      </Row>
    </Card>
  );
};

export default ScheduleProgressCard;
