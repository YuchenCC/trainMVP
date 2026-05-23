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
  '/dashboard/ba': 'BA 仪表盘',
  '/dashboard/pm': '项目经理仪表盘',
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
      children: [
        {
          key: '/dashboard/ba',
          label: 'BA 仪表盘',
        },
        {
          key: '/dashboard/pm',
          label: '项目经理仪表盘',
        },
      ],
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
    if (p.startsWith('/trains')) return '/trains';
    if (p === '/schedules') return '/trains';
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
    <Layout style={{ minHeight: '100vh' }}>
      {/* ===== 侧边栏：深色铁路控制台风格 ===== */}
      <Sider
        width={220}
        style={{
          background: 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)',
          borderRight: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        {/* Logo 区域 */}
        <div
          style={{
            height: 56,
            display: 'flex',
            alignItems: 'center',
            padding: '0 20px',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            gap: 10,
          }}
        >
          {/* 火车图标 */}
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 16,
              flexShrink: 0,
            }}
          >
            🚄
          </div>
          <div>
            <div style={{ color: '#f1f5f9', fontSize: 14, fontWeight: 700, lineHeight: '20px' }}>
              版本火车
            </div>
            <div style={{ color: '#64748b', fontSize: 10, lineHeight: '14px' }}>
              Release Train
            </div>
          </div>
        </div>

        {/* 导航菜单 */}
        <Menu
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
          theme="dark"
        />
      </Sider>

      {/* ===== 右侧主区域 ===== */}
      <Layout style={{ background: '#f1f5f9' }}>
        {/* 顶部栏：面包屑 + 用户 */}
        <Header
          style={{
            height: 48,
            background: '#fff',
            padding: '0 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
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
                  color: '#64748b',
                  fontSize: 14,
                  transition: 'all 0.15s',
                  marginRight: 4,
                }}
                onMouseEnter={(e) => {
                  const el = e.currentTarget as HTMLElement;
                  el.style.background = '#f1f5f9';
                  el.style.color = '#3b82f6';
                }}
                onMouseLeave={(e) => {
                  const el = e.currentTarget as HTMLElement;
                  el.style.background = 'transparent';
                  el.style.color = '#64748b';
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
                      style={{ color: '#3b82f6' }}
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

          {/* 右侧：用户信息 */}
          <Dropdown menu={{ items: userMenuItems }} placement="bottomRight" trigger={['click']}>
            <Space
              style={{
                cursor: 'pointer',
                padding: '4px 12px 4px 8px',
                borderRadius: 8,
                transition: 'background 0.2s',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background = '#f1f5f9';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = 'transparent';
              }}
            >
              <Avatar
                size={28}
                style={{ background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', flexShrink: 0 }}
                icon={<UserOutlined />}
              />
              <span style={{ fontSize: 13, color: '#334155', fontWeight: 500 }}>
                {user?.displayName}
              </span>
            </Space>
          </Dropdown>
        </Header>

        {/* 内容区域 */}
        <Content style={{ margin: 20 }}>
          <div
            style={{
              background: '#fff',
              borderRadius: 12,
              padding: 24,
              minHeight: 'calc(100vh - 108px)',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)',
            }}
          >
            <Outlet />
          </div>
        </Content>
      </Layout>
    </Layout>
  );
};

export default MainLayout;