// ========== 系统相关类型定义 ==========
// 系统实体类型（对应 Prisma System 模型）
export interface System {
  id: string;
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

// 创建系统请求参数
export interface CreateSystemRequest {
  name: string;
  description?: string;
}
