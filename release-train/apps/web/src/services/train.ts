// ========== 版本火车服务 API 层 ==========
// 封装版本火车相关的 HTTP 请求方法，供前端组件调用
// 文件名：train.ts — 版本火车 API 服务
import api from './api';  // Axios 实例（已配置 baseURL、拦截器、Token 注入、错误处理）
import {
  CreateTrainRequest,           // 创建火车请求体
  UpdateTrainRequest,           // 更新火车请求体
  TrainDetail,                  // 火车详情响应
  TrainItem,                   // 火车列表项
  TrainListParams,             // 火车列表查询参数
  TrainListResponse,           // 火车列表响应
  AddTrainSystemRequest,        // 添加搭载系统请求体
  UpdateTrainSystemRequest,     // 更新搭载系统请求体
  TrainSystemDetail,           // 搭载系统详情
  AvailableSystem,             // 可选系统项
  CreateTrainScheduleRequest,   // 创建班次请求体
  UpdateTrainScheduleRequest,   // 更新班次请求体
  KeyDatesResponse,            // 关键日期响应
  ApiResponse,                 // 通用 API 响应包装
  PrecheckOnboardRequest,
  PrecheckOnboardResponse,
  OnboardRequest,
  OnboardResponse,
} from '@release-train/shared';

/**
 * 版本火车服务对象
 * 
 * 所有方法返回的数据已经过 Axios 响应拦截器提取：
 * - 成功：返回 { success: true, data: ... }
 * - 业务失败：Axios 拦截器直接 reject，组件 catch 中处理
 */
export const trainService = {
  /**
   * 创建版本火车
   * 
   * @param data - 创建火车请求参数（名称、描述、搭载系统列表）
   * @returns 创建后的火车详情（含自动生成 ID）
   */
  create: async (data: CreateTrainRequest): Promise<ApiResponse<TrainDetail>> => {
    const response = await api.post('/trains', data); // POST /api/trains
    return response.data;                              // 提取响应数据
  },

  /**
   * 查询版本火车列表（分页 + 筛选）
   * 
   * @param params - 查询参数（status/page/pageSize）
   * @returns 分页响应 { list, pagination }
   */
  list: async (params: TrainListParams = {}): Promise<ApiResponse<any>> => {
    const response = await api.get('/trains', { params }); // GET /api/trains?status=&page=&pageSize=
    return response.data;
  },

  /**
   * 获取版本火车详情
   * 
   * @param id - 火车 ID
   * @returns 火车详情（含搭载系统、人员配置等完整数据）
   */
  getById: async (id: string): Promise<ApiResponse<TrainDetail>> => {
    const response = await api.get(`/trains/${id}`); // GET /api/trains/:id
    return response.data;
  },

  /**
   * 更新版本火车基本信息
   * 
   * @param id - 火车 ID
   * @param data - 更新参数（version 必填用于乐观锁，其他字段可选只传要修改的）
   * @returns 更新后的火车详情（version 已自增）
   */
  update: async (id: string, data: UpdateTrainRequest): Promise<ApiResponse<TrainDetail>> => {
    const response = await api.patch(`/trains/${id}`, data); // PATCH /api/trains/:id
    return response.data;
  },

  /**
   * 取消版本火车
   * 
   * 前置条件：火车状态为【计划中】且无已纳版需求
   * 
   * @param id - 火车 ID
   * @returns { success: true } — 取消成功
   */
  cancel: async (id: string): Promise<ApiResponse<{ success: true }>> => {
    const response = await api.post(`/trains/${id}/cancel`); // POST /api/trains/:id/cancel
    return response.data;
  },

  /**
   * 添加搭载系统
   * 
   * @param trainId - 火车 ID
   * @param data - 搭载系统参数（系统ID、容量、团队成员等）
   * @returns 添加后的搭载系统详情
   */
  addSystem: async (trainId: string, data: AddTrainSystemRequest): Promise<ApiResponse<TrainSystemDetail>> => {
    const response = await api.post(`/trains/${trainId}/systems`, data); // POST /api/trains/:id/systems
    return response.data;
  },

  /**
   * 移除搭载系统
   * 
   * 前置条件：该系统下无已纳版需求（usedPoints === 0）
   * 
   * @param trainId - 火车 ID
   * @param systemId - 系统 ID
   * @returns { success: true } — 移除成功
   */
  removeSystem: async (trainId: string, systemId: string): Promise<ApiResponse<{ success: true }>> => {
    const response = await api.delete(`/trains/${trainId}/systems/${systemId}`); // DELETE /api/trains/:id/systems/:systemId
    return response.data;
  },

  /**
   * 更新搭载系统配置
   * 
   * @param trainId - 火车 ID
   * @param systemId - 系统 ID
   * @param data - 更新参数（容量、团队成员等）
   * @returns 更新后的搭载系统详情
   */
  updateSystem: async (
    trainId: string,
    systemId: string,
    data: UpdateTrainSystemRequest,
  ): Promise<ApiResponse<TrainSystemDetail>> => {
    const response = await api.patch(`/trains/${trainId}/systems/${systemId}`, data); // PATCH /api/trains/:id/systems/:systemId
    return response.data;
  },

  /**
   * 获取可选系统列表（可用于添加到火车的系统）
   * 
   * 如果传入 trainId，则返回该火车可添加的系统（排除已在该火车的系统）
   * 同时返回冲突信息：一个系统同一时间只能参与一个火车
   * 
   * @param trainId - 可选，火车 ID（用于排除已在该火车的系统）
   * @returns 可选系统列表（含冲突信息）
   */
  getAvailableSystems: async (trainId?: string): Promise<ApiResponse<AvailableSystem[]>> => {
    const response = await api.get('/systems/available', {
      params: trainId ? { trainId } : {}, // GET /api/systems/available?trainId=
    });
    return response.data;
  },

  /**
   * 创建班次
   * 
   * @param trainId - 火车 ID
   * @param data - 班次参数（开始日期、结束日期，可选自定义关键日期）
   * @returns 更新后的火车详情
   */
  createSchedule: async (
    trainId: string,
    data: CreateTrainScheduleRequest,
  ): Promise<ApiResponse<TrainDetail>> => {
    const response = await api.post(`/trains/${trainId}/schedules`, data); // POST /api/trains/:id/schedules
    return response.data;
  },

  /**
   * 更新班次
   * 
   * @param trainId - 火车 ID
   * @param data - 更新参数（version 必填用于乐观锁，其他字段可选）
   * @returns 更新后的火车详情
   */
  updateSchedule: async (
    trainId: string,
    data: UpdateTrainScheduleRequest,
  ): Promise<ApiResponse<TrainDetail>> => {
    const response = await api.patch(`/trains/${trainId}/schedules`, data); // PATCH /api/trains/:id/schedules
    return response.data;
  },

  /**
   * 获取班次信息（含容量快照）
   * 
   * @param trainId - 火车 ID
   * @returns 班次详情和容量快照
   */
  getSchedule: async (trainId: string): Promise<ApiResponse<any>> => {
    const response = await api.get(`/trains/${trainId}/schedules`); // GET /api/trains/:id/schedules
    return response.data;
  },

  /**
   * 获取关键日期计算结果（预览用）
   * 
   * @param trainId - 火车 ID
   * @param startDate - 开始日期
   * @param endDate - 结束日期
   * @returns 关键日期计算结果
   */
  getKeyDates: async (
    trainId: string,
    startDate: string,
    endDate: string,
  ): Promise<ApiResponse<KeyDatesResponse>> => {
    const response = await api.get(`/trains/${trainId}/key-dates`, {
      params: { startDate, endDate }, // GET /api/trains/:id/key-dates?startDate=&endDate=
    });
    return response.data;
  },

  // 纳版预检
  precheckOnboard: async (
    trainId: string,
    data: PrecheckOnboardRequest,
  ): Promise<ApiResponse<PrecheckOnboardResponse>> => {
    const response = await api.post(`/trains/${trainId}/onboard/precheck`, data);
    return response.data;
  },

  // 纳版搭载
  onboardRequirements: async (
    trainId: string,
    data: OnboardRequest,
  ): Promise<ApiResponse<OnboardResponse>> => {
    const response = await api.post(`/trains/${trainId}/onboard`, data);
    return response.data;
  },

  // 从火车移除需求
  removeRequirement: async (
    trainId: string,
    requirementId: string,
    data: { reason: string },
  ): Promise<ApiResponse<any>> => {
    const response = await api.post(
      `/trains/${trainId}/requirements/${requirementId}/remove`,
      data
    );
    return response.data;
  },

  // 确认投产
  releaseRequirement: async (
    trainId: string,
    requirementId: string,
  ): Promise<ApiResponse<any>> => {
    const response = await api.post(
      `/trains/${trainId}/requirements/${requirementId}/release`
    );
    return response.data;
  },

  // 回滚需求
  rollbackRequirement: async (
    trainId: string,
    requirementId: string,
    data: { reason: string },
  ): Promise<ApiResponse<any>> => {
    const response = await api.post(
      `/trains/${trainId}/requirements/${requirementId}/rollback`,
      data
    );
    return response.data;
  },

  // 检查完成火车
  checkComplete: async (trainId: string): Promise<ApiResponse<any>> => {
    const response = await api.get(`/trains/${trainId}/complete-check`);
    return response.data;
  },

  // 完成火车
  completeTrain: async (trainId: string): Promise<ApiResponse<any>> => {
    const response = await api.post(`/trains/${trainId}/complete`);
    return response.data;
  },

  // ========== 班次级别纳版操作 ==========

  // 班次级别纳版预检
  precheckOnboardFromSchedule: async (
    scheduleId: string,
    data: PrecheckOnboardRequest,
  ): Promise<ApiResponse<PrecheckOnboardResponse>> => {
    const response = await api.post(`/trains/schedules/${scheduleId}/onboard/precheck`, data);
    return response.data;
  },

  // 班次级别纳版搭载
  onboardRequirementsToSchedule: async (
    scheduleId: string,
    data: OnboardRequest,
  ): Promise<ApiResponse<OnboardResponse>> => {
    const response = await api.post(`/trains/schedules/${scheduleId}/onboard`, data);
    return response.data;
  },

  // 班次级别从班次移除需求
  removeRequirementFromSchedule: async (
    scheduleId: string,
    requirementId: string,
    data: { reason: string },
  ): Promise<ApiResponse<any>> => {
    const response = await api.post(
      `/trains/schedules/${scheduleId}/requirements/${requirementId}/remove`,
      data
    );
    return response.data;
  },

  // 班次级别确认投产
  releaseRequirementFromSchedule: async (
    scheduleId: string,
    requirementId: string,
  ): Promise<ApiResponse<any>> => {
    const response = await api.post(
      `/trains/schedules/${scheduleId}/requirements/${requirementId}/release`
    );
    return response.data;
  },

  // 班次级别回滚需求
  rollbackRequirementFromSchedule: async (
    scheduleId: string,
    requirementId: string,
    data: { reason: string },
  ): Promise<ApiResponse<any>> => {
    const response = await api.post(
      `/trains/schedules/${scheduleId}/requirements/${requirementId}/rollback`,
      data
    );
    return response.data;
  },
};

export default trainService;
