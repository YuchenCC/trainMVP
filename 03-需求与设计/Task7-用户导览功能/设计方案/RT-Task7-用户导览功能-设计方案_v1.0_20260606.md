# Task 7: 用户导览功能 — 技术设计方案

**版本号**: v1.0
**日期**: 2026-06-06
**状态**: 待审核
**来源PRD**: [RT-Task7-用户导览功能-PRD.md](./PRD/RT-Task7-用户导览功能-PRD.md)
**对应用户故事**: US7.1、US7.2

---

## 一、功能概述

### 1.1 功能定位

用户导览系统是一个交互式引导组件，帮助新用户快速了解版本火车需求管理系统的核心功能和操作流程。

### 1.2 P0 功能范围

| 功能 | 描述 | 优先级 |
|------|------|--------|
| 首次登录引导 | 用户首次登录时自动触发的系统介绍 | P0 |
| 角色专属导览 | 根据用户角色展示的专属功能导览 | P0 |

---

## 二、技术架构

### 2.1 架构图

```
┌─────────────────────────────────────────────────────────────────┐
│                        前端应用层                               │
│  ┌─────────────┐  ┌─────────────┐  ┌───────────────────────┐   │
│  │ TourContext │  │ TourProvider│  │      TourHook        │   │
│  └──────┬──────┘  └──────┬──────┘  └──────────┬──────────┘   │
└─────────┼────────────────┼──────────────────────┼────────────┘
          │                │                      │
          ▼                ▼                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                        导览核心层                               │
│  ┌─────────────┐  ┌─────────────┐  ┌───────────────────────┐   │
│  │ TourManager │  │ TourSteps   │  │      TourConfig      │   │
│  │  (导览管理)  │  │  (步骤定义)  │  │   (配置管理)        │   │
│  └──────┬──────┘  └──────┬──────┘  └──────────┬──────────┘   │
└─────────┼────────────────┼──────────────────────┼────────────┘
          │                │                      │
          ▼                ▼                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                        导览引擎层                               │
│                    ┌─────────────┐                            │
│                    │   Joyride   │  (react-joyride 库)        │
│                    └─────────────┘                            │
└─────────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────┐
│                        后端接口层                               │
│  ┌─────────────────────┐  ┌─────────────────────────────┐     │
│  │ /api/tour/progress  │  │ /api/tour/config            │     │
│  │ (用户导览进度)       │  │ (导览配置获取)              │     │
│  └─────────────────────┘  └─────────────────────────────┘     │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 技术选型

| 分类 | 技术 | 版本 | 选型理由 |
|------|------|------|----------|
| 导览库 | react-joyride | ^2.8.0 | 成熟稳定，支持步骤引导、高亮、进度控制 |
| 状态管理 | React Context | - | 轻量级，适合导览状态管理 |
| 本地存储 | localStorage | - | 持久化导览进度 |
| UI框架 | Ant Design | ^5.x | 与项目现有技术栈一致 |

---

## 三、核心组件设计

### 3.1 TourProvider 组件

**职责**: 提供导览状态管理和全局配置

```typescript
interface TourProviderProps {
  children: React.ReactNode;
  config?: TourConfig;
}

interface TourProviderState {
  isTourActive: boolean;
  currentStep: number;
  completedTours: CompletedTours;
  currentTour: string | null;
}

interface CompletedTours {
  general: boolean;           // 通用导览
  roleSpecific: boolean;      // 角色专属导览
  featureTours: Record<string, boolean>; // 功能点导览
}
```

**核心方法**:
- `startTour(tourId: string)`: 启动指定导览
- `endTour()`: 结束当前导览
- `skipTour()`: 跳过当前导览
- `nextStep()`: 下一步
- `prevStep()`: 上一步
- `markCompleted(tourId: string)`: 标记导览完成
- `resetProgress()`: 重置导览进度

### 3.2 TourStep 组件

**职责**: 定义单个导览步骤

```typescript
interface TourStep {
  id: string;
  target: string;           // CSS选择器或组件ID
  title: string;            // 步骤标题
  content: string;          // 步骤内容
  position: 'top' | 'bottom' | 'left' | 'right';
  disableBeacon?: boolean;  // 是否禁用引导点
  spotlightClicks?: boolean; // 是否允许点击高亮区域
  spotlightPadding?: number; // 高亮区域padding
}
```

### 3.3 TourButton 组件

**职责**: 触发导览的按钮组件

```typescript
interface TourButtonProps {
  tourId: string;
  children: React.ReactNode;
  variant?: 'primary' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
}
```

### 3.4 WelcomeModal 组件

**职责**: 首次登录欢迎弹窗

```typescript
interface WelcomeModalProps {
  isOpen: boolean;
  onStart: () => void;
  onSkip: () => void;
  userRole: string;
}
```

---

## 四、导览配置设计

### 4.1 导览配置结构

```typescript
interface TourConfig {
  id: string;
  name: string;
  description: string;
  targetRoles: string[];
  trigger: 'first_login' | 'manual' | 'page_visit';
  steps: TourStep[];
  version: string;
  isActive: boolean;
}
```

### 4.2 P0 导览配置

#### 4.2.1 首次登录导览 (general)

```typescript
{
  id: 'general',
  name: '系统概览导览',
  description: '首次登录系统介绍',
  targetRoles: ['ALL'],
  trigger: 'first_login',
  steps: [
    {
      id: 'welcome',
      target: '#welcome-modal',
      title: '欢迎使用版本火车',
      content: '高效管理需求，智能规划版本',
      position: 'bottom'
    },
    {
      id: 'nav-overview',
      target: '#main-navigation',
      title: '核心模块',
      content: '需求池管理、版本火车、智能纳版、仪表盘',
      position: 'right'
    },
    {
      id: 'role-info',
      target: '#user-role',
      title: '您的角色',
      content: '根据您的角色，我们为您定制了专属导览',
      position: 'bottom'
    }
  ]
}
```

#### 4.2.2 业务BA导览 (ba)

```typescript
{
  id: 'ba',
  name: '业务BA导览',
  description: '业务BA专属功能导览',
  targetRoles: ['BA'],
  trigger: 'manual',
  steps: [
    {
      id: 'req-list',
      target: '#requirement-list',
      title: '需求池',
      content: '查看和管理所有需求',
      position: 'bottom'
    },
    {
      id: 'req-create',
      target: '#create-req-btn',
      title: '新建需求',
      content: '点击创建新需求',
      position: 'top'
    },
    {
      id: 'req-filter',
      target: '#req-filter',
      title: '筛选搜索',
      content: '快速定位需求',
      position: 'bottom'
    }
  ]
}
```

#### 4.2.3 项目经理导览 (pm)

```typescript
{
  id: 'pm',
  name: '项目经理导览',
  description: '项目经理专属功能导览',
  targetRoles: ['PM'],
  trigger: 'manual',
  steps: [
    {
      id: 'dashboard',
      target: '#dashboard',
      title: '仪表盘',
      content: '查看项目整体进度',
      position: 'bottom'
    },
    {
      id: 'calendar',
      target: '#calendar-view',
      title: '班次日历',
      content: '查看班次时间安排',
      position: 'bottom'
    },
    {
      id: 'resource',
      target: '#resource-panel',
      title: '资源协调',
      content: '管理资源分配',
      position: 'right'
    }
  ]
}
```

#### 4.2.4 火车管理员导览 (train-admin)

```typescript
{
  id: 'train-admin',
  name: '火车管理员导览',
  description: '火车管理员专属功能导览',
  targetRoles: ['TRAIN_ADMIN'],
  trigger: 'manual',
  steps: [
    {
      id: 'train-list',
      target: '#train-list',
      title: '版本火车',
      content: '管理版本火车',
      position: 'bottom'
    },
    {
      id: 'schedule',
      target: '#schedule-panel',
      title: '班次管理',
      content: '创建和管理班次',
      position: 'right'
    },
    {
      id: 'onboard',
      target: '#onboard-btn',
      title: '智能纳版',
      content: 'AI辅助排期建议',
      position: 'top'
    }
  ]
}
```

---

## 五、状态管理设计

### 5.1 导览状态结构

```typescript
interface TourState {
  isActive: boolean;           // 是否有导览正在进行
  currentTourId: string | null; // 当前导览ID
  currentStepIndex: number;    // 当前步骤索引
  completedTours: {
    general: boolean;
    roleSpecific: boolean;
    featureTours: Record<string, boolean>;
  };
  tourConfig: TourConfig | null;
}
```

### 5.2 状态流转

```
┌──────────────┐     startTour      ┌──────────────┐
│   Idle       │ ─────────────────→ │  TourActive  │
│  (空闲状态)   │                    │  (导览进行中) │
└──────────────┘                    └──────┬───────┘
        ▲                                  │
        │                                  │ nextStep/prevStep
        │                                  ▼
        │                           ┌──────────────┐
        │                           │  StepChange  │
        │                           │  (步骤切换)   │
        │                           └──────┬───────┘
        │                                  │
        │              ┌───────────────────┼───────────────────┐
        │              │                   │                   │
        │              ▼                   ▼                   ▼
        │       ┌───────────┐      ┌───────────┐      ┌───────────┐
        │       │ SkipTour  │      │ EndTour   │      │ Complete  │
        │       │  (跳过)    │      │  (结束)    │      │   (完成)   │
        │       └─────┬─────┘      └─────┬─────┘      └─────┬─────┘
        │             │                  │                  │
        └─────────────┴──────────────────┴──────────────────┘
```

---

## 六、后端接口设计

### 6.1 获取导览进度

**接口**: `GET /api/tour/progress`

**请求**:
```typescript
interface GetTourProgressRequest {
  userId: string; // 可选，默认当前用户
}
```

**响应**:
```typescript
interface GetTourProgressResponse {
  success: boolean;
  data: {
    userId: string;
    completedTours: {
      general: boolean;
      roleSpecific: boolean;
      featureTours: Record<string, boolean>;
    };
    lastTourDate: string;
  };
}
```

### 6.2 更新导览进度

**接口**: `PUT /api/tour/progress`

**请求**:
```typescript
interface UpdateTourProgressRequest {
  tourId: string;
  completed: boolean;
}
```

**响应**:
```typescript
interface UpdateTourProgressResponse {
  success: boolean;
  data: {
    tourId: string;
    completed: boolean;
    updatedAt: string;
  };
}
```

### 6.3 获取导览配置

**接口**: `GET /api/tour/config`

**请求**:
```typescript
interface GetTourConfigRequest {
  tourId?: string;  // 可选，获取指定导览配置
  role?: string;    // 可选，按角色筛选
}
```

**响应**:
```typescript
interface GetTourConfigResponse {
  success: boolean;
  data: TourConfig | TourConfig[];
}
```

---

## 七、数据库设计

### 7.1 用户导览进度表

| 字段名 | 类型 | 说明 |
|--------|------|------|
| id | UUID | 主键 |
| userId | UUID | 用户ID |
| completedTours | JSON | 完成的导览列表 |
| lastTourDate | DateTime | 最后导览时间 |
| createdAt | DateTime | 创建时间 |
| updatedAt | DateTime | 更新时间 |

### 7.2 导览配置表

| 字段名 | 类型 | 说明 |
|--------|------|------|
| id | UUID | 主键 |
| name | String | 导览名称 |
| description | String | 导览描述 |
| targetRoles | JSON | 目标角色列表 |
| trigger | String | 触发方式 |
| steps | JSON | 导览步骤列表 |
| version | String | 版本号 |
| isActive | Boolean | 是否启用 |
| createdAt | DateTime | 创建时间 |
| updatedAt | DateTime | 更新时间 |

---

## 八、安全与权限

### 8.1 权限控制

| 操作 | 权限要求 |
|------|----------|
| 获取导览进度 | 登录用户 |
| 更新导览进度 | 登录用户 |
| 获取导览配置 | 登录用户 |

### 8.2 数据安全

- 用户导览进度仅对当前用户可见
- 导览配置公开可读（所有登录用户均可获取）
- 敏感操作需验证用户身份

---

## 九、错误处理

### 9.1 错误类型

| 错误码 | 错误信息 | 处理方式 |
|--------|----------|----------|
| 401 | 未登录 | 跳转到登录页 |
| 403 | 权限不足 | 提示权限不足 |
| 404 | 导览配置不存在 | 返回默认配置 |
| 500 | 服务器错误 | 显示错误提示，可重试 |

### 9.2 异常场景

- 导览步骤目标元素不存在 → 跳过该步骤
- 导览配置加载失败 → 使用本地默认配置
- 网络请求失败 → 重试或使用本地缓存

---

## 十、性能优化

### 10.1 加载优化

- 导览配置按需加载
- 使用 localStorage 缓存导览进度
- 导览组件懒加载

### 10.2 渲染优化

- 避免不必要的重渲染
- 使用 React.memo 优化组件
- 导览弹窗使用 Portal 渲染

---

## 十一、测试要点

### 11.1 单元测试

- TourProvider 状态管理测试
- TourStep 组件渲染测试
- 导览配置解析测试

### 11.2 集成测试

- 首次登录自动触发导览测试
- 角色专属导览加载测试
- 导览进度持久化测试

### 11.3 E2E 测试

- 导览流程完整测试
- 跳过/结束导览测试
- 多角色导览切换测试

---

## 十二、部署与集成

### 12.1 前端集成

```typescript
// 在 App.tsx 中配置
import { TourProvider } from './components/TourProvider';

function App() {
  return (
    <TourProvider>
      <Router>
        {/* 应用组件 */}
      </Router>
    </TourProvider>
  );
}
```

### 12.2 后端集成

- 数据库迁移脚本
- API 路由注册
- 权限中间件配置

---

*版本历史*
- v1.0 (2026-06-06): 初始版本