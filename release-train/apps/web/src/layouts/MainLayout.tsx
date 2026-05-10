// ========== 主布局组件 ==========
// 包含侧边栏导航、顶部用户信息栏和内容区域
import React from 'react';
import { Layout, Menu, Dropdown, Avatar, Space } from 'antd';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  FileTextOutlined,
  CarOutlined,
  AppstoreOutlined,
  UserOutlined,
  LogoutOutlined,
} from '@ant-design/icons';
import { useAuthStore } from '../stores/auth';
import { ROLE_LABELS } from '@release-train/shared';
import type { MenuProps } from 'antd';

const { Header, Sider, Content } = Layout;

// ========== 主布局组件 ==========
const MainLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();

  // 侧边栏菜单配置（key 对应路由路径）
  const menuItems = [
    {
      key: '/requirements',
      icon: <FileTextOutlined />,
      label: '需求池',
    },
    {
      key: '/trains',
      icon: <CarOutlined />,
      label: '版本火车',
    },
    {
      key: '/systems',
      icon: <AppstoreOutlined />,
      label: '系统管理',
    },
  ];

  // 右上角用户下拉菜单
  const userMenuItems: MenuProps['items'] = [
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      onClick: () => {
        logout();
        navigate('/login');
      },
    },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider theme="light" width={200}>
        <div
          style={{
            height: 48,
            margin: 12,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 'bold',
            fontSize: 14,
          }}
        >
          🚄 版本火车
        </div>
        <Menu
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
        />
      </Sider>
      <Layout>
        <Header
          style={{
            background: '#fff',
            padding: '0 24px',
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'center',
            borderBottom: '1px solid #f0f0f0',
          }}
        >
          <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
            <Space style={{ cursor: 'pointer' }}>
              <Avatar size="small" icon={<UserOutlined />} />
              <span>{user?.displayName}</span>
              <span style={{ color: '#999', fontSize: 12 }}>
                {user?.role ? ROLE_LABELS[user.role] : ''}
              </span>
            </Space>
          </Dropdown>
        </Header>
        <Content style={{ margin: 16 }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};

export default MainLayout;
