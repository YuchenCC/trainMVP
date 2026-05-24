import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Typography,
  Button,
  Table,
  Space,
  Card,
  Spin,
  message,
  Empty,
  Tag,
  Pagination,
  Modal,
  Form,
  Input,
  DatePicker,
  Checkbox,
  Select,
  Divider,
} from 'antd';
import {
  PlusOutlined,
  SyncOutlined,
  EditOutlined,
  ArrowLeftOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import api from '../../../services/api';
import { TrainScheduleStatus, TRAIN_SCHEDULE_STATUS_LABELS } from '@release-train/shared';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { Option } = Select;

interface ScheduleItem {
  id: string;
  trainId: string;
  trainName: string;
  name: string;
  startDate: string | null;
  endDate: string | null;
  releaseDate: string | null;
  boardingDate: string | null;
  lockdownDate: string | null;
  status: TrainScheduleStatus;
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

interface TrainItem {
  id: string;
  name: string;
}

const SchedulesPage: React.FC = () => {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [scheduleList, setScheduleList] = useState<ScheduleItem[]>([]);
  const [trainList, setTrainList] = useState<TrainItem[]>([]);
  const [selectedTrainId, setSelectedTrainId] = useState<string | undefined>();
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0 });

  const [editModalVisible, setEditModalVisible] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<ScheduleDetail | null>(null);
  const [editForm] = Form.useForm();
  const [editIsManual, setEditIsManual] = useState(false);
  const [editPreviewDates, setEditPreviewDates] = useState<any>(null);
  const [editCustomDates, setEditCustomDates] = useState<CustomKeyDate[]>([]);

  // 新增班次弹窗
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createForm] = Form.useForm();

  const loadTrainList = useCallback(async () => {
    try {
      const res = await api.get('/trains', { params: { page: 1, pageSize: 1000 } });
      if (res.data.success && res.data.data) {
        setTrainList(res.data.data.list);
      }
    } catch (error) {
      console.error('加载火车列表失败:', error);
    }
  }, []);

  const loadScheduleList = useCallback(async (page = 1, pageSize = 20) => {
    setLoading(true);
    try {
      let response;
      
      if (selectedTrainId) {
        response = await api.get(`/trains/${selectedTrainId}/schedules`);
      } else {
        response = await api.get('/schedules', { params: { page, pageSize } });
      }
      
      const res = response.data;
      if (res.success) {
        setScheduleList(res.data.list || []);
        if (selectedTrainId) {
          setPagination({ page: 1, pageSize: 20, total: res.data.list?.length || 0 });
        } else {
          setPagination(res.data.pagination);
        }
      } else {
        setScheduleList([]);
        setPagination({ page: 1, pageSize: 20, total: 0 });
      }
    } catch (error) {
      console.error('加载班次列表失败:', error);
      message.error('加载班次列表失败');
      setScheduleList([]);
      setPagination({ page: 1, pageSize: 20, total: 0 });
    } finally {
      setLoading(false);
    }
  }, [selectedTrainId]);

  useEffect(() => {
    loadTrainList();
  }, [loadTrainList]);

  useEffect(() => {
    loadScheduleList(pagination.page, pagination.pageSize);
  }, [loadScheduleList, pagination.page, pagination.pageSize]);

  const handleRefresh = () => {
    loadScheduleList(pagination.page, pagination.pageSize);
  };

  const handlePageChange = (page: number, pageSize: number) => {
    setPagination(prev => ({ ...prev, page, pageSize }));
  };

  const handleTrainChange = async (trainId: string | undefined) => {
    setSelectedTrainId(trainId);
    setPagination(prev => ({ ...prev, page: 1 }));
    
    // 直接调用 API
    setLoading(true);
    try {
      let response;
      if (trainId) {
        response = await api.get(`/trains/${trainId}/schedules`);
      } else {
        response = await api.get('/schedules', { params: { page: 1, pageSize: 20 } });
      }
      const res = response.data;
      if (res.success) {
        setScheduleList(res.data.list || []);
        if (trainId) {
          setPagination({ page: 1, pageSize: 20, total: res.data.list?.length || 0 });
        } else {
          setPagination(res.data.pagination);
        }
      } else {
        setScheduleList([]);
        setPagination({ page: 1, pageSize: 20, total: 0 });
      }
    } catch (error) {
      console.error('加载班次列表失败:', error);
      message.error('加载班次列表失败');
      setScheduleList([]);
      setPagination({ page: 1, pageSize: 20, total: 0 });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: TrainScheduleStatus) => {
    const colorMap: Record<string, string> = {
      PLANNING: 'blue',
      IN_PROGRESS: 'processing',
      LOCKED_DOWN: 'orange',
      RELEASED: 'green',
    };
    return colorMap[status] || 'default';
  };

  const getStatusText = (status: TrainScheduleStatus) => {
    return TRAIN_SCHEDULE_STATUS_LABELS[status] || status;
  };

  const handleEditSchedule = async (record: ScheduleItem) => {
    try {
      const res = await api.get(`/trains/${record.trainId}/schedules/${record.id}`);
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

  const handleEditSubmit = async (values: any) => {
    if (!editingSchedule) return;
    setModalLoading(true);
    try {
      const res = await api.put(`/trains/${editingSchedule.trainId}/schedules/${editingSchedule.id}`, {
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
        loadScheduleList(pagination.page, pagination.pageSize);
      } else {
        message.error(res.data.message || '更新失败');
      }
    } catch (err: any) {
      message.error(err?.response?.data?.message || err?.message || '更新失败');
    } finally {
      setModalLoading(false);
    }
  };

  const handleAddCustomDate = () => {
    setEditCustomDates([...editCustomDates, { name: '', date: null }]);
  };

  const handleUpdateCustomDate = (index: number, field: keyof CustomKeyDate, value: any) => {
    const dates = [...editCustomDates];
    dates[index] = { ...dates[index], [field]: value };
    setEditCustomDates(dates);
  };

  const handleRemoveCustomDate = (index: number) => {
    const dates = [...editCustomDates];
    dates.splice(index, 1);
    setEditCustomDates(dates);
  };

  const scheduleColumns: ColumnsType<ScheduleItem> = [
    {
      title: '班次名称',
      dataIndex: 'name',
      key: 'name',
      width: 180,
      render: (name: string) => name || '-',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: TrainScheduleStatus) => (
        <Tag color={getStatusColor(status)}>{getStatusText(status)}</Tag>
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
      title: '纳版截止',
      dataIndex: 'boardingDate',
      key: 'boardingDate',
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
      width: 320,
      render: (_, record) => (
        <Space size={0}>
          {record.status === 'PLANNING' && (
            <Button type="link" size="small" onClick={() => handleChangeStatus(record, 'IN_PROGRESS')}>
              开始
            </Button>
          )}
          {record.status === 'IN_PROGRESS' && (
            <Button type="link" size="small" onClick={() => handleLockdown(record)}>
              封板
            </Button>
          )}
          {record.status === 'LOCKED_DOWN' && (
            <Button type="link" size="small" onClick={() => handleChangeStatus(record, 'RELEASED')}>
              投产
            </Button>
          )}
          {record.status !== 'RELEASED' && (
            <Button type="link" size="small" danger onClick={() => handleCancelSchedule(record)}>
              取消
            </Button>
          )}
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEditSchedule(record)}>
            编辑
          </Button>
        </Space>
      ),
    },
  ];

  const handleChangeStatus = async (record: ScheduleItem, status: string) => {
    const labelMap: Record<string, string> = {
      IN_PROGRESS: '进行中',
      LOCKED_DOWN: '封板',
      RELEASED: '投产',
    };
    Modal.confirm({
      title: '确认变更状态',
      content: `确定将班次状态变更为「${labelMap[status]}」？`,
      onOk: async () => {
        try {
          await api.post(`/trains/${record.trainId}/schedules/${record.id}/status`, { status });
          message.success('状态变更成功');
          loadScheduleList();
          loadTrainList();
        } catch (err: any) {
          message.error(err?.message || '状态变更失败');
        }
      },
    });
  };

  const handleLockdown = async (record: ScheduleItem) => {
    Modal.confirm({
      title: '确认封板',
      content: '封板后将设置为当前日期，确定继续？',
      onOk: async () => {
        try {
          await api.post(`/trains/${record.trainId}/schedules/${record.id}/status`, { status: 'LOCKED_DOWN' });
          message.success('封板成功');
          loadTrainList();
          loadScheduleList();
        } catch (err: any) {
          message.error(err?.message || '封板失败');
        }
      },
    });
  };

  const handleCancelSchedule = async (record: ScheduleItem) => {
    Modal.confirm({
      title: '确认取消班次',
      content: `确定取消班次「${record.name || '未命名'}」？取消后，已纳版的需求将被移除并恢复为就绪状态。`,
      onOk: async () => {
        try {
          await api.delete(`/trains/${record.trainId}/schedules/${record.id}`);
          message.success('取消成功');
          loadTrainList();
          loadScheduleList();
        } catch (err: any) {
          message.error(err?.message || '取消失败');
        }
      },
    });
  };

  const handleCreateSchedule = () => {
    createForm.resetFields();
    setCreateModalVisible(true);
  };

  const handleCreateSubmit = async (values: any) => {
    setCreateLoading(true);
    try {
      await api.post(`/trains/${selectedTrainId}/schedules`, {
        name: values.name || undefined,
        startDate: values.startDate.format('YYYY-MM-DD'),
        endDate: values.endDate.format('YYYY-MM-DD'),
      });
      message.success('班次创建成功');
      setCreateModalVisible(false);
      loadScheduleList();
      loadTrainList();
    } catch (err: any) {
      message.error(err?.message || '创建失败');
    } finally {
      setCreateLoading(false);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>班次列表</Title>
        <Space>
          <Button icon={<SyncOutlined spin={loading} />} onClick={handleRefresh}>
            刷新
          </Button>
          <Button onClick={() => navigate('/trains')}>
            火车列表
          </Button>
        </Space>
      </div>

      <Card style={{ marginBottom: 16 }}>
        <Space size="large">
          <Space>
            <Text type="secondary">所属火车：</Text>
            <Select
              value={selectedTrainId}
              onChange={handleTrainChange}
              style={{ width: 250 }}
              placeholder="全部火车"
              allowClear
            >
              {trainList.map(train => (
                <Option key={train.id} value={train.id}>{train.name}</Option>
              ))}
            </Select>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => {
              if (!selectedTrainId) { message.warning('请先选择所属火车'); return; }
              handleCreateSchedule();
            }}>
              新增班次
            </Button>
          </Space>
        </Space>
      </Card>

      <Card bodyStyle={{ padding: 0 }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 60 }}>
            <Spin size="large" />
          </div>
        ) : scheduleList.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="暂无班次"
            style={{ padding: 60 }}
          />
        ) : (
          <>
            <Table
              columns={scheduleColumns}
              dataSource={scheduleList}
              rowKey="id"
              pagination={false}
              scroll={{ x: 1400 }}
              onRow={(record) => ({
                onClick: () => navigate(`/trains/${record.trainId}/schedules/${record.id}`),
                style: { cursor: 'pointer' },
              })}
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
          >
            <Input placeholder="请输入班次名称" />
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
            <Button type="link" onClick={handleEditPreviewDates} style={{ padding: 0 }}>
              预览关键日期
            </Button>
          )}

          {editIsManual && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
                <Form.Item name="boardingDate" label="纳版截止日期">
                  <DatePicker style={{ width: '100%' }} />
                </Form.Item>
                <Form.Item name="lockdownDate" label="封板日期">
                  <DatePicker style={{ width: '100%' }} />
                </Form.Item>
                <Form.Item name="releaseDate" label="统一投产日">
                  <DatePicker style={{ width: '100%' }} />
                </Form.Item>
              </div>

              <Divider>自定义关键日期</Divider>

              {editCustomDates.map((date, index) => (
                <div key={index} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                  <Input
                    placeholder="日期名称"
                    value={date.name}
                    onChange={(e) => handleUpdateCustomDate(index, 'name', e.target.value)}
                    style={{ width: 150 }}
                  />
                  <DatePicker
                    value={date.date ? dayjs(date.date) : null}
                    onChange={(date, dateString) => handleUpdateCustomDate(index, 'date', dateString)}
                    style={{ flex: 1 }}
                  />
                  <Button type="link" danger onClick={() => handleRemoveCustomDate(index)}>
                    删除
                  </Button>
                </div>
              ))}

              <Button type="dashed" onClick={handleAddCustomDate} style={{ width: '100%' }}>
                + 添加自定义日期
              </Button>
            </>
          )}

          <Form.Item style={{ marginTop: 16, marginBottom: 0 }}>
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button onClick={() => setEditModalVisible(false)}>取消</Button>
              <Button type="primary" htmlType="submit" loading={modalLoading}>
                保存
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* 新增班次弹窗 */}
      <Modal
        title="新增班次"
        open={createModalVisible}
        onCancel={() => setCreateModalVisible(false)}
        confirmLoading={createLoading}
        onOk={() => createForm.submit()}
        okText="创建"
        cancelText="取消"
      >
        <Form form={createForm} layout="vertical" onFinish={handleCreateSubmit}>
          <Form.Item name="name" label="班次名称">
            <Input placeholder="可选，如 铁胆火车侠-第3班" />
          </Form.Item>
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
        </Form>
      </Modal>
    </div>
  );
};

export default SchedulesPage;
