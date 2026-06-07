import React, { useState, useEffect, useRef } from 'react';
import { 
  Card, 
  Row, 
  Col, 
  Tag, 
  Button, 
  Space, 
  Typography,
  Empty,
  Select,
  Progress,
  Statistic,
} from 'antd';
import {
  CalendarOutlined,
  ClockCircleOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  EyeOutlined,
  RocketOutlined,
  SwapOutlined,
  AlertOutlined,
} from '@ant-design/icons';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../../stores/auth';
import { useDashboardData } from '../../hooks/useDashboardData';
import { Role, ReqStatus, TrainScheduleStatus } from '@release-train/shared';
import SystemSelector from '../../components/dashboard/SystemSelector';
import { AppPageHeader, DataCard, MetricCard, StatusTag } from '../../components/common';
import SmartOnboardModal from '../../components/smart-onboard/SmartOnboardModal';
import requirementService from '../../services/requirement';
import { useTourStore } from '../../tour/store';

const { Text } = Typography;

interface TodoSection {
  key: string;
  title: string;
  description: string;
  data: any[];
  type: 'requirement' | 'emergency';
}

interface ChangeStats {
  totalOnboarded: number;
  changedCount: number;
  emergencyChangeCount: number;
  changeRate: number;
  emergencyChangeRate: number;
}

// ========== 统一仪表盘页面 ==========
const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuthStore();
  const [selectedSystemId, setSelectedSystemId] = useState<string>('');
  const [selectedScheduleId, setSelectedScheduleId] = useState<string>('');
  const [changeStats, setChangeStats] = useState<ChangeStats | null>(null);
  const [showSmartOnboardModal, setShowSmartOnboardModal] = useState(false);
  
  const { 
    stats, 
    todos, 
    schedules, 
    loading,
    refresh 
  } = useDashboardData({ 
    systemId: selectedSystemId 
  });

  // 导览状态
  const { startFeatureTour, checkShouldShowFeatureTour, isActive, clearCompleted } = useTourStore();

  // 当前用户角色
  const role = user?.role as Role;

  // 默认选中进行中的第一个班次
  useEffect(() => {
    if (schedules.length > 0 && !selectedScheduleId) {
      const inProgressSchedule = schedules.find(s => s.status === TrainScheduleStatus.IN_PROGRESS);
      if (inProgressSchedule) {
        setSelectedScheduleId(inProgressSchedule.scheduleId);
      }
    }
  }, [schedules, selectedScheduleId]);

  // 使用ref避免重复触发
  const hasProcessedTour = useRef(false);
  
  // 页面首次访问或从帮助按钮跳转时触发仪表盘导览
  useEffect(() => {
    // 检查URL参数是否指定了要启动的导览
    const tourParam = searchParams.get('tour');
    
    // 延迟触发，确保页面渲染完成
    const timer = setTimeout(() => {
      // 避免重复处理
      if (hasProcessedTour.current) {
        return;
      }
      
      // 如果导览已经激活，不要重复启动
      if (isActive) {
        // 如果URL参数还在，清除它并标记已处理
        if (tourParam === 'dashboard') {
          window.history.replaceState({}, '', window.location.pathname);
          hasProcessedTour.current = true;
        }
        return;
      }
      
      // 如果URL参数指定了导览，则强制启动（即使已完成）
      if (tourParam === 'dashboard') {
        // 标记已处理
        hasProcessedTour.current = true;
        // 清除已完成标记
        clearCompleted('dashboard');
        // 启动导览
        startFeatureTour('dashboard');
        // 立即清除URL参数，避免退出导览后再次启动
        window.history.replaceState({}, '', window.location.pathname);
      } else if (checkShouldShowFeatureTour('dashboard')) {
        // 否则检查是否应该自动启动（首次访问）
        startFeatureTour('dashboard');
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [isActive, checkShouldShowFeatureTour, startFeatureTour, searchParams, clearCompleted]);

  // 获取班次变更率数据
  useEffect(() => {
    const fetchChangeStats = async () => {
      if (!selectedScheduleId) {
        setChangeStats(null);
        return;
      }
      try {
        const res = await requirementService.getStats({ scheduleId: selectedScheduleId });
        if (res.success && res.data?.changeStats) {
          setChangeStats(res.data.changeStats);
        } else {
          setChangeStats(null);
        }
      } catch {
        setChangeStats(null);
      }
    };
    fetchChangeStats();
  }, [selectedScheduleId]);

  // 关键日期数据
  const getKeyDates = () => {
    if (!schedules || schedules.length === 0) return [];
    
    const now = new Date();
    const fourteenDaysLater = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
    const items: any[] = [];

    schedules.forEach(schedule => {
      const scheduleName = schedule.scheduleName || schedule.trainName;
      // 纳版截止
      if (schedule.boardingDate) {
        const date = new Date(schedule.boardingDate);
        if (date >= now && date <= fourteenDaysLater) {
          items.push({
            type: 'boarding',
            label: '纳版截止',
            date: date.toLocaleDateString(),
            daysLeft: Math.ceil((date.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)),
            scheduleName,
            trainId: schedule.trainId,
            scheduleId: schedule.scheduleId,
            color: '#faad14',
            icon: <ClockCircleOutlined />
          });
        }
      }

      // SIT开始
      if (schedule.sitDate) {
        const date = new Date(schedule.sitDate);
        if (date >= now && date <= fourteenDaysLater) {
          items.push({
            type: 'sit',
            label: 'SIT测试开始',
            date: date.toLocaleDateString(),
            daysLeft: Math.ceil((date.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)),
            scheduleName,
            trainId: schedule.trainId,
            scheduleId: schedule.scheduleId,
            color: '#1890ff',
            icon: <CalendarOutlined />
          });
        }
      }

      // UAT开始
      if (schedule.uatDate) {
        const date = new Date(schedule.uatDate);
        if (date >= now && date <= fourteenDaysLater) {
          items.push({
            type: 'uat',
            label: 'UAT测试开始',
            date: date.toLocaleDateString(),
            daysLeft: Math.ceil((date.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)),
            scheduleName,
            trainId: schedule.trainId,
            scheduleId: schedule.scheduleId,
            color: '#722ed1',
            icon: <CheckCircleOutlined />
          });
        }
      }

      // 封板
      if (schedule.lockdownDate) {
        const date = new Date(schedule.lockdownDate);
        if (date >= now && date <= fourteenDaysLater) {
          items.push({
            type: 'lockdown',
            label: '封板',
            date: date.toLocaleDateString(),
            daysLeft: Math.ceil((date.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)),
            scheduleName,
            trainId: schedule.trainId,
            scheduleId: schedule.scheduleId,
            color: '#f5222d',
            icon: <WarningOutlined />
          });
        }
      }

      // 投产
      if (schedule.releaseDate) {
        const date = new Date(schedule.releaseDate);
        if (date >= now && date <= fourteenDaysLater) {
          items.push({
            type: 'release',
            label: '投产',
            date: date.toLocaleDateString(),
            daysLeft: Math.ceil((date.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)),
            scheduleName,
            trainId: schedule.trainId,
            scheduleId: schedule.scheduleId,
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
        // TECH_MGR 待办：待评审需求 + 待开发完成
        if (todos.pendingReviewList && todos.pendingReviewList.length > 0) {
          sections.push({
            key: 'pendingReview',
            title: '待评审需求',
            description: '等待您评审的需求',
            data: todos.pendingReviewList,
            type: 'requirement'
          });
        }
        if (todos.pendingDevComplete && todos.pendingDevComplete.length > 0) {
          sections.push({
            key: 'pendingDevComplete',
            title: '待开发完成',
            description: '开发中的需求，可标记开发完成',
            data: todos.pendingDevComplete,
            type: 'requirement'
          });
        }
        break;

      case Role.TEST_MGR:
        // TEST_MGR 待办：紧急变更待审批 + 待 SIT 通过
        if (todos.emergencyPendingApproval && todos.emergencyPendingApproval.length > 0) {
          sections.push({
            key: 'emergency',
            title: '紧急变更待审批',
            description: '需要您审批的紧急变更申请',
            data: todos.emergencyPendingApproval,
            type: 'emergency'
          });
        }
        if (todos.pendingSitPass && todos.pendingSitPass.length > 0) {
          sections.push({
            key: 'pendingSitPass',
            title: '待 SIT 通过',
            description: 'SIT 测试中的需求，可标记测试通过',
            data: todos.pendingSitPass,
            type: 'requirement'
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
    <div className="rt-page">
      <AppPageHeader
        title="工作台"
        description="聚合当前角色的需求状态、关键节点和待处理事项。"
        meta={<Text type="secondary" style={{ fontSize: 12 }}>{user?.username} | {role}</Text>}
        actions={
          <>
            <div id="dashboard-system-filter">
              <SystemSelector value={selectedSystemId} onChange={setSelectedSystemId} />
            </div>
            {schedules.length > 0 && (
              <div id="dashboard-schedule-select">
                <Select
                  placeholder="选择班次查看变更率"
                  allowClear
                  style={{ width: 200 }}
                  value={selectedScheduleId || undefined}
                  onChange={(value) => setSelectedScheduleId(value || '')}
                  options={schedules.map(s => ({
                    label: s.scheduleName || s.trainName,
                    value: s.scheduleId,
                  }))}
                />
              </div>
            )}
            {role === Role.TRAIN_ADMIN && (
              <Button 
                type="primary" 
                icon={<RocketOutlined />}
                onClick={() => setShowSmartOnboardModal(true)}
              >
                AI 智能纳版
              </Button>
            )}
            {(role === Role.BA || role === Role.PM) && (
              <Button 
                type="primary" 
                icon={<RocketOutlined />}
                onClick={() => navigate('/requirements/new')}
              >
                AI 智能提需求
              </Button>
            )}
            <Button onClick={refresh} loading={loading}>
              刷新数据
            </Button>
          </>
        }
      />
        {loading ? (
          <Card loading style={{ width: '100%' }} />
        ) : (
          <div className="dashboard-content">
            {/* 第一部分：统计卡片 */}
            <div id="dashboard-stats">
              <DataCard
                title={
                  <Space>
                    <span>需求统计概览</span>
                    <StatusTag type="custom" value="实时数据" label="实时数据" />
                  </Space>
                }
                styles={{ body: { padding: '16px' } }}
              >
              <Row gutter={[16, 12]}>
                {stats && stats.byStatus && (
                  <>
                    {/* 草稿 */}
                    <Col xs={12} sm={8} md={6} lg={4}>
                      <MetricCard
                        label="草稿 · 待完善"
                        value={stats.byStatus[ReqStatus.DRAFT] || 0}
                        color="#2563eb"
                        onClick={() => navigate(`/requirements?status=${ReqStatus.DRAFT}${selectedSystemId ? `&systemId=${selectedSystemId}` : ''}`)}
                      />
                    </Col>

                    {/* 待评审 */}
                    <Col xs={12} sm={8} md={6} lg={4}>
                      <MetricCard
                        label="待评审 · 待确认"
                        value={stats.byStatus[ReqStatus.PENDING_REVIEW] || 0}
                        color="#f59e0b"
                        onClick={() => navigate(`/requirements?status=${ReqStatus.PENDING_REVIEW}${selectedSystemId ? `&systemId=${selectedSystemId}` : ''}`)}
                      />
                    </Col>

                    {/* 已就绪 */}
                    <Col xs={12} sm={8} md={6} lg={4}>
                      <MetricCard
                        label="已就绪 · 待纳版"
                        value={stats.byStatus[ReqStatus.READY] || 0}
                        color="#16a34a"
                        onClick={() => navigate(`/requirements?status=${ReqStatus.READY}${selectedSystemId ? `&systemId=${selectedSystemId}` : ''}`)}
                      />
                    </Col>

                    {/* 已纳版 */}
                    <Col xs={12} sm={8} md={6} lg={4}>
                      <MetricCard
                        label="已纳版 · 开发中"
                        value={stats.byStatus[ReqStatus.ONBOARDED] || 0}
                        color="#7c3aed"
                        onClick={() => navigate(`/requirements?status=${ReqStatus.ONBOARDED}${selectedSystemId ? `&systemId=${selectedSystemId}` : ''}`)}
                      />
                    </Col>

                    {/* 已投产 */}
                    <Col xs={12} sm={8} md={6} lg={4}>
                      <MetricCard
                        label="已投产 · 已上线"
                        value={stats.byStatus[ReqStatus.RELEASED] || 0}
                        color="#16a34a"
                        onClick={() => navigate(`/requirements?status=${ReqStatus.RELEASED}${selectedSystemId ? `&systemId=${selectedSystemId}` : ''}`)}
                      />
                    </Col>

                    {/* 已拒绝 */}
                    <Col xs={12} sm={8} md={6} lg={4}>
                      <MetricCard
                        label="已拒绝 · 需修改"
                        value={stats.byStatus[ReqStatus.REJECTED] || 0}
                        color="#dc2626"
                        onClick={() => navigate(`/requirements?status=${ReqStatus.REJECTED}${selectedSystemId ? `&systemId=${selectedSystemId}` : ''}`)}
                      />
                    </Col>
                  </>
                )}
              </Row>

              {/* 变更率统计（选择班次后显示） */}
              {selectedScheduleId && changeStats && (
                <Row gutter={16} style={{ marginTop: 16 }}>
                  <Col span={24}>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      班次变更率统计（{schedules.find(s => s.scheduleId === selectedScheduleId)?.scheduleName || ''}）
                    </Text>
                  </Col>
                  <Col xs={24} sm={12} md={8}>
                    <div id="dashboard-change-rate">
                      <Card size="small" style={{ background: '#f6ffed', borderColor: '#52c41a' }}>
                        <Statistic
                          title="需求变更率"
                          value={changeStats.changeRate}
                          suffix="%"
                          prefix={<SwapOutlined style={{ color: '#52c41a' }} />}
                          valueStyle={{ color: '#52c41a', fontSize: 24 }}
                        />
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {changeStats.changedCount}/{changeStats.totalOnboarded} 个需求发生过变更
                        </Text>
                      </Card>
                    </div>
                  </Col>
                  <Col xs={24} sm={12} md={8}>
                    <div id="dashboard-change-type-stats">
                      <Card size="small" style={{ background: '#fff2e8', borderColor: '#fa8c16' }}>
                        <Statistic
                          title="紧急变更率"
                          value={changeStats.emergencyChangeRate}
                          suffix="%"
                          prefix={<AlertOutlined style={{ color: '#fa8c16' }} />}
                          valueStyle={{ color: '#fa8c16', fontSize: 24 }}
                        />
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {changeStats.emergencyChangeCount}/{changeStats.totalOnboarded} 个需求发生紧急变更
                        </Text>
                      </Card>
                    </div>
                  </Col>
                  <Col xs={24} sm={12} md={8}>
                    <Card size="small">
                      <Statistic
                        title="已纳版需求"
                        value={changeStats.totalOnboarded}
                        prefix={<RocketOutlined style={{ color: '#7c3aed' }} />}
                        valueStyle={{ color: '#7c3aed', fontSize: 24 }}
                      />
                      <Progress 
                        percent={changeStats.changeRate} 
                        size="small" 
                        strokeColor="#52c41a"
                        style={{ marginTop: 8 }}
                      />
                    </Card>
                  </Col>
                </Row>
              )}
            </DataCard>
            </div>

            {/* 第二部分：关键时间倒计时 */}
            <div id="dashboard-key-dates">
              <DataCard
                title={
                  <Space>
                    <span>关键时间节点</span>
                    <StatusTag type="custom" value="未来14天" label="未来14天" />
                  </Space>
                }
                styles={{ body: { padding: '16px' } }}
              >
              {getKeyDates().length > 0 ? (
                <Row gutter={[12, 12]}>
                  {getKeyDates().map((item: any) => (
                    <Col key={`${item.type}-${item.date}`} xs={24} sm={12}>
                      <div
                        onClick={() => navigate(`/trains/${item.trainId}/schedules/${item.scheduleId}`)}
                        style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: 12,
                        padding: '12px 16px',
                        borderRadius: '8px',
                        backgroundColor: '#fff',
                        border: '1px solid #eef1f5',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                      }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = '#bfdbfe';
                          e.currentTarget.style.boxShadow = '0 4px 12px rgba(16,24,40,0.08)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = '#eef1f5';
                          e.currentTarget.style.boxShadow = 'none';
                        }}
                      >
                        <div style={{ fontSize: '20px', color: item.color, flexShrink: 0 }}>
                          {item.icon}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 500, color: '#1f1f1f', fontSize: 13 }}>
                            {item.label}
                          </div>
                          <div style={{ fontSize: '12px', color: '#8c8c8c', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {item.scheduleName}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <div style={{ fontSize: '16px', fontWeight: 600, color: item.color }}>
                            {item.daysLeft} 天
                          </div>
                          <div style={{ fontSize: '11px', color: '#8c8c8c' }}>
                            {item.date}
                          </div>
                        </div>
                      </div>
                    </Col>
                  ))}
                </Row>
              ) : (
                <Empty description="未来14天内无关键节点" />
              )}
            </DataCard>
            </div>

            {/* 第三部分：待办事项列表 */}
            <div id="dashboard-todos">
              <DataCard
                title={
                  <Space>
                    <span>我的待办</span>
                    <StatusTag type="custom" value="待办数量" label={`${getTodoSections().reduce((sum, s) => sum + s.data.length, 0)} 项`} />
                  </Space>
                }
                styles={{ body: { padding: 0 } }}
              >
              {getTodoSections().length > 0 ? (
                <div style={{ padding: '4px 0' }}>
                  {getTodoSections().map((section) => (
                    <div key={section.key}>
                      <div style={{ padding: '16px 20px 4px' }}>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                          <Text strong style={{ fontSize: 14, color: '#262626' }}>
                            {section.title}
                          </Text>
                          <Text style={{ fontSize: 12, color: '#8c8c8c' }}>
                            {section.description}
                          </Text>
                        </div>
                      </div>
                      <div style={{ padding: '12px 20px 16px' }}>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {section.data.map((item: any) => (
                            <div
                              key={item.id}
                              onClick={() => handleTodoClick(item, section.type)}
                              className="rt-list-row"
                              style={{ 
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '14px 16px',
                                cursor: 'pointer',
                              }}
                            >
                              <div style={{ flex: 1, minWidth: 0, marginRight: 16 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: 4 }}>
                                  <Text strong style={{ color: '#1f1f1f', fontSize: 13, whiteSpace: 'nowrap' }}>
                                    {item.reqCode}
                                  </Text>
                                  <StatusTag type="priority" value={item.priority} label={item.priority} />
                                  <StatusTag type="requirement" value={item.status} />
                                  {item.system && (
                                    <Tag style={{ margin: 0, fontSize: 11, lineHeight: '18px', border: '1px solid #e8e8e8', color: '#8c8c8c', backgroundColor: '#fafafa' }}>
                                      {item.system.name}
                                    </Tag>
                                  )}
                                </div>
                                <div style={{ color: '#595959', fontSize: 13, lineHeight: '20px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {item.title}
                                </div>
                              </div>

                              <div style={{ flexShrink: 0 }}>
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
                                  <Space size={8}>
                                    <Button 
                                      type="primary"
                                      size="small"
                                      icon={<CheckCircleOutlined />}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleApprove(item);
                                      }}
                                    >
                                      通过
                                    </Button>
                                    <Button 
                                      size="small"
                                      danger
                                      icon={<WarningOutlined />}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleReject(item);
                                      }}
                                    >
                                      拒绝
                                    </Button>
                                  </Space>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ padding: '48px' }}>
                  <Empty description="暂无待办事项" />
                </div>
              )}
            </DataCard>
            </div>
          </div>
        )}
        
        {/* 智能纳版模态框 */}
        <SmartOnboardModal 
          visible={showSmartOnboardModal} 
          onCancel={() => setShowSmartOnboardModal(false)} 
        />
    </div>
  );
};

export default DashboardPage;
