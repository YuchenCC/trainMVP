// ========== 需求详情页面（US1.2） ==========
// 路由 /requirements/:id，卡片分区展示需求完整信息
// 草稿状态 + 授权用户可见「编辑」按钮
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
} from 'antd';
import {
  EditOutlined,
} from '@ant-design/icons';
import { requirementService } from '../../services/requirement';
import { useAuthStore } from '../../stores/auth';
import {
  RequirementDetail,
  ReqStatus,
  REQ_STATUS_LABELS,
  REQ_STATUS_COLORS,
  PRIORITY_LABELS,
  PRIORITY_COLORS,
  REQ_TYPE_LABELS,
  SOURCE_CHANNEL_LABELS,
  Role,
  DependencyItem,
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

// ========== RequirementDetailPage 组件 ==========
const RequirementDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
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

  // 依赖列表表格列定义
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
      width: 100,
      render: (status: ReqStatus) => (
        <Tag color={REQ_STATUS_COLORS[status]}>{REQ_STATUS_LABELS[status]}</Tag>
      ),
    },
  ];

  return (
    <div>
      {/* 操作栏 */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
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
                  {REQ_STATUS_LABELS[requirement.status]}
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
              <Descriptions.Item label="提出时间">
                {new Date(requirement.proposedAt).toLocaleString('zh-CN')}
              </Descriptions.Item>
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