// ========== 导览状态管理 ==========
// 使用 Zustand 管理导览状态

import { create } from 'zustand';
import { 
  TourConfig, 
  getTourConfigByRole, 
  getRoleSpecificTour,
  getFeatureTours,
  generalTour,
  baTour,
  pmTour,
  trainAdminTour
} from './config';

export interface CompletedTours {
  general: boolean;
  roleSpecific: boolean;
  featureTours: Record<string, boolean>;
}

export interface TourState {
  isActive: boolean;
  currentTourId: string | null;
  currentStepIndex: number;
  completedTours: CompletedTours;
  currentConfig: TourConfig | null;
  
  startTour: (tourId: string) => void;
  endTour: () => void;
  skipTour: () => void;
  nextStep: () => void;
  prevStep: () => void;
  goToStep: (index: number) => void;
  markCompleted: (tourId: string) => void;
  clearCompleted: (tourId: string) => void;
  resetProgress: () => void;
  checkShouldShowWelcome: () => boolean;
  getRoleTour: (role: string) => TourConfig | null;
  startFeatureTour: (tourId: string) => void;
  checkShouldShowFeatureTour: (tourId: string) => boolean;
}

// 从 localStorage 恢复导览进度
const loadCompletedTours = (): CompletedTours => {
  const stored = localStorage.getItem('tour-progress');
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      localStorage.removeItem('tour-progress');
    }
  }
  return {
    general: false,
    roleSpecific: false,
    featureTours: {},
  };
};

// 保存导览进度到 localStorage
const saveCompletedTours = (tours: CompletedTours) => {
  localStorage.setItem('tour-progress', JSON.stringify(tours));
};

export const useTourStore = create<TourState>((set, get) => ({
  isActive: false,
  currentTourId: null,
  currentStepIndex: 0,
  completedTours: loadCompletedTours(),
  currentConfig: null,

  // 启动导览
  startTour: (tourId: string) => {
    const config = getTourConfigs().find(c => c.id === tourId);
    if (config) {
      set({
        isActive: true,
        currentTourId: tourId,
        currentStepIndex: 0,
        currentConfig: config,
      });
    }
  },

  // 结束导览
  endTour: () => {
    const { currentTourId } = get();
    if (currentTourId) {
      get().markCompleted(currentTourId);
    }
    set({
      isActive: false,
      currentTourId: null,
      currentStepIndex: 0,
      currentConfig: null,
    });
  },

  // 跳过导览
  skipTour: () => {
    const { currentTourId } = get();
    if (currentTourId) {
      get().markCompleted(currentTourId);
    }
    set({
      isActive: false,
      currentTourId: null,
      currentStepIndex: 0,
      currentConfig: null,
    });
    // 清除URL参数，避免页面重新渲染时再次触发导览
    window.history.replaceState({}, '', window.location.pathname);
  },

  // 下一步
  nextStep: () => {
    const { currentStepIndex, currentConfig } = get();
    if (currentConfig && currentStepIndex < currentConfig.steps.length - 1) {
      set({ currentStepIndex: currentStepIndex + 1 });
    } else if (currentConfig) {
      get().endTour();
    }
  },

  // 上一步
  prevStep: () => {
    const { currentStepIndex } = get();
    if (currentStepIndex > 0) {
      set({ currentStepIndex: currentStepIndex - 1 });
    }
  },

  // 跳转到指定步骤
  goToStep: (index: number) => {
    const { currentConfig } = get();
    if (currentConfig && index >= 0 && index < currentConfig.steps.length) {
      set({ currentStepIndex: index });
    }
  },

  // 标记导览完成
  markCompleted: (tourId: string) => {
    set((state) => {
      const newCompletedTours: CompletedTours = {
        general: state.completedTours.general,
        roleSpecific: state.completedTours.roleSpecific,
        featureTours: { ...state.completedTours.featureTours },
      };
      
      if (tourId === 'general') {
        newCompletedTours.general = true;
      } else if (['ba', 'pm', 'train-admin'].includes(tourId)) {
        newCompletedTours.roleSpecific = true;
      } else {
        // 页面级导览记录到 featureTours
        newCompletedTours.featureTours[tourId] = true;
      }
      
      saveCompletedTours(newCompletedTours);
      return { completedTours: newCompletedTours };
    });
  },

  // 清除已完成标记（用于强制重新启动导览）
  clearCompleted: (tourId: string) => {
    set((state) => {
      const newCompletedTours: CompletedTours = {
        general: state.completedTours.general,
        roleSpecific: state.completedTours.roleSpecific,
        featureTours: { ...state.completedTours.featureTours },
      };
      
      if (tourId === 'general') {
        newCompletedTours.general = false;
      } else if (['ba', 'pm', 'train-admin'].includes(tourId)) {
        newCompletedTours.roleSpecific = false;
      } else {
        // 页面级导览从 featureTours 中移除
        delete newCompletedTours.featureTours[tourId];
      }
      
      saveCompletedTours(newCompletedTours);
      return { completedTours: newCompletedTours };
    });
  },

  // 重置导览进度
  resetProgress: () => {
    const defaultTours: CompletedTours = {
      general: false,
      roleSpecific: false,
      featureTours: {},
    };
    saveCompletedTours(defaultTours);
    set({ completedTours: defaultTours });
  },

  // 检查是否应该显示欢迎弹窗
  checkShouldShowWelcome: () => {
    const { completedTours } = get();
    return !completedTours.general;
  },

  // 获取角色专属导览
  getRoleTour: (role: string) => {
    return getRoleSpecificTour(role);
  },

  // 启动页面级导览
  startFeatureTour: (tourId: string) => {
    const config = getFeatureTours().find(c => c.id === tourId);
    if (config) {
      set({
        isActive: true,
        currentTourId: tourId,
        currentStepIndex: 0,
        currentConfig: config,
      });
    }
  },

  // 检查是否应该显示页面级导览
  checkShouldShowFeatureTour: (tourId: string) => {
    const { completedTours } = get();
    return !completedTours.featureTours[tourId];
  },
}));

// 辅助函数：获取所有导览配置
const getTourConfigs = (): TourConfig[] => {
  return [generalTour, baTour, pmTour, trainAdminTour];
};