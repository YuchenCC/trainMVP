// ========== 编辑版本火车页面 ==========
// 路由 /trains/:id/edit，使用 TrainForm 编辑模式
// 仅允许编辑规划中的火车基本信息（名称、描述）
// 搭载系统的添加/移除/编辑在详情页进行
// 文件名：edit.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Typography, Button, Spin, Result, Card, Descriptions, Tag, Space, message } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import {
  TrainDetail,           // 火车详情类型
  TrainStatus,          // 火车状态枚举
  TRAIN_STATUS_LABELS, // 火车状态标签
  Role,               // 角色枚举
  Operation,         // 操作枚举
} from '@release-train/shared';
import { trainService } from '../../services/train';
import { useAuthStore } from '../../stores/auth';
import TrainForm from '../../components/trains/TrainForm';

const { Title, Text } = Typography;

// ========== 火车状态颜色映射 ==========
const TRAIN_STATUS_COLORS: Record<TrainStatus, string> = {
  [TrainStatus.PLANNING]: 'processing',
  [TrainStatus.IN_PROGRESS]: 'blue',
  [TrainStatus.COMPLETED]: 'success',
  [TrainStatus.CANCELLED]: 'default',
};

/**
 * 编辑版本火车页面
 * 
 * 仅允许编辑规划中的火车基本信息（名称、描述）。
 * 搭载系统的添加/移除/编辑在详情页进行。
 */
const TrainEditPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, checkPermission } = useAuthStore();

  // ========== 状态 ==========
  const [loading, setLoading] = useState(true);
  const [train, setTrain] = useState<TrainDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  // ========== 权限校验 ==========
  const canEdit = () => {
    if (!user?.role || !train) return false;
    if (user.role === Role.SUPER_ADMIN) return true;
    if (!checkPermission(Operation.CREATE_TRAIN)) return false;
    return train.status === TrainStatus.PLANNING;
  };

  // ========== 加载状态 ==========
  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 80 }}>
        <Spin size="large" tip="加载中..." />
      </div>
    );
  }

  // ========== 错误状态 ==========
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

  // ========== 非规划中状态 ==========
  // 仅允许编辑规划中的火车
  if (train.status !== TrainStatus.PLANNING) {
    return (
      <Result
        status="warning"
        title="无法编辑"
        subTitle={`该火车当前状态为「${TRAIN_STATUS_LABELS[train.status]}」，仅允许编辑规划中的火车。`}
        extra={
          <Space>
            <Button onClick={() => navigate(`/trains/${id}`)}>查看详情</Button>
            <Button type="primary" onClick={() => navigate('/trains')}>返回列表</Button>
          </Space>
        }
      />
    );
  }

  // ========== 无权限 ==========
  if (!canEdit()) {
    return (
      <Result
        status="403"
        title="无权限访问"
        subTitle="您没有权限编辑此火车。如需编辑，请联系火车管理员。"
        extra={
          <Button type="primary" onClick={() => navigate(`/trains/${id}`)}>
            查看详情
          </Button>
        }
      />
    );
  }

  // ========== 渲染表单 ==========
  return (
    <div>
      {/* 页面头部 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Button
          type="link"
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate(`/trains/${id}`)}
        >
          返回火车详情
        </Button>
        <Title level={4} style={{ margin: 0 }}>编辑版本火车</Title>
      </div>

      {/* 当前火车状态提示 */}
      <Card style={{ marginBottom: 16, background: '#f6ffed', border: '1px solid #b7eb8f' }}>
        <Space>
          <Text>当前状态：</Text>
          <Tag color={TRAIN_STATUS_COLORS[train.status]}>
            {TRAIN_STATUS_LABELS[train.status]}
          </Tag>
          <Text type="secondary">（规划中的火车可编辑基本信息，搭载系统配置请在详情页操作）</Text>
        </Space>
      </Card>

      {/* 火车表单组件 */}
      <TrainForm
        mode="edit"
        initialData={train}
        onCancel={() => navigate(`/trains/${id}`)}
        onSuccess={() => {
          message.success('火车信息已更新');
          navigate(`/trains/${id}`);
        }}
      />
    </div>
  );
};

export default TrainEditPage;
