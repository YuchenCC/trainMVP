// ========== 需求服务 API 层 ==========
// 封装需求相关的 HTTP 请求方法，供前端组件调用
// 文件名：requirement.ts — 需求 API 服务
import api from './api';       // Axios 实例（已配置 baseURL、拦截器、Token 注入、错误处理）
import {
  CreateRequirementRequest,   // 创建需求请求体
  UpdateRequirementRequest,   // 编辑需求请求体
  RequirementDetail,          // 需求详情响应
  RequirementListItem,        // 需求列表项
  RequirementListQuery,       // 需求列表查询参数
  ApiResponse,                // 通用 API 响应包装
  PaginatedResponse,          // 分页响应包装
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
   * 需求列表查询（分页 + 筛选 + 搜索）
   * 
   * @param params - 查询参数（page/pageSize/status/keyword）
   * @returns 分页响应 { list, total, page, pageSize }
   */
  list: async (params: RequirementListQuery): Promise<ApiResponse<PaginatedResponse<RequirementListItem>>> => {
    const response = await api.get('/requirements', { params }); // GET /api/requirements?page=&pageSize=&status=&keyword=
    return response.data;
  },

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
   * 发起评审（草稿 → 待评审）
   * 
   * @param id - 需求 ID
   * @returns 更新后的需求详情
   */
  submitReview: async (id: string): Promise<ApiResponse<RequirementDetail>> => {
    const response = await api.post(`/requirements/${id}/submit-review`); // POST /api/requirements/:id/submit-review
    return response.data;
  },

  /**
   * 评审通过（待评审 → 就绪）
   * 
   * @param id - 需求 ID
   * @returns 更新后的需求详情
   */
  reviewPass: async (id: string): Promise<ApiResponse<RequirementDetail>> => {
    const response = await api.post(`/requirements/${id}/review-pass`); // POST /api/requirements/:id/review-pass
    return response.data;
  },

  /**
   * 评审拒绝（待评审 → 已拒绝）
   * 
   * @param id - 需求 ID
   * @param reason - 拒绝原因（必填，最多 500 字）
   * @returns 更新后的需求详情
   */
  reviewReject: async (id: string, reason: string): Promise<ApiResponse<RequirementDetail>> => {
    const response = await api.post(`/requirements/${id}/review-reject`, { reason }); // POST /api/requirements/:id/review-reject
    return response.data;
  },

  /**
   * 重新编辑（已驳回 → 草稿）
   * 
   * @param id - 需求 ID
   * @returns 更新后的需求详情
   */
  reEdit: async (id: string): Promise<ApiResponse<RequirementDetail>> => {
    const response = await api.post(`/requirements/${id}/re-edit`); // POST /api/requirements/:id/re-edit
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
   * 需求变更（已就绪/已纳版 → 草稿）
   * 
   * US1.11 需求变更功能：
   * - 前置条件：状态为已就绪或已纳版（非封板）
   * - 权限：BA（归属人）、TRAIN_ADMIN、SUPER_ADMIN
   * - 已纳版变更时：清除 trainId，释放火车容量
   * 
   * @param id - 需求 ID
   * @param changeReason - 变更原因（必填，最多 500 字）
   * @returns 更新后的需求详情
   */
  changeRequirement: async (id: string, changeReason: string): Promise<ApiResponse<RequirementDetail>> => {
    const response = await api.post(`/requirements/${id}/change`, { changeReason }); // POST /api/requirements/:id/change
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

  /**
   * 子状态变更（已纳版需求推进/回退）
   * 
   * US1.10 子状态变更功能：
   * - 前置条件：主状态为已纳版，子状态不为封板
   * - 权限：PROJECT_MGR / TECH_MGR / TEST_MGR
   * - 目标子状态不能等于当前子状态
   * 
   * @param id - 需求 ID
   * @param subStatus - 目标子状态（DEV_IN_PROGRESS / SIT_TESTING / UAT_TESTING / FROZEN）
   * @param comment - 变更说明（可选，最多 500 字）
   * @returns 更新后的需求详情
   */
  changeSubStatus: async (id: string, subStatus: string, comment?: string): Promise<ApiResponse<RequirementDetail>> => {
    const response = await api.post(`/requirements/${id}/change-sub-status`, { subStatus, comment }); // POST /api/requirements/:id/change-sub-status
    return response.data;
  },

  /**
   * 紧急变更（封板状态 → 提交审批）
   * 
   * US1.12 紧急变更功能：
   * - 前置条件：状态为已纳版-封板
   * - 权限：BA（归属人）、TRAIN_ADMIN
   * - 提交后创建 EmergencyChange 记录，状态 PENDING
   * - 审批操作在 Task 2 实现
   * 
   * @param id - 需求 ID
   * @param urgency - 紧急程度（P0/P1）
   * @param reason - 紧急变更原因（必填，最多 500 字）
   * @returns 更新后的需求详情
   */
  emergencyChange: async (id: string, urgency: string, reason: string): Promise<ApiResponse<RequirementDetail>> => {
    const response = await api.post(`/requirements/${id}/emergency-change`, { urgency, reason }); // POST /api/requirements/:id/emergency-change
    return response.data;
  },

  approveEmergencyChange: async (id: string): Promise<ApiResponse<RequirementDetail>> => {
    const response = await api.post(`/requirements/${id}/emergency-approve`); // POST /api/requirements/:id/emergency-approve
    return response.data;
  },

  rejectEmergencyChange: async (id: string, reason: string): Promise<ApiResponse<void>> => {
    const response = await api.post(`/requirements/${id}/emergency-reject`, { reason }); // POST /api/requirements/:id/emergency-reject
    return response.data;
  },
};

export default requirementService;
