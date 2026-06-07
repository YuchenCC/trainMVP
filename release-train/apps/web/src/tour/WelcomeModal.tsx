// ========== 欢迎弹窗组件 ==========
import React, { useEffect, useState } from 'react';
import { Modal, Button, Typography, Avatar } from 'antd';
import { RocketOutlined, UserOutlined } from '@ant-design/icons';
import { useTourStore } from './store';
import { useAuthStore } from '../stores/auth';

const { Title, Text } = Typography;

export const WelcomeModal: React.FC = () => {
  const { completedTours, startTour, markCompleted } = useTourStore();
  const { user } = useAuthStore();
  const [visible, setVisible] = useState(false);

  // 检查是否需要显示欢迎弹窗
  useEffect(() => {
    if (user && !completedTours.general) {
      // 延迟显示，让页面加载完成
      const timer = setTimeout(() => {
        setVisible(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [user, completedTours.general]);

  // 获取角色中文名称
  const getRoleName = (role: string): string => {
    const roleMap: Record<string, string> = {
      BA: '业务BA',
      PM: '项目经理',
      TECH_LEAD: '技术经理',
      TRAIN_ADMIN: '火车管理员',
      DEVELOPER: '研发人员',
      TESTER: '测试人员',
      DEFAULT: '普通用户',
    };
    return roleMap[role] || roleMap['DEFAULT'];
  };

  // 开始导览
  const handleStartTour = () => {
    setVisible(false);
    startTour('general');
  };

  // 跳过导览
  const handleSkip = () => {
    setVisible(false);
    // 标记欢迎导览已完成
    markCompleted('general');
    // 同时标记所有页面级导览为已完成，避免自动启动
    markCompleted('dashboard');
    markCompleted('requirements');
    markCompleted('calendar');
    markCompleted('trains');
    markCompleted('schedule-detail');
    markCompleted('ai-review');
  };

  if (!user) return null;

  return (
    <Modal
      open={visible}
      closable={false}
      footer={null}
      width={480}
      centered
      className="tour-welcome-modal"
      styles={{
        body: { padding: 0, overflow: 'hidden' },
        mask: { backdropFilter: 'blur(4px)' },
        wrapper: { 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
        }
      }}
    >
      <div 
        id="tour-welcome-modal"
        style={{ 
          textAlign: 'center', 
          padding: '40px 32px 32px',
          background: 'linear-gradient(180deg, #e6f4ff 0%, #fff 100%)',
        }}
      >
        {/* 装饰圆形 */}
        <div
          style={{
            position: 'absolute',
            top: -30,
            right: -30,
            width: 100,
            height: 100,
            borderRadius: '50%',
            background: 'rgba(24, 144, 255, 0.1)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: 20,
            left: -20,
            width: 60,
            height: 60,
            borderRadius: '50%',
            background: 'rgba(24, 144, 255, 0.08)',
          }}
        />

        {/* Logo */}
        <div
          style={{
            width: 72,
            height: 72,
            margin: '0 auto 20px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #1890ff 0%, #69c0ff 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 24px rgba(24, 144, 255, 0.35)',
          }}
        >
          <RocketOutlined style={{ fontSize: 36, color: '#fff' }} />
        </div>

        {/* 标题 */}
        <Title level={3} style={{ marginBottom: 8, color: '#172033' }}>
          欢迎使用版本火车
        </Title>
        <Text type="secondary" style={{ fontSize: 14 }}>
          高效管理需求，智能规划版本
        </Text>

        {/* 分隔线 */}
        <div style={{ 
          height: 1, 
          background: 'linear-gradient(90deg, transparent, #e8e8e8, transparent)',
          margin: '24px 0',
        }} />

        {/* 用户信息 */}
        <div
          style={{
            padding: '12px 20px',
            background: '#fff',
            borderRadius: 8,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 12,
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
            border: '1px solid #f0f0f0',
          }}
        >
          <Avatar 
            size={40} 
            icon={<UserOutlined />} 
            style={{ background: '#1890ff' }}
          />
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontWeight: 500, color: '#172033', fontSize: 14 }}>
              {user.displayName || user.username}
            </div>
            <div style={{ fontSize: 12, color: '#8c8c8c' }}>
              您的角色：{getRoleName(user.role)}
            </div>
          </div>
        </div>

        {/* 按钮区域 */}
        <div style={{ 
          marginTop: 28, 
          display: 'flex', 
          flexDirection: 'column',
          gap: 12, 
          alignItems: 'center',
        }}>
          <Button
            type="primary"
            size="large"
            onClick={handleStartTour}
            icon={<RocketOutlined />}
            style={{ 
              width: '100%', 
              height: 48,
              fontSize: 15,
              borderRadius: 8,
            }}
          >
            开始我的专属导览
          </Button>
          <Button 
            size="large" 
            onClick={handleSkip}
            style={{ 
              width: '100%', 
              height: 44,
              fontSize: 14,
              borderRadius: 8,
            }}
          >
            跳过，直接使用
          </Button>
        </div>
      </div>
    </Modal>
  );
};