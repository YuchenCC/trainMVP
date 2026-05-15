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
  RocketOutlined,
  RedoOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import type { ColumnsType } from 'antd/es/table';
import { requirementService } from '../../services/requirement';
import { systemService, SystemOption } from '../../services/system';
import {
  RequirementListItem,
  RequirementListQuery,
  ReqStatus,
  REQ_STATUS_LABELS,
  PRIORITY_LABELS,
} from '@release-train/shared';

// ========== 常量定义 ==========

// 状态筛选选项（多选模式，不含"全部"选项）
const STATUS_OPTIONS = Object.values(ReqStatus).map((s) => ({
  label: REQ_STATUS_LABELS[s],
  value: s,
}));

// 状态 Tag 颜色映射
const STATUS_COLOR_MAP: Record<string, string> = {
  [ReqStatus.DRAFT]: 'default',
  [ReqStatus.PENDING_REVIEW]: 'processing',
  [ReqStatus.READY]: 'success',
  [ReqStatus.REJECTED]: 'error',
  [ReqStatus.ONBOARDED]: 'blue',
  [ReqStatus.RELEASED]: 'green',
  [ReqStatus.CANCELLED]: 'default',
};

// 优先级 Tag 颜色映射
const PRIORITY_COLOR_MAP: Record<string, string> = {
  P0: 'red',
  P1: 'orange',
  P2: 'blue',
  P3: 'default',
};

// ========== 操作按钮配置 ==========

/** 根据需求状态返回操作按钮列表 */
function getActionButtons(
  record: RequirementListItem,
  onEdit: (id: string) => void,
  onSubmitReview: (id: string) => void,
  onApprove: (id: string) => void,
  onReject: (id: string) => void,
  onOnboard: (id: string) => void,
  onResubmit: (id: string) => void,
) {
  const buttons: React.ReactNode[] = [];

  switch (record.status) {
    case ReqStatus.DRAFT:
      buttons.push(
        <Button key="edit" type="link" size="small" icon={<EditOutlined />} onClick={(e) => { e.stopPropagation(); onEdit(record.id); }}>
          编辑
        </Button>,
        <Button key="submit" type="link" size="small" icon={<SendOutlined />} onClick={(e) => { e.stopPropagation(); onSubmitReview(record.id); }}>
          发起评审
        </Button>,
      );
      break;
    case ReqStatus.PENDING_REVIEW:
      buttons.push(
        <Button key="approve" type="link" size="small" icon={<CheckOutlined />} style={{ color: '#52c41a' }} onClick={(e) => { e.stopPropagation(); onApprove(record.id); }}>
          通过评审
        </Button>,
        <Button key="reject" type="link" size="small" icon={<CloseOutlined />} danger onClick={(e) => { e.stopPropagation(); onReject(record.id); }}>
          驳回
        </Button>,
      );
      break;
    case ReqStatus.READY:
      buttons.push(
        <Button key="onboard" type="link" size="small" icon={<RocketOutlined />} onClick={(e) => { e.stopPropagation(); onOnboard(record.id); }}>
          纳版
        </Button>,
      );
      break;
    case ReqStatus.REJECTED:
      buttons.push(
        <Button key="resubmit" type="link" size="small" icon={<RedoOutlined />} onClick={(e) => { e.stopPropagation(); onResubmit(record.id); }}>
          重新提交
        </Button>,
      );
      break;
    default:
      // ONBOARDED / RELEASED / CANCELLED 无操作按钮
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

  // ========== 列表数据状态 ==========
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<RequirementListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // ========== 筛选条件状态 ==========
  const [systemFilter, setSystemFilter] = useState<string | undefined>(undefined);
  const [statusFilter, setStatusFilter] = useState<ReqStatus[]>([]);
  const [keyword, setKeyword] = useState('');

  // ========== 排序状态 ==========
  const [sortBy, setSortBy] = useState<'createdAt' | 'priority' | 'storyPoints' | undefined>(undefined);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | undefined>(undefined);

  // ========== 系统列表状态 ==========
  const [systems, setSystems] = useState<SystemOption[]>([]);

  // ========== 数据加载 ==========

  // 页面初始化时加载系统列表
  useEffect(() => {
    systemService.list().then(setSystems).catch(() => {});
  }, []);

  // 加载需求列表
  const fetchList = useCallback(async (params: RequirementListQuery) => {
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

  // 初始加载
  useEffect(() => {
    fetchList({
      page,
      pageSize,
      systemId: systemFilter,
      status: statusFilter.length > 0 ? statusFilter : undefined,
      keyword: keyword || undefined,
      sortBy,
      sortOrder,
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ========== 事件处理 ==========

  // 点击查询按钮
  const handleQuery = () => {
    setPage(1);
    fetchList({
      page: 1,
      pageSize,
      systemId: systemFilter,
      status: statusFilter.length > 0 ? statusFilter : undefined,
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

  // 表格排序变化（立即触发查询）
  const handleTableChange = (_pagination: any, _filters: any, sorter: any) => {
    let newSortBy: 'createdAt' | 'priority' | 'storyPoints' | undefined;
    let newSortOrder: 'asc' | 'desc' | undefined;

    if (sorter.order) {
      const fieldMap: Record<string, 'createdAt' | 'priority' | 'storyPoints'> = {
        createdAt: 'createdAt',
        priority: 'priority',
        storyPoints: 'storyPoints',
      };
      newSortBy = fieldMap[sorter.field];
      newSortOrder = sorter.order === 'ascend' ? 'asc' : 'desc';
    }

    setSortBy(newSortBy);
    setSortOrder(newSortOrder);
    setPage(1);

    // 立即用新排序参数发起查询
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

  const handleOnboard = (_id: string) => { /* TODO: T2 纳版 */ };

  const handleResubmit = async (id: string) => {
    try {
      await requirementService.reEdit(id);
      message.success('已退回草稿，可重新编辑');
      refreshList();
    } catch (error: any) {
      message.error(error?.message || '重新编辑失败');
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
      width: 100,
      render: (status: string) => (
        <Tag color={STATUS_COLOR_MAP[status] || 'default'}>
          {REQ_STATUS_LABELS[status as ReqStatus] || status}
        </Tag>
      ),
    },
    {
      title: '优先级',
      dataIndex: 'priority',
      key: 'priority',
      width: 90,
      sorter: true,
      render: (priority: string) => (
        <Tag color={PRIORITY_COLOR_MAP[priority] || 'default'}>
          {PRIORITY_LABELS[priority as keyof typeof PRIORITY_LABELS] || priority}
        </Tag>
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
      render: (_: any, record: RequirementListItem) =>
        getActionButtons(record, handleEdit, handleSubmitReview, handleApprove, handleReject, handleOnboard, handleResubmit),
    },
  ];

  // ========== 渲染 ==========
  return (
    <div>
      {/* 筛选栏：系统筛选 + 状态多选 + 关键字搜索 + 查询/重置按钮 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <Space wrap>
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
        </Space>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => navigate('/requirements/new')}
        >
          新增需求
        </Button>
      </div>

      {/* 需求列表表格（分页 + 排序） */}
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
          },
        }}
        locale={{ emptyText: '暂无需求，点击「新增需求」创建' }}
      />
    </div>
  );
};

export default RequirementsPage;