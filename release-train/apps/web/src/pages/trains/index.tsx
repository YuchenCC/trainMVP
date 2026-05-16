import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Typography, Button, Table, Tag, Space, Card, Badge, message } from 'antd';
import { PlusOutlined, SyncOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { trainService } from '../../services/train';
import { useAuthStore } from '../../stores/auth';
import { Role, Operation, TrainItem, TrainStatus, TRAIN_STATUS_OPTIONS, TrainListResponse } from '@release-train/shared';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

const STATUS_COLORS: Record<string, string> = {
  [TrainStatus.PLANNING]: 'blue',
  [TrainStatus.IN_PROGRESS]: 'processing',
  [TrainStatus.COMPLETED]: 'success',
  [TrainStatus.CANCELLED]: 'default',
};

const TrainsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, checkPermission } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [trains, setTrains] = useState<TrainItem[]>([]);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
  const [statusFilter, setStatusFilter] = useState<TrainStatus | undefined>(undefined);

  const canCreate = user?.role === Role.TRAIN_ADMIN ||
    user?.role === Role.SUPER_ADMIN ||
    checkPermission(Operation.CREATE_TRAIN);

  const fetchTrains = async (page = 1, pageSize = 10) => {
    setLoading(true);
    try {
      const res = await trainService.list({
        page,
        pageSize,
        status: statusFilter,
      });
      if (res.success && res.data) {
        setTrains(res.data.list);
        setPagination({
          current: res.data.pagination.page,
          pageSize: res.data.pagination.pageSize,
          total: res.data.pagination.total,
        });
      }
    } catch (error) {
      message.error('加载火车列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrains();
  }, [statusFilter]);

  const handleTableChange = (paginationConfig: { current?: number; pageSize?: number }) => {
    fetchTrains(paginationConfig.current, paginationConfig.pageSize);
  };

  const columns: ColumnsType<TrainItem> = [
    {
      title: '火车名称',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record) => (
        <a onClick={() => navigate(`/trains/${record.id}`)}>{name}</a>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: TrainStatus) => {
        const option = TRAIN_STATUS_OPTIONS.find(o => o.value === status);
        return <Tag color={STATUS_COLORS[status]}>{option?.label || status}</Tag>;
      },
    },
    {
      title: '搭载系统数',
      dataIndex: 'systemCount',
      key: 'systemCount',
      width: 100,
      align: 'center',
      render: (count: number) => <Badge count={count} showZero color="#3b82f6" />,
    },
    {
      title: '总容量',
      dataIndex: 'totalCapacity',
      key: 'totalCapacity',
      width: 100,
      align: 'right',
      render: (capacity: number) => capacity || 0,
    },
    {
      title: '已用容量',
      dataIndex: 'usedCapacity',
      key: 'usedCapacity',
      width: 100,
      align: 'right',
      render: (used: number) => {
        const color = used >= 90 ? '#ef4444' : undefined;
        return <Text style={{ color }}>{used || 0}</Text>;
      },
    },
    {
      title: '剩余容量',
      dataIndex: 'remainingCapacity',
      key: 'remainingCapacity',
      width: 100,
      align: 'right',
      render: (remaining: number) => <Text type="secondary">{remaining || 0}</Text>,
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 160,
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      render: (_, record) => (
        <Space>
          <Button type="link" size="small" onClick={() => navigate(`/trains/${record.id}`)}>
            查看
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={4} style={{ margin: 0 }}>版本火车</Title>
        <Space>
          <Button icon={<SyncOutlined spin={loading} />} onClick={() => fetchTrains()}>
            刷新
          </Button>
          {canCreate && (
            <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/trains/new')}>
              创建火车
            </Button>
          )}
        </Space>
      </div>

      <Card bodyStyle={{ padding: 0 }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #f0f0f0' }}>
          <Space>
            <Text type="secondary">状态筛选：</Text>
            <Tag
              color={!statusFilter ? 'blue' : 'default'}
              style={{ cursor: 'pointer' }}
              onClick={() => setStatusFilter(undefined)}
            >
              全部
            </Tag>
            {TRAIN_STATUS_OPTIONS.map(opt => (
              <Tag
                key={opt.value}
                color={statusFilter === opt.value ? opt.color || 'blue' : 'default'}
                style={{ cursor: 'pointer' }}
                onClick={() => setStatusFilter(opt.value as TrainStatus)}
              >
                {opt.label}
              </Tag>
            ))}
          </Space>
        </div>

        <Table
          columns={columns}
          dataSource={trains}
          rowKey="id"
          loading={loading}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条`,
          }}
          onChange={handleTableChange}
        />
      </Card>
    </div>
  );
};

export default TrainsPage;
