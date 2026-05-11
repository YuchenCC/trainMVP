// ========== 版本火车相关类型定义 ==========
import type { TrainStatus } from '../constants';

// 版本火车实体类型（对应 Prisma Train 模型）
export interface Train {
  id: string;
  name: string;
  cycleWeeks: number;
  status: TrainStatus;
  description?: string;
  startDate: Date;
  endDate: Date;
  boardingDate?: Date;
  lockdownDate?: Date;
  releaseDate?: Date;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
}

// 创建火车请求参数
export interface CreateTrainRequest {
  name: string;
  cycleWeeks: number;
  startDate: string;
  description?: string;
  systems: {
    systemId: string;
    capacityPoints: number;
  }[];
}

// 火车-系统关联类型（多对多中间表）
export interface TrainSystem {
  id: string;
  trainId: string;
  systemId: string;
  capacityPoints: number;
  usedPoints: number;
}
