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
  message,
  Modal,
  Input,
  Select,
} from 'antd';
import {
  EditOutlined,
  ArrowLeftOutlined,
  CloseOutlined,
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
  REQ_SUB_STATUS_COLORS,
  PRIORITY_LABELS,
  PRIORITY_COLORS,
  REQ_TYPE_LABELS,
  SOURCE_CHANNEL_LABELS,
  OPERATION_TYPE_LABELS,
  Role,
  DependencyItem,
  StatusLogItem,
  Operation,
} from '@release-train/shared';

const { Text } = Typography;

// 使用权限矩阵校验编辑权限：草稿状态 + 授权角色（BA 仅自己的需求）
// 该函数在组件内通过 useAuthStore 获取 checkPermission
function canEditRequirement(
  requirement: RequirementDetail,
  userRole: Role | undefined,
  userId: string | undefined,
  userSystemIds: string[],
  checkPermission: (op: Operation) => boolean,
): boolean {
  if (requirement.status !== ReqStatus.DRAFT) return false;
  if (!userRole || !userId) return false;
  if (userRole === Role.SUPER_ADMIN) return true;
  if (!checkPermission(Operation.EDIT_REQ)) return false;
  if (userRole === Role.BA && requirement.ba.id !== userId) return false;
  if (userRole === Role.BA && !userSystemIds.includes(requirement.system.id)) return false;
  return true;
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
  const { user, checkPermission } = useAuthStore();

  const [loading, setLoading] = useState(true);
  const [requirement, setRequirement] = useState<RequirementDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [changeModalVisible, setChangeModalVisible] = useState(false);
  const [changeReason, setChangeReason] = useState('');
  const [changeLoading, setChangeLoading] = useState(false);

  // ========== 子状态变更处理 ==========
  // 判断是否显示子状态变更按钮：已纳版（非封板）+ PROJECT_MGR/TECH_MGR/TEST_MGR
  const canChangeSubStatus = () => {
    if (!user?.role || !requirement) return false;

    // 权限检查：PROJECT_MGR、TECH_MGR、TEST_MGR
    const hasPermission =
      user.role === Role.PROJECT_MGR ||
      user.role === Role.TECH_MGR ||
      user.role === Role.TEST_MGR ||
      user.role === Role.SUPER_ADMIN;

    if (!hasPermission) return false;

    // 状态检查：已纳版且非封板
    const req = requirement;
    if (req.status === ReqStatus.ONBOARDED && req.subStatus !== ReqSubStatus.FROZEN) {
      return true;
    }
    return false;
  };

  const [subStatusModalVisible, setSubStatusModalVisible] = useState(false);
  const [targetSubStatus, setTargetSubStatus] = useState<string | undefined>(undefined);
  const [subStatusComment, setSubStatusComment] = useState('');
  const [subStatusLoading, setSubStatusLoading] = useState(false);

  // 获取可选的子状态列表（排除当前子状态）
  const getAvailableSubStatuses = () => {
    if (!requirement) return [];
    const allSubStatuses = [
      ReqSubStatus.DEV_IN_PROGRESS,
      ReqSubStatus.SIT_TESTING,
      ReqSubStatus.UAT_TESTING,
      ReqSubStatus.FROZEN,
    ];
    return allSubStatuses.filter((s) => s !== requirement.subStatus);
  };

  // 处理子状态变更提交
  const handleChangeSubStatus = async () => {
    if (!targetSubStatus) {
      message.warning('请选择目标子状态');
      return;
    }
    if (subStatusComment.length > 500) {
      message.warning('变更说明最多500字');
      return;
    }

    setSubStatusLoading(true);
    try {
      await requirementService.changeSubStatus(id!, targetSubStatus, subStatusComment || undefined);
      message.success('子状态变更成功');
      setSubStatusModalVisible(false);
      setTargetSubStatus(undefined);
      setSubStatusComment('');
      fetchDetail();
    } catch (error: any) {
      message.error(error?.message || '子状态变更失败');
    } finally {
      setSubStatusLoading(false);
    }
  };

  // ========== 数据获取 ==========
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

  // ========== 加载状态 ==========
  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 80 }}>
        <Spin size="large" tip="加载中..." />
      </div>
    );
  }

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

  const canEdit = canEditRequirement(requirement, user?.role, user?.id, user?.systemIds || [], checkPermission);

  const canSubmitReview = checkPermission(Operation.SUBMIT_REVIEW) && (user?.role !== Role.BA || (user?.systemIds || []).includes(requirement.system.id));

  // 评审权限：REVIEW_REQ 操作
  const canReview = checkPermission(Operation.REVIEW_REQ);

  // 取消权限：CANCEL_REQ 操作
  const canCancel = checkPermission(Operation.CANCEL_REQ);

  // 重新编辑权限：EDIT_REQ 操作
  const canReEdit = checkPermission(Operation.EDIT_REQ);

  const handleSubmitReview = async () => {
    try {
      await requirementService.submitReview(id!);
      message.success('已发起评审');
      fetchDetail();
    } catch (error: any) {
      message.error(error?.message || '发起评审失败');
    }
  };

  const handleReviewPass = () => {
    Modal.confirm({
      title: '确认评审通过',
      content: '通过后需求将变为「就绪」状态，可被纳版。',
      okText: '确认通过',
      cancelText: '取消',
      onOk: async () => {
        try {
          await requirementService.reviewPass(id!);
          message.success('评审已通过');
          fetchDetail();
        } catch (error: any) {
          message.error(error?.message || '评审通过失败');
        }
      },
    });
  };

  const handleReviewReject = () => {
    let rejectReason = '';
    Modal.confirm({
      title: '评审拒绝',
      icon: <CloseOutlined />,
      content: (
        <div style={{ marginTop: 16 }}>
          <p style={{ marginBottom: 8 }}>请输入拒绝原因（必填，最多 500 字）：</p>
          <Input.TextArea
            rows={4}
            maxLength={500}
            showCount
            placeholder="请详细说明拒绝原因，以便需求提出人修改"
            onChange={(e) => { rejectReason = e.target.value; }}
          />
        </div>
      ),
      okText: '确认拒绝',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: async () => {
        if (!rejectReason || rejectReason.trim().length === 0) {
          message.warning('请输入拒绝原因');
          return Promise.reject();
        }
        try {
          await requirementService.reviewReject(id!, rejectReason.trim());
          message.success('需求已驳回');
          fetchDetail();
        } catch (error: any) {
          message.error(error?.message || '评审拒绝失败');
        }
      },
    });
  };

  const handleReEdit = async () => {
    try {
      await requirementService.reEdit(id!);
      message.success('已退回草稿，可重新编辑');
      fetchDetail();
    } catch (error: any) {
      message.error(error?.message || '重新编辑失败');
    }
  };

  const handleCancel = () => {
    Modal.confirm({
      title: '确认取消需求',
      content: '取消后需求将变为「已取消」状态，不可恢复。',
      okText: '确认取消',
      okButtonProps: { danger: true },
      cancelText: '返回',
      onOk: async () => {
        try {
          await requirementService.cancel(id!);
          message.success('需求已取消');
          fetchDetail();
        } catch (error: any) {
          message.error(error?.message || '取消失败');
        }
      },
    });
  };

  const canChangeRequirement = () => {
    if (!user?.role || !user?.id) return false;

    // 权限检查：BA（归属人）、TRAIN_ADMIN、SUPER_ADMIN
    const hasPermission =
      user.role === Role.TRAIN_ADMIN ||
      user.role === Role.SUPER_ADMIN ||
      (user.role === Role.BA && requirement.ba.id === user.id);

    if (!hasPermission) return false;

    // 状态检查：已就绪 或 已纳版（非封板）
    if (requirement.status === ReqStatus.READY) {
      return true;
    }
    if (requirement.status === ReqStatus.ONBOARDED && requirement.subStatus !== ReqSubStatus.FROZEN) {
      return true;
    }
    return false;
  };

  // 处理需求变更提交
  const handleChangeRequirement = async () => {
    if (!changeReason.trim()) {
      message.warning('请填写变更原因');
      return;
    }
    if (changeReason.length > 500) {
      message.warning('变更原因最多500字');
      return;
    }

    setChangeLoading(true);
    try {
      await requirementService.changeRequirement(id!, changeReason);
      message.success('需求已变更，请重新编辑');
      setChangeModalVisible(false);
      setChangeReason('');
      fetchDetail();
    } catch (error: any) {
      message.error(error?.message || '变更失败');
    } finally {
      setChangeLoading(false);
    }
  };

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
                  {canEdit && (
                    <Button type="primary" onClick={() => navigate(`/requirements/${id}/edit`)}>
                      编辑
                    </Button>
                  )}
                  {canSubmitReview && (
                    <Button onClick={handleSubmitReview}>发起评审</Button>
                  )}
                  {canCancel && (
                    <Button danger onClick={handleCancel}>取消</Button>
                  )}
                </>
              )}
              {requirement.status === ReqStatus.PENDING_REVIEW && (
                <>
                  {canReview && (
                    <>
                      <Button type="primary" onClick={handleReviewPass}>评审通过</Button>
                      <Button danger onClick={handleReviewReject}>评审拒绝</Button>
                    </>
                  )}
                </>
              )}
              {requirement.status === ReqStatus.REJECTED && (
                <>
                  {canReEdit && (
                    <Button type="primary" onClick={handleReEdit}>重新编辑</Button>
                  )}
                </>
              )}
              {requirement.status === ReqStatus.READY && canChangeRequirement() && (
                <>
                  <Button type="primary" onClick={() => setChangeModalVisible(true)}>需求变更</Button>
                </>
              )}
              {requirement.status === ReqStatus.ONBOARDED && (
                <>
                  {requirement.subStatus === ReqSubStatus.FROZEN ? (
                    <>
                      {checkPermission(Operation.EMERGENCY_CHANGE) && (
                        <Button type="primary">紧急变更</Button>
                      )}
                      {canCancel && (
                        <Button danger>取消</Button>
                      )}
                    </>
                  ) : (
                    <>
                      {canChangeRequirement() && (
                        <Button type="primary" onClick={() => setChangeModalVisible(true)}>需求变更</Button>
                      )}
                      {canChangeSubStatus() && (
                        <Button type="primary" onClick={() => {
                          setTargetSubStatus(undefined);
                          setSubStatusComment('');
                          setSubStatusModalVisible(true);
                        }}>子状态变更</Button>
                      )}
                      {canCancel && (
                        <Button danger>取消</Button>
                      )}
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

      {/* 需求变更弹窗 */}
      <Modal
        title="需求变更"
        open={changeModalVisible}
        onCancel={() => {
          setChangeModalVisible(false);
          setChangeReason('');
        }}
        footer={[
          <Button
            key="cancel"
            onClick={() => {
              setChangeModalVisible(false);
              setChangeReason('');
            }}
          >
            取消
          </Button>,
          <Button
            key="submit"
            type="primary"
            loading={changeLoading}
            onClick={handleChangeRequirement}
          >
            确认变更
          </Button>,
        ]}
      >
        <div style={{ marginBottom: 16 }}>
           <div style={{ marginBottom: 8, color: '#64748b' }}>变更原因（必填，最多500字）</div>
           <Input.TextArea
             value={changeReason}
             onChange={(e) => setChangeReason(e.target.value)}
             placeholder="请输入需求变更的原因..."
             maxLength={500}
             rows={4}
             showCount
           />
         </div>
      </Modal>

      {/* 子状态变更弹窗 */}
      <Modal
        title="子状态变更"
        open={subStatusModalVisible}
        onCancel={() => {
          setSubStatusModalVisible(false);
          setTargetSubStatus(undefined);
          setSubStatusComment('');
        }}
        footer={[
          <Button
            key="cancel"
            onClick={() => {
              setSubStatusModalVisible(false);
              setTargetSubStatus(undefined);
              setSubStatusComment('');
            }}
          >
            取消
          </Button>,
          <Button
            key="submit"
            type="primary"
            loading={subStatusLoading}
            onClick={handleChangeSubStatus}
          >
            确认变更
          </Button>,
        ]}
      >
        <div style={{ marginBottom: 16 }}>
          <div style={{ marginBottom: 8, color: '#64748b' }}>
            当前子状态：
            <Tag color={requirement.subStatus ? REQ_SUB_STATUS_COLORS[requirement.subStatus] : 'default'} style={{ marginLeft: 8 }}>
              {requirement.subStatus ? REQ_SUB_STATUS_LABELS[requirement.subStatus] : '-'}
            </Tag>
          </div>
          <div style={{ marginBottom: 8, color: '#64748b' }}>目标子状态（必选）</div>
          <Select
            style={{ width: '100%' }}
            placeholder="请选择目标子状态"
            value={targetSubStatus}
            onChange={(value) => setTargetSubStatus(value)}
            options={getAvailableSubStatuses().map((s) => ({
              value: s,
              label: (
                <span>
                  {REQ_SUB_STATUS_LABELS[s]}
                  <Tag color={REQ_SUB_STATUS_COLORS[s]} style={{ marginLeft: 8 }}>{s}</Tag>
                </span>
              ),
            }))}
          />
        </div>
        <div style={{ marginBottom: 16 }}>
          <div style={{ marginBottom: 8, color: '#64748b' }}>变更说明（可选，最多500字）</div>
          <Input.TextArea
            value={subStatusComment}
            onChange={(e) => setSubStatusComment(e.target.value)}
            placeholder="请输入子状态变更的原因..."
            maxLength={500}
            rows={4}
            showCount
          />
        </div>
      </Modal>
    </div>
  );
};

export default RequirementDetailPage;