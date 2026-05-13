// ========== 系统服务 API 层 ==========
// 封装系统相关的 HTTP 请求方法，供前端组件调用
// 文件名：system.ts — 系统 API 服务
import api from './api';  // Axios 实例（已配置 baseURL、拦截器、Token 注入）

// ========== 前端类型定义（后端返回格式的映射） ==========

/** 系统列表项（对应 GET /api/systems 返回的单条记录） */
export interface SystemOption {
  id: string;           // 系统 ID（提交表单时作为 systemId）
  name: string;         // 系统名称（下拉框显示文本）
  description: string | null; // 系统描述
}

/** 系统成员项（对应 GET /api/systems/:id/users 返回的单条记录） */
export interface SystemUserOption {
  id: string;           // 用户 ID（提交表单时作为 baId/pmId）
  displayName: string;   // 用户显示名（下拉框显示文本）
  role: string;         // 成员角色（BA/PM/...，前端按此过滤下拉选项）
}

/**
 * 系统服务对象
 * 
 * 提供系统列表查询和系统成员查询两个方法，
 * 用于需求表单中「归属系统」和「BA/PM」下拉框的动态数据加载。
 * 
 * 注意：系统列表采用远程搜索模式，用户输入关键词后才发起请求，
 * 避免系统数量多时一次性全量加载。不传 keyword 时返回全量（兼容其他场景）。
 */
export const systemService = {
  /**
   * 获取系统列表（支持关键词模糊搜索）
   * 
   * @param keyword - 可选搜索关键词，按系统名称模糊匹配
   * @returns 系统列表（按名称升序，最多 50 条）
   */
  list: async (keyword?: string): Promise<SystemOption[]> => {
    const response = await api.get('/systems', { params: keyword ? { q: keyword } : {} }); // GET /api/systems?q=关键词
    return response.data.data;                   // 提取 data 数组
  },

  /**
   * 获取指定系统的所有成员
   * 
   * @param systemId - 系统 ID
   * @returns 该系统下的成员列表（含 role，前端按 role 过滤 BA/PM）
   */
  getUsers: async (systemId: string): Promise<SystemUserOption[]> => {
    const response = await api.get(`/systems/${systemId}/users`); // GET /api/systems/:id/users
    return response.data.data;                                     // 提取 data 数组
  },
};

export default systemService;
