// ========== 需求服务 API 层 ==========
// 封装需求相关的 HTTP 请求方法，供前端组件调用
// 文件名：requirement.ts — 需求 API 服务
import api from './api';       // Axios 实例（已配置 baseURL、拦截器、Token 注入、错误处理）
import {
  CreateRequirementRequest,   // 创建需求请求体
  UpdateRequirementRequest,   // 编辑需求请求体
  RequirementDetail,          // 需求详情响应
  ApiResponse,                // 通用 API 响应包装
} from '@release-train/shared';

/**
 * 需求服务对象
 * 
 * 所有方法返回的数据已经过 Axios 响应拦截器提取：
 * - 成功：返回 { success: true, data: ... }
 * - 业务失败：Axios 拦截器直接 reject，组件 catch 中处理
 */
export const requirementService = {
  /**
   * 创建需求
   * 
   * @param data - 创建需求请求参数（标题、描述、系统、优先级等）
   * @returns 创建后的需求详情（含自动生成的编号）
   */
  create: async (data: CreateRequirementRequest): Promise<ApiResponse<RequirementDetail>> => {
    const response = await api.post('/requirements', data); // POST /api/requirements
    return response.data;                                   // 提取响应数据
  },

  /**
   * 获取需求详情
   * 
   * @param id - 需求 ID
   * @returns 需求详情（含系统、人员、依赖等关联数据）
   */
  getById: async (id: string): Promise<ApiResponse<RequirementDetail>> => {
    const response = await api.get(`/requirements/${id}`); // GET /api/requirements/:id
    return response.data;
  },

  /**
   * 编辑需求（仅草稿状态）
   * 
   * @param id - 需求 ID
   * @param data - 编辑参数（version 必填用于乐观锁，其他字段可选只传要修改的）
   * @returns 更新后的需求详情（version 已自增）
   */
  update: async (id: string, data: UpdateRequirementRequest): Promise<ApiResponse<RequirementDetail>> => {
    const response = await api.patch(`/requirements/${id}`, data); // PATCH /api/requirements/:id
    return response.data;
  },

  /**
   * 取消需求（草稿状态，免填原因）
   * 
   * @param id - 需求 ID
   * @returns { success: true } — 取消成功
   */
  cancel: async (id: string): Promise<ApiResponse<{ success: true }>> => {
    const response = await api.post(`/requirements/${id}/cancel`); // POST /api/requirements/:id/cancel
    return response.data;
  },

  /**
   * 搜索需求（用于依赖选择）
   * 
   * 模糊匹配需求编号（reqCode）和标题（title），大小写不敏感。
   * 前端防抖 300ms 后调用。
   * 
   * @param keyword - 搜索关键词（空字符串返回空数组）
   * @returns 匹配的需求列表（最多 20 条，含 id/reqCode/title/status）
   */
  search: async (keyword: string): Promise<{ id: string; reqCode: string; title: string; status: string }[]> => {
    if (!keyword || keyword.trim().length === 0) return [];    // 空关键词直接返回空
    const response = await api.get('/requirements/search', { params: { q: keyword } }); // GET /api/requirements/search?q=
    return response.data.data;                                  // 提取 data 数组
  },
};

export default requirementService;
