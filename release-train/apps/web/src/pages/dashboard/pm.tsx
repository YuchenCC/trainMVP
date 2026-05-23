import React, { useState, useEffect } from 'react';
import { Typography, Row, Col, Spin, message } from 'antd';
import { RequirementStatsResponse, MyTodosResponse, ScheduleProgressItem } from '@release-train/shared';
import requirementService from '../../services/requirement';
import trainService from '../../services/train';
import StatusStatCards from '../../components/dashboard/StatusStatCards';
import TodoList from '../../components/dashboard/TodoList';
import ScheduleProgressCard from '../../components/dashboard/ScheduleProgressCard';

const { Title } = Typography;

const PMDashboard: React.FC = () => {
  const [stats, setStats] = useState<RequirementStatsResponse | null>(null);
  const [todos, setTodos] = useState<MyTodosResponse>({});
  const [schedules, setSchedules] = useState<ScheduleProgressItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [statsRes, todosRes, schedulesRes] = await Promise.all([
        requirementService.getStats(),
        requirementService.getMyTodos(),
        trainService.getScheduleProgress()
      ]);

      if (statsRes.success && statsRes.data) setStats(statsRes.data);
      if (todosRes.success && todosRes.data) setTodos(todosRes.data);
      if (schedulesRes.success && schedulesRes.data) setSchedules(schedulesRes.data);
    } catch (error) {
      message.error('加载数据失败');
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Title level={2}>项目经理仪表盘</Title>
      <Spin spinning={loading}>
        <Row gutter={[16, 16]}>
          <Col span={24}>
            {stats && <StatusStatCards stats={stats} />}
          </Col>
          <Col span={24}>
            <ScheduleProgressCard schedules={schedules} />
          </Col>
          <Col span={24}>
            <TodoList todos={todos} />
          </Col>
        </Row>
      </Spin>
    </div>
  );
};

export default PMDashboard;
