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
  Form,
  Input,
  DatePicker,
  Checkbox,
  Divider,
  Modal,
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
import api from '../../services/api';
import { useAuthStore } from '../../stores/auth';
import { Role, TrainStatus } from '@release-train/shared';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { Option } = Select;

// 火车列表项类型定义
interface TrainListItem {
  id: string;
  name: string;
  status: TrainStatus;
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

interface ScheduleItem {
  id: string;
  name: string;
  startDate: string | null;
  endDate: string | null;
  releaseDate: string | null;
  boardingDate: string | null;
  lockdownDate: string | null;
  systemCount: number;
  requirementCount: number;
  createdAt: string;
  version: number;
}

interface CustomKeyDate {
  id?: string;
  name: string;
  date: string | null;
}

interface ScheduleDetail {
  id: string;
  trainId: string;
  name: string;
  startDate: string | null;
  endDate: string | null;
  boardingDate: string | null;
  lockdownDate: string | null;
  releaseDate: string | null;
  customKeyDates?: CustomKeyDate[];
  version: number;
}

const TrainsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const canCreateTrain = user?.role === Role.TRAIN_ADMIN || user?.role === Role.SUPER_ADMIN;

  // 火车列表相关状态
  const [loading, setLoading] = useState(false);
  const [trainList, setTrainList] = useState<TrainListItem[]>([]);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0 });
  const [statusFilter, setStatusFilter] = useState<TrainStatus | undefined>();

  // 班次管理相关状态
  const [selectedTrainId, setSelectedTrainId] = useState<string | undefined>();
  const [scheduleList, setScheduleList] = useState<ScheduleItem[]>([]);
  const [scheduleLoading, setScheduleLoading] = useState(false);

  // 模态框状态
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [createForm] = Form.useForm();
  const [editForm] = Form.useForm();
  const [editingSchedule, setEditingSchedule] = useState<ScheduleDetail | null>(null);
  const [createIsManual, setCreateIsManual] = useState(false);
  const [editIsManual, setEditIsManual] = useState(false);
  const [createPreviewDates, setCreatePreviewDates] = useState<any>(null);
  const [editPreviewDates, setEditPreviewDates] = useState<any>(null);
  const [createCustomDates, setCreateCustomDates] = useState<CustomKeyDate[]>([]);
  const [editCustomDates, setEditCustomDates] = useState<CustomKeyDate[]>([]);

  // 加载火车列表
  const loadTrainList = useCallback(async (page = 1, pageSize = 20) => {
    setLoading(true);
    try {
      const res = await trainService.list({
        status: statusFilter,
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
  }, [statusFilter]);

  // 加载班次列表
  const loadScheduleList = useCallback(async (trainId: string) => {
    setScheduleLoading(true);
    try {
      const response = await api.get(`/trains/${trainId}/schedules`);
      const res = response.data;
      if (res.success && res.data) {
        setScheduleList(res.data.list || []);
      } else {
        setScheduleList([]);
      }
    } catch (error) {
      console.error('加载班次列表失败:', error);
      message.error('加载班次列表失败');
      setScheduleList([]);
    } finally {
      setScheduleLoading(false);
    }
  }, []);

  // 初始化和刷新
  useEffect(() => {
    loadTrainList(pagination.page, pagination.pageSize);
  }, [loadTrainList, pagination.page, pagination.pageSize]);

  // 火车切换时加载班次列表
  useEffect(() => {
    if (selectedTrainId) {
      loadScheduleList(selectedTrainId);
    }
  }, [selectedTrainId, loadScheduleList]);

  const handleRefresh = () => {
    loadTrainList(pagination.page, pagination.pageSize);
    if (selectedTrainId) {
      loadScheduleList(selectedTrainId);
    }
  };

  const handleStatusChange = (status: TrainStatus | undefined) => {
    setStatusFilter(status);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handlePageChange = (page: number, pageSize: number) => {
    setPagination(prev => ({ ...prev, page, pageSize }));
  };

  // 状态标签颜色映射
  const getStatusColor = (status: TrainStatus) => {
    switch (status) {
      case TrainStatus.PLANNING:
        return 'blue';
      case TrainStatus.IN_PROGRESS:
        return 'green';
      case TrainStatus.COMPLETED:
        return 'default';
      case TrainStatus.CANCELLED:
        return 'red';
      default:
        return 'default';
    }
  };

  const getStatusText = (status: TrainStatus) => {
    switch (status) {
      case TrainStatus.PLANNING:
        return '计划中';
      case TrainStatus.IN_PROGRESS:
        return '进行中';
      case TrainStatus.COMPLETED:
        return '已完成';
      case TrainStatus.CANCELLED:
        return '已取消';
      default:
        return status;
    }
  };

  // 打开创建班次模态框
  const handleCreateSchedule = () => {
    setCreateModalVisible(true);
    setCreateIsManual(false);
    setCreatePreviewDates(null);
    setCreateCustomDates([]);
    createForm.resetFields();
  };

  // 添加自定义关键日期
  const handleAddCustomDate = (type: 'create' | 'edit') => {
    if (type === 'create') {
      setCreateCustomDates([...createCustomDates, { name: '', date: null }]);
    } else {
      setEditCustomDates([...editCustomDates, { name: '', date: null }]);
    }
  };

  // 更新自定义关键日期
  const handleUpdateCustomDate = (type: 'create' | 'edit', index: number, field: keyof CustomKeyDate, value: any) => {
    const dates = type === 'create' ? [...createCustomDates] : [...editCustomDates];
    dates[index] = { ...dates[index], [field]: value };
    if (type === 'create') {
      setCreateCustomDates(dates);
    } else {
      setEditCustomDates(dates);
    }
  };

  // 删除自定义关键日期
  const handleRemoveCustomDate = (type: 'create' | 'edit', index: number) => {
    const dates = type === 'create' ? [...createCustomDates] : [...editCustomDates];
    dates.splice(index, 1);
    if (type === 'create') {
      setCreateCustomDates(dates);
    } else {
      setEditCustomDates(dates);
    }
  };

  // 预览创建班次的关键日期
  const handleCreatePreviewDates = async () => {
    try {
      const values = await createForm.validateFields(['startDate', 'endDate']);
      const res = await api.post('/trains/schedules/preview', {
        startDate: values.startDate.format('YYYY-MM-DD'),
        endDate: values.endDate.format('YYYY-MM-DD'),
      });
      if (res.data.success) {
        setCreatePreviewDates(res.data.data);
        createForm.setFieldsValue({
          boardingDate: dayjs(res.data.data.boardingDate),
          lockdownDate: dayjs(res.data.data.lockdownDate),
          releaseDate: dayjs(res.data.data.releaseDate),
        });
      }
    } catch (err: any) {
      message.error(err?.response?.data?.message || '获取关键日期失败');
    }
  };

  // 提交创建班次
  const handleCreateSubmit = async (values: any) => {
    if (!selectedTrainId) return;
    setModalLoading(true);
    try {
      const res = await api.post(`/trains/${selectedTrainId}/schedules`, {
        ...(values.name && values.name.trim() ? { name: values.name.trim() } : {}),
        startDate: values.startDate.format('YYYY-MM-DD'),
        endDate: values.endDate.format('YYYY-MM-DD'),
        boardingDate: values.boardingDate?.format('YYYY-MM-DD'),
        lockdownDate: values.lockdownDate?.format('YYYY-MM-DD'),
        releaseDate: values.releaseDate?.format('YYYY-MM-DD'),
        customKeyDates: createCustomDates.map(d => ({
          name: d.name,
          date: d.date ? dayjs(d.date).format('YYYY-MM-DD') : null,
        })),
      });

      if (res.data.success) {
        message.success('创建成功');
        setCreateModalVisible(false);
        setCreateCustomDates([]);
        createForm.resetFields();
        // 刷新列表
        loadTrainList(pagination.page, pagination.pageSize);
        loadScheduleList(selectedTrainId);
      } else {
        message.error(res.data.message || '创建失败');
      }
    } catch (err: any) {
      message.error(err?.response?.data?.message || err?.message || '创建失败');
    } finally {
      setModalLoading(false);
    }
  };

  // 打开编辑班次模态框
  const handleEditSchedule = async (record: ScheduleItem) => {
    if (!selectedTrainId) return;
    try {
      const res = await api.get(`/trains/${selectedTrainId}/schedules/${record.id}`);
      if (res.data.success) {
        const schedule = res.data.data;
        setEditingSchedule(schedule);
        setEditIsManual(false);
        setEditPreviewDates(null);
        setEditCustomDates(schedule.customKeyDates || []);
        editForm.setFieldsValue({
          name: schedule.name,
          startDate: schedule.startDate ? dayjs(schedule.startDate) : null,
          endDate: schedule.endDate ? dayjs(schedule.endDate) : null,
          boardingDate: schedule.boardingDate ? dayjs(schedule.boardingDate) : null,
          lockdownDate: schedule.lockdownDate ? dayjs(schedule.lockdownDate) : null,
          releaseDate: schedule.releaseDate ? dayjs(schedule.releaseDate) : null,
          isManual: false,
        });
        setEditModalVisible(true);
      }
    } catch (err: any) {
      message.error(err?.response?.data?.message || err?.message || '加载班次详情失败');
    }
  };

  // 预览编辑班次的关键日期
  const handleEditPreviewDates = async () => {
    try {
      const values = await editForm.validateFields(['startDate', 'endDate']);
      const res = await api.post('/trains/schedules/preview', {
        startDate: values.startDate.format('YYYY-MM-DD'),
        endDate: values.endDate.format('YYYY-MM-DD'),
      });
      if (res.data.success) {
        setEditPreviewDates(res.data.data);
        editForm.setFieldsValue({
          boardingDate: dayjs(res.data.data.boardingDate),
          lockdownDate: dayjs(res.data.data.lockdownDate),
          releaseDate: dayjs(res.data.data.releaseDate),
        });
      }
    } catch (err: any) {
      message.error(err?.response?.data?.message || '获取关键日期失败');
    }
  };

  // 提交编辑班次
  const handleEditSubmit = async (values: any) => {
    if (!selectedTrainId || !editingSchedule) return;
    setModalLoading(true);
    try {
      const res = await api.put(`/trains/${selectedTrainId}/schedules/${editingSchedule.id}`, {
        name: values.name,
        startDate: values.startDate ? values.startDate.format('YYYY-MM-DD') : null,
        endDate: values.endDate ? values.endDate.format('YYYY-MM-DD') : null,
        boardingDate: values.boardingDate ? values.boardingDate.format('YYYY-MM-DD') : null,
        lockdownDate: values.lockdownDate ? values.lockdownDate.format('YYYY-MM-DD') : null,
        releaseDate: values.releaseDate ? values.releaseDate.format('YYYY-MM-DD') : null,
        customKeyDates: editCustomDates.map(d => ({
          id: d.id,
          name: d.name,
          date: d.date ? dayjs(d.date).format('YYYY-MM-DD') : null,
        })),
        version: editingSchedule.version,
      });

      if (res.data.success) {
        message.success('更新成功');
        setEditModalVisible(false);
        setEditCustomDates([]);
        // 刷新列表
        loadTrainList(pagination.page, pagination.pageSize);
        loadScheduleList(selectedTrainId);
      } else {
        message.error(res.data.message || '更新失败');
      }
    } catch (err: any) {
      message.error(err?.response?.data?.message || err?.message || '更新失败');
    } finally {
      setModalLoading(false);
    }
  };

  // 火车列表列定义
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
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: TrainStatus) => (
        <Tag color={getStatusColor(status)}>{getStatusText(status)}</Tag>
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
          {canCreateTrain && record.status === TrainStatus.PLANNING && (
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
              <Button
                type="link"
                size="small"
                icon={<CalendarOutlined />}
                onClick={() => {
                  setSelectedTrainId(record.id);
                  handleCreateSchedule();
                }}
              >
                创建班次
              </Button>
            </>
          )}
          {canCreateTrain && record.status === TrainStatus.IN_PROGRESS && (
            <Button
              type="link"
              size="small"
              icon={<CheckCircleOutlined />}
              onClick={async () => {
                try {
                  await trainService.completeTrain(record.id);
                  message.success('火车已完成');
                  loadTrainList(pagination.page, pagination.pageSize);
                } catch (err: any) {
                  message.error(err?.response?.data?.message || '完成失败');
                }
              }}
            >
              完成
            </Button>
          )}
          {canCreateTrain && (
            <Button
              type="link"
              size="small"
              onClick={() => setSelectedTrainId(record.id)}
            >
              管理班次
            </Button>
          )}
        </Space>
      ),
    },
  ];

  // 班次列表列定义
  const scheduleColumns: ColumnsType<ScheduleItem> = [
    {
      title: '班次名称',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record) => (
        <a onClick={() => navigate(`/trains/${selectedTrainId}/schedules/${record.id}`)}>
          {name}
        </a>
      ),
    },
    {
      title: '开始日期',
      dataIndex: 'startDate',
      key: 'startDate',
      width: 110,
      render: (date: string) => (date ? dayjs(date).format('YYYY-MM-DD') : '-'),
    },
    {
      title: '结束日期',
      dataIndex: 'endDate',
      key: 'endDate',
      width: 110,
      render: (date: string) => (date ? dayjs(date).format('YYYY-MM-DD') : '-'),
    },
    {
      title: '统一投产日',
      dataIndex: 'releaseDate',
      key: 'releaseDate',
      width: 110,
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
      title: '已纳版',
      dataIndex: 'requirementCount',
      key: 'requirementCount',
      width: 80,
      align: 'center',
      render: (count: number) => count || 0,
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
      width: 80,
      render: (_, record) => (
        <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEditSchedule(record)}>
          编辑
        </Button>
      ),
    },
  ];

  const selectedTrain = trainList.find(t => t.id === selectedTrainId);

  return (
    <div>
      {/* 顶部操作栏 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>版本火车</Title>
        <Space>
          <Button icon={<SyncOutlined spin={loading} />} onClick={handleRefresh}>
            刷新
          </Button>
          {canCreateTrain && (
            <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/trains/new')}>
              创建火车
            </Button>
          )}
        </Space>
      </div>

      {/* 筛选区域 */}
      <Card style={{ marginBottom: 16 }}>
        <Space size="large">
          <Space>
            <Text type="secondary">状态：</Text>
            <Select
              value={statusFilter}
              onChange={handleStatusChange}
              style={{ width: 150 }}
              placeholder="全部"
              allowClear
            >
              <Option value={TrainStatus.PLANNING}>计划中</Option>
              <Option value={TrainStatus.IN_PROGRESS}>进行中</Option>
              <Option value={TrainStatus.COMPLETED}>已完成</Option>
              <Option value={TrainStatus.CANCELLED}>已取消</Option>
            </Select>
          </Space>
        </Space>
      </Card>

      {/* 火车列表 */}
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

      {/* 班次管理区域 */}
      {selectedTrainId && (
        <Card
          title={
            <Space>
              <CalendarOutlined />
              <span>{selectedTrain?.name} - 班次管理</span>
            </Space>
          }
          extra={
            <Space>
              <Button onClick={() => setSelectedTrainId(undefined)}>关闭</Button>
              {canCreateTrain && (
                <Button type="primary" icon={<PlusOutlined />} onClick={handleCreateSchedule}>
                  创建班次
                </Button>
              )}
            </Space>
          }
          bodyStyle={{ padding: 0 }}
        >
          {scheduleLoading ? (
            <div style={{ textAlign: 'center', padding: 60 }}>
              <Spin size="large" />
            </div>
          ) : scheduleList.length === 0 ? (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="暂无班次"
              style={{ padding: 60 }}
            >
              {canCreateTrain && (
                <Button type="primary" onClick={handleCreateSchedule}>
                  创建班次
                </Button>
              )}
            </Empty>
          ) : (
            <Table
              columns={scheduleColumns}
              dataSource={scheduleList}
              rowKey="id"
              pagination={false}
            />
          )}
        </Card>
      )}

      {/* 创建班次模态框 */}
      <Modal
        title="创建班次"
        open={createModalVisible}
        onCancel={() => setCreateModalVisible(false)}
        footer={null}
        width={600}
      >
        <Form
          form={createForm}
          layout="vertical"
          onFinish={handleCreateSubmit}
          initialValues={{ isManual: false }}
        >
          <Form.Item
            name="name"
            label="班次名称"
            extra={`可选，不填将自动生成：${selectedTrain?.name || '[火车名称]'} - 第${scheduleList.length + 1}班`}
          >
            <Input placeholder="请输入班次名称（可选）" />
          </Form.Item>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Form.Item
              name="startDate"
              label="开始日期"
              rules={[{ required: true, message: '请选择开始日期' }]}
            >
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item
              name="endDate"
              label="结束日期"
              rules={[{ required: true, message: '请选择结束日期' }]}
            >
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
          </div>

          <Form.Item name="isManual" valuePropName="checked">
            <Checkbox
              checked={createIsManual}
              onChange={(e) => setCreateIsManual(e.target.checked)}
            >
              手动设置关键日期
            </Checkbox>
          </Form.Item>

          {!createIsManual && (
            <Form.Item>
              <Button type="default" onClick={handleCreatePreviewDates}>
                预览并生成关键日期
              </Button>
            </Form.Item>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
            <Form.Item
              name="boardingDate"
              label="统一纳版日"
              rules={[{ required: true, message: '请选择统一纳版日' }]}
            >
              <DatePicker style={{ width: '100%' }} disabled={!createIsManual && !createPreviewDates} />
            </Form.Item>
            <Form.Item
              name="lockdownDate"
              label="统一封板日"
              rules={[{ required: true, message: '请选择统一封板日' }]}
            >
              <DatePicker style={{ width: '100%' }} disabled={!createIsManual && !createPreviewDates} />
            </Form.Item>
            <Form.Item
              name="releaseDate"
              label="统一投产日"
              rules={[{ required: true, message: '请选择统一投产日' }]}
            >
              <DatePicker style={{ width: '100%' }} disabled={!createIsManual && !createPreviewDates} />
            </Form.Item>
          </div>

          {createPreviewDates && !createIsManual && (
            <Card size="small" style={{ marginBottom: 16, background: '#f8fafc' }}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                ⏱️ 系统自动计算的关键日期：
              </Text>
              <div style={{ marginTop: 8, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                <div>📅 纳版: {dayjs(createPreviewDates.boardingDate).format('MM-DD')}</div>
                <div>🔒 封板: {dayjs(createPreviewDates.lockdownDate).format('MM-DD')}</div>
                <div>🚀 投产: {dayjs(createPreviewDates.releaseDate).format('MM-DD')}</div>
              </div>
            </Card>
          )}

          <Divider>自定义关键节点</Divider>

          {createCustomDates.map((customDate, index) => (
            <div key={index} style={{ display: 'flex', gap: 12, marginBottom: 12, alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <Input
                  placeholder="节点名称"
                  value={customDate.name}
                  onChange={(e) => handleUpdateCustomDate('create', index, 'name', e.target.value)}
                />
              </div>
              <div style={{ flex: 1 }}>
                <DatePicker
                  style={{ width: '100%' }}
                  value={customDate.date ? dayjs(customDate.date) : null}
                  onChange={(date) => handleUpdateCustomDate('create', index, 'date', date)}
                />
              </div>
              <Button
                type="text"
                danger
                icon={<DeleteOutlined />}
                onClick={() => handleRemoveCustomDate('create', index)}
              />
            </div>
          ))}

          <Form.Item style={{ marginBottom: 16 }}>
            <Button
              type="dashed"
              icon={<PlusOutlined />}
              onClick={() => handleAddCustomDate('create')}
              block
            >
              添加自定义关键节点
            </Button>
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setCreateModalVisible(false)}>取消</Button>
              <Button type="primary" htmlType="submit" loading={modalLoading}>
                保存
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* 编辑班次模态框 */}
      <Modal
        title="编辑班次"
        open={editModalVisible}
        onCancel={() => setEditModalVisible(false)}
        footer={null}
        width={600}
      >
        <Form
          form={editForm}
          layout="vertical"
          onFinish={handleEditSubmit}
          initialValues={{ isManual: false }}
        >
          <Form.Item
            name="name"
            label="班次名称"
            extra="可选，不填将自动生成"
          >
            <Input placeholder="请输入班次名称（可选）" />
          </Form.Item>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Form.Item
              name="startDate"
              label="开始日期"
              rules={[{ required: true, message: '请选择开始日期' }]}
            >
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item
              name="endDate"
              label="结束日期"
              rules={[{ required: true, message: '请选择结束日期' }]}
            >
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
          </div>

          <Form.Item name="isManual" valuePropName="checked">
            <Checkbox
              checked={editIsManual}
              onChange={(e) => setEditIsManual(e.target.checked)}
            >
              手动设置关键日期
            </Checkbox>
          </Form.Item>

          {!editIsManual && (
            <Form.Item>
              <Button type="default" onClick={handleEditPreviewDates}>
                预览并生成关键日期
              </Button>
            </Form.Item>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
            <Form.Item
              name="boardingDate"
              label="统一纳版日"
              rules={[{ required: true, message: '请选择统一纳版日' }]}
            >
              <DatePicker style={{ width: '100%' }} disabled={!editIsManual && !editPreviewDates} />
            </Form.Item>
            <Form.Item
              name="lockdownDate"
              label="统一封板日"
              rules={[{ required: true, message: '请选择统一封板日' }]}
            >
              <DatePicker style={{ width: '100%' }} disabled={!editIsManual && !editPreviewDates} />
            </Form.Item>
            <Form.Item
              name="releaseDate"
              label="统一投产日"
              rules={[{ required: true, message: '请选择统一投产日' }]}
            >
              <DatePicker style={{ width: '100%' }} disabled={!editIsManual && !editPreviewDates} />
            </Form.Item>
          </div>

          {editPreviewDates && !editIsManual && (
            <Card size="small" style={{ marginBottom: 16, background: '#f8fafc' }}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                ⏱️ 系统自动计算的关键日期：
              </Text>
              <div style={{ marginTop: 8, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                <div>📅 纳版: {dayjs(editPreviewDates.boardingDate).format('MM-DD')}</div>
                <div>🔒 封板: {dayjs(editPreviewDates.lockdownDate).format('MM-DD')}</div>
                <div>🚀 投产: {dayjs(editPreviewDates.releaseDate).format('MM-DD')}</div>
              </div>
            </Card>
          )}

          <Divider>自定义关键节点</Divider>

          {editCustomDates.map((customDate, index) => (
            <div key={index} style={{ display: 'flex', gap: 12, marginBottom: 12, alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <Input
                  placeholder="节点名称"
                  value={customDate.name}
                  onChange={(e) => handleUpdateCustomDate('edit', index, 'name', e.target.value)}
                />
              </div>
              <div style={{ flex: 1 }}>
                <DatePicker
                  style={{ width: '100%' }}
                  value={customDate.date ? dayjs(customDate.date) : null}
                  onChange={(date) => handleUpdateCustomDate('edit', index, 'date', date)}
                />
              </div>
              <Button
                type="text"
                danger
                icon={<DeleteOutlined />}
                onClick={() => handleRemoveCustomDate('edit', index)}
              />
            </div>
          ))}

          <Form.Item style={{ marginBottom: 16 }}>
            <Button
              type="dashed"
              icon={<PlusOutlined />}
              onClick={() => handleAddCustomDate('edit')}
              block
            >
              添加自定义关键节点
            </Button>
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setEditModalVisible(false)}>取消</Button>
              <Button type="primary" htmlType="submit" loading={modalLoading}>
                保存
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default TrainsPage;
