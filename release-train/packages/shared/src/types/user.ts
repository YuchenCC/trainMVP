// ========== 用户相关类型定义 ==========
import type { Role, SystemRole } from '../constants';

// 用户实体类型（对应 Prisma User 模型）
export interface User {
  id: string;
  username: string;
  displayName: string;
  email: string;
  role: Role;
  ssoId?: string;
  createdAt: Date;
  updatedAt: Date;
}

// 系统成员类型（用户与系统的多对多关联）
export interface SystemMember {
  id: string;
  systemId: string;
  userId: string;
  role: SystemRole;
}
