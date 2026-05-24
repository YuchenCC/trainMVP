
// ========== 智能纳版 API 服务 ==========
import api from './api';
import type {
  SmartOnboardSuggestRequest,
  SmartOnboardSuggestResponse,
  ConfirmOnboardRequest,
} from '@release-train/shared';

export const smartOnboardService = {
  // 生成智能纳版建议（Coze 工作流耗时较长，日志显示实际耗时约76秒，超时设为180秒）
  generateSuggest: async (data: SmartOnboardSuggestRequest) => {
    const res = await api.post('/smart-onboard/suggest', data, { timeout: 180000 });
    return res.data as { success: boolean; data: SmartOnboardSuggestResponse; message?: string };
  },

  // 确认并执行纳版
  confirmOnboard: async (data: ConfirmOnboardRequest) => {
    const res = await api.post('/smart-onboard/confirm', data, { timeout: 60000 });
    return res.data as { success: boolean; data: any; message?: string };
  },
};
