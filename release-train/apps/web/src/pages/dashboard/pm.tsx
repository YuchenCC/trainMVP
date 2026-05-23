import React, { useState, useEffect } from 'react';
import {
  Typography, Row, Col, Spin, message, Table, Card, Tag, Button, Space, Modal,
  Input, Progress
} from 'antd';
import {
  RequirementStatsResponse,
  MyTodosResponse,
  ScheduleProgressItem,
  EmergencyChangeItem,
  RequirementListItem
} from '@release-train/shared';
import requirementService from '../../services/requirement';
import trainService from '../../services/train';
import StatusStatCards from '../../components/dashboard/StatusStatCards';
import { useNavigate } from 'react-router-dom';
import { WarningOutlined, CheckCircleOutlined, CloseOutlined, InfoCircleOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;
const { TextArea } = Input;

const PMDashboard: React.FC = () => {
  const [stats, setStats] = useState<RequirementStatsResponse | null>(null);
  const [todos, setTodos] = useState<MyTodosResponse>({});
  const [schedules, setSchedules] = useState<ScheduleProgressItem[]>([]);
  const [emergencyChanges, setEmergencyChanges] = useState<EmergencyChangeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [currentEmergencyId, setCurrentEmergencyId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [statsRes, todosRes, schedulesRes, emergencyRes] = await Promise.all([
        requirementService.getStats(),
        requirementService.getMyTodos(),
        trainService.getScheduleProgress(),
        requirementService.getEmergencyChanges()
      ]);

      if (statsRes.success && statsRes.data) setStats(statsRes.data);
      if (todosRes.success && todosRes.data) setTodos(todosRes.data);
      if (schedulesRes.success && schedulesRes.data) setSchedules(schedulesRes.data);
      if (emergencyRes.success && emergencyRes.data) {
        const pendingList = (emergencyRes.data.items || []).filter(e => e.status === 'PENDING');
        setEmergencyChanges(pendingList);
      }
    } catch (error) {
      message.error('加载数据失败');
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      const res = await requirementService.approveEmergencyChange(id);
      if (res.success) {
        message.success('审批通过');
        loadData();
      }
    } catch (error) {
      message.error('审批失败');
    }
  };

  const handleReject = async () => {
    if (!currentEmergencyId || !rejectReason.trim()) {
      message.error('请填写驳回原因');
      return;
    }
    try {
      const res = await requirementService.rejectEmergencyChange(currentEmergencyId, rejectReason);
      if (res.success) {
        message.success('已驳回');
        setRejectModalVisible(false);
        setRejectReason('');
        setCurrentEmergencyId(null);
        loadData();
      }
    } catch (error) {
      message.error('驳回失败');
    }
  };

  const openRejectModal = (id: string) => {
    setCurrentEmergencyId(id);
    setRejectModalVisible(true);
  };

  // 计算容量使用率颜色
  const getCapacityColor = (used: number, total: number) => {
    const percent = total > 0 ? (used / total) * 100 : 0;
    if (percent > 85) return 'red';
    if (percent > 60) return 'orange';
    return 'green';
  };

  // 班次进度列定义
  const scheduleColumns = [
    {
      title: '火车/班次',
      dataIndex: ['trainName', 'version'],
      key: 'name',
      render: (_, record: ScheduleProgressItem) => (
        <Text strong>{record.trainName} - v{record.version}</Text>
      )
    },
    {
      title: '状态',
      dataIndex: 'currentPhase',
      key: 'phase',
      render: (phase: string) => {
        const phaseMap: Record<string, { text: string; color: string }> = {
          planning: { text: '计划中', color: 'blue' },
          testing: { text: '测试中', color: 'orange' },
          'pre-release': { text: '待投产', color: 'green' },
          released: { text: '已投产', color: 'default' }
        };
        const item = phaseMap[phase] || { text: phase, color: 'default' };
        return <Tag color={item.color}>{item.text}</Tag>;
      }
    },
    {
      title: '容量',
      dataIndex: ['capacityUsed', 'capacityTotal'],
      key: 'capacity',
      render: (_, record: ScheduleProgressItem) => {
        const used = record.capacityUsed || 0;
        const total = record.capacityTotal || 100;
        return (
          <div>
            <span style={{ color: getCapacityColor(used, total) }}>
              {used}/{total}
            </span>
            <Progress
              percent={total > 0 ? (used / total) * 100 : 0}
              strokeColor={getCapacityColor(used, total)}
              size="small"
            />
          </div>
        );
      }
    },
    {
      title: '需求进度',
      dataIndex: ['completedCount', 'totalRequirements'],
      key: 'progress',
      render: (_, record: ScheduleProgressItem) => {
        const completed = record.completedCount || 0;
        const total = record.totalRequirements || 0;
        const percent = total > 0 ? (completed / total) * 100 : record.progress || 0;
        return (
          <div>
            <span>{completed}/{total}</span>
            <span style={{ marginLeft: '8px', fontWeight: 600 }}>· {Math.round(percent)}%</span>
          </div>
        );
      }
    },
    {
      title: '关键日期',
      dataIndex: ['lockdownDate', 'releaseDate'],
      key: 'dates',
      render: (_, record: ScheduleProgressItem) => (
        <div>
          {record.lockdownDate && (
            <div style={{ fontSize: '12px' }}>
              <Text type="secondary">封板:</Text>
              {' '}{new Date(record.lockdownDate).toLocaleDateString()}
            </div>
          )}
          {record.releaseDate && (
            <div style={{ fontSize: '12px' }}>
              <Text type="secondary">投产:</Text>
              {' '}{new Date(record.releaseDate).toLocaleDateString()}
            </div>
          )}
        </div>
      )
    }
  ];

  // 紧急变更列定义
  const emergencyColumns = [
    {
      title: '需求编号',
      dataIndex: 'reqCode',
      key: 'reqCode',
      render: (text: string, record: EmergencyChangeItem) => (
        <Text
          strong
          style={{ cursor: 'pointer', color: '#1890ff' }}
          onClick={() => navigate(`/requirements/${record.requirementId}`)}
        >
          {text}
        </Text>
      )
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
      title: '紧急程度',
      dataIndex: 'urgency',
      key: 'urgency',
      render: (urgency: string) => (
        <Tag color={urgency === 'P0' ? 'red' : 'orange'}>{urgency}</Tag>
      )
    },
    {
      title: '申请时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => new Date(date).toLocaleString()
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record: EmergencyChangeItem) => (
        <Space>
          <Button
            type="primary"
            size="small"
            icon={<CheckCircleOutlined />}
            onClick={() => handleApprove(record.id)}
          >
            通过
          </Button>
          <Button
            size="small"
            danger
            icon={<CloseOutlined />}
            onClick={() => openRejectModal(record.id)}
          >
            驳回
          </Button>
        </Space>
      )
    }
  ];

  // 依赖风险数据（模拟）
  const riskItems = [
    { id: '1', reqCode: 'REQ-001', title: '用户登录模块重构', system: '用户中心', riskLevel: 'high', reason: '依赖第三方认证服务升级' },
    { id: '2', reqCode: 'REQ-002', title: '订单支付接口优化', system: '交易系统', riskLevel: 'medium', reason: '与财务对账存在时间窗口' },
    { id: '3', reqCode: 'REQ-003', title: '数据迁移工具', system: '数据平台', riskLevel: 'low', reason: '已完成预演，风险可控' }
  ];

  const getRiskTag = (level: string) => {
    const levelMap: Record<string, { text: string; color: string }> = {
      high: { text: '高风险', color: 'red' },
      medium: { text: '中风险', color: 'orange' },
      low: { text: '低风险', color: 'green' }
    };
    const item = levelMap[level] || { text: level, color: 'default' };
    return <Tag color={item.color}>{item.text}</Tag>;
  };

  return (
    <div>
      <Title level={2}>项目经理 · 全局管控</Title>
      <Spin spinning={loading}>
        {/* 统计卡片 */}
        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          <Col span={24}>
            {stats && <StatusStatCards stats={stats} />}
          </Col>
        </Row>

        {/* 两栏布局：班次进度 + 紧急变更待审批 */}
        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          <Col span={16}>
            <Card title="火车班次进度">
              {schedules.length > 0 ? (
                <Table
                  dataSource={schedules}
                  columns={scheduleColumns}
                  rowKey="id"
                  pagination={false}
                  size="small"
                />
              ) : (
                <Text type="secondary">暂无班次数据</Text>
              )}
            </Card>
          </Col>
          <Col span={8}>
            <Card
              title="紧急变更待审批"
              extra={
                <span style={{ color: '#f5222d', fontWeight: 600 }}>
                  {emergencyChanges.length} 条待处理
                </span>
              }
            >
              {emergencyChanges.length > 0 ? (
                <Table
                  dataSource={emergencyChanges}
                  columns={emergencyColumns}
                  rowKey="id"
                  pagination={false}
                  size="small"
                  scroll={{ y: 300 }}
                />
              ) : (
                <Text type="secondary">暂无待审批的紧急变更</Text>
              )}
            </Card>
          </Col>
        </Row>

        {/* 依赖风险提示 */}
        <Row gutter={[16, 16]}>
          <Col span={24}>
            <Card
              title={
                <Space>
                  <InfoCircleOutlined style={{ color: '#faad14' }} />
                  <span>依赖风险提示</span>
                </Space>
              }
            >
              <Table
                dataSource={riskItems}
                columns={[
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
                    title: '所属系统',
                    dataIndex: 'system',
                    key: 'system',
                    render: (text: string) => <Tag color="blue">{text}</Tag>
                  },
                  {
                    title: '风险等级',
                    dataIndex: 'riskLevel',
                    key: 'riskLevel',
                    render: (level: string) => getRiskTag(level)
                  },
                  {
                    title: '风险原因',
                    dataIndex: 'reason',
                    key: 'reason',
                    ellipsis: true
                  }
                ]}
                rowKey="id"
                pagination={false}
                size="small"
              />
            </Card>
          </Col>
        </Row>
      </Spin>

      {/* 驳回确认弹窗 */}
      <Modal
        title="驳回紧急变更"
        visible={rejectModalVisible}
        onCancel={() => {
          setRejectModalVisible(false);
          setRejectReason('');
          setCurrentEmergencyId(null);
        }}
        footer={[
          <Button key="back" onClick={() => setRejectModalVisible(false)}>
            取消
          </Button>,
          <Button key="submit" type="primary" onClick={handleReject}>
            确认驳回
          </Button>
        ]}
      >
        <TextArea
          placeholder="请输入驳回原因"
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
          rows={4}
          style={{ marginBottom: 16 }}
        />
      </Modal>
    </div>
  );
};

export default PMDashboard;
