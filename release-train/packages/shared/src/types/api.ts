// ========== 通用 API 类型定义 ==========
// 统一前后端 API 请求/响应的数据结构

// 通用 API 响应包装
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  code?: number;
}

// 分页响应数据
export interface PaginatedResponse<T> {
  list: T[];
  total: number;
  page: number;
  pageSize: number;
}

// 分页请求参数
export interface PaginationParams {
  page?: number;
  pageSize?: number;
}
