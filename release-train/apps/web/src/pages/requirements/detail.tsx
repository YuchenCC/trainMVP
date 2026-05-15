// ========== 需求详情页面（US1.4） ==========
// 路由 /requirements/:id，卡片分区展示需求完整信息
// 包含：基本信息、需求描述、依赖列表、操作历史时间线、操作按钮
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  Card,
  Descriptions,
  Tag,
  Button,
  Space,
  Spin,
  Result,
  Typography,
  Row,
  Col,
  Table,
  Timeline,
} from 'antd';
import {
  EditOutlined,
  ArrowLeftOutlined,
} from '@ant-design/icons';
import { requirementService } from '../../services/requirement';
import { useAuthStore } from '../../stores/auth';
import {
  RequirementDetail,
  ReqStatus,
  ReqSubStatus,
  REQ_STATUS_LABELS,
  REQ_STATUS_COLORS,
  REQ_SUB_STATUS_LABELS,
  PRIORITY_LABELS,
  PRIORITY_COLORS,
  REQ_TYPE_LABELS,
  SOURCE_CHANNEL_LABELS,
  OPERATION_TYPE_LABELS,
  Role,
  DependencyItem,
  StatusLogItem,
} from '@release-train/shared';

const { Text } = Typography;

// 编辑权限判断：草稿状态 + 授权角色（BA仅自己的需求）
function canEditRequirement(
  requirement: RequirementDetail,
  userRole: Role | undefined,
  userId: string | undefined,
): boolean {
  if (requirement.status !== ReqStatus.DRAFT) return false;
  if (!userRole || !userId) return false;
  if (userRole === Role.SUPER_ADMIN || userRole === Role.TRAIN_ADMIN) return true;
  if (userRole === Role.PM) return true;
  if (userRole === Role.BA && requirement.ba.id === userId) return true;
  return false;
}

// 获取状态显示文本（含子状态）
function getStatusText(requirement: RequirementDetail): string {
  const statusLabel = REQ_STATUS_LABELS[requirement.status];
  if (requirement.status === ReqStatus.ONBOARDED && requirement.subStatus) {
    return `${statusLabel}-${REQ_SUB_STATUS_LABELS[requirement.subStatus]}`;
  }
  return statusLabel;
}

// 获取风险等级对应的 Tag 配置
function getRiskLevelConfig(riskLevel: DependencyItem['riskLevel']) {
  switch (riskLevel) {
    case 'warning':
      return { color: 'orange', text: '⚠️ 风险' };
    case 'high':
      return { color: 'red', text: '🔴 高风险' };
    case 'critical':
      return { color: 'red', text: '🔴 严重' };
    default:
      return { color: 'green', text: '✅ 无风险' };
  }
}

// ========== RequirementDetailPage 组件 ==========
const RequirementDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthStore();

  const [loading, setLoading] = useState(true);
  const [requirement, setRequirement] = useState<RequirementDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 加载需求详情
  const fetchDetail = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await requirementService.getById(id);
      setRequirement(res.data ?? null);
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || '加载失败';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  // 加载中
  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 80 }}>
        <Spin size="large" tip="加载中..." />
      </div>
    );
  }

  // 加载失败
  if (error || !requirement) {
    return (
      <Result
        status="error"
        title="加载失败"
        subTitle={error || '需求不存在'}
        extra={
          <Button onClick={() => navigate('/requirements')}>
            返回需求列表
          </Button>
        }
      />
    );
  }

  const canEdit = canEditRequirement(requirement, user?.role, user?.id);

  // 依赖列表表格列定义（新增风险等级列）
  const dependencyColumns = [
    {
      title: '需求编号',
      dataIndex: 'reqCode',
      key: 'reqCode',
      width: 140,
    },
    {
      title: '标题',
      dataIndex: 'title',
      key: 'title',
      ellipsis: true,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status: ReqStatus, record: DependencyItem) => (
        <Tag color={REQ_STATUS_COLORS[status]}>
          {record.subStatus && status === ReqStatus.ONBOARDED
            ? `${REQ_STATUS_LABELS[status]}-${REQ_SUB_STATUS_LABELS[record.subStatus]}`
            : REQ_STATUS_LABELS[status]}
        </Tag>
      ),
    },
    {
      title: '风险等级',
      dataIndex: 'riskLevel',
      key: 'riskLevel',
      width: 100,
      render: (riskLevel: DependencyItem['riskLevel']) => {
        const config = getRiskLevelConfig(riskLevel);
        return <Tag color={config.color}>{config.text}</Tag>;
      },
    },
  ];

  // 格式化操作历史时间
  const formatLogTime = (isoString: string) => {
    return new Date(isoString).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // 获取操作历史记录的描述文本
  const getLogDescription = (log: StatusLogItem) => {
    const operationText = OPERATION_TYPE_LABELS[log.operationType] || log.operationType;
    return `${operationText}${log.reason ? ` - ${log.reason}` : ''}`;
  };

  return (
    <div>
      {/* 操作栏：返回列表 + 编辑按钮 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Button
          type="link"
          icon={<ArrowLeftOutlined />}
          onClick={() => {
            // 保留之前的筛选条件（通过 URL query 参数传递）
            const searchParams = new URLSearchParams(location.search);
            const queryString = searchParams.toString();
            navigate(`/requirements${queryString ? `?${queryString}` : ''}`);
          }}
        >
          返回列表
        </Button>
        <Space>
          {canEdit && (
            <Button
              type="primary"
              icon={<EditOutlined />}
              onClick={() => navigate(`/requirements/${id}/edit`)}
            >
              编辑
            </Button>
          )}
        </Space>
      </div>

      <Row gutter={[16, 16]}>
        {/* 左列 */}
        <Col xs={24} lg={16}>
          {/* 基本信息卡片 */}
          <Card title="基本信息" style={{ marginBottom: 16 }}>
            <Descriptions column={2} size="small" labelStyle={{ color: '#64748b', width: 80 }}>
              <Descriptions.Item label="需求编号">
                <Text code>{requirement.reqCode}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="状态">
                <Tag color={REQ_STATUS_COLORS[requirement.status]}>
                  {getStatusText(requirement)}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="优先级">
                <Tag color={PRIORITY_COLORS[requirement.priority]}>
                  {PRIORITY_LABELS[requirement.priority]}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="工作量">
                {requirement.storyPoints} 点
              </Descriptions.Item>
              <Descriptions.Item label="需求类型">
                {requirement.reqType ? REQ_TYPE_LABELS[requirement.reqType] : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="来源渠道">
                {requirement.sourceChannel ? SOURCE_CHANNEL_LABELS[requirement.sourceChannel] : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="归属系统">
                {requirement.system.name}
              </Descriptions.Item>
              <Descriptions.Item label="所属火车">
                {requirement.train?.name || '未纳版'}
              </Descriptions.Item>
              <Descriptions.Item label="版本号" span={2}>
                v{requirement.version}
              </Descriptions.Item>
            </Descriptions>
          </Card>

          {/* 需求描述卡片 */}
          <Card title="需求描述" style={{ marginBottom: 16 }}>
            <div
              style={{ minHeight: 60, lineHeight: 1.8, color: '#334155' }}
              dangerouslySetInnerHTML={{ __html: requirement.description }}
            />
          </Card>

          {/* 依赖列表卡片 */}
          <Card title={`前置依赖（${requirement.dependencies.length}）`} style={{ marginBottom: 16 }}>
            {requirement.dependencies.length === 0 ? (
              <Text type="secondary">无前置依赖</Text>
            ) : (
              <Table<DependencyItem>
                rowKey="id"
                columns={dependencyColumns}
                dataSource={requirement.dependencies}
                pagination={false}
                size="small"
              />
            )}
          </Card>

          {/* 操作历史时间线卡片 */}
          <Card title={`操作历史（${requirement.statusLogs.length}）`} style={{ marginBottom: 16 }}>
            {requirement.statusLogs.length === 0 ? (
              <Text type="secondary">暂无操作记录</Text>
            ) : (
              <Timeline mode="left">
                {requirement.statusLogs.map((log) => (
                  <Timeline.Item key={log.id}>
                    <div>
                      <div style={{ fontWeight: 500 }}>{getLogDescription(log)}</div>
                      <div style={{ color: '#64748b', fontSize: 12, marginTop: 4 }}>
                        {formatLogTime(log.createdAt)} · {log.operatorName}
                      </div>
                      {log.fromStatus && (
                        <div style={{ color: '#94a3b8', fontSize: 12, marginTop: 4 }}>
                          {REQ_STATUS_LABELS[log.fromStatus]} → {REQ_STATUS_LABELS[log.toStatus]}
                        </div>
                      )}
                    </div>
                  </Timeline.Item>
                ))}
              </Timeline>
            )}
          </Card>

          {/* 底部操作按钮区域 */}
          <Card style={{ marginBottom: 16 }}>
            <Space>
              {requirement.status === ReqStatus.DRAFT && (
                <>
                  <Button type="primary" onClick={() => navigate(`/requirements/${id}/edit`)}>
                    编辑
                  </Button>
                  <Button>发起评审</Button>
                  <Button danger>取消</Button>
                </>
              )}
              {requirement.status === ReqStatus.PENDING_REVIEW && (
                <>
                  <Button type="primary">评审通过</Button>
                  <Button danger>评审拒绝</Button>
                </>
              )}
              {requirement.status === ReqStatus.REJECTED && (
                <>
                  <Button type="primary">重新编辑</Button>
                </>
              )}
              {requirement.status === ReqStatus.READY && (
                <>
                  <Button>需求变更</Button>
                </>
              )}
              {requirement.status === ReqStatus.ONBOARDED && (
                <>
                  {requirement.subStatus === ReqSubStatus.FROZEN ? (
                    <>
                      <Button type="primary">紧急变更</Button>
                      <Button danger>取消</Button>
                    </>
                  ) : (
                    <>
                      <Button>需求变更</Button>
                      <Button danger>取消</Button>
                    </>
                  )}
                </>
              )}
              {/* 已投产和已取消状态不显示操作按钮 */}
            </Space>
          </Card>
        </Col>

        {/* 右列 */}
        <Col xs={24} lg={8}>
          {/* 人员信息卡片 */}
          <Card title="人员信息" style={{ marginBottom: 16 }}>
            <Descriptions column={1} size="small" labelStyle={{ color: '#64748b' }}>
              <Descriptions.Item label="创建人">
                {requirement.creator.displayName}
              </Descriptions.Item>
              <Descriptions.Item label="业务归属人">
                {requirement.ba.displayName}
              </Descriptions.Item>
              <Descriptions.Item label="产品经理">
                {requirement.pm?.displayName || '未指定'}
              </Descriptions.Item>
            </Descriptions>
          </Card>

          {/* 时间信息卡片 */}
          <Card title="时间信息">
            <Descriptions column={1} size="small" labelStyle={{ color: '#64748b' }}>
              <Descriptions.Item label="创建时间">
                {new Date(requirement.createdAt).toLocaleString('zh-CN')}
              </Descriptions.Item>
              <Descriptions.Item label="更新时间">
                {new Date(requirement.updatedAt).toLocaleString('zh-CN')}
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default RequirementDetailPage;