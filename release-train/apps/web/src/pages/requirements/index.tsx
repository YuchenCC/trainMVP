// ========== 需求池列表页面 ==========
// 路由 /requirements：分页列表 + 状态筛选 + 关键词搜索 + 新增按钮
// 点击「新增需求」跳转 /requirements/new
// 点击行跳转 /requirements/:id（需求详情）
import React, { useState, useEffect, useCallback } from 'react';
import { Button, Table, Input, Select, Space, Tag } from 'antd';
import { PlusOutlined, SearchOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import type { ColumnsType } from 'antd/es/table';
import { requirementService } from '../../services/requirement';
import {
  RequirementListItem,
  RequirementListQuery,
  ReqStatus,
  REQ_STATUS_LABELS,
  PRIORITY_LABELS,
} from '@release-train/shared';

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
 * 需求池列表页面组件
 * 
 * 功能：
 * - 分页列表展示
 * - 状态筛选 + 关键词搜索
 * - 点击行跳转需求详情
 * - 新增按钮跳转创建页
 */
const RequirementsPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<RequirementListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [keyword, setKeyword] = useState('');

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
    setPage(1);
  };

  // 搜索关键词变更
  const handleSearch = (value: string) => {
    setKeyword(value);
    setPage(1);
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

  return (
    <div>
      {/* 操作栏：新增按钮 + 筛选 + 搜索 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Space>
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
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => navigate('/requirements/new')}
        >
          新增需求
        </Button>
      </div>

      {/* 需求列表表格（分页） */}
      <Table<RequirementListItem>
        rowKey="id"
        columns={columns}
        dataSource={data}
        loading={loading}
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