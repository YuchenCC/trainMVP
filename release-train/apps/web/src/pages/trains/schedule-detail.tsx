// ========== 班次详情页面 ==========
// 路由 /trains/schedule-detail，展示班次完整信息
// 包含：班次信息、容量概览、搭载系统、关键节点、纳版管理、操作按钮
// 文件名：schedule-detail.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card, Descriptions, Button, Spin, Result, Typography, Row, Col, message, Table, Calendar, Badge, Modal, Form, Input, DatePicker, Checkbox, Space, Divider, Avatar, List, Progress,
} from 'antd';
import { ArrowLeftOutlined, EditOutlined, CheckCircleOutlined } from '@ant-design/icons';
import {
  PrecheckOnboardResponse,
  RequirementListItem,
} from '@release-train/shared';
import api from '../../services/api';
import { trainService } from '../../services/train';
import dayjs from 'dayjs';

const { Text, Title } = Typography;

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
  createdAt: string;
  train: {
    id: string;
    name: string;
  };
  snapshots: Array<{
    id: string;
    system: { id: string; name: string };
    capacityPoints: number;
    usedPoints: number;
  }>;
}

const ScheduleDetailPage: React.FC = () => {
  const { trainId, scheduleId } = useParams<{ trainId: string; scheduleId: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [schedule, setSchedule] = useState<ScheduleDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 编辑模态框状态
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editModalLoading, setEditModalLoading] = useState(false);
  const [form] = Form.useForm();
  const [isManualMode, setIsManualMode] = useState(false);
  const [previewDates, setPreviewDates] = useState<any>(null);
  const [editCustomDates, setEditCustomDates] = useState<CustomKeyDate[]>([]);

  const fetchSchedule = useCallback(async () => {
    if (!trainId || !scheduleId) {
      setError('参数错误');
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const res = await api.get(`/trains/${trainId}/schedules/${scheduleId}`);
      if (res.data.success) {
        setSchedule(res.data.data);
      } else {
        setError(res.data.message || '加载失败');
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || '加载失败');
    } finally {
      setLoading(false);
    }
  }, [trainId, scheduleId]);

  const handleRefresh = () => {
    fetchSchedule();
  };

  useEffect(() => {
    fetchSchedule();
  }, [fetchSchedule]);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 80 }}>
        <Spin size="large" tip="加载中..." />
      </div>
    );
  }

  if (error || !schedule) {
    return (
      <Result
        status="error"
        title="加载失败"
        subTitle={error || '班次不存在'}
        extra={
          <Button onClick={() => navigate('/trains')}>
            返回火车列表
          </Button>
        }
      />
    );
  }

  const totalCapacity = schedule.snapshots.reduce((sum, s) => sum + s.capacityPoints, 0);
  const totalUsed = schedule.snapshots.reduce((sum, s) => sum + s.usedPoints, 0);

  // 打开编辑模态框
  const handleEdit = () => {
    setEditModalVisible(true);
    setIsManual(false);
    setEditCustomDates(schedule.customKeyDates || []);
    form.setFieldsValue({
      name: schedule.name,
      startDate: schedule.startDate ? dayjs(schedule.startDate) : null,
      endDate: schedule.endDate ? dayjs(schedule.endDate) : null,
      boardingDate: schedule.boardingDate ? dayjs(schedule.boardingDate) : null,
      lockdownDate: schedule.lockdownDate ? dayjs(schedule.lockdownDate) : null,
      releaseDate: schedule.releaseDate ? dayjs(schedule.releaseDate) : null,
    });
  };

  // 手动模式变化
  const handleManualChange = (checked: boolean) => {
    setIsManualMode(checked);
    if (!checked) {
      setPreviewDates(null);
      form.setFieldsValue({
        boardingDate: schedule.boardingDate ? dayjs(schedule.boardingDate) : null,
        lockdownDate: schedule.lockdownDate ? dayjs(schedule.lockdownDate) : null,
        releaseDate: schedule.releaseDate ? dayjs(schedule.releaseDate) : null,
      });
    }
  };

  // 预览关键日期
  const handlePreviewDates = async (values: any) => {
    if (!values.startDate || !values.endDate) {
      message.warning('请先选择开始和结束日期');
      return;
    }

    try {
      const res = await api.get('/trains/key-dates', {
        params: {
          startDate: values.startDate.format('YYYY-MM-DD'),
          endDate: values.endDate.format('YYYY-MM-DD'),
        },
      });
      if (res.data.success) {
        setPreviewDates(res.data.data);
        form.setFieldsValue({
          boardingDate: dayjs(res.data.data.boardingDate),
          lockdownDate: dayjs(res.data.data.lockdownDate),
          releaseDate: dayjs(res.data.data.releaseDate),
        });
      }
    } catch (err: any) {
      message.error(err?.response?.data?.message || '获取关键日期失败');
    }
  };

  // 添加自定义关键日期
  const handleAddEditCustomDate = () => {
    setEditCustomDates([...editCustomDates, { name: '', date: null }]);
  };

  // 删除自定义关键日期
  const handleDeleteEditCustomDate = (index: number) => {
    setEditCustomDates(editCustomDates.filter((_, i) => i !== index));
  };

  // 更新自定义关键日期
  const handleUpdateEditCustomDate = (index: number, field: 'name' | 'date', value: any) => {
    const newDates = [...editCustomDates];
    newDates[index] = {
      ...newDates[index],
      [field]: field === 'date' && value ? value.format('YYYY-MM-DD') : value,
    };
    setEditCustomDates(newDates);
  };

  // 提交编辑
  const handleEditSubmit = async (values: any) => {
    setEditModalLoading(true);
    try {
      // 验证自定义关键日期
      const validCustomDates = editCustomDates.filter(d => d.name.trim());
      for (const date of validCustomDates) {
        if (!date.date) {
          message.error(`请为自定义关键日期"${date.name}"选择日期`);
          setEditModalLoading(false);
          return;
        }
      }

      const res = await api.put(`/trains/${trainId}/schedules/${scheduleId}`, {
        name: values.name,
        startDate: values.startDate ? values.startDate.format('YYYY-MM-DD') : null,
        endDate: values.endDate ? values.endDate.format('YYYY-MM-DD') : null,
        boardingDate: values.boardingDate ? values.boardingDate.format('YYYY-MM-DD') : null,
        lockdownDate: values.lockdownDate ? values.lockdownDate.format('YYYY-MM-DD') : null,
        releaseDate: values.releaseDate ? values.releaseDate.format('YYYY-MM-DD') : null,
        customKeyDates: validCustomDates,
        version: schedule?.version,
      });

      if (res.data.success) {
        message.success('更新成功');
        setEditModalVisible(false);
        // 重新获取班次信息
        const fetchRes = await api.get(`/trains/${trainId}/schedules/${scheduleId}`);
        if (fetchRes.data.success) {
          setSchedule(fetchRes.data.data);
        }
      } else {
        message.error(res.data.message || '更新失败');
      }
    } catch (err: any) {
      message.error(err?.response?.data?.message || err?.message || '更新失败');
    } finally {
      setEditModalLoading(false);
    }
  };

  // 搭载系统表格
  const systemsTable = (
    <Table
      dataSource={schedule.snapshots}
      rowKey="id"
      pagination={false}
      columns={[
        { title: '系统名称', dataIndex: ['system', 'name'], key: 'name' },
        {
          title: '容量点数',
          dataIndex: 'capacityPoints',
          key: 'capacityPoints',
          align: 'center' as const,
        },
        {
          title: '已使用',
          dataIndex: 'usedPoints',
          key: 'usedPoints',
          align: 'center' as const,
        },
        {
          title: '剩余',
          key: 'remaining',
          align: 'center' as const,
          render: (_, record) => record.capacityPoints - record.usedPoints,
        },
      ]}
    />
  );

  // 关键节点内容
  const keyDatesContent = (
    <div>
      {/* 关键日期卡片 */}
          <Card size="small" style={{ marginBottom: 16 }}>
            <Row gutter={[16, 16]}>
              <Col xs={24} sm={12} md={8}>
                <div style={{ textAlign: 'center', padding: '8px 0' }}>
                  <Text type="secondary" style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>开始日期</Text>
                  <Text strong style={{ fontSize: 16 }}>
                    {schedule.startDate ? dayjs(schedule.startDate).format('YYYY-MM-DD') : '-'}
                  </Text>
                </div>
              </Col>
              <Col xs={24} sm={12} md={8}>
                <div style={{ textAlign: 'center', padding: '8px 0' }}>
                  <Text type="secondary" style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>统一纳版日</Text>
                  <Text strong style={{ fontSize: 16, color: '#faad14' }}>
                    {schedule.boardingDate ? dayjs(schedule.boardingDate).format('YYYY-MM-DD') : '-'}
                  </Text>
                </div>
              </Col>
              <Col xs={24} sm={12} md={8}>
                <div style={{ textAlign: 'center', padding: '8px 0' }}>
                  <Text type="secondary" style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>统一封板日</Text>
                  <Text strong style={{ fontSize: 16, color: '#1890ff' }}>
                    {schedule.lockdownDate ? dayjs(schedule.lockdownDate).format('YYYY-MM-DD') : '-'}
                  </Text>
                </div>
              </Col>
              <Col xs={24} sm={12} md={8}>
                <div style={{ textAlign: 'center', padding: '8px 0' }}>
                  <Text type="secondary" style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>统一投产日</Text>
                  <Text strong style={{ fontSize: 16, color: '#52c41a' }}>
                    {schedule.releaseDate ? dayjs(schedule.releaseDate).format('YYYY-MM-DD') : '-'}
                  </Text>
                </div>
              </Col>
              <Col xs={24} sm={12} md={8}>
                <div style={{ textAlign: 'center', padding: '8px 0' }}>
                  <Text type="secondary" style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>结束日期</Text>
                  <Text strong style={{ fontSize: 16, color: '#ff4d4f' }}>
                    {schedule.endDate ? dayjs(schedule.endDate).format('YYYY-MM-DD') : '-'}
                  </Text>
                </div>
              </Col>
            </Row>

            {/* 自定义关键日期 */}
            {schedule.customKeyDates && schedule.customKeyDates.length > 0 && (
              <>
                <Divider style={{ margin: '12px 0' }} />
                <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>自定义关键日期</Text>
                <Row gutter={[16, 12]}>
                  {schedule.customKeyDates.map((customDate) => (
                    <Col xs={24} sm={12} md={8} key={customDate.id || customDate.name}>
                      <div style={{ textAlign: 'center', padding: '8px 0' }}>
                        <Text type="secondary" style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>
                          {customDate.name}
                        </Text>
                        <Text strong style={{ fontSize: 16 }}>
                          {customDate.date ? dayjs(customDate.date).format('YYYY-MM-DD') : '-'}
                        </Text>
                      </div>
                    </Col>
                  ))}
                </Row>
              </>
            )}
          </Card>

      {/* 日历组件 */}
      <Calendar
        defaultValue={schedule.startDate ? dayjs(schedule.startDate) : dayjs()}
        cellRender={(current) => {
          const listData = [];

          // 标记开始日期
          if (schedule.startDate && dayjs(schedule.startDate).isSame(current, 'day')) {
            listData.push({ type: 'success', content: '开始' });
          }

          // 标记结束日期
          if (schedule.endDate && dayjs(schedule.endDate).isSame(current, 'day')) {
            listData.push({ type: 'error', content: '结束' });
          }

          // 标记统一纳版日
          if (schedule.boardingDate && dayjs(schedule.boardingDate).isSame(current, 'day')) {
            listData.push({ type: 'warning', content: '纳版' });
          }

          // 标记统一封板日
          if (schedule.lockdownDate && dayjs(schedule.lockdownDate).isSame(current, 'day')) {
            listData.push({ type: 'processing', content: '封板' });
          }

          // 标记统一投产日
          if (schedule.releaseDate && dayjs(schedule.releaseDate).isSame(current, 'day')) {
            listData.push({ type: 'success', content: '投产' });
          }

          // 标记自定义关键日期
          if (schedule.customKeyDates) {
            schedule.customKeyDates.forEach((customDate) => {
              if (customDate.date && dayjs(customDate.date).isSame(current, 'day')) {
                listData.push({ type: 'default', content: customDate.name });
              }
            });
          }

          return (
            <ul className="events">
              {listData.map((item, index) => (
                <li key={`${item.content}-${index}`}>
                  <Badge status={item.type as any} text={item.content} />
                </li>
              ))}
            </ul>
          );
        }}
      />
    </div>
  );

  return (
    <div>
      {/* 操作栏 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Button type="link" icon={<ArrowLeftOutlined />} onClick={() => navigate('/trains')}>
          返回班次列表
        </Button>
        <Button type="primary" icon={<EditOutlined />} onClick={handleEdit}>
          编辑班次
        </Button>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24}>
          {/* 基本信息卡片 */}
          <Card title="班次信息" style={{ marginBottom: 16 }}>
            <Descriptions column={3} size="small" labelStyle={{ color: '#64748b', width: 100 }}>
              <Descriptions.Item label="班次名称">
                <Text strong>{schedule.name}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="所属火车">
                <a onClick={() => navigate(`/trains/${schedule.train.id}`)}>{schedule.train.name}</a>
              </Descriptions.Item>
              <Descriptions.Item label="创建时间">
                {dayjs(schedule.createdAt).format('YYYY-MM-DD HH:mm')}
              </Descriptions.Item>
            </Descriptions>
          </Card>

          {/* 容量概览卡片 */}
          <Card title="容量概览" style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 28, fontWeight: 'bold' }}>
                  {totalCapacity > 0 ? Math.round((totalUsed / totalCapacity) * 100) : 0}%
                </div>
                <Text type="secondary" style={{ fontSize: 12 }}>总体使用率</Text>
              </div>

              {/* 所有信息在同一行 */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, flex: 1 }}>
                <div style={{ textAlign: 'center', padding: 12, background: '#f5f5f5', borderRadius: 8 }}>
                  <div style={{ fontSize: 20, fontWeight: 'bold' }}>{totalCapacity}</div>
                  <Text type="secondary" style={{ fontSize: 12 }}>总容量</Text>
                </div>
                <div style={{ textAlign: 'center', padding: 12, background: '#f5f5f5', borderRadius: 8 }}>
                  <div style={{ fontSize: 20, fontWeight: 'bold' }}>{totalUsed}</div>
                  <Text type="secondary" style={{ fontSize: 12 }}>已使用</Text>
                </div>
                <div style={{ textAlign: 'center', padding: 12, background: '#f5f5f5', borderRadius: 8 }}>
                  <div style={{ fontSize: 20, fontWeight: 'bold' }}>{totalCapacity - totalUsed}</div>
                  <Text type="secondary" style={{ fontSize: 12 }}>剩余</Text>
                </div>
                <div style={{ textAlign: 'center', padding: 12, background: '#f5f5f5', borderRadius: 8 }}>
                  <div style={{ fontSize: 20, fontWeight: 'bold' }}>{schedule.snapshots.length}</div>
                  <Text type="secondary" style={{ fontSize: 12 }}>系统数</Text>
                </div>
              </div>
            </div>
          </Card>

          {/* 搭载系统卡片 */}
          <Card title={`搭载系统（${schedule.snapshots.length}）`} style={{ marginBottom: 16 }}>
            {systemsTable}
          </Card>

          {/* 关键节点卡片 */}
          <Card title="关键节点" style={{ marginBottom: 16 }}>
            {keyDatesContent}
          </Card>

          {/* 纳版管理卡片 */}
          <Card title="纳版管理">
            <OnboardTab
              scheduleId={scheduleId!}
              systems={schedule.snapshots}
              onRefresh={handleRefresh}
            />
          </Card>
        </Col>
      </Row>

      {/* 编辑班次模态框 */}
      <Modal
        title="编辑班次"
        open={editModalVisible}
        onCancel={() => setEditModalVisible(false)}
        footer={null}
        width={600}
      >
        <Form
          form={form}
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

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="startDate"
                label="开始日期"
                rules={[{ required: true, message: '请选择开始日期' }]}
              >
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="endDate"
                label="结束日期"
                rules={[{ required: true, message: '请选择结束日期' }]}
              >
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="isManual" valuePropName="checked">
            <Checkbox checked={isManualMode} onChange={(e) => handleManualChange(e.target.checked)}>
              手动设置关键日期
            </Checkbox>
          </Form.Item>

          {!isManualMode && (
            <Form.Item>
              <Button type="default" onClick={() => form.validateFields(['startDate', 'endDate']).then(handlePreviewDates)}>
                预览并生成关键日期
              </Button>
            </Form.Item>
          )}

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="boardingDate"
                label="统一纳版日"
                rules={[{ required: true, message: '请选择统一纳版日' }]}
              >
                <DatePicker style={{ width: '100%' }} disabled={!isManualMode && !previewDates} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="lockdownDate"
                label="统一封板日"
                rules={[{ required: true, message: '请选择统一封板日' }]}
              >
                <DatePicker style={{ width: '100%' }} disabled={!isManualMode && !previewDates} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="releaseDate"
                label="统一投产日"
                rules={[{ required: true, message: '请选择统一投产日' }]}
              >
                <DatePicker style={{ width: '100%' }} disabled={!isManualMode && !previewDates} />
              </Form.Item>
            </Col>
          </Row>

          {previewDates && !isManualMode && (
            <Card size="small" style={{ marginBottom: 16, background: '#f8fafc' }}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                ⏱️ 系统自动计算的关键日期：
              </Text>
              <div style={{ marginTop: 8, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                <div>📅 纳版：{dayjs(previewDates.boardingDate).format('MM-DD')}</div>
                <div>🔒 封板：{dayjs(previewDates.lockdownDate).format('MM-DD')}</div>
                <div>🚀 投产：{dayjs(previewDates.releaseDate).format('MM-DD')}</div>
              </div>
            </Card>
          )}

          <Divider style={{ margin: '12px 0' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Text type="secondary" style={{ fontSize: 12 }}>自定义关键日期</Text>
            <Button type="dashed" size="small" onClick={handleAddEditCustomDate}>
              + 添加
            </Button>
          </div>

          {editCustomDates.map((customDate, index) => (
            <Row gutter={12} key={index} style={{ marginBottom: 8 }}>
              <Col span={10}>
                <Input
                  placeholder="节点名称"
                  value={customDate.name}
                  onChange={(e) => handleUpdateEditCustomDate(index, 'name', e.target.value)}
                />
              </Col>
              <Col span={10}>
                <DatePicker
                  placeholder="选择日期"
                  style={{ width: '100%' }}
                  value={customDate.date ? dayjs(customDate.date) : null}
                  onChange={(date) => handleUpdateEditCustomDate(index, 'date', date)}
                />
              </Col>
              <Col span={4}>
                <Button type="text" danger onClick={() => handleDeleteEditCustomDate(index)}>
                  删除
                </Button>
              </Col>
            </Row>
          ))}

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setEditModalVisible(false)}>取消</Button>
              <Button type="primary" htmlType="submit" loading={editModalLoading}>
                保存
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

// ========== 纳版管理标签页组件 ==========
const OnboardTab = ({ scheduleId, systems, onRefresh }: { scheduleId: string; systems: any[]; onRefresh?: () => void }) => {
  const [selectedRequirements, setSelectedRequirements] = useState<string[]>([]);
  const [precheckResult, setPrecheckResult] = useState<PrecheckOnboardResponse | null>(null);
  const [showPrecheckModal, setShowPrecheckModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [readyRequirements, setReadyRequirements] = useState<RequirementListItem[]>([]);
  const [onboardedRequirements, setOnboardedRequirements] = useState<RequirementListItem[]>([]);

  // 容量颜色映射
  const getCapacityColor = (used: number, total: number): string => {
    const rate = total > 0 ? (used / total) * 100 : 0;
    if (rate >= 90) return '#ff4d4f';
    if (rate >= 70) return '#faad14';
    return '#52c41a';
  };

  // 加载数据
  const loadData = useCallback(async () => {
    setDataLoading(true);
    try {
      // 先获取待纳版需求
      const readyRes = await api.get(`/trains/schedules/${scheduleId}/ready-requirements`);
      if (readyRes.data.success && readyRes.data.data) {
        setReadyRequirements(readyRes.data.data.list);
      }
      // 再获取已纳版需求
      const onboardedRes = await api.get(`/trains/schedules/${scheduleId}/onboarded-requirements`);
      if (onboardedRes.data.success && onboardedRes.data.data) {
        setOnboardedRequirements(onboardedRes.data.data.list);
      }
    } catch (err) {
      console.error('加载纳版数据失败:', err);
      message.error('加载纳版数据失败');
    } finally {
      setDataLoading(false);
    }
  }, [scheduleId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // 团队容量概览表格列
  const capacityColumns = [
    { title: '系统', dataIndex: 'systemName', key: 'systemName' },
    { title: '可用容量', dataIndex: 'capacity', key: 'capacity', align: 'center' as const },
    { title: '已分配', dataIndex: 'used', key: 'used', align: 'center' as const },
    { title: '剩余', dataIndex: 'remaining', key: 'remaining', align: 'center' as const },
    { 
      title: '使用率', 
      dataIndex: 'usage', 
      key: 'usage',
      align: 'center' as const,
      render: (text: string, record: any) => (
        <Progress percent={Number(text)} strokeColor={getCapacityColor(record.used, record.capacity)} size="small" />
      ),
    },
  ];

  // 已纳版需求表格列
  const onboardedColumns = [
    { title: '需求编号', dataIndex: 'reqCode', key: 'reqCode' },
    { title: '需求标题', dataIndex: 'title', key: 'title' },
    { title: '系统', dataIndex: ['system', 'name'], key: 'system' },
    { title: '优先级', dataIndex: 'priority', key: 'priority' },
    { title: '故事点', dataIndex: 'storyPoints', key: 'storyPoints', align: 'center' as const },
    { 
      title: '操作', 
      key: 'action',
      render: (_: any, record: RequirementListItem) => (
        <Space>
          <Button
            type="text"
            size="small"
            onClick={async () => {
              try {
                await trainService.removeRequirementFromSchedule(scheduleId, record.id, { reason: '从班次移除' });
                message.success('需求已移除');
                loadData();
                onRefresh?.();
              } catch (err: any) {
                message.error(err?.response?.data?.message || '移除失败');
              }
            }}
          >
            移除
          </Button>
          <Button
            type="text"
            size="small"
            onClick={async () => {
              try {
                await trainService.releaseRequirementFromSchedule(scheduleId, record.id);
                message.success('需求已投产');
                loadData();
                onRefresh?.();
              } catch (err: any) {
                message.error(err?.response?.data?.message || '投产失败');
              }
            }}
          >
            投产
          </Button>
        </Space>
      ),
    },
  ];

  // 待纳版需求表格列
  const readyColumns = [
    {
      title: '',
      key: 'select',
      width: 50,
      render: (_: any, record: RequirementListItem) => (
        <Checkbox
          checked={selectedRequirements.includes(record.id)}
          onChange={(e) => {
            if (e.target.checked) {
              setSelectedRequirements([...selectedRequirements, record.id]);
            } else {
              setSelectedRequirements(selectedRequirements.filter(id => id !== record.id));
            }
          }}
        />
      ),
    },
    { title: '需求编号', dataIndex: 'reqCode', key: 'reqCode' },
    { title: '需求标题', dataIndex: 'title', key: 'title' },
    { title: '系统', dataIndex: ['system', 'name'], key: 'system' },
    { title: '优先级', dataIndex: 'priority', key: 'priority' },
    { title: '故事点', dataIndex: 'storyPoints', key: 'storyPoints', align: 'center' as const },
  ];

  // 团队容量概览数据
  const capacityData = systems.map(s => ({
    key: s.id,
    systemName: s.system?.name || s.systemName,
    capacity: s.capacityPoints,
    used: s.usedPoints,
    remaining: s.remainingPoints || (s.capacityPoints - s.usedPoints),
    usage: Math.round(s.usageRate || ((s.usedPoints / s.capacityPoints) * 100)),
  }));

  // 纳版预检处理
  const handlePrecheck = async () => {
    if (selectedRequirements.length === 0) {
      message.warning('请先选择要纳版的需求');
      return;
    }
    setLoading(true);
    try {
      const res = await trainService.precheckOnboardFromSchedule(scheduleId, { requirementIds: selectedRequirements });
      setPrecheckResult(res.data!);
      setShowPrecheckModal(true);
    } catch (err: any) {
      message.error(err?.response?.data?.message || '预检失败');
    } finally {
      setLoading(false);
    }
  };

  // 确认纳版处理
  const handleConfirmOnboard = async () => {
    if (!precheckResult) return;
    try {
      await trainService.onboardRequirementsToSchedule(scheduleId, { requirementIds: selectedRequirements });
      message.success('纳版成功');
      setShowPrecheckModal(false);
      setSelectedRequirements([]);
      loadData();
      onRefresh?.();
    } catch (err: any) {
      message.error(err?.response?.data?.message || '纳版失败');
    }
  };

  return (
    <div>
      {/* 团队容量概览 */}
      <Card title="团队容量概览" style={{ marginBottom: 16 }}>
        <Table
          columns={capacityColumns}
          dataSource={capacityData}
          pagination={false}
          size="small"
        />
      </Card>

      {/* 已纳版需求 */}
      <Card
        title={`已纳版需求（共 ${onboardedRequirements.length} 条）`}
        style={{ marginBottom: 16 }}
      >
        <Table
          columns={onboardedColumns}
          dataSource={onboardedRequirements}
          pagination={false}
          size="small"
          rowKey="id"
          loading={dataLoading}
        />
      </Card>

      {/* 待纳版需求 */}
      <Card
        title={`待纳版需求（已就绪，共 ${readyRequirements.length} 条）`}
        extra={
          <Space>
            <Button type="primary" onClick={handlePrecheck} loading={loading}>
              确认纳版（已选 {selectedRequirements.length}）
            </Button>
          </Space>
        }
      >
        <Table
          columns={readyColumns}
          dataSource={readyRequirements}
          pagination={false}
          size="small"
          rowKey="id"
          loading={dataLoading}
          rowSelection={{
            selectedRowKeys: selectedRequirements,
            onChange: (keys) => setSelectedRequirements(keys as string[]),
          }}
        />
      </Card>

      {/* 纳版预检模态框 */}
      <Modal
        title="纳版预检"
        open={showPrecheckModal}
        onCancel={() => setShowPrecheckModal(false)}
        onOk={handleConfirmOnboard}
        okText="确认纳版"
        cancelText="取消"
        width={700}
      >
        {precheckResult && (
          <div>
            {precheckResult.risks.length === 0 ? (
              <Result
                status="success"
                title="预检通过"
                subTitle="所有需求均可安全纳版"
              />
            ) : (
              <div>
                <Typography.Title level={5}>风险提示</Typography.Title>
                <List
                  dataSource={precheckResult.risks}
                  renderItem={(risk) => (
                    <List.Item>
                      <List.Item.Meta
                        avatar={
                          risk.level === 'critical' ? (
                            <Avatar style={{ background: '#ff4d4f' }}>!</Avatar>
                          ) : risk.level === 'warning' ? (
                            <Avatar style={{ background: '#faad14' }}>!</Avatar>
                          ) : (
                            <Avatar style={{ background: '#52c41a' }}>!</Avatar>
                          )
                        }
                        title={`需求 ${risk.requirementId}: ${risk.message}`}
                      />
                    </List.Item>
                  )}
                />
                <Divider />
                <Typography.Text type="secondary">请确认是否继续纳版</Typography.Text>
              </div>
            )}

            {precheckResult.capacityImpact.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <Typography.Title level={5}>容量影响</Typography.Title>
                <List
                  dataSource={precheckResult.capacityImpact}
                  renderItem={(impact) => (
                    <List.Item>
                      <List.Item.Meta
                        title={impact.systemName}
                        description={`新增 ${impact.addedPoints} 点，剩余 ${impact.remainingPoints} 点`}
                      />
                    </List.Item>
                  )}
                />
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ScheduleDetailPage;
