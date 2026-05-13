// ========== 需求池页面 ==========
// 需求池首页：分页列表 + 状态筛选 + 关键词搜索 + 新增需求按钮
// 点击「新增需求」后切换为 RequirementForm 组件（创建模式）
// 文件名：pages/requirements/index.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { Typography, Button, Table, Input, Select, Space, Tag } from 'antd'; // Ant Design 组件
import { PlusOutlined, SearchOutlined } from '@ant-design/icons'; // 图标
import type { ColumnsType } from 'antd/es/table'; // Table 列定义类型
import RequirementForm from '../../components/requirements/RequirementForm'; // 需求表单组件
import { requirementService } from '../../services/requirement'; // 需求 API 服务
import {
  RequirementListItem,       // 需求列表项类型
  RequirementListQuery,       // 需求列表查询参数类型
  ReqStatus,                  // 需求状态枚举
  REQ_STATUS_LABELS,          // 需求状态中文标签
  PRIORITY_LABELS,            // 优先级中文标签
} from '@release-train/shared';

const { Title } = Typography;

// 状态筛选选项（全部 + 各状态枚举值）
const STATUS_OPTIONS = [
  { label: '全部状态', value: '' },
  ...Object.values(ReqStatus).map((s) => ({
    label: REQ_STATUS_LABELS[s],
    value: s,
  })),
];

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

/**
 * 需求池页面组件
 * 
 * 两种模式：
 * - showForm = false → 分页列表 + 筛选 + 搜索 + 新增按钮
 * - showForm = true  → 需求表单（创建模式）
 */
const RequirementsPage: React.FC = () => {
  const [showForm, setShowForm] = useState(false);       // 是否显示表单
  const [loading, setLoading] = useState(false);          // 列表加载状态
  const [data, setData] = useState<RequirementListItem[]>([]); // 当前页数据
  const [total, setTotal] = useState(0);                  // 总记录数
  const [page, setPage] = useState(1);                    // 当前页码
  const [pageSize, setPageSize] = useState(20);           // 每页条数
  const [statusFilter, setStatusFilter] = useState<string>(''); // 状态筛选
  const [keyword, setKeyword] = useState('');             // 搜索关键词

  /**
   * 加载需求列表
   * 
   * 依赖：page / pageSize / statusFilter / keyword
   * 筛选条件变更时自动重置页码为 1
   */
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
      // 错误已由 Axios 拦截器统一处理（message.error）
    } finally {
      setLoading(false);
    }
  }, []);

  // 初始加载 + 分页/筛选变化时重新请求
  useEffect(() => {
    fetchList({
      page,
      pageSize,
      status: (statusFilter || undefined) as ReqStatus | undefined,
      keyword: keyword || undefined,
    });
  }, [page, pageSize, statusFilter, keyword, fetchList]);

  // 筛选条件变更时重置页码
  const handleStatusChange = (value: string) => {
    setStatusFilter(value);
    setPage(1); // 重置到第一页
  };

  // 搜索关键词变更（防抖由用户点击搜索按钮触发）
  const handleSearch = (value: string) => {
    setKeyword(value);
    setPage(1); // 重置到第一页
  };

  // 表格列定义
  const columns: ColumnsType<RequirementListItem> = [
    {
      title: '需求编号',
      dataIndex: 'reqCode',
      key: 'reqCode',
      width: 150,
    },
    {
      title: '需求标题',
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
      title: '创建人',
      dataIndex: ['creator', 'displayName'],
      key: 'creator',
      width: 100,
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      render: (val: string) => new Date(val).toLocaleString('zh-CN'),
    },
  ];

  // 表单模式：显示 RequirementForm
  if (showForm) {
    return (
      <RequirementForm
        mode="create"                               // 创建模式
        onCancel={() => setShowForm(false)}         // 取消 → 返回列表
        onSuccess={() => {
          setShowForm(false);                       // 成功 → 返回列表
          fetchList({
            page: 1,
            pageSize,
            status: (statusFilter || undefined) as ReqStatus | undefined,
            keyword: keyword || undefined,
          }); // 刷新列表
        }}
      />
    );
  }

  // 列表模式：筛选栏 + 表格
  return (
    <div>
      {/* 标题栏：需求池 + 新增需求按钮 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>需求池</Title>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setShowForm(true)}         // 点击切换到表单模式
        >
          新增需求
        </Button>
      </div>

      {/* 筛选栏：状态筛选 + 关键词搜索 */}
      <Space style={{ marginBottom: 16 }}>
        <Select
          placeholder="状态筛选"
          value={statusFilter}
          onChange={handleStatusChange}
          options={STATUS_OPTIONS}
          style={{ width: 140 }}
          allowClear
        />
        <Input.Search
          placeholder="搜索需求编号或标题"
          allowClear
          onSearch={handleSearch}
          style={{ width: 280 }}
          prefix={<SearchOutlined />}
        />
      </Space>

      {/* 需求列表表格（分页） */}
      <Table<RequirementListItem>
        rowKey="id"
        columns={columns}
        dataSource={data}
        loading={loading}
        pagination={{
          current: page,
          pageSize,
          total,
          showSizeChanger: true,                               // 允许切换每页条数
          pageSizeOptions: ['10', '20', '50', '100'],          // 可选每页条数
          showTotal: (t) => `共 ${t} 条`,                      // 显示总数
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