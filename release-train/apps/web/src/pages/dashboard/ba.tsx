import React, { useState, useEffect } from 'react';
import {
  Typography, Row, Col, Spin, message, Alert, Timeline, Tag, Table, Card,
  Statistic, Button, Space
} from 'antd';
import {
  RequirementStatsResponse,
  MyTodosResponse,
  ScheduleProgressItem,
  RequirementListItem,
  EmergencyChangeItem
} from '@release-train/shared';
import requirementService from '../../services/requirement';
import trainService from '../../services/train';
import StatusStatCards from '../../components/dashboard/StatusStatCards';
import TodoList from '../../components/dashboard/TodoList';
import ScheduleProgressCard from '../../components/dashboard/ScheduleProgressCard';
import SystemSelector from '../../components/dashboard/SystemSelector';
import { useNavigate } from 'react-router-dom';
import { InfoCircleOutlined, WarningOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { systemService, SystemOption } from '../../services/system';

const { Title, Text } = Typography;

const BADashboard: React.FC = () => {
  const [stats, setStats] = useState<RequirementStatsResponse | null>(null);
  const [todos, setTodos] = useState<MyTodosResponse>({});
  const [selectedSystemId, setSelectedSystemId] = useState<string>('');
  const [systems, setSystems] = useState<SystemOption[]>([]);
  const [schedules, setSchedules] = useState<ScheduleProgressItem[]>([]);
  const [readyRequirements, setReadyRequirements] = useState<RequirementListItem[]>([]);
  const [emergencyChanges, setEmergencyChanges] = useState<EmergencyChangeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadSystems();
    loadData();
  }, []);

  useEffect(() => {
    if (selectedSystemId) {
      loadData();
    }
  }, [selectedSystemId]);

  const loadSystems = async () => {
    try {
      const allSystems = await systemService.list();
      setSystems(allSystems);
      if (allSystems.length > 0 && !selectedSystemId) {
        setSelectedSystemId(allSystems[0].id);
      }
    } catch (error) {
      console.error('Failed to load systems:', error);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const params = selectedSystemId ? { systemId: selectedSystemId } : undefined;
      const [statsRes, todosRes, schedulesRes, emergencyRes] = await Promise.all([
        requirementService.getStats(params),
        requirementService.getMyTodos(),
        trainService.getScheduleProgress(params),
        requirementService.getEmergencyChanges(params)
      ]);

      if (statsRes.success && statsRes.data) setStats(statsRes.data);
      if (todosRes.success && todosRes.data) setTodos(todosRes.data);
      if (schedulesRes.success && schedulesRes.data) setSchedules(schedulesRes.data);
      if (emergencyRes.success && emergencyRes.data) {
        setEmergencyChanges(emergencyRes.data);
      }

      // 获取已就绪需求
      const readyReqRes = await requirementService.list({ status: 'READY', ...params });
      if (readyReqRes.success && readyReqRes.data) {
        setReadyRequirements(readyReqRes.data.items || []);
      }
    } catch (error) {
      message.error('加载数据失败');
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectedSystem = systems.find(s => s.id === selectedSystemId);

  // 计算纳版截止倒计时
  const getLockdownCountdown = () => {
    if (!schedules.length) return null;
    const activeSchedule = schedules.find(s => s.status === 'IN_PROGRESS' || s.currentPhase === 'testing');
    if (!activeSchedule || !activeSchedule.lockdownDate) return null;
    
    const lockdownDate = new Date(activeSchedule.lockdownDate);
    const now = new Date();
    const diffTime = lockdownDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return {
      days: diffDays,
      date: lockdownDate
    };
  };

  const countdown = getLockdownCountdown();

  // 获取关键日期数据
  const getKeyDates = () => {
    if (!schedules.length) return [];
    const activeSchedule = schedules.find(s => s.status === 'IN_PROGRESS' || s.currentPhase === 'testing');
    if (!activeSchedule) return [];

    const dates = [];
    if (activeSchedule.boardingDate) {
      dates.push({
        label: '纳版截止',
        date: new Date(activeSchedule.boardingDate),
        status: 'warning',
        icon: <InfoCircleOutlined />
      });
    }
    if (activeSchedule.lockdownDate) {
      dates.push({
        label: '封板',
        date: new Date(activeSchedule.lockdownDate),
        status: 'error',
        icon: <WarningOutlined />
      });
    }
    if (activeSchedule.releaseDate) {
      dates.push({
        label: '投产',
        date: new Date(activeSchedule.releaseDate),
        status: 'success',
        icon: <CheckCircleOutlined />
      });
    }
    return dates;
  };

  const keyDates = getKeyDates();

  // 快速操作统计
  const quickStats = {
    notOnboarded: stats?.byStatus['READY'] || 0,
    ready: stats?.byStatus['READY'] || 0,
    emergency: emergencyChanges.length || 0
  };

  // 已就绪需求列表列定义
  const readyReqColumns = [
    {
      title: '需求编号',
      dataIndex: 'reqCode',
      key: 'reqCode',
      render: (text: string) => <Text strong>{text}</Text>
    },
    {
      title: '需求标题',
      dataIndex: 'title',
      key: 'title',
      ellipsis: true
    },
    {
      title: '系统',
      dataIndex: 'system',
      key: 'system',
      render: (system: { name: string }) => <Tag color="blue">{system.name}</Tag>
    },
    {
      title: '优先级',
      dataIndex: 'priority',
      key: 'priority',
      render: (priority: string) => (
        <Tag color={priority === 'P0' ? 'red' : priority === 'P1' ? 'orange' : 'default'}>
          {priority}
        </Tag>
      )
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record: RequirementListItem) => (
        <Button type="primary" size="small" onClick={() => navigate(`/requirements/${record.id}`)}>
          查看详情
        </Button>
      )
    }
  ];

  return (
    <div>
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Title level={2}>业务BA · {selectedSystem?.name || '请选择系统'}</Title>
        <SystemSelector value={selectedSystemId} onChange={setSelectedSystemId} />
      </Row>
      <Spin spinning={loading}>
        {/* 纳版截止提醒 Alert */}
        {countdown && countdown.days > 0 && countdown.days <= 7 && (
          <Alert
            message={`纳版截止倒计时：${countdown.days} 天`}
            description={`距离 ${countdown.date.toLocaleDateString()} 封板还有 ${countdown.days} 天，请尽快完成需求纳版`}
            type="warning"
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}

        {/* 统计卡片 */}
        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          <Col span={24}>
            {stats && <StatusStatCards stats={stats} />}
          </Col>
        </Row>

        {/* 快速操作区 */}
        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          <Col span={8}>
            <Card
              hoverable
              onClick={() => navigate('/requirements?status=READY')}
              style={{ cursor: 'pointer', textAlign: 'center' }}
            >
              <Statistic
                title="未纳版需求"
                value={quickStats.notOnboarded}
                valueStyle={{ color: '#faad14', fontSize: '28px' }}
              />
              <div style={{ fontSize: '12px', color: '#8c8c8c', marginTop: '8px' }}>
                等待上车
              </div>
            </Card>
          </Col>
          <Col span={8}>
            <Card
              hoverable
              onClick={() => navigate('/requirements?status=READY')}
              style={{ cursor: 'pointer', textAlign: 'center' }}
            >
              <Statistic
                title="已就绪需求"
                value={quickStats.ready}
                valueStyle={{ color: '#52c41a', fontSize: '28px' }}
              />
              <div style={{ fontSize: '12px', color: '#8c8c8c', marginTop: '8px' }}>
                可纳版
              </div>
            </Card>
          </Col>
          <Col span={8}>
            <Card
              hoverable
              onClick={() => navigate('/emergency-changes')}
              style={{ cursor: 'pointer', textAlign: 'center' }}
            >
              <Statistic
                title="紧急变更"
                value={quickStats.emergency}
                valueStyle={{ color: '#f5222d', fontSize: '28px' }}
              />
              <div style={{ fontSize: '12px', color: '#8c8c8c', marginTop: '8px' }}>
                待审批
              </div>
            </Card>
          </Col>
        </Row>

        {/* 关键日期 Timeline + 已就绪需求列表 */}
        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          <Col span={12}>
            <Card title="关键日期">
              {keyDates.length > 0 ? (
                <Timeline mode="left">
                  {keyDates.map((item, index) => (
                    <Timeline.Item key={index} color={item.status}>
                      <Space>
                        {item.icon}
                        <span>
                          <strong>{item.label}</strong>
                          {' '}
                          <Text type="secondary">
                            {item.date.toLocaleDateString()}
                          </Text>
                        </span>
                      </Space>
                    </Timeline.Item>
                  ))}
                </Timeline>
              ) : (
                <Text type="secondary">暂无关键日期信息</Text>
              )}
            </Card>
          </Col>
          <Col span={12}>
            <Card title="已就绪需求" extra={<Button size="small" onClick={() => navigate('/requirements?status=READY')}>查看全部</Button>}>
              {readyRequirements.length > 0 ? (
                <Table
                  dataSource={readyRequirements.slice(0, 5)}
                  columns={readyReqColumns}
                  rowKey="id"
                  pagination={false}
                  size="small"
                />
              ) : (
                <Text type="secondary">暂无已就绪需求</Text>
              )}
            </Card>
          </Col>
        </Row>

        {/* 班次进度 */}
        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          <Col span={24}>
            <ScheduleProgressCard schedules={schedules} />
          </Col>
        </Row>

        {/* 待办事项 */}
        <Row gutter={[16, 16]}>
          <Col span={24}>
            <TodoList todos={todos} />
          </Col>
        </Row>
      </Spin>
    </div>
  );
};

export default BADashboard;
