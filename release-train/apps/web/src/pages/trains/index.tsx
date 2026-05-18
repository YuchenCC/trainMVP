import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Typography,
  Button,
  Table,
  Space,
  Card,
  Select,
  Spin,
  message,
  Empty,
  Tag,
  Pagination,
} from 'antd';
import {
  PlusOutlined,
  SyncOutlined,
  CalendarOutlined,
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { trainService } from '../../services/train';
import { useAuthStore } from '../../stores/auth';
import { Role } from '@release-train/shared';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { Option } = Select;

interface TrainListItem {
  id: string;
  name: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  boardingDate?: string;
  lockdownDate?: string;
  releaseDate?: string;
  systemCount: number;
  requirementCount: number;
  createdAt: string;
}

const TrainsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const canCreateTrain = user?.role === Role.TRAIN_ADMIN || user?.role === Role.SUPER_ADMIN;

  const [loading, setLoading] = useState(false);
  const [trainList, setTrainList] = useState<TrainListItem[]>([]);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0 });

  const loadTrainList = useCallback(async (page = 1, pageSize = 20) => {
    setLoading(true);
    try {
      const res = await trainService.list({
        page,
        pageSize,
      });
      if (res.success && res.data) {
        setTrainList(res.data.list);
        setPagination(res.data.pagination);
      }
    } catch (error) {
      console.error('加载火车列表失败:', error);
      message.error('加载火车列表失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTrainList(pagination.page, pagination.pageSize);
  }, [loadTrainList, pagination.page, pagination.pageSize]);

  const handleRefresh = () => {
    loadTrainList(pagination.page, pagination.pageSize);
  };

  const handlePageChange = (page: number, pageSize: number) => {
    setPagination(prev => ({ ...prev, page, pageSize }));
  };

  const trainColumns: ColumnsType<TrainListItem> = [
    {
      title: '火车名称',
      dataIndex: 'name',
      key: 'name',
      width: 200,
      render: (name: string, record) => (
        <a onClick={() => navigate(`/trains/${record.id}`)}>{name}</a>
      ),
    },
    {
      title: '开始时间',
      dataIndex: 'startDate',
      key: 'startDate',
      width: 120,
      render: (date: string) => (date ? dayjs(date).format('YYYY-MM-DD') : '-'),
    },
    {
      title: '结束时间',
      dataIndex: 'endDate',
      key: 'endDate',
      width: 120,
      render: (date: string) => (date ? dayjs(date).format('YYYY-MM-DD') : '-'),
    },
    {
      title: '统一投产日',
      dataIndex: 'releaseDate',
      key: 'releaseDate',
      width: 120,
      render: (date: string) => (date ? dayjs(date).format('YYYY-MM-DD') : '-'),
    },
    {
      title: '搭载系统',
      dataIndex: 'systemCount',
      key: 'systemCount',
      width: 80,
      align: 'center',
      render: (count: number) => count || 0,
    },
    {
      title: '已纳版需求',
      dataIndex: 'requirementCount',
      key: 'requirementCount',
      width: 100,
      align: 'center',
      render: (count: number) => count || 0,
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      fixed: 'right' as const,
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => navigate(`/trains/${record.id}`)}
          >
            查看
          </Button>
          {canCreateTrain && (
            <>
              <Button
                type="link"
                size="small"
                icon={<EditOutlined />}
                onClick={() => navigate(`/trains/${record.id}/edit`)}
              >
                编辑
              </Button>
              <Button
                type="link"
                size="small"
                danger
                icon={<DeleteOutlined />}
                onClick={async () => {
                  try {
                    await trainService.cancel(record.id);
                    message.success('火车已取消');
                    loadTrainList(pagination.page, pagination.pageSize);
                  } catch (err: any) {
                    message.error(err?.response?.data?.message || '取消失败');
                  }
                }}
              >
                取消
              </Button>
            </>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>版本火车</Title>
        <Space>
          <Button icon={<SyncOutlined spin={loading} />} onClick={handleRefresh}>
            刷新
          </Button>
          <Button icon={<CalendarOutlined />} onClick={() => navigate('/trains')}>
            班次列表
          </Button>
          {canCreateTrain && (
            <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/trains/new')}>
              创建火车
            </Button>
          )}
        </Space>
      </div>

      <Card bodyStyle={{ padding: 0 }} style={{ marginBottom: 24 }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 60 }}>
            <Spin size="large" />
          </div>
        ) : trainList.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="暂无版本火车"
            style={{ padding: 60 }}
          >
            {canCreateTrain && (
              <Button type="primary" onClick={() => navigate('/trains/new')}>
                创建火车
              </Button>
            )}
          </Empty>
        ) : (
          <>
            <Table
              columns={trainColumns}
              dataSource={trainList}
              rowKey="id"
              pagination={false}
              scroll={{ x: 1200 }}
            />
            <div style={{ padding: '16px', textAlign: 'right' }}>
              <Pagination
                current={pagination.page}
                pageSize={pagination.pageSize}
                total={pagination.total}
                onChange={handlePageChange}
                showSizeChanger
                showQuickJumper
                showTotal={(total) => `共 ${total} 条`}
              />
            </div>
          </>
        )}
      </Card>
    </div>
  );
};

export default TrainsPage;
