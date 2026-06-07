// ========== 主布局组件 ==========
// 铁路控制台风格：深色侧边栏 + 轨道线选中指示 + 集成面包屑顶栏
import React from 'react';
import { Layout, Menu, Dropdown, Avatar, Space, Breadcrumb, Typography } from 'antd';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  FileTextOutlined,
  CarOutlined,
  AppstoreOutlined,
  UserOutlined,
  LogoutOutlined,
  ArrowLeftOutlined,
  DashboardOutlined,
  CalendarOutlined,
} from '@ant-design/icons';
import { useAuthStore } from '../stores/auth';
import { ROLE_LABELS } from '@release-train/shared';
import { TourHelpButton } from '../tour';
import type { MenuProps } from 'antd';

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

// 路由 → 面包屑名称映射
const BREADCRUMB_MAP: Record<string, string> = {
  '/requirements': '需求池',
  '/requirements/new': '新增需求',
  '/trains': '版本火车',
  '/trains/new': '新增火车',
  '/schedules': '班次列表',
  '/systems': '系统管理',
  '/dashboard': '仪表盘',
  // 已删除：/dashboard/ba 和 /dashboard/pm 已合并到统一的 /dashboard
  '/calendar': '月历视图',
};

// 动态路由模式：首页 + 父级 + 当前页面
const DYNAMIC_BREADCRUMB: { pattern: RegExp; breadcrumb: string[] }[] = [
  // 需求相关
  { pattern: /^\/requirements\/[^/]+\/edit$/, breadcrumb: ['需求池', '编辑需求'] },
  { pattern: /^\/requirements\/[^/]+$/, breadcrumb: ['需求池', '需求详情'] },
  // 火车相关
  { pattern: /^\/trains\/[^/]+\/edit$/, breadcrumb: ['版本火车', '编辑火车'] },
  { pattern: /^\/trains\/[^/]+$/, breadcrumb: ['版本火车', '火车详情'] },
  // 班次详情
  { pattern: /^\/trains\/[^/]+\/schedules\/[^/]+$/, breadcrumb: ['班次列表', '班次详情'] },
];

// 根据路径生成面包屑
function buildBreadcrumbs(pathname: string) {
  const items: { title: string; path?: string }[] = [];
  
  // 首页始终是第一个
  const homeItem = { title: '首页', path: '/dashboard' };
  
  // 检查动态路由模式
  for (const { pattern, breadcrumb } of DYNAMIC_BREADCRUMB) {
    if (pattern.test(pathname)) {
      items.push(homeItem);
      breadcrumb.forEach((name, index) => {
        if (index === breadcrumb.length - 1) {
          items.push({ title: name });
        } else {
          const path = name === '需求池' ? '/requirements' : 
                       name === '版本火车' ? '/trains' : 
                       name === '班次列表' ? '/schedules' : '/trains';
          items.push({ title: name, path });
        }
      });
      return items;
    }
  }
  
  // 检查静态路由映射
  const name = BREADCRUMB_MAP[pathname];
  if (name) {
    items.push(homeItem);
    items.push({ title: name });
  }
  
  return items;
}

// 根据当前路径获取语义父级路由（避免 navigate(-1) 依赖浏览器历史栈导致套圈）
function getParentPath(pathname: string): string {
  // /requirements/:id/edit → /requirements/:id
  const reqEditMatch = pathname.match(/^(\/requirements\/[^/]+)\/edit$/);
  if (reqEditMatch) return reqEditMatch[1];

  // /requirements/:id → /requirements
  const reqDetailMatch = pathname.match(/^\/requirements\/[^/]+$/);
  if (reqDetailMatch) return '/requirements';

  // /requirements/new → /requirements
  if (pathname === '/requirements/new') return '/requirements';

  // /trains/:id/edit → /trains/:id
  const trainEditMatch = pathname.match(/^(\/trains\/[^/]+)\/edit$/);
  if (trainEditMatch) return trainEditMatch[1];

  // /trains/:id → /trains
  const trainDetailMatch = pathname.match(/^\/trains\/[^/]+$/);
  if (trainDetailMatch) return '/trains';

  // /trains/new → /trains
  if (pathname === '/trains/new') return '/trains';

  // 其他子页面兜底返回首页
  return '/dashboard';
}

// ========== 主布局组件 ==========
const MainLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const breadcrumbs = buildBreadcrumbs(location.pathname);

  // 侧边栏菜单
  const menuItems: MenuProps['items'] = [
    {
      key: '/dashboard',
      icon: <DashboardOutlined />,
      label: '仪表盘',
    },
    {
      key: '/calendar',
      icon: <CalendarOutlined />,
      label: '月历视图',
    },
    {
      key: '/requirements',
      icon: <FileTextOutlined />,
      label: '需求池',
    },
    {
      key: '/schedules',
      icon: <CarOutlined />,
      label: '版本火车',
    },
    {
      key: '/systems',
      icon: <AppstoreOutlined />,
      label: '系统管理',
    },
  ];

  // 子路由高亮父菜单
  const selectedKey = (() => {
    const p = location.pathname;
    if (p.startsWith('/dashboard')) return p;
    if (p.startsWith('/calendar')) return '/calendar';
    if (p.startsWith('/requirements')) return '/requirements';
    if (p.startsWith('/trains')) return '/schedules';
    if (p === '/schedules') return '/schedules';
    if (p.startsWith('/systems')) return '/systems';
    return p;
  })();

  // 用户下拉菜单
  const userMenuItems: MenuProps['items'] = [
    {
      key: 'role',
      label: `角色：${user?.role ? ROLE_LABELS[user.role] : '-'}`,
      disabled: true,
    },
    { type: 'divider' },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      danger: true,
      onClick: () => {
        logout();
        navigate('/login');
      },
    },
  ];

  return (
    <Layout style={{ minHeight: '100vh', background: '#f7f9fc' }}>
      {/* ===== 侧边栏：白底调度工作台导航 ===== */}
      <Sider
        width={220}
        className="rt-sider"
        style={{
          background: '#fff',
          borderRight: '1px solid #e4e7ec',
        }}
      >
        {/* Logo 区域 */}
        <div
          style={{
            height: 56,
            display: 'flex',
            alignItems: 'center',
            padding: '0 20px',
            borderBottom: '1px solid #eef1f5',
            gap: 10,
          }}
        >
          <div className="rt-layout-logo-mark">RT</div>
          <div>
            <div style={{ color: '#172033', fontSize: 14, fontWeight: 700, lineHeight: '20px' }}>
              版本火车
            </div>
            <div style={{ color: '#98a2b3', fontSize: 10, lineHeight: '14px' }}>
              Release Train
            </div>
          </div>
        </div>

        {/* 导航菜单 */}
        <Menu
          id="main-navigation"
          mode="inline"
          selectedKeys={[selectedKey]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
          style={{
            background: 'transparent',
            borderInlineEnd: 'none',
            marginTop: 8,
            padding: '0 8px',
          }}
          theme="light"
        />
      </Sider>

      {/* ===== 右侧主区域 ===== */}
      <Layout style={{ background: '#f7f9fc' }}>
        {/* 顶部栏：面包屑 + 用户 */}
        <Header
          style={{
            height: 48,
            background: '#fff',
            padding: '0 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid #e4e7ec',
            boxShadow: '0 1px 0 #eef1f5',
            position: 'sticky',
            top: 0,
            zIndex: 10,
          }}
        >
          {/* 左侧：返回按钮（子页面显示）+ 面包屑 */}
          <Space size={4}>
            {breadcrumbs.length > 0 && (
              <span
                onClick={() => navigate(getParentPath(location.pathname))}
                style={{
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 28,
                  height: 28,
                  borderRadius: 6,
                  color: '#667085',
                  fontSize: 14,
                  transition: 'all 0.15s',
                  marginRight: 4,
                }}
                onMouseEnter={(e) => {
                  const el = e.currentTarget as HTMLElement;
                  el.style.background = '#eff6ff';
                  el.style.color = '#2563eb';
                }}
                onMouseLeave={(e) => {
                  const el = e.currentTarget as HTMLElement;
                  el.style.background = 'transparent';
                  el.style.color = '#667085';
                }}
              >
                <ArrowLeftOutlined />
              </span>
            )}
            <Breadcrumb
              items={breadcrumbs.map((item) => ({
                  title: item.path ? (
                    <a
                      onClick={() => navigate(item.path!)}
                      style={{ color: '#2563eb' }}
                    >
                      {item.title}
                    </a>
                  ) : (
                    <Text strong>{item.title}</Text>
                  ),
                }))
              }
            />
          </Space>

          {/* 右侧：帮助按钮 + 用户信息 */}
          <Space size={8}>
            <TourHelpButton />
            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight" trigger={['click']}>
              <Space
                id="user-menu"
                style={{
                  cursor: 'pointer',
                  padding: '4px 12px 4px 8px',
                  borderRadius: 8,
                  transition: 'background 0.2s',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.background = '#eff6ff';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background = 'transparent';
                }}
              >
                <Avatar
                  size={28}
                  style={{ background: '#2563eb', flexShrink: 0 }}
                  icon={<UserOutlined />}
                />
                <span style={{ fontSize: 13, color: '#172033', fontWeight: 500 }}>
                  {user?.displayName}
                </span>
              </Space>
            </Dropdown>
          </Space>
        </Header>

        {/* 内容区域 */}
        <Content style={{ padding: 20, minHeight: 'calc(100vh - 48px)' }}>
          <div style={{ minHeight: 'calc(100vh - 88px)' }}>
            <Outlet />
          </div>
        </Content>
      </Layout>
    </Layout>
  );
};

export default MainLayout;
