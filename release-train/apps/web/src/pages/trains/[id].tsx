// ========== 版本火车详情页面 ==========
// 路由 /trains/:id，展示火车完整信息
// 包含：基本信息、容量概览、搭载系统列表、操作按钮
// 文件名：[id].tsx
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card, Descriptions, Tag, Button, Space, Spin, Result, Typography, Row, Col, Tabs, message, Modal,
  Form, DatePicker, Checkbox, Divider,
} from 'antd';
import {
  EditOutlined, ArrowLeftOutlined, CloseOutlined, CalendarOutlined,
} from '@ant-design/icons';
import {
  TrainDetail,                // 火车详情类型
  TrainStatus,              // 火车状态枚举
  TRAIN_STATUS_LABELS,      // 火车状态标签
  Role,                   // 角色枚举
  Operation,             // 操作枚举
  KeyDatesResponse,       // 关键日期响应
  CreateTrainScheduleRequest, // 创建班次请求
  UpdateTrainScheduleRequest, // 更新班次请求
} from '@release-train/shared';
import { trainService } from '../../services/train';
import { useAuthStore } from '../../stores/auth';
import TrainSystemList from '../../components/trains/TrainSystemList';
import dayjs from 'dayjs';

const { Text, Title } = Typography;
const { RangePicker } = DatePicker;

// ========== 火车状态颜色映射 ==========
const TRAIN_STATUS_COLORS: Record<TrainStatus, string> = {
  [TrainStatus.PLANNING]: 'processing',
  [TrainStatus.IN_PROGRESS]: 'blue',
  [TrainStatus.COMPLETED]: 'success',
  [TrainStatus.CANCELLED]: 'default',
};

// ========== 容量颜色映射 ==========
const getCapacityColor = (used: number, total: number): string => {
  const rate = total > 0 ? (used / total) * 100 : 0;
  if (rate >= 90) return '#ff4d4f';
  if (rate >= 70) return '#faad14';
  return '#52c41a';
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
  // ========== 班次模态框状态 ==========
  const [scheduleModalVisible, setScheduleModalVisible] = useState(false);
  const [scheduleModalLoading, setScheduleModalLoading] = useState(false);
  const [scheduleForm] = Form.useForm();
  const [previewDates, setPreviewDates] = useState<KeyDatesResponse | null>(null);
  const [isManualMode, setIsManualMode] = useState(false);

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
    if (!checkPermission(Operation.CREATE_TRAIN)) return false;
    return train.status === TrainStatus.PLANNING;
  };

  const canCancel = () => {
    if (!user?.role || !train) return false;
    if (user.role === Role.SUPER_ADMIN) return true;
    if (!checkPermission(Operation.CREATE_TRAIN)) return false;
    return train.status === TrainStatus.PLANNING;
  };

  const canManageSchedule = () => {
    if (!user?.role || !train) return false;
    if (user.role === Role.SUPER_ADMIN) return true;
    if (!checkPermission(Operation.CREATE_TRAIN)) return false;
    return train.status === TrainStatus.PLANNING || train.status === TrainStatus.IN_PROGRESS;
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

    const requestData: CreateTrainScheduleRequest | UpdateTrainScheduleRequest = {
      startDate,
      endDate,
      version: train.version,
    };

    if (isManualMode) {
      (requestData as any).boardingDate = values.boardingDate?.format('YYYY-MM-DD');
      (requestData as any).lockdownDate = values.lockdownDate?.format('YYYY-MM-DD');
      (requestData as any).releaseDate = values.releaseDate?.format('YYYY-MM-DD');
    }

    setScheduleModalLoading(true);
    try {
      let res;
      if (train.startDate && train.endDate) {
        // 已存在班次，执行更新
        res = await trainService.updateSchedule(train.id, requestData as UpdateTrainScheduleRequest);
      } else {
        // 无班次，执行创建
        res = await trainService.createSchedule(train.id, requestData as CreateTrainScheduleRequest);
      }
      setTrain(res.data!);
      message.success(train.startDate && train.endDate ? '班次已更新' : '班次已创建');
      setScheduleModalVisible(false);
    } catch (err: any) {
      message.error(err?.message || '保存失败');
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

  // ========== 计算容量统计 ==========
  const totalCapacity = train.systems.reduce((sum, s) => sum + s.capacityPoints, 0);
  const totalUsed = train.systems.reduce((sum, s) => sum + s.usedPoints, 0);
  const totalRemaining = totalCapacity - totalUsed;
  const overallUsageRate = totalCapacity > 0 ? Math.round((totalUsed / totalCapacity) * 100) : 0;

  // ========== Tab 配置 ==========
  const tabItems = [
    {
      key: 'systems',
      label: `搭载系统（${train.systems.length}）`,
      children: (
        <TrainSystemList
          trainId={train.id}
          systems={train.systems}
          trainStatus={train.status}
          onRefresh={fetchDetail}
        />
      ),
    },
  ];

  return (
    <div>
      {/* 操作栏 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Button
          type="link"
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate('/trains')}
        >
          返回火车列表
        </Button>
        <Space>
          {canManageSchedule() && (
            <Button
              type="primary"
              icon={<CalendarOutlined />}
              onClick={openScheduleModal}
            >
              {train.startDate && train.endDate ? '编辑班次' : '创建班次'}
            </Button>
          )}
          {train.status === TrainStatus.PLANNING && (
            <>
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
            </>
          )}
        </Space>
      </div>

      <Row gutter={[16, 16]}>
        {/* 左列 */}
        <Col xs={24} lg={16}>
          {/* 基本信息卡片 */}
          <Card title="基本信息" style={{ marginBottom: 16 }}>
            <Descriptions column={2} size="small" labelStyle={{ color: '#64748b', width: 100 }}>
              <Descriptions.Item label="火车名称">
                <Text strong>{train.name}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="状态">
                <Tag color={TRAIN_STATUS_COLORS[train.status]}>
                  {TRAIN_STATUS_LABELS[train.status]}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="版本号">
                v{train.version}
              </Descriptions.Item>
              <Descriptions.Item label="创建人">
                {train.createdBy.displayName}
              </Descriptions.Item>
              <Descriptions.Item label="创建时间" span={2}>
                {new Date(train.createdAt).toLocaleString('zh-CN')}
              </Descriptions.Item>
              {train.description && (
                <Descriptions.Item label="火车描述" span={2}>
                  <div style={{ whiteSpace: 'pre-wrap' }}>{train.description}</div>
                </Descriptions.Item>
              )}
            </Descriptions>
          </Card>

          {/* 搭载系统 Tab */}
          <Card>
            <Tabs items={tabItems} />
          </Card>
        </Col>

        {/* 右列 */}
        <Col xs={24} lg={8}>
          {/* 容量概览卡片 */}
          <Card title="容量概览" style={{ marginBottom: 16 }}>
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <div style={{ fontSize: 32, fontWeight: 'bold', color: getCapacityColor(totalUsed, totalCapacity) }}>
                {overallUsageRate}%
              </div>
              <Text type="secondary">总体使用率</Text>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={{ textAlign: 'center', padding: 12, background: '#f5f5f5', borderRadius: 8 }}>
                <div style={{ fontSize: 20, fontWeight: 'bold' }}>{totalCapacity}</div>
                <Text type="secondary" style={{ fontSize: 12 }}>总容量</Text>
              </div>
              <div style={{ textAlign: 'center', padding: 12, background: '#f5f5f5', borderRadius: 8 }}>
                <div style={{ fontSize: 20, fontWeight: 'bold' }}>{totalUsed}</div>
                <Text type="secondary" style={{ fontSize: 12 }}>已使用</Text>
              </div>
              <div style={{ textAlign: 'center', padding: 12, background: '#f5f5f5', borderRadius: 8 }}>
                <div style={{ fontSize: 20, fontWeight: 'bold' }}>{totalRemaining}</div>
                <Text type="secondary" style={{ fontSize: 12 }}>剩余</Text>
              </div>
              <div style={{ textAlign: 'center', padding: 12, background: '#f5f5f5', borderRadius: 8 }}>
                <div style={{ fontSize: 20, fontWeight: 'bold' }}>{train.systems.length}</div>
                <Text type="secondary" style={{ fontSize: 12 }}>系统数</Text>
              </div>
            </div>

            {/* 各系统容量详情 */}
            <div style={{ marginTop: 16 }}>
              <Text strong style={{ fontSize: 13 }}>各系统容量</Text>
              <div style={{ marginTop: 8 }}>
                {train.systems.map((sys) => (
                  <div key={sys.id} style={{ marginBottom: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <Text style={{ fontSize: 13 }}>{sys.system.name}</Text>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {sys.usedPoints} / {sys.capacityPoints}
                      </Text>
                    </div>
                    <div style={{
                      height: 6,
                      background: '#e8e8e8',
                      borderRadius: 3,
                      overflow: 'hidden',
                    }}>
                      <div style={{
                        height: '100%',
                        width: `${sys.usageRate}%`,
                        background: getCapacityColor(sys.usedPoints, sys.capacityPoints),
                        borderRadius: 3,
                        transition: 'width 0.3s',
                      }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          {/* 关键日期卡片 */}
          <Card title="关键日期">
            <Descriptions column={1} size="small" labelStyle={{ color: '#64748b', width: 100 }}>
              {train.startDate && (
                <Descriptions.Item label="开始日期">
                  {new Date(train.startDate).toLocaleDateString('zh-CN')}
                </Descriptions.Item>
              )}
              {train.endDate && (
                <Descriptions.Item label="结束日期">
                  {new Date(train.endDate).toLocaleDateString('zh-CN')}
                </Descriptions.Item>
              )}
              {train.boardingDate && (
                <Descriptions.Item label="纳版截止">
                  {new Date(train.boardingDate).toLocaleDateString('zh-CN')}
                </Descriptions.Item>
              )}
              {train.lockdownDate && (
                <Descriptions.Item label="封板日期">
                  {new Date(train.lockdownDate).toLocaleDateString('zh-CN')}
                </Descriptions.Item>
              )}
              {train.releaseDate && (
                <Descriptions.Item label="投产日期">
                  {new Date(train.releaseDate).toLocaleDateString('zh-CN')}
                </Descriptions.Item>
              )}
              {!train.startDate && !train.endDate && !train.boardingDate && !train.lockdownDate && !train.releaseDate && (
                <Descriptions.Item label=" ">
                  <Text type="secondary">US2.2 创建班次后自动计算</Text>
                </Descriptions.Item>
              )}
            </Descriptions>
          </Card>
        </Col>
      </Row>

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
                  {new Date(previewDates.boardingDate).toLocaleDateString('zh-CN')}
                </Descriptions.Item>
                <Descriptions.Item label="封板日期">
                  {new Date(previewDates.lockdownDate).toLocaleDateString('zh-CN')}
                </Descriptions.Item>
                <Descriptions.Item label="投产日期">
                  {new Date(previewDates.releaseDate).toLocaleDateString('zh-CN')}
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
