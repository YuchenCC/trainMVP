// ========== 登录页面 ==========
// 提供用户名密码登录表单，登录成功后跳转首页
import React from 'react';
import { Form, Input, Button, Card, Typography, message } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useAuthStore } from '../../stores/auth';
import { useNavigate } from 'react-router-dom';

const { Title } = Typography;

// ========== 登录页面 ==========
const LoginPage: React.FC = () => {
  const { login, loading } = useAuthStore();
  const navigate = useNavigate();

  // 表单提交：调用登录接口，成功后跳转首页
  const onFinish = async (values: { username: string; password: string }) => {
    try {
      await login(values.username, values.password);
      message.success('登录成功');
      navigate('/dashboard');
    } catch (error) {
      message.error(error instanceof Error ? error.message : '登录失败');
    }
  };

  return (
    <div className="rt-login-shell">
      <Card className="rt-login-card">
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div className="rt-layout-logo-mark" style={{ margin: '0 auto 12px' }}>RT</div>
          <Title level={3} style={{ marginBottom: 6, color: '#172033' }}>
            版本火车需求管理系统
          </Title>
          <Typography.Text type="secondary">
            统一管理需求评审、纳版、班次与投产
          </Typography.Text>
        </div>

        <Form
          name="login"
          onFinish={onFinish}
          autoComplete="off"
          size="large"
        >
          <Form.Item
            name="username"
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input prefix={<UserOutlined />} placeholder="用户名" />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: '请输入密码' }]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="密码" />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              block
            >
              登录
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default LoginPage;
