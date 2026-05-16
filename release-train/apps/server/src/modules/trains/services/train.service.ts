// ========== 火车模块 Service 层 ==========
// 实现版本火车和搭载系统的业务逻辑：创建、查询、更新、取消、搭载系统管理
import { Prisma } from '@prisma/client';
import {
  CreateTrainRequest,
  UpdateTrainRequest,
  AddTrainSystemRequest,
  UpdateTrainSystemRequest,
  CreateTrainScheduleRequest,
  UpdateTrainScheduleRequest,
  KeyDatesResponse,
} from '@release-train/shared';
import { errors } from '../../../common/errors/index.js';
import { prisma } from '../../../prisma/index.js';
import { calculateKeyDates } from '../utils/key-dates.js';

// ========== 内部响应类型（避免 Prisma 枚举与 shared 枚举冲突） ==========
interface TrainDetailResponse {
  id: string;
  name: string;
  status: string;
  description?: string;
  version: number;
  startDate?: string;
  endDate?: string;
  boardingDate?: string;
  lockdownDate?: string;
  releaseDate?: string;
  createdById: string;
  createdBy: { id: string; displayName: string };
  createdAt: string;
  updatedAt: string;
  systems: TrainSystemDetailResponse[];
}

interface TrainSystemDetailResponse {
  id: string;
  system: { id: string; name: string };
  capacityPoints: number;
  usedPoints: number;
  remainingPoints: number;
  usageRate: number;
  baUser?: { id: string; displayName: string };
  pmUser?: { id: string; displayName: string };
  techMgrUser?: { id: string; displayName: string };
  testMgrUser?: { id: string; displayName: string };
  devTeamUsers?: { id: string; displayName: string }[];
}

interface TrainListItemResponse {
  id: string;
  name: string;
  status: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  systemCount: number;
  totalCapacity: number;
  usedCapacity: number;
  remainingCapacity: number;
  requirementCount: number;
  createdAt: string;
}

interface TrainListResponseData {
  list: TrainListItemResponse[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

interface AvailableSystemResponse {
  id: string;
  name: string;
  conflictTrain?: {
    id: string;
    name: string;
    status: string;
  };
}

// ========== 系统冲突校验 ==========

/**
 * 校验系统是否可添加到火车
 */
async function checkSystemConflict(
  systemId: string,
  excludeTrainId?: string,
): Promise<{ conflict: boolean; train?: { id: string; name: string; status: string } }> {
  const trainSystems = await prisma.trainSystem.findMany({
    where: { systemId },
    include: {
      train: {
        select: { id: true, name: true, status: true },
      },
    },
  });

  const conflictTrain = trainSystems.find((ts) => {
    if (excludeTrainId && ts.train.id === excludeTrainId) {
      return false;
    }
    return ts.train.status === 'PLANNING' || ts.train.status === 'IN_PROGRESS';
  });

  if (conflictTrain) {
    return {
      conflict: true,
      train: conflictTrain.train as { id: string; name: string; status: string },
    };
  }

  return { conflict: false };
}

// ========== 查询用户信息 ==========

async function getUserDisplayName(userId: string | null): Promise<{ id: string; displayName: string } | undefined> {
  if (!userId) return undefined;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, displayName: true },
  });
  return user ? { id: user.id, displayName: user.displayName } : undefined;
}

// ========== 火车创建 ==========

export async function createTrain(
  data: CreateTrainRequest,
  userId: string,
): Promise<TrainDetailResponse> {
  if (!data.name || data.name.trim().length === 0) {
    throw errors.trainNameRequired();
  }
  if (data.name.trim().length < 2) {
    throw errors.trainNameTooShort();
  }
  if (data.name.trim().length > 100) {
    throw errors.trainNameTooLong();
  }

  const systems = data.systems || [];
  if (systems.length === 0) {
    throw errors.trainSystemRequired();
  }

  for (const systemItem of systems) {
    const system = await prisma.system.findUnique({
      where: { id: systemItem.systemId },
    });
    if (!system) {
      throw errors.systemNotFound(`系统不存在：${systemItem.systemId}`);
    }

    const conflict = await checkSystemConflict(systemItem.systemId);
    if (conflict.conflict && conflict.train) {
      throw errors.trainSystemConflict(
        `系统[${system.name}]已在火车[${conflict.train.name}]中，无法重复添加`,
      );
    }

    if (systemItem.capacityPoints < 1 || systemItem.capacityPoints > 500) {
      throw errors.trainCapacityOutOfRange();
    }
  }

  const train = await prisma.$transaction(async (tx) => {
    const newTrain = await tx.train.create({
      data: {
        name: data.name.trim(),
        description: data.description?.trim(),
        status: 'PLANNING',
        createdById: userId,
      },
    });

    await tx.trainSystem.createMany({
      data: systems.map((systemItem) => ({
        trainId: newTrain.id,
        systemId: systemItem.systemId,
        capacityPoints: systemItem.capacityPoints,
        usedPoints: 0,
        baUserId: systemItem.baUserId || null,
        pmUserId: systemItem.pmUserId || null,
        techMgrUserId: systemItem.techMgrUserId || null,
        testMgrUserId: systemItem.testMgrUserId || null,
        devTeamUserIds: systemItem.devTeamUserIds || [],
      })),
    });

    return newTrain;
  });

  return getTrainById(train.id) as Promise<TrainDetailResponse>;
}

// ========== 火车列表查询 ==========

export async function listTrains(
  query: { status?: string; page?: number; pageSize?: number }
): Promise<TrainListResponseData> {
  const page = query.page || 1;
  const pageSize = query.pageSize || 20;
  const skip = (page - 1) * pageSize;

  const where: Prisma.TrainWhereInput = {};
  if (query.status) {
    where.status = query.status as Prisma.EnumTrainStatusFilter<'Train'>;
  }

  const [total, trains] = await Promise.all([
    prisma.train.count({ where }),
    prisma.train.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
      include: {
        trainSystems: {
          select: { id: true, capacityPoints: true, usedPoints: true },
        },
        requirements: {
          select: { id: true },
        },
      },
    }),
  ]);

  const list: TrainListItemResponse[] = trains.map((train) => {
    const totalCapacity = train.trainSystems.reduce((sum, ts) => sum + ts.capacityPoints, 0);
    const usedCapacity = train.trainSystems.reduce((sum, ts) => sum + ts.usedPoints, 0);
    const remainingCapacity = totalCapacity - usedCapacity;

    return {
      id: train.id,
      name: train.name,
      status: train.status,
      description: train.description || undefined,
      startDate: train.startDate?.toISOString(),
      endDate: train.endDate?.toISOString(),
      systemCount: train.trainSystems.length,
      totalCapacity,
      usedCapacity,
      remainingCapacity,
      requirementCount: train.requirements.length,
      createdAt: train.createdAt.toISOString(),
    };
  });

  return {
    list,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  };
}

// ========== 火车详情查询 ==========

export async function getTrainById(trainId: string): Promise<TrainDetailResponse> {
  const train = await prisma.train.findUnique({
    where: { id: trainId },
    include: {
      createdBy: {
        select: { id: true, displayName: true },
      },
      trainSystems: {
        include: {
          system: {
            select: { id: true, name: true },
          },
        },
      },
    },
  });

  if (!train) {
    throw errors.trainNotFound();
  }

  const allUserIds = new Set<string>();
  train.trainSystems.forEach((ts) => {
    if (ts.baUserId) allUserIds.add(ts.baUserId);
    if (ts.pmUserId) allUserIds.add(ts.pmUserId);
    if (ts.techMgrUserId) allUserIds.add(ts.techMgrUserId);
    if (ts.testMgrUserId) allUserIds.add(ts.testMgrUserId);
    ts.devTeamUserIds.forEach((id) => allUserIds.add(id));
  });

  const usersMap = new Map<string, { id: string; displayName: string }>();
  if (allUserIds.size > 0) {
    const users = await prisma.user.findMany({
      where: { id: { in: Array.from(allUserIds) } },
      select: { id: true, displayName: true },
    });
    users.forEach((u) => usersMap.set(u.id, { id: u.id, displayName: u.displayName }));
  }

  const systems: TrainSystemDetailResponse[] = train.trainSystems.map((ts) => {
    const remainingPoints = ts.capacityPoints - ts.usedPoints;
    const usageRate = ts.capacityPoints > 0 ? (ts.usedPoints / ts.capacityPoints) * 100 : 0;

    return {
      id: ts.id,
      system: ts.system,
      capacityPoints: ts.capacityPoints,
      usedPoints: ts.usedPoints,
      remainingPoints,
      usageRate: Math.round(usageRate * 100) / 100,
      baUser: ts.baUserId ? usersMap.get(ts.baUserId) : undefined,
      pmUser: ts.pmUserId ? usersMap.get(ts.pmUserId) : undefined,
      techMgrUser: ts.techMgrUserId ? usersMap.get(ts.techMgrUserId) : undefined,
      testMgrUser: ts.testMgrUserId ? usersMap.get(ts.testMgrUserId) : undefined,
      devTeamUsers: ts.devTeamUserIds.length > 0
        ? ts.devTeamUserIds.map((id) => usersMap.get(id)).filter(Boolean) as { id: string; displayName: string }[]
        : undefined,
    };
  });

  return {
    id: train.id,
    name: train.name,
    status: train.status,
    description: train.description || undefined,
    version: train.version,
    startDate: train.startDate?.toISOString().split('T')[0],
    endDate: train.endDate?.toISOString().split('T')[0],
    boardingDate: train.boardingDate?.toISOString().split('T')[0],
    lockdownDate: train.lockdownDate?.toISOString().split('T')[0],
    releaseDate: train.releaseDate?.toISOString().split('T')[0],
    createdById: train.createdById,
    createdBy: train.createdBy,
    createdAt: train.createdAt.toISOString(),
    updatedAt: train.updatedAt.toISOString(),
    systems,
  };
}

// ========== 火车更新（支持同时更新搭载系统） ==========

export async function updateTrain(
  trainId: string,
  data: UpdateTrainRequest,
): Promise<TrainDetailResponse> {
  const existing = await prisma.train.findUnique({
    where: { id: trainId },
    include: {
      trainSystems: {
        include: { system: true },
      },
    },
  });

  if (!existing) {
    throw errors.trainNotFound();
  }

  if (existing.status !== 'PLANNING') {
    throw errors.trainInvalidStatus('只有规划中的火车才能编辑');
  }

  if (data.name !== undefined) {
    if (data.name.trim().length === 0) {
      throw errors.trainNameRequired();
    }
    if (data.name.trim().length < 2) {
      throw errors.trainNameTooShort();
    }
    if (data.name.trim().length > 100) {
      throw errors.trainNameTooLong();
    }
  }

  // 如果传了 systems，则更新搭载系统配置
  if (data.systems !== undefined) {
    for (const sysItem of data.systems) {
      const system = await prisma.system.findUnique({
        where: { id: sysItem.systemId },
      });
      if (!system) {
        throw errors.systemNotFound(`系统不存在：${sysItem.systemId}`);
      }

      const conflict = await checkSystemConflict(sysItem.systemId, trainId);
      if (conflict.conflict && conflict.train) {
        throw errors.trainSystemConflict(
          `系统[${system.name}]已在火车[${conflict.train.name}]中`,
        );
      }

      if (sysItem.capacityPoints < 1 || sysItem.capacityPoints > 500) {
        throw errors.trainCapacityOutOfRange();
      }

      const existingSystem = existing.trainSystems.find(ts => ts.systemId === sysItem.systemId);
      if (existingSystem && sysItem.capacityPoints < existingSystem.usedPoints) {
        throw errors.trainCapacityOutOfRange(
          `系统[${system.name}]容量点数不能小于已使用点数（${existingSystem.usedPoints}）`,
        );
      }
    }

    await prisma.$transaction(async (tx) => {
      // 更新火车基本信息
      await tx.train.updateMany({
        where: { id: trainId, version: data.version },
        data: {
          name: data.name?.trim(),
          description: data.description?.trim(),
          version: { increment: 1 },
        },
      });

      // 删除不在新列表中的搭载系统
      const newSystemIds = data.systems.map(s => s.systemId);
      const toDelete = existing.trainSystems.filter(ts => !newSystemIds.includes(ts.systemId));
      for (const ts of toDelete) {
        if (ts.usedPoints > 0) {
          throw errors.trainSystemHasOnboardedRequirements();
        }
      }
      if (toDelete.length > 0) {
        await tx.trainSystem.deleteMany({
          where: { id: { in: toDelete.map(ts => ts.id) } },
        });
      }

      // 更新或创建搭载系统
      for (const sysItem of data.systems) {
        const existingSystem = existing.trainSystems.find(ts => ts.systemId === sysItem.systemId);

        if (existingSystem) {
          await tx.trainSystem.update({
            where: { id: existingSystem.id },
            data: {
              capacityPoints: sysItem.capacityPoints,
              baUserId: sysItem.baUserId || null,
              pmUserId: sysItem.pmUserId || null,
              techMgrUserId: sysItem.techMgrUserId || null,
              testMgrUserId: sysItem.testMgrUserId || null,
              devTeamUserIds: sysItem.devTeamUserIds || [],
            },
          });
        } else {
          await tx.trainSystem.create({
            data: {
              trainId,
              systemId: sysItem.systemId,
              capacityPoints: sysItem.capacityPoints,
              usedPoints: 0,
              baUserId: sysItem.baUserId || null,
              pmUserId: sysItem.pmUserId || null,
              techMgrUserId: sysItem.techMgrUserId || null,
              testMgrUserId: sysItem.testMgrUserId || null,
              devTeamUserIds: sysItem.devTeamUserIds || [],
            },
          });
        }
      }
    });
  } else {
    // 只更新基本信息
    const result = await prisma.train.updateMany({
      where: { id: trainId, version: data.version },
      data: {
        name: data.name?.trim(),
        description: data.description?.trim(),
        version: { increment: 1 },
      },
    });

    if (result.count === 0) {
      const current = await prisma.train.findUnique({ where: { id: trainId } });
      if (!current) {
        throw errors.trainNotFound();
      }
      if (current.version !== data.version) {
        throw errors.trainVersionConflict();
      }
      throw errors.trainNotFound();
    }
  }

  return getTrainById(trainId) as Promise<TrainDetailResponse>;
}

// ========== 取消火车 ==========

export async function cancelTrain(trainId: string): Promise<TrainDetailResponse> {
  const train = await prisma.train.findUnique({
    where: { id: trainId },
    include: {
      requirements: {
        select: { id: true, status: true },
      },
    },
  });

  if (!train) {
    throw errors.trainNotFound();
  }

  if (train.status !== 'PLANNING') {
    throw errors.trainInvalidStatus('只有规划中的火车才能取消');
  }

  const hasOnboarded = train.requirements.some(
    (req) => req.status === 'ONBOARDED' || req.status === 'RELEASED',
  );
  if (hasOnboarded) {
    throw errors.trainHasOnboardedRequirements();
  }

  await prisma.train.update({
    where: { id: trainId },
    data: {
      status: 'CANCELLED',
      version: { increment: 1 },
    },
  });

  return getTrainById(trainId) as Promise<TrainDetailResponse>;
}

// ========== 添加搭载系统 ==========

export async function addTrainSystem(
  trainId: string,
  data: AddTrainSystemRequest,
): Promise<TrainSystemDetailResponse> {
  const train = await prisma.train.findUnique({
    where: { id: trainId },
  });

  if (!train) {
    throw errors.trainNotFound();
  }

  if (train.status !== 'PLANNING') {
    throw errors.trainInvalidStatus('只有规划中的火车才能添加搭载系统');
  }

  const system = await prisma.system.findUnique({
    where: { id: data.systemId },
  });
  if (!system) {
    throw errors.systemNotFound(`系统不存在：${data.systemId}`);
  }

  const existingSystem = await prisma.trainSystem.findUnique({
    where: { trainId_systemId: { trainId, systemId: data.systemId } },
  });
  if (existingSystem) {
    throw errors.trainSystemConflict(`系统[${system.name}]已在该火车中`);
  }

  const conflict = await checkSystemConflict(data.systemId);
  if (conflict.conflict && conflict.train) {
    throw errors.trainSystemConflict(
      `系统[${system.name}]已在火车[${conflict.train.name}]中，无法重复添加`,
    );
  }

  if (data.capacityPoints < 1 || data.capacityPoints > 500) {
    throw errors.trainCapacityOutOfRange();
  }

  const trainSystem = await prisma.trainSystem.create({
    data: {
      trainId,
      systemId: data.systemId,
      capacityPoints: data.capacityPoints,
      usedPoints: 0,
      baUserId: data.baUserId || null,
      pmUserId: data.pmUserId || null,
      techMgrUserId: data.techMgrUserId || null,
      testMgrUserId: data.testMgrUserId || null,
      devTeamUserIds: data.devTeamUserIds || [],
    },
    include: {
      system: { select: { id: true, name: true } },
    },
  });

  await prisma.train.update({
    where: { id: trainId },
    data: { version: { increment: 1 } },
  });

  const [baUser, pmUser, techMgrUser, testMgrUser] = await Promise.all([
    getUserDisplayName(trainSystem.baUserId),
    getUserDisplayName(trainSystem.pmUserId),
    getUserDisplayName(trainSystem.techMgrUserId),
    getUserDisplayName(trainSystem.testMgrUserId),
  ]);

  return {
    id: trainSystem.id,
    system: trainSystem.system,
    capacityPoints: trainSystem.capacityPoints,
    usedPoints: trainSystem.usedPoints,
    remainingPoints: trainSystem.capacityPoints - trainSystem.usedPoints,
    usageRate: 0,
    baUser,
    pmUser,
    techMgrUser,
    testMgrUser,
    devTeamUsers: [],
  };
}

// ========== 移除搭载系统 ==========

export async function removeTrainSystem(trainId: string, systemId: string): Promise<void> {
  const train = await prisma.train.findUnique({ where: { id: trainId } });

  if (!train) {
    throw errors.trainNotFound();
  }

  if (train.status !== 'PLANNING') {
    throw errors.trainInvalidStatus('只有规划中的火车才能移除搭载系统');
  }

  const trainSystem = await prisma.trainSystem.findUnique({
    where: { id: systemId },
  });

  if (!trainSystem || trainSystem.trainId !== trainId) {
    throw errors.trainSystemNotFound();
  }

  const systemRequirements = await prisma.requirement.findMany({
    where: { systemId: trainSystem.systemId, trainId: trainId },
    select: { id: true, status: true },
  });

  const hasOnboardedSystem = systemRequirements.some(
    (req) => req.status === 'ONBOARDED' || req.status === 'RELEASED',
  );
  if (hasOnboardedSystem) {
    throw errors.trainSystemHasOnboardedRequirements();
  }

  await prisma.trainSystem.delete({ where: { id: systemId } });

  await prisma.train.update({
    where: { id: trainId },
    data: { version: { increment: 1 } },
  });
}

// ========== 更新搭载系统配置 ==========

export async function updateTrainSystem(
  trainId: string,
  systemId: string,
  data: UpdateTrainSystemRequest,
): Promise<TrainSystemDetailResponse> {
  const train = await prisma.train.findUnique({ where: { id: trainId } });

  if (!train) {
    throw errors.trainNotFound();
  }

  if (train.status !== 'PLANNING') {
    throw errors.trainInvalidStatus('只有规划中的火车才能更新搭载系统');
  }

  const trainSystem = await prisma.trainSystem.findUnique({
    where: { id: systemId },
    include: { system: { select: { id: true, name: true } } },
  });

  if (!trainSystem || trainSystem.trainId !== trainId) {
    throw errors.trainSystemNotFound();
  }

  if (data.capacityPoints !== undefined) {
    if (data.capacityPoints < 1 || data.capacityPoints > 500) {
      throw errors.trainCapacityOutOfRange();
    }
    if (data.capacityPoints < trainSystem.usedPoints) {
      throw errors.trainCapacityOutOfRange(
        `容量点数不能小于已使用点数（${trainSystem.usedPoints}）`,
      );
    }
  }

  const updatedSystem = await prisma.trainSystem.update({
    where: { id: systemId },
    data: {
      capacityPoints: data.capacityPoints,
      baUserId: data.baUserId !== undefined ? (data.baUserId || null) : undefined,
      pmUserId: data.pmUserId !== undefined ? (data.pmUserId || null) : undefined,
      techMgrUserId: data.techMgrUserId !== undefined ? (data.techMgrUserId || null) : undefined,
      testMgrUserId: data.testMgrUserId !== undefined ? (data.testMgrUserId || null) : undefined,
      devTeamUserIds: data.devTeamUserIds !== undefined ? (data.devTeamUserIds || []) : undefined,
    },
    include: { system: { select: { id: true, name: true } } },
  });

  await prisma.train.update({
    where: { id: trainId },
    data: { version: { increment: 1 } },
  });

  const [baUser, pmUser, techMgrUser, testMgrUser] = await Promise.all([
    getUserDisplayName(updatedSystem.baUserId),
    getUserDisplayName(updatedSystem.pmUserId),
    getUserDisplayName(updatedSystem.techMgrUserId),
    getUserDisplayName(updatedSystem.testMgrUserId),
  ]);

  return {
    id: updatedSystem.id,
    system: updatedSystem.system,
    capacityPoints: updatedSystem.capacityPoints,
    usedPoints: updatedSystem.usedPoints,
    remainingPoints: updatedSystem.capacityPoints - updatedSystem.usedPoints,
    usageRate: updatedSystem.capacityPoints > 0
      ? Math.round((updatedSystem.usedPoints / updatedSystem.capacityPoints) * 10000) / 100
      : 0,
    baUser,
    pmUser,
    techMgrUser,
    testMgrUser,
    devTeamUsers: [],
  };
}

// ========== 获取可选系统列表 ==========

export async function getAvailableSystems(trainId?: string): Promise<AvailableSystemResponse[]> {
  const systems = await prisma.system.findMany({
    orderBy: { name: 'asc' },
    include: {
      trainSystems: {
        include: { train: { select: { id: true, name: true, status: true } } },
      },
    },
  });

  return systems.map((system) => {
    const conflictTrain = system.trainSystems.find((ts) => {
      if (trainId && ts.train.id === trainId) return false;
      return ts.train.status === 'PLANNING' || ts.train.status === 'IN_PROGRESS';
    });

    return {
      id: system.id,
      name: system.name,
      conflictTrain: conflictTrain
        ? { id: conflictTrain.train.id, name: conflictTrain.train.name, status: conflictTrain.train.status }
        : undefined,
    };
  });
}

export type {
  TrainDetailResponse,
  TrainSystemDetailResponse,
  TrainListItemResponse,
  TrainListResponseData,
  AvailableSystemResponse,
};

// ========== 创建火车班次 ==========
export async function createTrainSchedule(
  trainId: string,
  data: CreateTrainScheduleRequest,
): Promise<TrainDetailResponse> {
  // 校验火车
  const train = await prisma.train.findUnique({ where: { id: trainId } });
  if (!train) {
    throw errors.trainNotFound();
  }

  // 校验状态必须为 PLANNING
  if (train.status !== 'PLANNING') {
    throw errors.trainNotPlanning();
  }

  // 校验日期
  if (!data.startDate || data.startDate.trim().length === 0) {
    throw errors.trainScheduleStartDateRequired();
  }
  if (!data.endDate || data.endDate.trim().length === 0) {
    throw errors.trainScheduleEndDateRequired();
  }

  const startDate = new Date(data.startDate);
  const endDate = new Date(data.endDate);

  if (endDate <= startDate) {
    throw errors.trainScheduleEndDateInvalid('结束时间必须晚于开始时间');
  }

  // 计算关键日期
  const keyDates = calculateKeyDates(startDate, endDate);

  // 更新火车
  await prisma.train.update({
    where: { id: trainId },
    data: {
      startDate,
      endDate,
      boardingDate: keyDates.boardingDate,
      lockdownDate: keyDates.lockdownDate,
      releaseDate: keyDates.releaseDate,
      status: 'IN_PROGRESS',
      version: { increment: 1 },
    },
  });

  return getTrainById(trainId) as Promise<TrainDetailResponse>;
}

// ========== 更新火车班次 ==========
export async function updateTrainSchedule(
  trainId: string,
  data: UpdateTrainScheduleRequest,
): Promise<TrainDetailResponse> {
  // 校验火车
  const train = await prisma.train.findUnique({ where: { id: trainId } });
  if (!train) {
    throw errors.trainNotFound();
  }

  // 校验版本号（乐观锁）
  if (train.version !== data.version) {
    throw errors.trainVersionConflict();
  }

  // 准备更新数据
  const updateData: any = {
    version: { increment: 1 },
  };

  // 如果提供了新的开始或结束日期，重新计算关键日期
  let newKeyDates: any = null;
  if (data.startDate || data.endDate) {
    const startDate = data.startDate ? new Date(data.startDate) : train.startDate;
    const endDate = data.endDate ? new Date(data.endDate) : train.endDate;

    if (!startDate || !endDate) {
      throw errors.trainScheduleDateInvalid();
    }

    if (endDate <= startDate) {
      throw errors.trainScheduleEndDateInvalid('结束时间必须晚于开始时间');
    }

    updateData.startDate = startDate;
    updateData.endDate = endDate;

    newKeyDates = calculateKeyDates(startDate, endDate);
  }

  // 如果用户手动设置了关键日期，覆盖自动计算的值
  if (data.boardingDate) {
    updateData.boardingDate = new Date(data.boardingDate);
  } else if (newKeyDates) {
    updateData.boardingDate = newKeyDates.boardingDate;
  }

  if (data.lockdownDate) {
    updateData.lockdownDate = new Date(data.lockdownDate);
  } else if (newKeyDates) {
    updateData.lockdownDate = newKeyDates.lockdownDate;
  }

  if (data.releaseDate) {
    updateData.releaseDate = new Date(data.releaseDate);
  } else if (newKeyDates) {
    updateData.releaseDate = newKeyDates.releaseDate;
  }

  // 执行更新
  await prisma.train.update({
    where: { id: trainId },
    data: updateData,
  });

  return getTrainById(trainId) as Promise<TrainDetailResponse>;
}

// ========== 获取关键日期信息 ==========
export async function getKeyDates(trainId: string): Promise<KeyDatesResponse> {
  const train = await prisma.train.findUnique({ where: { id: trainId } });

  if (!train) {
    throw errors.trainNotFound();
  }

  if (!train.startDate || !train.endDate) {
    throw errors.trainNoSchedule('该火车尚未创建班次');
  }

  // 计算天数
  const totalDays = Math.ceil(
    (train.endDate.getTime() - train.startDate.getTime()) / (1000 * 60 * 60 * 24) + 1
  );

  return {
    startDate: train.startDate.toISOString().split('T')[0],
    endDate: train.endDate.toISOString().split('T')[0],
    boardingDate: train.boardingDate?.toISOString().split('T')[0] || '',
    lockdownDate: train.lockdownDate?.toISOString().split('T')[0] || '',
    releaseDate: train.releaseDate?.toISOString().split('T')[0] || '',
    daysCount: totalDays,
  };
}
