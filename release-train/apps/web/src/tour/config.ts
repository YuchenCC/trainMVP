// ========== 导览配置 ==========
// 定义用户导览的步骤配置

import type { EventData } from 'react-joyride';

export interface TourStep {
  id: string;
  target: string;
  title: string;
  content: string;
  placement?: 'top' | 'bottom' | 'left' | 'right' | 'auto';
  skipBeacon?: boolean;
  // 步骤显示前的回调，用于跨页跳转
  onBeforeShow?: (event: EventData) => void;
}

export interface TourConfig {
  id: string;
  name: string;
  description: string;
  targetRoles: string[];
  trigger: 'first_login' | 'manual' | 'page_visit';
  steps: TourStep[];
}

export interface CompletedTours {
  general: boolean;
  roleSpecific: boolean;
  featureTours: Record<string, boolean>;
}

// 首次登录导览配置
export const generalTour: TourConfig = {
  id: 'general',
  name: '系统概览导览',
  description: '首次登录系统介绍',
  targetRoles: ['ALL'],
  trigger: 'first_login',
  steps: [
    {
      id: 'main-nav',
      target: '#main-navigation',
      title: '核心模块导航',
      content: '• 需求池：录入、评审、跟踪需求\n• 版本火车：创建火车、规划班次\n• 仪表盘：数据可视化、进度跟踪',
      placement: 'right',
      skipBeacon: true,
    },
    {
      id: 'help-button',
      target: '#help-button',
      title: '帮助入口',
      content: '点击这里可以查看各种功能的导览介绍，随时重新学习系统操作。',
      placement: 'bottom',
      skipBeacon: true,
    },
  ],
};

// 业务BA导览配置
export const baTour: TourConfig = {
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
      content: '查看和管理所有需求，\n支持筛选和搜索。',
      placement: 'bottom',
      skipBeacon: true,
    },
    {
      id: 'create-req-btn',
      target: '#create-req-btn',
      title: '新建需求',
      content: '点击创建新需求，\n填写标题、描述、优先级等信息。',
      placement: 'top',
      skipBeacon: true,
    },
  ],
};

// 项目经理导览配置
export const pmTour: TourConfig = {
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
      content: '查看项目整体进度、\n各系统进度分布。',
      placement: 'bottom',
      skipBeacon: true,
    },
    {
      id: 'calendar-view',
      target: '#calendar-view',
      title: '班次日历',
      content: '查看班次时间安排\n和容量使用情况。',
      placement: 'bottom',
      skipBeacon: true,
    },
  ],
};

// 火车管理员导览配置
export const trainAdminTour: TourConfig = {
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
      content: '管理版本火车，\n查看火车详情和系统配置。',
      placement: 'bottom',
      skipBeacon: true,
    },
    {
      id: 'onboard-btn',
      target: '#onboard-btn',
      title: '智能纳版',
      content: '使用AI辅助排期建议，\n完成需求纳版。',
      placement: 'top',
      skipBeacon: true,
    },
  ],
};

// 获取所有导览配置
export const getTourConfigs = (): TourConfig[] => {
  return [generalTour, baTour, pmTour, trainAdminTour];
};

// 根据角色获取导览配置
export const getTourConfigByRole = (role: string): TourConfig | null => {
  const configs = getTourConfigs();
  return configs.find(
    (config) =>
      config.targetRoles.includes('ALL') || config.targetRoles.includes(role)
  ) || null;
};

// 获取角色专属导览配置（不包括通用导览）
export const getRoleSpecificTour = (role: string): TourConfig | null => {
  const configs = getTourConfigs();
  return configs.find(
    (config) =>
      config.id !== 'general' && config.targetRoles.includes(role)
  ) || null;
};

// ========== 页面级功能导览配置 ==========

// 仪表盘导览配置
export const dashboardTour: TourConfig = {
  id: 'dashboard',
  name: '仪表盘导览',
  description: '工作台仪表盘功能导览',
  targetRoles: ['ALL'],
  trigger: 'page_visit',
  steps: [
    {
      id: 'dashboard-system-filter',
      target: '#dashboard-system-filter',
      title: '系统筛选',
      content: '通过这里切换系统，仪表盘的所有数据会跟着变。\n默认显示你所属的系统。\n• BA/PM/技术经理：只能看到自己所属系统的数据\n• 火车管理员/超管：可以看到所有系统的数据',
      placement: 'bottom',
      skipBeacon: true,
    },
    {
      id: 'dashboard-stats',
      target: '#dashboard-stats',
      title: '需求统计',
      content: '各状态的需求数量一目了然。\n点击卡片可跳转到对应的需求列表。',
      placement: 'bottom',
      skipBeacon: true,
    },
    {
      id: 'dashboard-todos',
      target: '#dashboard-todos',
      title: '待办事项',
      content: '你当前需要处理的事项列表。\n点击可进入具体操作。',
      placement: 'top',
      skipBeacon: true,
    },
    {
      id: 'dashboard-change-rate',
      target: '#dashboard-change-rate',
      title: '变更率监控',
      content: '• 绿色：需求变更率（变更需求数/已纳版需求数）',
      placement: 'bottom',
      skipBeacon: true,
    },
    {
      id: 'dashboard-change-type-stats',
      target: '#dashboard-change-type-stats',
      title: '紧急变更率',
      content: '封板后发生的变更需要紧急变更流程。\n紧急变更过多会影响发布质量。',
      placement: 'bottom',
      skipBeacon: true,
    },
  ],
};

// 需求池导览配置
export const requirementsTour: TourConfig = {
  id: 'requirements',
  name: '需求池导览',
  description: '需求池功能导览',
  targetRoles: ['ALL'],
  trigger: 'page_visit',
  steps: [
    {
      id: 'requirements-new-btn',
      target: '#requirements-new-btn',
      title: '新增需求',
      content: '点击这里创建新需求。填写需求信息后，点击「保存草稿」可以暂时保存，点击「提交评审」直接进入审核流程。\n在需求编辑页，可以使用「AI智能补全」功能，自动生成业务描述、验收标准等内容。',
      placement: 'bottom',
      skipBeacon: true,
    },
    {
      id: 'requirements-filter',
      target: '#requirements-filter',
      title: '筛选搜索',
      content: '按系统、状态、关键词多维度筛选需求。',
      placement: 'bottom',
      skipBeacon: true,
    },
    {
      id: 'requirements-list',
      target: '#requirements-list',
      title: '需求列表',
      content: '查看所有需求信息，点击进入详情页。',
      placement: 'top',
      skipBeacon: true,
    },
  ],
};

// 月历视图导览配置
export const calendarTour: TourConfig = {
  id: 'calendar',
  name: '月历视图导览',
  description: '月历视图功能导览',
  targetRoles: ['ALL'],
  trigger: 'page_visit',
  steps: [
    {
      id: 'calendar-filter',
      target: '#calendar-filter',
      title: '筛选器',
      content: '选择系统和版本火车，\n月历自动显示对应的班次。',
      placement: 'bottom',
      skipBeacon: true,
    },
    {
      id: 'calendar-main',
      target: '#calendar-main',
      title: '班次展示',
      content: '彩色横条表示班次周期。\n悬停查看班次详情。',
      placement: 'top',
      skipBeacon: true,
    },
  ],
};

// 版本火车导览配置
export const trainsTour: TourConfig = {
  id: 'trains',
  name: '版本火车导览',
  description: '版本火车功能导览',
  targetRoles: ['ALL'],
  trigger: 'page_visit',
  steps: [
    {
      id: 'trains-header',
      target: '#main-navigation',
      title: '版本火车',
      content: '发布管理的核心单元。\n查看、创建和管理版本火车。',
      placement: 'bottom',
      skipBeacon: true,
    },
    {
      id: 'trains-list',
      target: '#trains-list',
      title: '火车列表',
      content: '展示所有版本火车。\n点击「查看」进入详情管理班次。',
      placement: 'top',
      skipBeacon: true,
    },
  ],
};

// 班次详情页导览配置
export const scheduleDetailTour: TourConfig = {
  id: 'schedule-detail',
  name: '班次详情导览',
  description: '了解班次详情页的功能',
  targetRoles: ['ALL'],
  trigger: 'page_visit',
  steps: [
    
    {
      id: 'schedule-detail-info',
      target: '#schedule-detail-info',
      title: '班次状态',
      content: '规划中 → 进行中 → 已封板 → 已投产',
      placement: 'top',
      skipBeacon: true,
    },
    {
      id: 'schedule-detail-capacity',
      target: '#schedule-detail-capacity',
      title: '容量使用',
      content: '查看容量使用率。\n确保不超出上限。',
      placement: 'top',
      skipBeacon: true,
    },
    {
      id: 'schedule-detail-onboard',
      target: '#schedule-detail-onboard',
      title: '纳版管理',
      content: '管理已纳版和待纳版的需求。\n使用AI智能纳版提升效率。',
      placement: 'top',
      skipBeacon: true,
    },
    {
      id: 'ai-smart-onboard-btn',
      target: '#ai-smart-onboard-button',
      title: 'AI智能纳版',
      content: '点击此按钮，AI会自动分析并推荐最优的纳版方案。\n包括需求优先级、容量限制等综合考量。',
      placement: 'bottom',
      skipBeacon: true,
    },
  ],
};

// AI审查导览配置
export const aiReviewTour: TourConfig = {
  id: 'ai-review',
  name: 'AI审查导览',
  description: 'AI审查功能导览',
  targetRoles: ['ALL'],
  trigger: 'page_visit',
  steps: [
    {
      id: 'requirements-description-input',
      target: '#requirements-description-input',
      title: '需求录入',
      content: '在此输入需求描述，包括背景、目标和验收标准。\n可使用「AI智能补全」自动生成内容。',
      placement: 'top',
      skipBeacon: true,
    },
    {
      id: 'ai-review-btn',
      target: '#ai-review-button',
      title: 'AI审查',
      content: '点击此按钮，AI会自动分析需求质量。\n包括完整性、合理性检查。',
      placement: 'top',
      skipBeacon: true,
    },
  ],
};

// 获取所有页面级导览配置
export const getFeatureTours = (): TourConfig[] => {
  return [dashboardTour, requirementsTour, calendarTour, scheduleDetailTour, aiReviewTour];
};