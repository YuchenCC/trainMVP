import React, { useState } from 'react';
import { 
  Layout, 
  Card, 
  Row, 
  Col, 
  Statistic, 
  Tag, 
  List, 
  Button, 
  Space, 
  Typography,
  Divider,
  Empty,
} from 'antd';
import {
  CalendarOutlined,
  ClockCircleOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  EyeOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/auth';
import { useDashboardData } from '../../hooks/useDashboardData';
import { Role, ReqStatus } from '@release-train/shared';
import SystemSelector from '../../components/dashboard/SystemSelector';

const { Header, Content } = Layout;
const { Title, Text, Paragraph } = Typography;

// 状态颜色映射
const statusColors: Record<string, string> = {
  [ReqStatus.DRAFT]: '#d9d9d9',
  [ReqStatus.PENDING_REVIEW]: '#1890ff',
  [ReqStatus.READY]: '#52c41a',
  [ReqStatus.ONBOARDED]: '#722ed1',
  [ReqStatus.RELEASED]: '#13c2c2',
  [ReqStatus.REJECTED]: '#f5222d',
  PENDING: '#faad14',
  APPROVED: '#52c41a',
};

// 状态标签映射
const statusLabels: Record<string, string> = {
  [ReqStatus.DRAFT]: '草稿',
  [ReqStatus.PENDING_REVIEW]: '待评审',
  [ReqStatus.READY]: '已就绪',
  [ReqStatus.ONBOARDED]: '已纳版',
  [ReqStatus.RELEASED]: '已投产',
  [ReqStatus.REJECTED]: '已拒绝',
  PENDING: '待审批',
  APPROVED: '已通过',
};

// 优先级颜色映射
const priorityColors: Record<string, string> = {
  P0: '#f5222d',
  P1: '#fa8c16',
  P2: '#faad14',
  P3: '#a0d911',
};

interface TodoSection {
  key: string;
  title: string;
  description: string;
  data: any[];
  type: 'requirement' | 'emergency';
}

// ========== 统一仪表盘页面 ==========
const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [selectedSystemId, setSelectedSystemId] = useState<string>('');
  
  const { 
    stats, 
    todos, 
    schedules, 
    loading,
    refresh 
  } = useDashboardData({ 
    systemId: selectedSystemId 
  });

  // 当前用户角色
  const role = user?.role as Role;

  // 关键日期数据
  const getKeyDates = () => {
    if (!schedules || schedules.length === 0) return [];
    
    const now = new Date();
    const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const items: any[] = [];

    schedules.forEach(schedule => {
      const scheduleName = `${schedule.trainName} v${schedule.version}`;

      // 纳版截止
      if (schedule.boardingDate) {
        const date = new Date(schedule.boardingDate);
        if (date >= now && date <= thirtyDaysLater) {
          items.push({
            type: 'boarding',
            label: '纳版截止',
            date: date.toLocaleDateString(),
            daysLeft: Math.ceil((date.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)),
            scheduleName,
            color: '#faad14',
            icon: <ClockCircleOutlined />
          });
        }
      }

      // SIT开始
      if (schedule.sitDate) {
        const date = new Date(schedule.sitDate);
        if (date >= now && date <= thirtyDaysLater) {
          items.push({
            type: 'sit',
            label: 'SIT测试开始',
            date: date.toLocaleDateString(),
            daysLeft: Math.ceil((date.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)),
            scheduleName,
            color: '#1890ff',
            icon: <CalendarOutlined />
          });
        }
      }

      // UAT开始
      if (schedule.uatDate) {
        const date = new Date(schedule.uatDate);
        if (date >= now && date <= thirtyDaysLater) {
          items.push({
            type: 'uat',
            label: 'UAT测试开始',
            date: date.toLocaleDateString(),
            daysLeft: Math.ceil((date.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)),
            scheduleName,
            color: '#722ed1',
            icon: <CheckCircleOutlined />
          });
        }
      }

      // 封板
      if (schedule.lockdownDate) {
        const date = new Date(schedule.lockdownDate);
        if (date >= now && date <= thirtyDaysLater) {
          items.push({
            type: 'lockdown',
            label: '封板',
            date: date.toLocaleDateString(),
            daysLeft: Math.ceil((date.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)),
            scheduleName,
            color: '#f5222d',
            icon: <WarningOutlined />
          });
        }
      }

      // 投产
      if (schedule.releaseDate) {
        const date = new Date(schedule.releaseDate);
        if (date >= now && date <= thirtyDaysLater) {
          items.push({
            type: 'release',
            label: '投产',
            date: date.toLocaleDateString(),
            daysLeft: Math.ceil((date.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)),
            scheduleName,
            color: '#52c41a',
            icon: <CheckCircleOutlined />
          });
        }
      }
    });

    return items.sort((a, b) => a.daysLeft - b.daysLeft);
  };

  // 根据角色获取待办列表配置
  const getTodoSections = (): TodoSection[] => {
    const sections: TodoSection[] = [];

    switch (role) {
      case Role.BA:
        // BA 待办：审核拒绝待重新编辑 + 紧急变更进度
        if (todos.pendingReviewRejected && todos.pendingReviewRejected.length > 0) {
          sections.push({
            key: 'rejected',
            title: '需求审核拒绝',
            description: '需重新编辑后提交审核',
            data: todos.pendingReviewRejected,
            type: 'requirement'
          });
        }
        if (todos.changeApprovedNeedsResubmit && todos.changeApprovedNeedsResubmit.length > 0) {
          sections.push({
            key: 'resubmit',
            title: '需重新提交',
            description: '变更通过后需重新编辑提交审核',
            data: todos.changeApprovedNeedsResubmit,
            type: 'requirement'
          });
        }
        break;

      case Role.PM:
        // PM 待办：待评审需求
        if (todos.pendingReviewList && todos.pendingReviewList.length > 0) {
          sections.push({
            key: 'pendingReview',
            title: '待评审需求',
            description: '等待您评审的需求',
            data: todos.pendingReviewList,
            type: 'requirement'
          });
        }
        break;

      case Role.PROJECT_MGR:
        // PROJECT_MGR 待办：待评审需求 + 紧急变更待审批
        if (todos.pendingReviewList && todos.pendingReviewList.length > 0) {
          sections.push({
            key: 'pendingReview',
            title: '待评审需求',
            description: '等待您评审的需求',
            data: todos.pendingReviewList,
            type: 'requirement'
          });
        }
        if (todos.emergencyPendingApproval && todos.emergencyPendingApproval.length > 0) {
          sections.push({
            key: 'emergency',
            title: '紧急变更待审批',
            description: '需要您审批的紧急变更申请',
            data: todos.emergencyPendingApproval,
            type: 'emergency'
          });
        }
        break;

      case Role.TECH_MGR:
        // TECH_MGR 待办：待评审需求
        if (todos.pendingReviewList && todos.pendingReviewList.length > 0) {
          sections.push({
            key: 'pendingReview',
            title: '待评审需求',
            description: '等待您评审的需求',
            data: todos.pendingReviewList,
            type: 'requirement'
          });
        }
        break;

      case Role.TEST_MGR:
        // TEST_MGR 待办：紧急变更待审批
        if (todos.emergencyPendingApproval && todos.emergencyPendingApproval.length > 0) {
          sections.push({
            key: 'emergency',
            title: '紧急变更待审批',
            description: '需要您审批的紧急变更申请',
            data: todos.emergencyPendingApproval,
            type: 'emergency'
          });
        }
        break;

      case Role.TRAIN_ADMIN:
        // TRAIN_ADMIN 待办：待纳版需求 + 待投产需求
        if (todos.pendingOnboard && todos.pendingOnboard.length > 0) {
          sections.push({
            key: 'pendingOnboard',
            title: '待纳版需求',
            description: '等待纳版的需求',
            data: todos.pendingOnboard,
            type: 'requirement'
          });
        }
        if (todos.pendingRelease && todos.pendingRelease.length > 0) {
          sections.push({
            key: 'pendingRelease',
            title: '待投产需求',
            description: '测试完成待投产的需求',
            data: todos.pendingRelease,
            type: 'requirement'
          });
        }
        break;

      default:
        break;
    }

    return sections;
  };

  // 点击待办项跳转详情
  const handleTodoClick = (item: any, type: string) => {
    if (type === 'requirement') {
      navigate(`/requirements/${item.id}`);
    } else if (type === 'emergency') {
      navigate(`/emergency-changes/${item.id}`);
    }
  };

  // 审批操作处理
  const handleApprove = (item: any) => {
    // 跳转到紧急变更审批页面
    navigate(`/emergency-changes/${item.id}/approve`);
  };

  const handleReject = (item: any) => {
    // 跳转到紧急变更驳回页面
    navigate(`/emergency-changes/${item.id}/reject`);
  };

  return (
    <Layout className="dashboard-layout" style={{ minHeight: '100vh' }}>
      {/* 顶部标题栏 */}
      <Header style={{ 
        background: '#fff', 
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
        padding: '0 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          <Title level={5} style={{ margin: 0, color: '#1f1f1f' }}>
            🚄 版本火车仪表盘
          </Title>
          <Paragraph style={{ margin: 0, fontSize: '12px', color: '#8c8c8c' }}>
            {user?.username} | {role}
          </Paragraph>
        </div>
        <Space>
          <SystemSelector value={selectedSystemId} onChange={setSelectedSystemId} />
          <Button onClick={refresh} loading={loading}>
            刷新数据
          </Button>
        </Space>
      </Header>

      {/* 主内容区 */}
      <Content style={{ padding: '24px', backgroundColor: '#f5f5f5' }}>
        {loading ? (
          <Card loading style={{ width: '100%' }} />
        ) : (
          <div className="dashboard-content">
            {/* 第一部分：统计卡片 */}
            <Card 
              title={
                <Space>
                  <span>需求统计概览</span>
                  <Tag color="blue">实时数据</Tag>
                </Space>
              }
              style={{ marginBottom: '24px', borderRadius: '12px' }}
              styles={{ body: { padding: '24px' } }}
            >
              <Row gutter={[24, 16]}>
                {stats && stats.byStatus && (
                  <>
                    {/* 草稿 */}
                    <Col xs={24} sm={12} lg={8} xl={6}>
                      <div 
                        className="stat-card"
                        onClick={() => navigate(`/requirements?status=${ReqStatus.DRAFT}${selectedSystemId ? `&systemId=${selectedSystemId}` : ''}`)}
                        style={{ 
                          backgroundColor: '#e6f7ff', 
                          borderLeft: `4px solid #1890ff`,
                          padding: '16px',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          transition: 'all 0.3s ease',
                        }}
                      >
                        <div style={{ fontSize: '12px', color: '#8c8c8c', marginBottom: '8px' }}>
                          草稿 · 待完善
                        </div>
                        <Statistic 
                          value={stats.byStatus[ReqStatus.DRAFT] || 0} 
                          valueStyle={{ color: '#1890ff', fontSize: '32px', fontWeight: 600 }}
                        />
                      </div>
                    </Col>

                    {/* 待评审 */}
                    <Col xs={24} sm={12} lg={8} xl={6}>
                      <div 
                        className="stat-card"
                        onClick={() => navigate(`/requirements?status=${ReqStatus.PENDING_REVIEW}${selectedSystemId ? `&systemId=${selectedSystemId}` : ''}`)}
                        style={{ 
                          backgroundColor: '#fff7e6', 
                          borderLeft: `4px solid #faad14`,
                          padding: '16px',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          transition: 'all 0.3s ease'
                        }}
                      >
                        <div style={{ fontSize: '12px', color: '#8c8c8c', marginBottom: '8px' }}>
                          待评审 · 待确认
                        </div>
                        <Statistic 
                          value={stats.byStatus[ReqStatus.PENDING_REVIEW] || 0} 
                          valueStyle={{ color: '#faad14', fontSize: '32px', fontWeight: 600 }}
                        />
                      </div>
                    </Col>

                    {/* 已就绪 */}
                    <Col xs={24} sm={12} lg={8} xl={6}>
                      <div 
                        className="stat-card"
                        onClick={() => navigate(`/requirements?status=${ReqStatus.READY}${selectedSystemId ? `&systemId=${selectedSystemId}` : ''}`)}
                        style={{ 
                          backgroundColor: '#f6ffed', 
                          borderLeft: `4px solid #52c41a`,
                          padding: '16px',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          transition: 'all 0.3s ease'
                        }}
                      >
                        <div style={{ fontSize: '12px', color: '#8c8c8c', marginBottom: '8px' }}>
                          已就绪 · 待纳版
                        </div>
                        <Statistic 
                          value={stats.byStatus[ReqStatus.READY] || 0} 
                          valueStyle={{ color: '#52c41a', fontSize: '32px', fontWeight: 600 }}
                        />
                      </div>
                    </Col>

                    {/* 已纳版 */}
                    <Col xs={24} sm={12} lg={8} xl={6}>
                      <div 
                        className="stat-card"
                        onClick={() => navigate(`/requirements?status=${ReqStatus.ONBOARDED}${selectedSystemId ? `&systemId=${selectedSystemId}` : ''}`)}
                        style={{ 
                          backgroundColor: '#f9f0ff', 
                          borderLeft: `4px solid #722ed1`,
                          padding: '16px',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          transition: 'all 0.3s ease'
                        }}
                      >
                        <div style={{ fontSize: '12px', color: '#8c8c8c', marginBottom: '8px' }}>
                          已纳版 · 开发中
                        </div>
                        <Statistic 
                          value={stats.byStatus[ReqStatus.ONBOARDED] || 0} 
                          valueStyle={{ color: '#722ed1', fontSize: '32px', fontWeight: 600 }}
                        />
                      </div>
                    </Col>

                    {/* 已投产 */}
                    <Col xs={24} sm={12} lg={8} xl={6}>
                      <div 
                        className="stat-card"
                        onClick={() => navigate(`/requirements?status=${ReqStatus.RELEASED}${selectedSystemId ? `&systemId=${selectedSystemId}` : ''}`)}
                        style={{ 
                          backgroundColor: '#e6fffb', 
                          borderLeft: `4px solid #13c2c2`,
                          padding: '16px',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          transition: 'all 0.3s ease'
                        }}
                      >
                        <div style={{ fontSize: '12px', color: '#8c8c8c', marginBottom: '8px' }}>
                          已投产 · 已上线
                        </div>
                        <Statistic 
                          value={stats.byStatus[ReqStatus.RELEASED] || 0} 
                          valueStyle={{ color: '#13c2c2', fontSize: '32px', fontWeight: 600 }}
                        />
                      </div>
                    </Col>

                    {/* 已拒绝 */}
                    <Col xs={24} sm={12} lg={8} xl={6}>
                      <div 
                        className="stat-card"
                        onClick={() => navigate(`/requirements?status=${ReqStatus.REJECTED}${selectedSystemId ? `&systemId=${selectedSystemId}` : ''}`)}
                        style={{ 
                          backgroundColor: '#fff2f0', 
                          borderLeft: `4px solid #f5222d`,
                          padding: '16px',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          transition: 'all 0.3s ease'
                        }}
                      >
                        <div style={{ fontSize: '12px', color: '#8c8c8c', marginBottom: '8px' }}>
                          已拒绝 · 需修改
                        </div>
                        <Statistic 
                          value={stats.byStatus[ReqStatus.REJECTED] || 0} 
                          valueStyle={{ color: '#f5222d', fontSize: '32px', fontWeight: 600 }}
                        />
                      </div>
                    </Col>
                  </>
                )}
              </Row>
            </Card>

            {/* 第二部分：关键时间倒计时 */}
            <Card 
              title={
                <Space>
                  <span>关键时间节点</span>
                  <Tag color="orange">未来30天</Tag>
                </Space>
              }
              style={{ marginBottom: '24px', borderRadius: '12px' }}
              styles={{ body: { padding: '16px' } }}
            >
              {getKeyDates().length > 0 ? (
                <List
                  dataSource={getKeyDates()}
                  renderItem={(item: any) => (
                    <List.Item 
                      key={`${item.type}-${item.date}`}
                      style={{ 
                        padding: '12px 16px',
                        borderRadius: '8px',
                        backgroundColor: '#fafafa',
                        marginBottom: '8px',
                        transition: 'all 0.3s ease',
                      }}
                    >
                      <Space direction="horizontal" size="large" style={{ width: '100%', alignItems: 'center' }}>
                        <div style={{ fontSize: '20px', color: item.color }}>
                          {item.icon}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 500, color: '#1f1f1f' }}>
                            {item.label}
                          </div>
                          <div style={{ fontSize: '12px', color: '#8c8c8c' }}>
                            {item.scheduleName}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '18px', fontWeight: 600, color: item.color }}>
                            {item.daysLeft} 天
                          </div>
                          <div style={{ fontSize: '12px', color: '#8c8c8c' }}>
                            {item.date}
                          </div>
                        </div>
                      </Space>
                    </List.Item>
                  )}
                />
              ) : (
                <Empty description="未来30天内无关键节点" />
              )}
            </Card>

            {/* 第三部分：待办事项列表 */}
            <Card 
              title={
                <Space>
                  <span>我的待办</span>
                  <Tag color="purple">
                    {getTodoSections().reduce((sum, s) => sum + s.data.length, 0)} 项
                  </Tag>
                </Space>
              }
              style={{ borderRadius: '12px' }}
              styles={{ body: { padding: 0 } }}
            >
              {getTodoSections().length > 0 ? (
                <div>
                  {getTodoSections().map((section) => (
                    <div key={section.key}>
                      <Divider style={{ margin: 0, backgroundColor: '#f0f0f0' }} />
                      <div style={{ padding: '16px' }}>
                        <div style={{ marginBottom: '12px' }}>
                          <Title level={5} style={{ margin: 0, color: '#1f1f1f' }}>
                            {section.title}
                          </Title>
                          <Paragraph style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#8c8c8c' }}>
                            {section.description}
                          </Paragraph>
                        </div>

                        <List
                          dataSource={section.data}
                          renderItem={(item: any) => (
                            <List.Item
                              key={item.id}
                              onClick={() => handleTodoClick(item, section.type)}
                              style={{ 
                                padding: '12px 16px',
                                borderRadius: '8px',
                                backgroundColor: '#fff',
                                marginBottom: '8px',
                                border: '1px solid #f0f0f0',
                                cursor: 'pointer',
                                transition: 'all 0.3s ease',
                              }}
                            >
                              <Space direction="horizontal" size="large" style={{ width: '100%', alignItems: 'center' }}>
                                <div style={{ flex: 1 }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Text strong style={{ color: '#1f1f1f' }}>
                                      {item.reqCode}
                                    </Text>
                                    <Tag color={priorityColors[item.priority] || '#d9d9d9'}>
                                      {item.priority}
                                    </Tag>
                                    <Tag color={statusColors[item.status] || '#d9d9d9'}>
                                      {statusLabels[item.status] || item.status}
                                    </Tag>
                                  </div>
                                  <div style={{ marginTop: '4px', color: '#595959' }}>
                                    {item.title}
                                  </div>
                                  {item.system && (
                                    <div style={{ marginTop: '4px', fontSize: '12px', color: '#8c8c8c' }}>
                                      {item.system.name}
                                    </div>
                                  )}
                                </div>

                                <div>
                                  <Space>
                                    {section.type === 'requirement' && (
                                        <Button 
                                          type="primary" 
                                          size="small"
                                          icon={<EyeOutlined />}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            navigate(`/requirements/${item.id}`);
                                          }}
                                        >
                                          去处理
                                        </Button>
                                    )}
                                    {section.type === 'emergency' && (
                                      <>
                                        <Button 
                                          type="primary" 
                                          icon={<CheckCircleOutlined />}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleApprove(item);
                                          }}
                                        >
                                          通过
                                        </Button>
                                        <Button 
                                          danger 
                                          icon={<WarningOutlined />}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleReject(item);
                                          }}
                                        >
                                          拒绝
                                        </Button>
                                      </>
                                    )}
                                  </Space>
                                </div>
                              </Space>
                            </List.Item>
                          )}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ padding: '48px' }}>
                  <Empty description="暂无待办事项" />
                </div>
              )}
            </Card>
          </div>
        )}
      </Content>
    </Layout>
  );
};

export default DashboardPage;
