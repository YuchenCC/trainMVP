// ========== 创建版本火车页面 ==========
// 路由 /trains/new，使用 TrainForm 创建模式
// 创建成功或取消后返回火车列表
// 文件名：create.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Typography, Button, Space } from 'antd';
import { ArrowLeftOutlined, PlusOutlined } from '@ant-design/icons';
import TrainForm from '../../components/trains/TrainForm';
import { useAuthStore } from '../../stores/auth';
import { Role, Operation } from '@release-train/shared';
import { Result } from 'antd';

const { Title } = Typography;

/**
 * 创建版本火车页面
 * 
 * 仅允许 TRAIN_ADMIN 或 SUPER_ADMIN 角色访问。
 * 使用 TrainForm 组件的创建模式。
 */
const TrainCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const { user, checkPermission } = useAuthStore();

  // ========== 权限校验 ==========
  // 仅允许火车管理员和超级管理员创建火车
  const canCreate = user?.role === Role.TRAIN_ADMIN ||
    user?.role === Role.SUPER_ADMIN ||
    checkPermission(Operation.CREATE_TRAIN);

  // 无权限时显示提示
  if (!canCreate) {
    return (
      <Result
        status="403"
        title="无权限访问"
        subTitle="您没有权限创建版本火车。如需创建，请联系火车管理员。"
        extra={
          <Button type="primary" onClick={() => navigate('/trains')}>
            返回火车列表
          </Button>
        }
      />
    );
  }

  return (
    <div>
      {/* 页面头部：返回按钮 + 标题 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Button
          type="link"
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate('/trains')}
        >
          返回火车列表
        </Button>
        <Title level={4} style={{ margin: 0 }}>创建版本火车</Title>
      </div>

      {/* 火车表单组件 */}
      <TrainForm
        mode="create"
        onCancel={() => navigate('/trains')}
        onSuccess={(trainId) => {
          if (trainId) {
            navigate(`/trains/${trainId}`);
          } else {
            navigate('/trains');
          }
        }}
      />
    </div>
  );
};

export default TrainCreatePage;
