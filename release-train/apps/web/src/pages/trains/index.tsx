import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Button,
  Table,
  Space,
  Spin,
  message,
  Empty,
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
import { useTourStore } from '../../tour/store';
import { Role } from '@release-train/shared';
import { AppPageHeader, DataCard } from '../../components/common';

interface TrainListItem {
  id: string;
  name: string;
  description?: string;
  systemCount: number;
  scheduleCount: number;
  totalCapacity: number;
  createdAt: string;
}

const TrainsPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuthStore();
  const { startFeatureTour, checkShouldShowFeatureTour, isActive, clearCompleted } = useTourStore();
  
  // 使用ref避免重复触发
  const hasProcessedTour = useRef(false);

  // 页面首次访问或从帮助按钮跳转时触发导览
  useEffect(() => {
    const timer = setTimeout(() => {
      // 避免重复处理
      if (hasProcessedTour.current) {
        return;
      }
      
      // 检查URL参数是否指定了要启动的导览
      const tourParam = searchParams.get('tour');
      
      // 如果导览已经激活，不要重复启动
      if (isActive) {
        // 如果URL参数还在，清除它并标记已处理
        if (tourParam === 'trains') {
          window.history.replaceState({}, '', window.location.pathname);
          hasProcessedTour.current = true;
        }
        return;
      }
      
      // 如果URL参数指定了导览，则强制启动（即使已完成）
      if (tourParam === 'trains') {
        // 标记已处理
        hasProcessedTour.current = true;
        // 清除已完成标记
        clearCompleted('trains');
        // 启动导览
        startFeatureTour('trains');
        // 立即清除URL参数，避免退出导览后再次启动
        window.history.replaceState({}, '', window.location.pathname);
      } else if (checkShouldShowFeatureTour('trains')) {
        // 否则检查是否应该自动启动（首次访问）
        startFeatureTour('trains');
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [isActive, checkShouldShowFeatureTour, startFeatureTour, searchParams, clearCompleted]);

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
      ellipsis: true,
      render: (name: string, record) => (
        <a 
          onClick={() => navigate(`/trains/${record.id}`)} 
          style={{ 
            display: 'block', 
            overflow: 'hidden', 
            textOverflow: 'ellipsis', 
            whiteSpace: 'nowrap',
            maxWidth: '100%'
          }}
        >
          {name}
        </a>
      ),
    },
    {
      title: '搭载系统',
      dataIndex: 'systemCount',
      key: 'systemCount',
      align: 'center',
      render: (count: number) => count || 0,
    },
    {
      title: '火车容量',
      dataIndex: 'totalCapacity',
      key: 'totalCapacity',
      align: 'center',
      render: (capacity: number) => capacity || 0,
    },
    {
      title: '班次数量',
      dataIndex: 'scheduleCount',
      key: 'scheduleCount',
      align: 'center',
      render: (count: number) => count || 0,
    },
    {
      title: '操作',
      key: 'action',
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
    <div className="rt-page">
      <AppPageHeader
        title="版本火车"
        description="管理发布火车、搭载系统、容量和班次入口。"
        actions={
          <div id="trains-actions">
            <>
            <Button icon={<SyncOutlined spin={loading} />} onClick={handleRefresh}>
              刷新
            </Button>
            <Button icon={<CalendarOutlined />} onClick={() => navigate('/schedules')}>
              班次列表
            </Button>
            {canCreateTrain && (
              <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/trains/new')}>
                创建火车
              </Button>
            )}
            </>
          </div>
        }
      />

      <div id="trains-list">
        <DataCard tableCard>
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
        </DataCard>
      </div>
    </div>
  );
};

export default TrainsPage;
