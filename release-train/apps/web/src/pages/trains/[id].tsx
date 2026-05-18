// ========== 版本火车详情页面 ==========
// 路由 /trains/:id，展示火车完整信息
// 包含：基本信息、搭载系统列表、关键节点、操作按钮
// 文件名：[id].tsx
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card, Descriptions, Tag, Button, Space, Spin, Result, Typography, Row, Col, Tabs, message, Modal,
  Form, DatePicker, Checkbox, Divider, Input, List, Avatar, Select,
} from 'antd';
import {
  EditOutlined, ArrowLeftOutlined, CloseOutlined, CalendarOutlined,
  CheckCircleOutlined, SyncOutlined,
} from '@ant-design/icons';
import {
  TrainDetail,                // 火车详情类型
  Role,                   // 角色枚举
  Operation,             // 操作枚举
  KeyDatesResponse,       // 关键日期响应
  CreateTrainScheduleRequest, // 创建班次请求
  UpdateTrainScheduleRequest, // 更新班次请求
  ApiResponse,
} from '@release-train/shared';
import { trainService } from '../../services/train';
import api from '../../services/api';
import { useAuthStore } from '../../stores/auth';
import TrainSystemList from '../../components/trains/TrainSystemList';
import dayjs from 'dayjs';

const { Text } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;

// ========== 容量颜色映射 ==========
const getCapacityColor = (used: number, total: number): string => {
  const rate = total > 0 ? (used / total) * 100 : 0;
  if (rate >= 90) return '#ff4d4f';
  if (rate >= 70) return '#faad14';
  return '#52c41a';
};

// ========== 基本信息标签页组件 ==========
const BasicInfoTab = ({ train }: { train: TrainDetail }) => {
  return (
    <div>
      <Card title="基本信息" style={{ marginBottom: 16 }}>
        <Descriptions column={2} size="small" labelStyle={{ color: '#64748b', width: 100 }}>
          <Descriptions.Item label="火车名称">
            <Text strong>{train.name}</Text>
          </Descriptions.Item>
          <Descriptions.Item label="开始时间">
            {train.startDate ? dayjs(train.startDate).format('YYYY-MM-DD') : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="结束时间">
            {train.endDate ? dayjs(train.endDate).format('YYYY-MM-DD') : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="统一投产日">
            {train.releaseDate ? dayjs(train.releaseDate).format('YYYY-MM-DD') : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="创建人">
            {train.createdBy.displayName}
          </Descriptions.Item>
          <Descriptions.Item label="创建时间" span={2}>
            {dayjs(train.createdAt).format('YYYY-MM-DD HH:mm:ss')}
          </Descriptions.Item>
          {train.description && (
            <Descriptions.Item label="火车描述" span={2}>
              <div style={{ whiteSpace: 'pre-wrap' }}>{train.description}</div>
            </Descriptions.Item>
          )}
        </Descriptions>
      </Card>
      
      <Card title="操作历史">
        <List
          itemLayout="horizontal"
          dataSource={[]}
          renderItem={() => (
            <List.Item>
              <List.Item.Meta
                avatar={<Avatar icon={<CheckCircleOutlined />} />}
                title="暂无操作历史"
              />
            </List.Item>
          )}
        />
      </Card>
    </div>
  );
};

// ========== 搭载系统标签页组件 ==========
const SystemsTab = ({ train, onRefresh }: { train: TrainDetail; onRefresh: () => void }) => {
  return (
    <TrainSystemList
      trainId={train.id}
      systems={train.systems}
      onRefresh={onRefresh}
    />
  );
};

/**
 * 版本火车详情页面
 */
const TrainDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, checkPermission } = useAuthStore();

  // ========== 状态 ==========
  const [loading, setLoading] = useState(true);
  const [train, setTrain] = useState<TrainDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('info');
  // ========== 班次模态框状态 ==========
  const [scheduleModalVisible, setScheduleModalVisible] = useState(false);
  const [scheduleModalLoading, setScheduleModalLoading] = useState(false);
  const [scheduleForm] = Form.useForm();
  const [previewDates, setPreviewDates] = useState<KeyDatesResponse | null>(null);
  const [isManualMode, setIsManualMode] = useState(false);
  const [createCustomDates, setCreateCustomDates] = useState<any[]>([]);

  // ========== 数据获取 ==========
  const fetchDetail = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await trainService.getById(id);
      setTrain(res.data ?? null);
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || '加载失败';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  // ========== 权限判断 ==========
  const canEdit = () => {
    if (!user?.role || !train) return false;
    if (user.role === Role.SUPER_ADMIN) return true;
    return checkPermission(Operation.CREATE_TRAIN);
  };

  const canCancel = () => {
    if (!user?.role || !train) return false;
    if (user.role === Role.SUPER_ADMIN) return true;
    return checkPermission(Operation.CREATE_TRAIN);
  };

  const canManageSchedule = () => {
    if (!user?.role || !train) return false;
    if (user.role === Role.SUPER_ADMIN) return true;
    return checkPermission(Operation.CREATE_TRAIN);
  };

  const canCompleteTrain = () => {
    if (!user?.role || !train) return false;
    if (user.role === Role.SUPER_ADMIN) return true;
    return checkPermission(Operation.CREATE_TRAIN);
  };

  // ========== 班次操作处理 ==========

  const openScheduleModal = () => {
    if (!train) return;
    // 初始化表单
    const initialValues: any = {};
    if (train.startDate && train.endDate) {
      initialValues.dateRange = [dayjs(train.startDate), dayjs(train.endDate)];
    }
    if (train.boardingDate) initialValues.boardingDate = dayjs(train.boardingDate);
    if (train.lockdownDate) initialValues.lockdownDate = dayjs(train.lockdownDate);
    if (train.releaseDate) initialValues.releaseDate = dayjs(train.releaseDate);
    
    scheduleForm.setFieldsValue(initialValues);
    setPreviewDates(null);
    setIsManualMode(!!train.boardingDate || !!train.lockdownDate || !!train.releaseDate);
    setScheduleModalVisible(true);
  };

  const handleDateRangeChange = async (dates: any) => {
    if (!train || !dates || dates.length !== 2) {
      setPreviewDates(null);
      return;
    }
    try {
      const res = await trainService.getKeyDates(
        train.id,
        dates[0].format('YYYY-MM-DD'),
        dates[1].format('YYYY-MM-DD'),
      );
      setPreviewDates(res.data!);
    } catch (err) {
      console.error('预览失败', err);
    }
  };

  const handleSaveSchedule = async (values: any) => {
    if (!train) return;
    const dateRange = values.dateRange;
    const startDate = dateRange[0].format('YYYY-MM-DD');
    const endDate = dateRange[1].format('YYYY-MM-DD');

    const requestData: any = {
      startDate,
      endDate,
      version: train.version,
    };

    // 班次名称（可选，不填则后端自动生成）
    if (values.name) {
      requestData.name = values.name;
    }

    if (isManualMode) {
      requestData.boardingDate = values.boardingDate?.format('YYYY-MM-DD');
      requestData.lockdownDate = values.lockdownDate?.format('YYYY-MM-DD');
      requestData.releaseDate = values.releaseDate?.format('YYYY-MM-DD');
    }

    setScheduleModalLoading(true);
    try {
      let res;
      if (train.startDate && train.endDate) {
        // 已存在班次，执行更新
        res = await api.put(`/trains/${train.id}/schedules`, requestData);
      } else {
        // 无班次，执行创建
        res = await api.post(`/trains/${train.id}/schedules`, requestData);
      }
      setTrain(res.data.data);
      message.success(train.startDate && train.endDate ? '班次已更新' : '班次已创建');
      setScheduleModalVisible(false);
    } catch (err: any) {
      message.error(err?.response?.data?.message || '保存失败');
    } finally {
      setScheduleModalLoading(false);
    }
  };

  // ========== 操作处理 ==========
  const handleCancel = () => {
    if (!train) return;

    const hasOnboardedRequirements = train.systems.some((s) => s.usedPoints > 0);
    if (hasOnboardedRequirements) {
      Modal.warning({
        title: '无法取消',
        content: '该火车已有需求纳版，无法取消。请先处理已纳版需求。',
        okText: '知道了',
      });
      return;
    }

    Modal.confirm({
      title: '确认取消火车',
      icon: <CloseOutlined />,
      content: '取消后火车将变为「已取消」状态，搭载系统可被其他火车使用。',
      okText: '确认取消',
      okButtonProps: { danger: true },
      cancelText: '返回',
      onOk: async () => {
        setCancelLoading(true);
        try {
          await trainService.cancel(train.id);
          message.success('火车已取消');
          fetchDetail();
        } catch (error: any) {
          message.error(error?.message || '取消失败');
        } finally {
          setCancelLoading(false);
        }
      },
    });
  };

  const handleCompleteTrain = async () => {
    if (!train) return;
    Modal.confirm({
      title: '确认完成火车',
      content: '完成后火车将变为「已完成」状态，无法再进行纳版等操作。',
      okText: '确认完成',
      okButtonProps: { type: 'primary' },
      cancelText: '返回',
      onOk: async () => {
        try {
          await trainService.completeTrain(train.id);
          message.success('火车已完成');
          fetchDetail();
        } catch (err: any) {
          message.error(err?.response?.data?.message || '完成失败');
        }
      },
    });
  };

  // ========== 加载状态 ==========
  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 80 }}>
        <Spin size="large" tip="加载中..." />
      </div>
    );
  }

  if (error || !train) {
    return (
      <Result
        status="error"
        title="加载失败"
        subTitle={error || '火车不存在'}
        extra={
          <Button onClick={() => navigate('/trains')}>
            返回火车列表
          </Button>
        }
      />
    );
  }

  // ========== Tab 配置 ==========
  const tabItems = [
    {
      key: 'info',
      label: '基本信息',
      children: <BasicInfoTab train={train} />,
    },
    {
      key: 'systems',
      label: `搭载系统（${train.systems.length}）`,
      children: <SystemsTab train={train} onRefresh={fetchDetail} />,
    },
  ];

  return (
    <div>
      {/* 操作栏 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Space>
          <Button
            type="link"
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate('/trains')}
          >
            返回火车列表
          </Button>
          <Text strong style={{ fontSize: 18 }}>{train.name}</Text>
        </Space>
        <Space>
          <Button icon={<SyncOutlined />} onClick={fetchDetail}>
            刷新
          </Button>
          {canManageSchedule() && (
            <Button
              type="primary"
              icon={<CalendarOutlined />}
              onClick={openScheduleModal}
            >
              {train.startDate && train.endDate ? '编辑班次' : '创建班次'}
            </Button>
          )}
          {canEdit() && (
            <Button
              icon={<EditOutlined />}
              onClick={() => navigate(`/trains/${id}/edit`)}
            >
              编辑
            </Button>
          )}
          {canCancel() && (
            <Button
              danger
              icon={<CloseOutlined />}
              onClick={handleCancel}
              loading={cancelLoading}
            >
              取消火车
            </Button>
          )}
          {canCompleteTrain() && (
            <Button
              type="primary"
              icon={<CheckCircleOutlined />}
              onClick={handleCompleteTrain}
            >
              完成火车
            </Button>
          )}
        </Space>
      </div>

      <Card>
        <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} />
      </Card>

      {/* 班次编辑模态框 */}
      <Modal
        title={train?.startDate && train?.endDate ? '编辑班次' : '创建班次'}
        open={scheduleModalVisible}
        onCancel={() => setScheduleModalVisible(false)}
        footer={null}
        width={600}
      >
        <Form
          form={scheduleForm}
          layout="vertical"
          onFinish={handleSaveSchedule}
        >
          <Form.Item
            label="班次名称"
            name="name"
            extra="不填则自动生成，格式：火车名 + 序号"
          >
            <Input placeholder={`例如：${train?.name || '版本火车'}第1班`} />
          </Form.Item>

          <Form.Item
            label="时间范围"
            name="dateRange"
            rules={[{ required: true, message: '请选择时间范围' }]}
          >
            <RangePicker
              style={{ width: '100%' }}
              onChange={handleDateRangeChange}
              placeholder={['开始日期', '结束日期']}
            />
          </Form.Item>

          {previewDates && !isManualMode && (
            <Card size="small" style={{ marginBottom: 16, background: '#f0f5ff' }}>
              <Descriptions column={1} size="small">
                <Descriptions.Item label="纳版截止">
                  {dayjs(previewDates.boardingDate).format('YYYY-MM-DD')}
                </Descriptions.Item>
                <Descriptions.Item label="封板日期">
                  {dayjs(previewDates.lockdownDate).format('YYYY-MM-DD')}
                </Descriptions.Item>
                <Descriptions.Item label="投产日期">
                  {dayjs(previewDates.releaseDate).format('YYYY-MM-DD')}
                </Descriptions.Item>
              </Descriptions>
              <Text type="secondary" style={{ fontSize: 12 }}>
                以上为自动计算结果
              </Text>
            </Card>
          )}

          <Form.Item
            label="手动调整关键日期"
            valuePropName="checked"
            initialValue={isManualMode}
          >
            <Checkbox
              onChange={(e) => setIsManualMode(e.target.checked)}
            >
              自定义关键日期
            </Checkbox>
          </Form.Item>

          {isManualMode && (
            <>
              <Divider style={{ margin: '16px 0' }} />
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    label="纳版截止"
                    name="boardingDate"
                  >
                    <DatePicker style={{ width: '100%' }} placeholder="选择纳版截止日期" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    label="封板日期"
                    name="lockdownDate"
                  >
                    <DatePicker style={{ width: '100%' }} placeholder="选择封板日期" />
                  </Form.Item>
                </Col>
              </Row>
              <Form.Item
                label="投产日期"
                name="releaseDate"
              >
                <DatePicker style={{ width: '100%' }} placeholder="选择投产日期" />
              </Form.Item>
            </>
          )}

          <div style={{ textAlign: 'right', marginTop: 24 }}>
            <Space>
              <Button onClick={() => setScheduleModalVisible(false)}>
                取消
              </Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={scheduleModalLoading}
              >
                保存
              </Button>
            </Space>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default TrainDetailPage;
