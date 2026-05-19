// ========== 版本火车详情页面 ==========
// 路由 /trains/:id，展示火车完整信息
// 包含：基本信息、搭载系统列表、关键节点、操作按钮
// 文件名：[id].tsx
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card, Descriptions, Button, Space, Spin, Result, Typography, Tabs, message, Modal,
  List, Avatar,
} from 'antd';
import {
  EditOutlined, ArrowLeftOutlined, CloseOutlined, CalendarOutlined,
  CheckCircleOutlined, SyncOutlined,
} from '@ant-design/icons';
import {
  TrainDetail,                // 火车详情类型
  Role,                   // 角色枚举
  Operation,             // 操作枚举
} from '@release-train/shared';
import { trainService } from '../../services/train';
import { useAuthStore } from '../../stores/auth';
import TrainSystemList from '../../components/trains/TrainSystemList';
import dayjs from 'dayjs';

const { Text } = Typography;

// ========== 基本信息标签页组件 ==========
const BasicInfoTab = ({ train }: { train: TrainDetail }) => {
  // 计算火车总容量（所有搭载系统容量之和）
  const totalCapacity = train.systems.reduce((sum, sys) => sum + sys.capacityPoints, 0);
  
  return (
    <div>
      <Card title="基本信息" style={{ marginBottom: 16 }}>
        <Descriptions column={2} size="small" labelStyle={{ color: '#64748b', width: 100 }}>
          <Descriptions.Item label="火车名称">
            <Text strong>{train.name}</Text>
          </Descriptions.Item>
          <Descriptions.Item label="创建人">
            {train.createdBy.displayName}
          </Descriptions.Item>
          <Descriptions.Item label="火车容量">
            {totalCapacity}
          </Descriptions.Item>
          <Descriptions.Item label="搭载系统数">
            {train.systems.length}
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
            onClick={() => navigate('/trains/list')}
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
              onClick={() => navigate(`/trains/${id}/schedule`)}
            >
              管理班次
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
        </Space>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <BasicInfoTab train={train} />
        <Card title={`搭载系统（${train.systems.length}）`}>
          <SystemsTab train={train} onRefresh={fetchDetail} />
        </Card>
      </div>
    </div>
  );
};

export default TrainDetailPage;
