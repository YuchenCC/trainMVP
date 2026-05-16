import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Typography, Button, Table, Space, Card, Select, Spin, message, Empty, Modal, Form, Input, DatePicker, Checkbox, Divider } from 'antd';
import { PlusOutlined, SyncOutlined, CalendarOutlined, EyeOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { trainService } from '../../services/train';
import api from '../../services/api';
import { useAuthStore } from '../../stores/auth';
import { Role } from '@release-train/shared';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

interface TrainItem {
  id: string;
  name: string;
  description?: string;
  systemCount: number;
  scheduleCount: number;
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

interface ScheduleListResponse {
  success: boolean;
  data?: {
    list: ScheduleItem[];
    pagination?: {
      total: number;
      page: number;
      pageSize: number;
    };
  };
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
  
  const [loading, setLoading] = useState(false);
  const [trainLoading, setTrainLoading] = useState(false);
  const [trainList, setTrainList] = useState<TrainItem[]>([]);
  const [selectedTrainId, setSelectedTrainId] = useState<string | undefined>(undefined);
  const [scheduleList, setScheduleList] = useState<ScheduleItem[]>([]);
  const [scheduleTotal, setScheduleTotal] = useState(0);
  
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
  const loadTrainList = useCallback(async () => {
    setTrainLoading(true);
    try {
      const res = await trainService.list({ pageSize: 100 });
      if (res.success && res.data) {
        setTrainList(res.data.list);
      }
    } catch (error) {
      console.error('加载火车列表失败:', error);
      message.error('加载火车列表失败');
    } finally {
      setTrainLoading(false);
    }
  }, []);

  // 加载班次列表
  const loadScheduleList = useCallback(async (trainId: string) => {
    setLoading(true);
    try {
      const response = await api.get<ScheduleListResponse>(`/trains/${trainId}/schedules`);
      const res = response.data;
      if (res.success && res.data) {
        setScheduleList(res.data.list || []);
        setScheduleTotal(res.data.pagination?.total || res.data.list?.length || 0);
      } else {
        setScheduleList([]);
        setScheduleTotal(0);
      }
    } catch (error) {
      console.error('加载班次列表失败:', error);
      message.error('加载班次列表失败');
      setScheduleList([]);
      setScheduleTotal(0);
    } finally {
      setLoading(false);
    }
  }, []);

  // 初始化
  useEffect(() => {
    loadTrainList();
  }, [loadTrainList]);

  // 当火车列表加载完成后，选中第一个
  useEffect(() => {
    if (trainList.length > 0 && !selectedTrainId) {
      setSelectedTrainId(trainList[0].id);
    }
  }, [trainList, selectedTrainId]);

  // 火车切换时加载班次列表
  useEffect(() => {
    if (selectedTrainId) {
      loadScheduleList(selectedTrainId);
    }
  }, [selectedTrainId, loadScheduleList]);

  const handleTrainChange = (trainId: string) => {
    setSelectedTrainId(trainId);
  };

  const handleRefresh = () => {
    loadTrainList();
    if (selectedTrainId) {
      loadScheduleList(selectedTrainId);
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
        name: values.name,
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
        loadTrainList();
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
        loadTrainList();
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

  const selectedTrain = trainList.find(t => t.id === selectedTrainId);

  // 班次列表列定义
  const scheduleColumns: ColumnsType<ScheduleItem> = [
    {
      title: '班次名称',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record) => (
        <a onClick={() => navigate(`/trains/${selectedTrainId}/schedules/${record.id}`)}>{name}</a>
      ),
    },
    {
      title: '开始日期',
      dataIndex: 'startDate',
      key: 'startDate',
      width: 110,
      render: (date: string) => date ? dayjs(date).format('YYYY-MM-DD') : '-',
    },
    {
      title: '结束日期',
      dataIndex: 'endDate',
      key: 'endDate',
      width: 110,
      render: (date: string) => date ? dayjs(date).format('YYYY-MM-DD') : '-',
    },
    {
      title: '统一投产日',
      dataIndex: 'releaseDate',
      key: 'releaseDate',
      width: 110,
      render: (date: string) => date ? dayjs(date).format('YYYY-MM-DD') : '-',
    },
    {
      title: '搭载系统',
      dataIndex: 'systemCount',
      key: 'systemCount',
      width: 90,
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

  return (
    <div>
      {/* 顶部操作栏 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>版本火车</Title>
        <Space>
          <Button icon={<SyncOutlined spin={loading || trainLoading} />} onClick={handleRefresh}>
            刷新
          </Button>
          {canCreateTrain && (
            <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/trains/new')}>
              创建火车
            </Button>
          )}
        </Space>
      </div>

      {/* 火车选择器 */}
      <Card style={{ marginBottom: 16 }}>
        <Space size="large" wrap>
          <Space>
            <Text type="secondary">选择火车：</Text>
            <Select
              value={selectedTrainId}
              onChange={handleTrainChange}
              style={{ width: 280 }}
              placeholder="请选择火车"
              showSearch
              optionFilterProp="children"
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
              loading={trainLoading}
              options={trainList.map(train => ({
                value: train.id,
                label: train.name,
              }))}
            />
          </Space>
          {selectedTrain && (
            <Space>
              <Button 
                size="small" 
                icon={<EyeOutlined />}
                onClick={() => navigate(`/trains/${selectedTrainId}`)}
              >
                查看火车
              </Button>
              {canCreateTrain && (
                <Button 
                  size="small" 
                  icon={<EditOutlined />}
                  onClick={() => navigate(`/trains/${selectedTrainId}/edit`)}
                >
                  编辑火车
                </Button>
              )}
            </Space>
          )}
          {selectedTrain && (
            <>
              <Text type="secondary">|</Text>
              <Text type="secondary">
                搭载系统: {selectedTrain.systemCount}
              </Text>
              <Text type="secondary">|</Text>
              <Text type="secondary">
                班次: {selectedTrain.scheduleCount}
              </Text>
            </>
          )}
        </Space>
      </Card>

      {/* 班次列表 */}
      <Card bodyStyle={{ padding: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid #f0f0f0', background: '#fafafa' }}>
          <Text strong>
            {selectedTrain ? `「${selectedTrain.name}」班次列表` : '请选择火车'}
          </Text>
          {canCreateTrain && selectedTrain && (
            <Button 
              type="primary" 
              size="small" 
              icon={<CalendarOutlined />}
              onClick={handleCreateSchedule}
            >
              创建班次
            </Button>
          )}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 60 }}>
            <Spin size="large" />
          </div>
        ) : scheduleList.length === 0 ? (
          <Empty 
            image={Empty.PRESENTED_IMAGE_SIMPLE} 
            description={
              selectedTrain 
                ? '暂无班次，请先创建班次' 
                : '请先选择火车'
            }
            style={{ padding: 60 }}
          >
            {canCreateTrain && selectedTrain && (
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
            loading={loading}
            pagination={{
              pageSize: 20,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total) => `共 ${total} 条`,
            }}
            locale={{ emptyText: '暂无班次数据' }}
          />
        )}
      </Card>
      
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
            rules={[{ required: true, message: '请输入班次名称' }]}
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
            rules={[{ required: true, message: '请输入班次名称' }]}
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
