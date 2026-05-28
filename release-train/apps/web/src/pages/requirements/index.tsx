// ========== 需求池列表页面（US1.3 增强） ==========
// 路由 /requirements：分页列表 + 系统筛选 + 状态多选 + 关键词搜索 + 排序 + 操作按钮矩阵
// 点击「新增需求」跳转 /requirements/new
// 点击行跳转 /requirements/:id（需求详情）
import React, { useState, useEffect, useCallback } from 'react';
import { Button, Table, Input, Select, Space, Tag, message, Modal } from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  ReloadOutlined,
  EditOutlined,
  SendOutlined,
  CheckOutlined,
  CloseOutlined,
  RedoOutlined,
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import type { ColumnsType } from 'antd/es/table';
import { requirementService } from '../../services/requirement';
import { systemService, SystemOption } from '../../services/system';
import { useAuthStore } from '../../stores/auth';
import {
  RequirementListItem,
  ReqStatus,
  ReqSubStatus,
  REQ_STATUS_LABELS,
  REQ_SUB_STATUS_LABELS,
  REQ_SUB_STATUS_COLORS,
  Operation,
  Role,
} from '@release-train/shared';
import { AppPageHeader, DataCard, FilterBar, StatusTag } from '../../components/common';

// ========== 常量定义 ==========

// 状态筛选选项（多选模式，不含"全部"选项）
const STATUS_OPTIONS = Object.values(ReqStatus).map((s) => ({
  label: REQ_STATUS_LABELS[s],
  value: s,
}));

// ========== 操作按钮配置 ==========

/**
 * 根据需求状态和用户权限返回操作按钮列表
 * 仅显示当前用户有权限操作的功能按钮
 * @param record - 需求列表项
 * @param currentUserId - 当前用户ID（用于判断是否是归属人）
 * @param userSystemIds - 当前用户所属系统ID列表（BA只能操作自己系统的需求）
 * @param checkPermission - 权限校验函数
 * @param onEdit - 编辑回调
 * @param onSubmitReview - 发起评审回调
 * @param onApprove - 通过评审回调
 * @param onReject - 驳回回调
 * @param onResubmit - 重新提交回调
 */
function getActionButtons(
  record: RequirementListItem,
  currentUserId: string,
  userSystemIds: string[],
  checkPermission: (op: Operation) => boolean,
  onEdit: (id: string) => void,
  onSubmitReview: (id: string) => void,
  onApprove: (id: string) => void,
  onReject: (id: string) => void,
  onResubmit: (id: string) => void,
  onChangeSubStatus: (id: string) => void,
  onChangeRequirement: (id: string) => void,
) {
  const buttons: React.ReactNode[] = [];
  const isOwner = record.ba?.id === currentUserId || record.creator?.id === currentUserId;
  const isInUserSystem = userSystemIds.includes(record.system.id);
  const currentUser = useAuthStore.getState().user;
  const isBA = currentUser?.role === Role.BA;

  switch (record.status) {
    case ReqStatus.DRAFT:
      if (checkPermission(Operation.EDIT_REQ) && (!isBA || isInUserSystem)) {
        buttons.push(
          <Button key="edit" type="link" size="small" icon={<EditOutlined />} onClick={(e) => { e.stopPropagation(); onEdit(record.id); }}>
            编辑
          </Button>,
        );
      }
      if (checkPermission(Operation.SUBMIT_REVIEW) && (!isBA || isInUserSystem)) {
        buttons.push(
          <Button key="submit" type="link" size="small" icon={<SendOutlined />} onClick={(e) => { e.stopPropagation(); onSubmitReview(record.id); }}>
            发起评审
          </Button>,
        );
      }
      break;
    case ReqStatus.PENDING_REVIEW:
      if (checkPermission(Operation.REVIEW_REQ)) {
        buttons.push(
          <Button key="approve" type="link" size="small" icon={<CheckOutlined />} style={{ color: '#52c41a' }} onClick={(e) => { e.stopPropagation(); onApprove(record.id); }}>
            通过评审
          </Button>,
          <Button key="reject" type="link" size="small" icon={<CloseOutlined />} danger onClick={(e) => { e.stopPropagation(); onReject(record.id); }}>
            驳回
          </Button>,
        );
      }
      break;
    case ReqStatus.READY:
      // 需求变更：BA(归属人)/TRAIN_ADMIN/SUPER_ADMIN
      if (isOwner || currentUser?.role === Role.TRAIN_ADMIN || currentUser?.role === Role.SUPER_ADMIN) {
        buttons.push(
          <Button key="changeReq" type="link" size="small" icon={<EditOutlined />} onClick={(e) => { e.stopPropagation(); onChangeRequirement(record.id); }}>
            需求变更
          </Button>,
        );
      }
      break;
    case ReqStatus.REJECTED:
      if (checkPermission(Operation.EDIT_REQ) && isOwner) {
        buttons.push(
          <Button key="resubmit" type="link" size="small" icon={<RedoOutlined />} onClick={(e) => { e.stopPropagation(); onResubmit(record.id); }}>
            重新提交
          </Button>,
        );
      }
      break;
    case ReqStatus.ONBOARDED:
      if (checkPermission(Operation.CHANGE_SUB_STATUS) && record.subStatus !== ReqSubStatus.FROZEN) {
        buttons.push(
          <Button key="changeSubStatus" type="link" size="small" icon={<EditOutlined />} onClick={(e) => { e.stopPropagation(); onChangeSubStatus(record.id); }}>
            子状态变更
          </Button>,
        );
      }
      // 需求变更：BA(归属人)/TRAIN_ADMIN/SUPER_ADMIN（非封板状态）
      if (record.subStatus !== ReqSubStatus.FROZEN && (isOwner || currentUser?.role === Role.TRAIN_ADMIN || currentUser?.role === Role.SUPER_ADMIN)) {
        buttons.push(
          <Button key="changeReq" type="link" size="small" icon={<EditOutlined />} onClick={(e) => { e.stopPropagation(); onChangeRequirement(record.id); }}>
            需求变更
          </Button>,
        );
      }
      break;
    default:
      break;
  }

  return <Space size={0}>{buttons}</Space>;
}

// ========== 组件 ==========

/**
 * 需求池列表页面组件（US1.3 增强版）
 * 
 * 功能：
 * - 分页列表展示
 * - 系统筛选 + 状态多选 + 关键词搜索 + 查询/重置按钮
 * - 表格列排序（创建时间、优先级、工作量）
 * - 操作按钮矩阵（根据状态动态显示）
 * - 点击行跳转需求详情
 * - 新增按钮跳转创建页
 */
const RequirementsPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // ========== 列表数据状态 ==========
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<RequirementListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // ========== 筛选条件状态 ==========
  // 从 URL 参数初始化筛选条件
  const [systemFilter, setSystemFilter] = useState<string | undefined>(() => {
    const searchParams = new URLSearchParams(location.search);
    const systemParam = searchParams.get('systemId');
    return systemParam || undefined;
  });
  const [statusFilter, setStatusFilter] = useState<ReqStatus[]>(() => {
    const searchParams = new URLSearchParams(location.search);
    const statusParam = searchParams.get('status');
    if (statusParam && Object.values(ReqStatus).includes(statusParam as ReqStatus)) {
      return [statusParam as ReqStatus];
    }
    return [];
  });
  const [keyword, setKeyword] = useState('');

  // ========== 排序状态 ==========
  const [sortBy, setSortBy] = useState<'createdAt' | 'priority' | 'storyPoints' | 'status' | undefined>(undefined);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | undefined>(undefined);

  // ========== 系统列表状态 ==========
  const [systems, setSystems] = useState<SystemOption[]>([]);

  // ========== 数据加载 ==========

  // 页面初始化时加载系统列表
  useEffect(() => {
    systemService.list().then(setSystems).catch(() => {});
  }, []);

  // 加载需求列表
  const fetchList = useCallback(async (params: any) => {
    setLoading(true);
    try {
      const res = await requirementService.list(params);
      if (res.data) {
        setData(res.data.list);
        setTotal(res.data.total);
        setPage(res.data.page);
        setPageSize(res.data.pageSize);
      }
    } catch {
      // 错误已由 Axios 拦截器统一处理
    } finally {
      setLoading(false);
    }
  }, []);

  // 初始加载和 URL 参数变化时重新加载
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    
    // 直接从 URL 读取所有筛选参数（避免状态同步延迟问题）
    const urlSystemId = searchParams.get('systemId') || undefined;
    const urlStatusValues = searchParams.getAll('status').filter(s => 
      Object.values(ReqStatus).includes(s as ReqStatus)
    );
    const urlKeyword = searchParams.get('keyword') || '';
    const urlSortBy = searchParams.get('sortBy') as 'createdAt' | 'priority' | 'storyPoints' | 'status' | undefined;
    const urlSortOrder = searchParams.get('sortOrder') as 'asc' | 'desc' | undefined;
    
    // 同步 URL 参数到 UI 状态（用于表单显示）
    setSystemFilter(urlSystemId);
    if (urlStatusValues.length > 0) {
      setStatusFilter(urlStatusValues as ReqStatus[]);
    } else {
      setStatusFilter([]);
    }
    setKeyword(urlKeyword);
    if (urlSortBy) setSortBy(urlSortBy);
    if (urlSortOrder) setSortOrder(urlSortOrder);
    
    // 直接调用 API，使用 URL 参数
    setLoading(true);
    requirementService.list({
      page,
      pageSize,
      systemId: urlSystemId,
      // 将数组转换为逗号分隔字符串，避免 Fastify 不支持 status[]=value 格式
      status: urlStatusValues.length > 0 ? urlStatusValues.join(',') as any : undefined,
      keyword: urlKeyword || undefined,
      sortBy: urlSortBy,
      sortOrder: urlSortOrder,
    }).then(res => {
      if (res.data) {
        setData(res.data.list);
        setTotal(res.data.total);
        setPage(res.data.page);
        setPageSize(res.data.pageSize);
      }
    }).catch(() => {
      // 错误已由 Axios 拦截器统一处理
    }).finally(() => {
      setLoading(false);
    });
  }, [location.search]); // 监听 URL 参数变化

  // ========== 事件处理 ==========

  // 点击查询按钮
  const handleQuery = () => {
    setPage(1);
    fetchList({
      page: 1,
      pageSize,
      systemId: systemFilter,
      status: statusFilter.length > 0 ? statusFilter.join(',') as any : undefined,
      keyword: keyword || undefined,
      sortBy,
      sortOrder,
    });
  };

  // 点击重置按钮
  const handleReset = () => {
    setSystemFilter(undefined);
    setStatusFilter([]);
    setKeyword('');
    setSortBy(undefined);
    setSortOrder(undefined);
    setPage(1);
    fetchList({ page: 1, pageSize });
  };

  // 表格变化处理：仅排序变化时重置到第一页并发请求，翻页由 pagination.onChange 处理
  const handleTableChange = (_pagination: any, _filters: any, sorter: any, extra: any) => {
    if (extra.action !== 'sort') return;

    const fieldMap: Record<string, 'createdAt' | 'priority' | 'storyPoints' | 'status'> = {
      createdAt: 'createdAt',
      priority: 'priority',
      storyPoints: 'storyPoints',
      status: 'status',
    };
    const newSortBy = fieldMap[sorter.field];
    const newSortOrder = sorter.order === 'ascend' ? 'asc' : 'desc';

    setSortBy(newSortBy);
    setSortOrder(newSortOrder);
    setPage(1);

    fetchList({
      page: 1,
      pageSize,
      systemId: systemFilter,
      status: statusFilter.length > 0 ? statusFilter : undefined,
      keyword: keyword || undefined,
      sortBy: newSortBy,
      sortOrder: newSortOrder,
    });
  };

  // ========== 操作按钮回调 ==========
  const handleEdit = (id: string) => navigate(`/requirements/${id}/edit`);

  const refreshList = () => {
    fetchList({
      page,
      pageSize,
      systemId: systemFilter,
      status: statusFilter.length > 0 ? statusFilter : undefined,
      keyword: keyword || undefined,
      sortBy,
      sortOrder,
    });
  };

  const handleSubmitReview = async (id: string) => {
    try {
      await requirementService.submitReview(id);
      message.success('已发起评审');
      refreshList();
    } catch (error: any) {
      message.error(error?.message || '发起评审失败');
    }
  };

  const handleApprove = (id: string) => {
    Modal.confirm({
      title: '确认评审通过',
      content: '通过后需求将变为「就绪」状态，可被纳版。',
      okText: '确认通过',
      cancelText: '取消',
      onOk: async () => {
        try {
          await requirementService.reviewPass(id);
          message.success('评审已通过');
          refreshList();
        } catch (error: any) {
          message.error(error?.message || '评审通过失败');
        }
      },
    });
  };

  const handleReject = (id: string) => {
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
          await requirementService.reviewReject(id, rejectReason.trim());
          message.success('需求已驳回');
          refreshList();
        } catch (error: any) {
          message.error(error?.message || '评审拒绝失败');
        }
      },
    });
  };

  const handleResubmit = async (id: string) => {
    try {
      await requirementService.reEdit(id);
      message.success('已退回草稿，可重新编辑');
      refreshList();
    } catch (error: any) {
      message.error(error?.message || '重新编辑失败');
    }
  };

  // 子状态变更：打开弹窗
  const [subStatusModalVisible, setSubStatusModalVisible] = useState(false);
  const [subStatusTargetId, setSubStatusTargetId] = useState<string>('');
  const [targetSubStatus, setTargetSubStatus] = useState<string | undefined>(undefined);
  const [subStatusComment, setSubStatusComment] = useState('');
  const [subStatusLoading, setSubStatusLoading] = useState(false);

  const handleOpenChangeSubStatus = (id: string) => {
    setSubStatusTargetId(id);
    setTargetSubStatus(undefined);
    setSubStatusComment('');
    setSubStatusModalVisible(true);
  };

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
      await requirementService.changeSubStatus(subStatusTargetId, targetSubStatus, subStatusComment || undefined);
      message.success('子状态变更成功');
      setSubStatusModalVisible(false);
      refreshList();
    } catch (error: any) {
      message.error(error?.message || '子状态变更失败');
    } finally {
      setSubStatusLoading(false);
    }
  };

  // 需求变更：打开弹窗输入变更原因
  const [changeReqModalVisible, setChangeReqModalVisible] = useState(false);
  const [changeReqTargetId, setChangeReqTargetId] = useState('');
  const [changeReqReason, setChangeReqReason] = useState('');
  const [changeReqLoading, setChangeReqLoading] = useState(false);

  const handleOpenChangeRequirement = (id: string) => {
    setChangeReqTargetId(id);
    setChangeReqReason('');
    setChangeReqModalVisible(true);
  };

  const handleChangeRequirement = async () => {
    if (!changeReqReason.trim()) {
      message.warning('请填写变更原因');
      return;
    }
    if (changeReqReason.length > 500) {
      message.warning('变更原因最多500字');
      return;
    }
    setChangeReqLoading(true);
    try {
      await requirementService.changeRequirement(changeReqTargetId, changeReqReason);
      message.success('需求已变更，请重新编辑');
      setChangeReqModalVisible(false);
      refreshList();
    } catch (error: any) {
      message.error(error?.message || '需求变更失败');
    } finally {
      setChangeReqLoading(false);
    }
  };

  // ========== 表格列定义 ==========
  const columns: ColumnsType<RequirementListItem> = [
    {
      title: '需求编号',
      dataIndex: 'reqCode',
      key: 'reqCode',
      width: 150,
    },
    {
      title: '需求名称',
      dataIndex: 'title',
      key: 'title',
      ellipsis: true,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 140,
      sorter: true,
      render: (status: string, record: RequirementListItem) => (
        <Space size={4} wrap>
          <StatusTag type="requirement" value={status} />
          {status === ReqStatus.ONBOARDED && record.subStatus && (
            <StatusTag type="subStatus" value={record.subStatus} />
          )}
        </Space>
      ),
    },
    {
      title: '优先级',
      dataIndex: 'priority',
      key: 'priority',
      width: 90,
      sorter: true,
      render: (priority: string) => (
        <StatusTag type="priority" value={priority} />
      ),
    },
    {
      title: '工作量',
      dataIndex: 'storyPoints',
      key: 'storyPoints',
      width: 80,
      sorter: true,
      render: (points: number) => `${points} 点`,
    },
    {
      title: '归属系统',
      dataIndex: ['system', 'name'],
      key: 'system',
      width: 120,
    },
    {
      title: '业务归属人',
      dataIndex: ['ba', 'displayName'],
      key: 'ba',
      width: 100,
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      sorter: true,
      defaultSortOrder: 'descend',
      render: (val: string) => new Date(val).toLocaleString('zh-CN'),
    },
    {
      title: '操作',
      key: 'action',
      width: 180,
      render: (_: any, record: RequirementListItem) => {
        const user = useAuthStore.getState().user;
        const checkPermission = useAuthStore.getState().checkPermission;
        return getActionButtons(
          record,
          user?.id || '',
          user?.systemIds || [],
          checkPermission,
          handleEdit,
          handleSubmitReview,
          handleApprove,
          handleReject,
          handleResubmit,
          handleOpenChangeSubStatus,
          handleOpenChangeRequirement,
        );
      },
    },
  ];

  // ========== 渲染 ==========
  return (
    <div className="rt-page">
      <AppPageHeader
        title="需求池"
        description="集中查询、评审和跟踪所有需求的状态、优先级与纳版进展。"
        actions={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => navigate('/requirements/new')}
          >
            新增需求
          </Button>
        }
      />

      {/* 筛选栏：系统筛选 + 状态多选 + 关键字搜索 + 查询/重置按钮 */}
      <FilterBar
        fields={
          <>
          <Select
            placeholder="归属系统"
            value={systemFilter}
            onChange={(value) => setSystemFilter(value)}
            options={systems.map((s) => ({ label: s.name, value: s.id }))}
            style={{ width: 160 }}
            allowClear
          />
          <Select
            mode="multiple"
            placeholder="需求状态"
            value={statusFilter}
            onChange={(value) => setStatusFilter(value)}
            options={STATUS_OPTIONS}
            style={{ minWidth: 200 }}
            allowClear
            maxTagCount={2}
          />
          <Input.Search
            placeholder="搜索需求编号或标题"
            allowClear
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onSearch={(value) => { setKeyword(value); setPage(1); }}
            style={{ width: 280 }}
            prefix={<SearchOutlined />}
          />
          <Button type="primary" icon={<SearchOutlined />} onClick={handleQuery}>
            查询
          </Button>
          <Button icon={<ReloadOutlined />} onClick={handleReset}>
            重置
          </Button>
          </>
        }
      />

      {/* 需求列表表格（分页 + 排序） */}
      <DataCard tableCard>
        <Table<RequirementListItem>
          rowKey="id"
          columns={columns}
          dataSource={data}
          loading={loading}
          onChange={handleTableChange}
          onRow={(record) => ({
            onClick: () => navigate(`/requirements/${record.id}`),
            style: { cursor: 'pointer' },
          })}
          pagination={{
            current: page,
            pageSize,
            total,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50', '100'],
            showTotal: (t) => `共 ${t} 条`,
            onChange: (p, ps) => {
              setPage(p);
              setPageSize(ps);
              fetchList({
                page: p,
                pageSize: ps,
                systemId: systemFilter,
                status: statusFilter.length > 0 ? statusFilter : undefined,
                keyword: keyword || undefined,
                sortBy,
                sortOrder,
              });
            },
          }}
          locale={{ emptyText: '暂无需求，点击「新增需求」创建' }}
        />
      </DataCard>

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
          <div style={{ marginBottom: 8, color: '#64748b' }}>目标子状态（必选）</div>
          <Select
            style={{ width: '100%' }}
            placeholder="请选择目标子状态"
            value={targetSubStatus}
            onChange={(value) => setTargetSubStatus(value)}
            options={[
              ReqSubStatus.DEV_IN_PROGRESS,
              ReqSubStatus.SIT_TESTING,
              ReqSubStatus.UAT_TESTING,
              ReqSubStatus.FROZEN,
            ].map((s) => ({
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

      {/* ========== 需求变更弹窗 ========== */}
      <Modal
        title="需求变更"
        open={changeReqModalVisible}
        onCancel={() => setChangeReqModalVisible(false)}
        confirmLoading={changeReqLoading}
        onOk={handleChangeRequirement}
        okText="确认变更"
        cancelText="取消"
      >
        <div style={{ marginBottom: 8, color: '#64748b' }}>变更原因（必填，最多500字）</div>
        <Input.TextArea
          value={changeReqReason}
          onChange={(e) => setChangeReqReason(e.target.value)}
          placeholder="请输入需求变更的原因..."
          maxLength={500}
          rows={4}
          showCount
        />
      </Modal>
    </div>
  );
};

export default RequirementsPage;
