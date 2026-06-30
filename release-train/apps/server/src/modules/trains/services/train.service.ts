// ========== 火车模块 Service 层（v2.0） ==========
// 实现版本火车、班次、搭载系统的业务逻辑
import { Prisma } from '@prisma/client';
import {
  CreateTrainRequest,
  UpdateTrainRequest,
  AddTrainSystemRequest,
  UpdateTrainSystemRequest,
  CreateTrainScheduleRequest,
  UpdateTrainScheduleRequest,
  PreviewKeyDatesRequest,
  PreviewKeyDatesResponse,
  AvailableSystem,
  ScheduleProgressItem,
} from '@release-train/shared';
import { errors } from '../../../common/errors/index.js';
import { prisma } from '../../../prisma/index.js';
import { calculateKeyDates } from '../utils/key-dates.js';
import { executeIdempotent } from '../../../common/idempotency/index.js';

// ========== 内部响应类型 ==========
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

interface TrainDetailResponse {
  id: string;
  name: string;
  description?: string;
  version: number;
  createdBy: { id: string; displayName: string };
  createdAt: string;
  updatedAt: string;
  systems: TrainSystemDetailResponse[];
}

interface TrainListItemResponse {
  id: string;
  name: string;
  description?: string;
  systemCount: number;
  scheduleCount: number;
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
  };
}

interface TrainScheduleListItemResponse {
  id: string;
  trainId: string;
  trainName?: string;
  name: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  boardingDate?: string;
  lockdownDate?: string;
  releaseDate?: string;
  systemCount: number;
  totalCapacity: number;
  usedCapacity: number;
  requirementCount: number;
  createdAt: string;
}

interface TrainScheduleDetailResponse {
  id: string;
  trainId: string;
  name: string;
  status: string;
  startDate?: string;
  endDate?: string;
  boardingDate?: string;
  lockdownDate?: string;
  releaseDate?: string;
  version: number;
  createdBy: { id: string; displayName: string };
  createdAt: string;
  updatedAt: string;
  train: { id: string; name: string };
  snapshots: {
    id: string;
    trainScheduleId: string;
    systemId: string;
    system: { id: string; name: string };
    capacityPoints: number;
    usedPoints: number;
    remainingPoints: number;
    usageRate: number;
  }[];
}

// ========== 辅助函数 ==========

async function getUserDisplayName(userId: string | null): Promise<{ id: string; displayName: string } | undefined> {
  if (!userId) return undefined;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, displayName: true },
  });
  return user ? { id: user.id, displayName: user.displayName } : undefined;
}

async function checkSystemConflict(
  systemId: string,
  excludeTrainId?: string,
): Promise<{ conflict: boolean; train?: { id: string; name: string } }> {
  const trainSystems = await prisma.trainSystem.findMany({
    where: { systemId },
    include: {
      train: {
        select: { id: true, name: true },
      },
    },
  });

  const conflictTrain = trainSystems.find((ts) => {
    if (excludeTrainId && ts.train.id === excludeTrainId) {
      return false;
    }
    return true;
  });

  if (conflictTrain) {
    return {
      conflict: true,
      train: conflictTrain.train as { id: string; name: string },
    };
  }

  return { conflict: false };
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

  const [total, trains] = await Promise.all([
    prisma.train.count({ where }),
    prisma.train.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
      include: {
        trainSystems: {
          select: { id: true, capacityPoints: true },
        },
        schedules: {
          select: { id: true },
        },
      },
    }),
  ]);

  const list: TrainListItemResponse[] = trains.map((train) => {
    const totalCapacity = train.trainSystems.reduce((sum, ts) => sum + ts.capacityPoints, 0);
    return {
      id: train.id,
      name: train.name,
      description: train.description || undefined,
      systemCount: train.trainSystems.length,
      scheduleCount: train.schedules.length,
      totalCapacity,
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
    description: train.description || undefined,
    version: train.version,
    createdBy: train.createdBy,
    createdAt: train.createdAt.toISOString(),
    updatedAt: train.updatedAt.toISOString(),
    systems,
  };
}

// ========== 火车更新 ==========

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
      await tx.train.updateMany({
        where: { id: trainId, version: data.version },
        data: {
          name: data.name?.trim(),
          description: data.description?.trim(),
          version: { increment: 1 },
        },
      });

      const newSystemIds = data.systems!.map(s => s.systemId);
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

      for (const sysItem of data.systems!) {
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

export async function cancelTrain(trainId: string): Promise<void> {
  const train = await prisma.train.findUnique({
    where: { id: trainId },
    include: {
      trainSystems: true,
    },
  });

  if (!train) {
    throw errors.trainNotFound();
  }

  const hasOnboardedRequirements = train.trainSystems.some(ts => ts.usedPoints > 0);
  if (hasOnboardedRequirements) {
    throw errors.trainHasOnboardedRequirements('该火车已有需求纳版，无法取消');
  }

  await prisma.train.delete({
    where: { id: trainId },
  });
}

// ========== 添加/更新/移除搭载系统（保持原有逻辑） ==========

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

export async function removeTrainSystem(trainId: string, systemId: string): Promise<void> {
  const train = await prisma.train.findUnique({ where: { id: trainId } });

  if (!train) {
    throw errors.trainNotFound();
  }

  const trainSystem = await prisma.trainSystem.findUnique({
    where: { id: systemId },
  });

  if (!trainSystem || trainSystem.trainId !== trainId) {
    throw errors.trainSystemNotFound();
  }

  await prisma.trainSystem.delete({ where: { id: systemId } });

  await prisma.train.update({
    where: { id: trainId },
    data: { version: { increment: 1 } },
  });
}

export async function updateTrainSystem(
  trainId: string,
  systemId: string,
  data: UpdateTrainSystemRequest,
): Promise<TrainSystemDetailResponse> {
  const train = await prisma.train.findUnique({ where: { id: trainId } });

  if (!train) {
    throw errors.trainNotFound();
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

export async function getAvailableSystems(trainId?: string): Promise<AvailableSystem[]> {
  const systems = await prisma.system.findMany({
    orderBy: { name: 'asc' },
    include: {
      trainSystems: {
        include: { train: { select: { id: true, name: true } } },
      },
    },
  });

  return systems.map((system) => {
    const conflictTrain = system.trainSystems && (!trainId || system.trainSystems.train.id !== trainId)
      ? system.trainSystems
      : undefined;

    return {
      id: system.id,
      name: system.name,
      conflictTrain: conflictTrain
        ? { id: conflictTrain.train.id, name: conflictTrain.train.name }
        : undefined,
    } as AvailableSystem;
  });
}

// ========== 班次相关函数（v2.0 核心新增） ==========

export async function createTrainSchedule(
  trainId: string,
  data: CreateTrainScheduleRequest & { customKeyDates?: Array<{ name: string; date?: string | null }> },
  userId: string,
): Promise<TrainScheduleDetailResponse> {
  const train = await prisma.train.findUnique({
    where: { id: trainId },
    include: { trainSystems: true },
  });
  if (!train) {
    throw errors.trainNotFound();
  }

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

  // 如果用户手动设置了关键日期，使用用户设置的；否则自动计算
  let boardingDate, sitDate, uatDate, lockdownDate, releaseDate;
  if (data.boardingDate || data.sitDate || data.uatDate || data.lockdownDate || data.releaseDate) {
    boardingDate = data.boardingDate ? new Date(data.boardingDate) : undefined;
    sitDate = data.sitDate ? new Date(data.sitDate) : undefined;
    uatDate = data.uatDate ? new Date(data.uatDate) : undefined;
    lockdownDate = data.lockdownDate ? new Date(data.lockdownDate) : undefined;
    releaseDate = data.releaseDate ? new Date(data.releaseDate) : undefined;
  } else {
    const keyDates = calculateKeyDates(startDate, endDate);
    boardingDate = keyDates.boardingDate;
    sitDate = keyDates.sitDate;
    uatDate = keyDates.uatDate;
    lockdownDate = keyDates.lockdownDate;
    releaseDate = keyDates.releaseDate;
  }

  const scheduleCount = await prisma.trainSchedule.count({ where: { trainId } });
  const scheduleName = data.name?.trim() || `${train.name} - 第${scheduleCount + 1}班`;

  const schedule = await prisma.$transaction(async (tx) => {
    const newSchedule = await tx.trainSchedule.create({
      data: {
        trainId,
        name: scheduleName,
        startDate,
        endDate,
        boardingDate,
        sitDate,
        uatDate,
        lockdownDate,
        releaseDate,
        createdById: userId,
      },
      include: {
        createdBy: { select: { id: true, displayName: true } },
      },
    });

    for (const trainSystem of train.trainSystems) {
      await tx.trainSystemSnapshot.create({
        data: {
          trainScheduleId: newSchedule.id,
          systemId: trainSystem.systemId,
          capacityPoints: trainSystem.capacityPoints,
          usedPoints: 0,                   // 新班次从零开始
          baUserId: trainSystem.baUserId,
          pmUserId: trainSystem.pmUserId,
          techMgrUserId: trainSystem.techMgrUserId,
          testMgrUserId: trainSystem.testMgrUserId,
          devTeamUserIds: trainSystem.devTeamUserIds,
        },
      });
    }

    if (data.customKeyDates && data.customKeyDates.length > 0) {
      for (const customKeyDate of data.customKeyDates) {
        await tx.trainScheduleKeyDate.create({
          data: {
            trainScheduleId: newSchedule.id,
            name: customKeyDate.name,
            date: customKeyDate.date ? new Date(customKeyDate.date) : null,
          },
        });
      }
    }

    return newSchedule;
  });

  return getTrainScheduleById(schedule.id) as Promise<TrainScheduleDetailResponse>;
}

export async function listTrainSchedules(
  trainId: string,
): Promise<{ list: TrainScheduleListItemResponse[] }> {
  const train = await prisma.train.findUnique({ where: { id: trainId } });
  if (!train) {
    throw errors.trainNotFound();
  }

  const schedules = await prisma.trainSchedule.findMany({
    where: { trainId },
    orderBy: { createdAt: 'desc' },
    include: {
      snapshots: {
        select: { id: true, capacityPoints: true, usedPoints: true },
      },
      requirements: {
        select: { id: true },
      },
    },
  });

  const list = schedules.map((s) => {
    const totalCapacity = s.snapshots.reduce((sum, snap) => sum + snap.capacityPoints, 0);
    const usedCapacity = s.snapshots.reduce((sum, snap) => sum + snap.usedPoints, 0);

    return {
      id: s.id,
      trainId: s.trainId,
      trainName: train.name,
      status: s.status,
      name: s.name,
      startDate: s.startDate?.toISOString().split('T')[0],
      endDate: s.endDate?.toISOString().split('T')[0],
      boardingDate: s.boardingDate?.toISOString().split('T')[0],
      lockdownDate: s.lockdownDate?.toISOString().split('T')[0],
      releaseDate: s.releaseDate?.toISOString().split('T')[0],
      systemCount: s.snapshots.length,
      totalCapacity,
      usedCapacity,
      requirementCount: s.requirements.length,
      createdAt: s.createdAt.toISOString(),
      version: s.version,
    };
  });

  return { list };
}

export async function listAllSchedules(
  query: { page?: number; pageSize?: number }
): Promise<{ list: any[]; pagination: any }> {
  // 参数校验：处理边界值和无效参数
  const MAX_PAGE_SIZE = 100;
  const DEFAULT_PAGE_SIZE = 20;
  const DEFAULT_PAGE = 1;

  // page 校验：非正数时使用默认值
  const page = (query.page && query.page > 0) ? query.page : DEFAULT_PAGE;

  // pageSize 校验：非正数时使用默认值，超过最大值时截断
  const pageSize = (query.pageSize && query.pageSize > 0)
    ? Math.min(query.pageSize, MAX_PAGE_SIZE)
    : DEFAULT_PAGE_SIZE;

  const skip = (page - 1) * pageSize;

  const [total, schedules] = await Promise.all([
    prisma.trainSchedule.count(),
    prisma.trainSchedule.findMany({
      skip,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
      include: {
        train: {
          select: { id: true, name: true },
        },
        snapshots: {
          select: { id: true, capacityPoints: true, usedPoints: true },
        },
        requirements: {
          select: { id: true },
        },
      },
    }),
  ]);

  const list = schedules.map((s) => {
    const totalCapacity = s.snapshots.reduce((sum, snap) => sum + snap.capacityPoints, 0);
    const usedCapacity = s.snapshots.reduce((sum, snap) => sum + snap.usedPoints, 0);

    return {
      id: s.id,
      trainId: s.trainId,
      trainName: s.train.name,
      status: s.status,
      name: s.name,
      startDate: s.startDate?.toISOString().split('T')[0],
      endDate: s.endDate?.toISOString().split('T')[0],
      boardingDate: s.boardingDate?.toISOString().split('T')[0],
      lockdownDate: s.lockdownDate?.toISOString().split('T')[0],
      releaseDate: s.releaseDate?.toISOString().split('T')[0],
      systemCount: s.snapshots.length,
      totalCapacity,
      usedCapacity,
      requirementCount: s.requirements.length,
      createdAt: s.createdAt.toISOString(),
      version: s.version,
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

export async function getTrainScheduleById(
  scheduleId: string,
): Promise<any> {
  const schedule = await prisma.trainSchedule.findUnique({
    where: { id: scheduleId },
    include: {
      createdBy: { select: { id: true, displayName: true } },
      train: { select: { id: true, name: true } },
      snapshots: {
        include: {
          system: { select: { id: true, name: true } },
        },
      },
      keyDates: true,
    },
  });

  if (!schedule) {
    throw errors.trainNotFound();
  }

  const snapshots = schedule.snapshots.map((snap) => {
    const remainingPoints = snap.capacityPoints - snap.usedPoints;
    const usageRate = snap.capacityPoints > 0
      ? Math.round((snap.usedPoints / snap.capacityPoints) * 10000) / 100
      : 0;

    return {
      id: snap.id,
      trainScheduleId: snap.trainScheduleId,
      systemId: snap.systemId,
      system: snap.system,
      capacityPoints: snap.capacityPoints,
      usedPoints: snap.usedPoints,
      remainingPoints,
      usageRate,
    };
  });

  const customKeyDates = schedule.keyDates.map((kd) => ({
    id: kd.id,
    name: kd.name,
    date: kd.date?.toISOString().split('T')[0] || null,
  }));

  return {
    id: schedule.id,
    trainId: schedule.trainId,
    name: schedule.name,
    status: schedule.status,
    startDate: schedule.startDate?.toISOString().split('T')[0],
    endDate: schedule.endDate?.toISOString().split('T')[0],
    boardingDate: schedule.boardingDate?.toISOString().split('T')[0],
    sitDate: schedule.sitDate?.toISOString().split('T')[0],
    uatDate: schedule.uatDate?.toISOString().split('T')[0],
    lockdownDate: schedule.lockdownDate?.toISOString().split('T')[0],
    releaseDate: schedule.releaseDate?.toISOString().split('T')[0],
    customKeyDates,
    version: schedule.version,
    createdBy: schedule.createdBy,
    createdAt: schedule.createdAt.toISOString(),
    updatedAt: schedule.updatedAt.toISOString(),
    train: schedule.train,
    snapshots,
  };
}

export async function updateTrainSchedule(
  scheduleId: string,
  data: UpdateTrainScheduleRequest & { customKeyDates?: Array<{ id?: string; name: string; date?: string | null }> },
): Promise<TrainScheduleDetailResponse> {
  const schedule = await prisma.trainSchedule.findUnique({
    where: { id: scheduleId },
  });

  if (!schedule) {
    throw errors.trainNotFound();
  }

  const updateData: any = {
    version: { increment: 1 },
  };

  if (data.name !== undefined) {
    updateData.name = data.name.trim();
  }

  // 处理日期更新
  let startDate = schedule.startDate;
  let endDate = schedule.endDate;
  let needCalculateKeyDates = false;

  if (data.startDate !== undefined) {
    startDate = data.startDate ? new Date(data.startDate) : null;
    updateData.startDate = startDate;
    needCalculateKeyDates = true;
  }

  if (data.endDate !== undefined) {
    endDate = data.endDate ? new Date(data.endDate) : null;
    updateData.endDate = endDate;
    needCalculateKeyDates = true;
  }

  // 如果更新了开始或结束日期，验证日期有效性
  if (needCalculateKeyDates && startDate && endDate) {
    if (endDate <= startDate) {
      throw errors.trainScheduleEndDateInvalid('结束时间必须晚于开始时间');
    }
  }

  // 处理关键日期 - 优先使用用户手动设置的
  if (data.boardingDate !== undefined) {
    updateData.boardingDate = data.boardingDate ? new Date(data.boardingDate) : null;
  } else if (needCalculateKeyDates && startDate && endDate) {
    // 只有在用户没有手动设置，并且更新了开始/结束日期时，才重新计算
    const newKeyDates = calculateKeyDates(startDate, endDate);
    updateData.boardingDate = newKeyDates.boardingDate;
  }

  if (data.sitDate !== undefined) {
    updateData.sitDate = data.sitDate ? new Date(data.sitDate) : null;
  } else if (needCalculateKeyDates && startDate && endDate) {
    const newKeyDates = calculateKeyDates(startDate, endDate);
    updateData.sitDate = newKeyDates.sitDate;
  }

  if (data.uatDate !== undefined) {
    updateData.uatDate = data.uatDate ? new Date(data.uatDate) : null;
  } else if (needCalculateKeyDates && startDate && endDate) {
    const newKeyDates = calculateKeyDates(startDate, endDate);
    updateData.uatDate = newKeyDates.uatDate;
  }

  if (data.lockdownDate !== undefined) {
    updateData.lockdownDate = data.lockdownDate ? new Date(data.lockdownDate) : null;
  } else if (needCalculateKeyDates && startDate && endDate) {
    const newKeyDates = calculateKeyDates(startDate, endDate);
    updateData.lockdownDate = newKeyDates.lockdownDate;
  }

  if (data.releaseDate !== undefined) {
    updateData.releaseDate = data.releaseDate ? new Date(data.releaseDate) : null;
  } else if (needCalculateKeyDates && startDate && endDate) {
    const newKeyDates = calculateKeyDates(startDate, endDate);
    updateData.releaseDate = newKeyDates.releaseDate;
  }

  // 处理自定义关键日期
  await prisma.$transaction(async (tx) => {
    if (data.version !== undefined) {
      const result = await tx.trainSchedule.updateMany({
        where: { id: scheduleId, version: data.version },
        data: updateData,
      });

      if (result.count === 0) {
        const current = await tx.trainSchedule.findUnique({
          where: { id: scheduleId },
          select: { version: true },
        });
        if (!current) {
          throw errors.trainNotFound();
        }
        if (current.version !== data.version) {
          throw errors.trainVersionConflict();
        }
        throw errors.trainNotFound();
      }
    } else {
      await tx.trainSchedule.update({
        where: { id: scheduleId },
        data: updateData,
      });
    }

    if (data.customKeyDates !== undefined) {
      // 删除旧的自定义关键日期
      await tx.trainScheduleKeyDate.deleteMany({
        where: { trainScheduleId: scheduleId },
      });

      // 创建新的自定义关键日期
      if (data.customKeyDates.length > 0) {
        for (const customKeyDate of data.customKeyDates) {
          await tx.trainScheduleKeyDate.create({
            data: {
              trainScheduleId: scheduleId,
              name: customKeyDate.name,
              date: customKeyDate.date ? new Date(customKeyDate.date) : null,
            },
          });
        }
      }
    }
  });

  return getTrainScheduleById(scheduleId) as Promise<TrainScheduleDetailResponse>;
}

export async function updateTrainScheduleStatus(
  scheduleId: string,
  status: string,
  idempotencyKey?: string
): Promise<TrainScheduleDetailResponse> {
  const schedule = await prisma.trainSchedule.findUnique({ where: { id: scheduleId } });
  if (!schedule) throw errors.trainNotFound();

  const validTransitions: Record<string, string[]> = {
    PLANNING: ['IN_PROGRESS'],
    IN_PROGRESS: ['LOCKED_DOWN'],
    LOCKED_DOWN: ['RELEASED'],
    RELEASED: [],
  };

  if (!validTransitions[schedule.status]?.includes(status)) {
    throw errors.badRequest(`不能从 ${schedule.status} 变更为 ${status}`);
  }

  const updateData: any = { status };
  if (status === 'LOCKED_DOWN') {
    updateData.lockdownDate = new Date();
  }
  if (status === 'RELEASED') {
    updateData.releaseDate = new Date();
  }

  const performUpdate = async (): Promise<TrainScheduleDetailResponse> => {
    await prisma.$transaction(async (tx) => {
      await tx.trainSchedule.update({
        where: { id: scheduleId },
        data: updateData,
      });

      if (status === 'LOCKED_DOWN') {
        await tx.requirement.updateMany({
          where: {
            scheduleId,
            status: 'ONBOARDED',
          },
          data: {
            subStatus: 'FROZEN',
          },
        });
      }

      if (status === 'RELEASED') {
        await tx.requirement.updateMany({
          where: {
            scheduleId,
            status: 'ONBOARDED',
          },
          data: {
            status: 'RELEASED',
          },
        });
      }
    });

    return getTrainScheduleById(scheduleId) as Promise<TrainScheduleDetailResponse>;
  };

  if (idempotencyKey) {
    const idempotencyKeyFull = `updateScheduleStatus:${scheduleId}:${idempotencyKey}`;
    return executeIdempotent(idempotencyKeyFull, performUpdate);
  }

  return performUpdate();
}

export async function cancelTrainSchedule(scheduleId: string): Promise<void> {
  const schedule = await prisma.trainSchedule.findUnique({
    where: { id: scheduleId },
    include: {
      requirements: {
        select: { id: true, status: true },
      },
    },
  });

  if (!schedule) {
    throw errors.trainNotFound();
  }

  // 使用事务：取消班次时，将已纳版的需求状态改为 READY
  await prisma.$transaction(async (tx) => {
    // 将该班次下所有 ONBOARDED 状态的需求改为 READY
    await tx.requirement.updateMany({
      where: {
        scheduleId,
        status: 'ONBOARDED',
      },
      data: {
        status: 'READY',
        scheduleId: null,
      },
    });

    // 删除班次
    await tx.trainSchedule.delete({
      where: { id: scheduleId },
    });
  });
}

export async function previewKeyDates(
  data: PreviewKeyDatesRequest,
): Promise<PreviewKeyDatesResponse> {
  const startDate = new Date(data.startDate);
  const endDate = new Date(data.endDate);

  if (isNaN(startDate.getTime())) {
    throw errors.trainScheduleDateInvalid('开始日期格式无效');
  }
  if (isNaN(endDate.getTime())) {
    throw errors.trainScheduleDateInvalid('结束日期格式无效');
  }

  if (endDate <= startDate) {
    throw errors.trainScheduleEndDateInvalid('结束时间必须晚于开始时间');
  }

  const keyDates = calculateKeyDates(startDate, endDate);

  return {
    boardingDate: keyDates.boardingDate.toISOString().split('T')[0],
    sitDate: keyDates.sitDate.toISOString().split('T')[0],
    uatDate: keyDates.uatDate.toISOString().split('T')[0],
    lockdownDate: keyDates.lockdownDate.toISOString().split('T')[0],
    releaseDate: keyDates.releaseDate.toISOString().split('T')[0],
  };
}

// ========== US2.5 - 纳版搭载相关函数 ==========

function getRiskLevel(
  status: string,
  dependencyScheduleId: string | null,
  targetScheduleId: string,
): 'none' | 'warning' | 'high' | 'critical' {
  if (status === 'RELEASED') return 'none';
  if (status === 'ONBOARDED' && dependencyScheduleId === targetScheduleId) return 'none';
  
  if (status === 'CANCELLED') return 'critical';
  
  if (status === 'DRAFT' || status === 'PENDING_REVIEW' || status === 'REJECTED') return 'high';
  
  if (status === 'READY') return 'warning';
  
  return 'warning';
}

function getRiskMessage(riskLevel: string, reqCode: string, status: string): string {
  switch (riskLevel) {
    case 'none':
      return `依赖 ${reqCode} 已满足`;
    case 'warning':
      return `依赖 ${reqCode} 已就绪但未纳入本车，纳版后可能影响开发进度`;
    case 'high':
      return `依赖 ${reqCode} 状态为[${status}]，纳版后可能阻塞开发`;
    case 'critical':
      return `依赖 ${reqCode} 已取消，请重新评估需求依赖`;
    default:
      return `依赖 ${reqCode} 状态异常`;
  }
}

async function checkDependencyRisk(
  requirementId: string,
  scheduleId: string,
): Promise<{ hasRisk: boolean; risks: any[] }> {
  const dependencies = await prisma.requirementDependency.findMany({
    where: { dependantId: requirementId },
    include: {
      dependency: {
        select: {
          id: true,
          reqCode: true,
          title: true,
          status: true,
          scheduleId: true,
        },
      },
    },
  });

  if (dependencies.length === 0) {
    return { hasRisk: false, risks: [] };
  }

  const risks: any[] = [];

  for (const dep of dependencies) {
    const { dependency } = dep;
    const riskLevel = getRiskLevel(dependency.status, dependency.scheduleId, scheduleId);
    
    risks.push({
      dependencyId: dependency.id,
      reqCode: dependency.reqCode,
      title: dependency.title,
      dependencyStatus: dependency.status,
      riskLevel,
      message: getRiskMessage(riskLevel, dependency.reqCode, dependency.status),
    });
  }

  const hasRisk = risks.some((r) => r.riskLevel !== 'none');

  return { hasRisk, risks };
}

async function checkCapacityImpact(
  scheduleId: string,
  requirementSystemId: string,
  storyPoints: number,
): Promise<any> {
  const snapshot = await prisma.trainSystemSnapshot.findUnique({
    where: {
      trainScheduleId_systemId: { trainScheduleId: scheduleId, systemId: requirementSystemId },
    },
    include: {
      system: { select: { name: true } },
    },
  });

  if (!snapshot) {
    return {
      valid: false,
      error: 'SYSTEM_NOT_CONFIGURED',
      message: '需求归属系统未配置到本车次',
    };
  }

  const remainingPoints = snapshot.capacityPoints - snapshot.usedPoints;
  const afterOnboard = remainingPoints - storyPoints;
  const hasCapacity = afterOnboard >= 0;

  return {
    valid: true,
    hasCapacity,
    systemName: snapshot.system.name,
    capacityPoints: snapshot.capacityPoints,
    usedPoints: snapshot.usedPoints,
    remainingPoints,
    afterOnboard,
    storyPoints,
  };
}

export async function precheckOnboard(
  scheduleId: string,
  requirementIds: string[],
): Promise<any> {
  const schedule = await prisma.trainSchedule.findUnique({
    where: { id: scheduleId },
    include: {
      snapshots: true,
    },
  });

  if (!schedule) {
    throw errors.trainNotFound();
  }

  const results: any[] = [];
  let canOnboardCount = 0;
  let hasDependencyRiskCount = 0;
  let hasCapacityWarningCount = 0;
  let lockdownBlockedCount = 0;

  // 封板后的纳版限制：只允许经过紧急变更审批的需求
  const isLockedDown = (schedule.status as string) === 'LOCKED_DOWN';

  for (const reqId of requirementIds) {
    const req = await prisma.requirement.findUnique({
      where: { id: reqId },
      include: {
        system: { select: { id: true, name: true } },
      },
    });

    if (!req) {
      continue;
    }

    const systemConfigured = schedule.snapshots.some(s => s.systemId === req.systemId);
    const dependencyCheck = await checkDependencyRisk(reqId, scheduleId);
    const capacityCheck = await checkCapacityImpact(scheduleId, req.systemId, req.storyPoints);

    // 封板班次：检查需求是否有已审批的紧急变更
    let blockedByLockdown = false;
    if (isLockedDown) {
      const emergencyApproved = await prisma.emergencyChange.findFirst({
        where: { requirementId: reqId, status: 'APPROVED' },
      });
      if (!emergencyApproved) {
        blockedByLockdown = true;
        lockdownBlockedCount++;
      }
    }

    const result = {
      requirementId: req.id,
      reqCode: req.reqCode,
      title: req.title,
      system: req.system,
      storyPoints: req.storyPoints,
      systemConfigured,
      dependencyCheck,
      capacityCheck,
      blockedByLockdown,        // 封板阻断标记（v2.0 新增）
    };

    results.push(result);

    if (systemConfigured && req.status === 'READY' && !blockedByLockdown) {
      canOnboardCount++;
    }
    if (dependencyCheck.hasRisk) {
      hasDependencyRiskCount++;
    }
    if (!capacityCheck.hasCapacity) {
      hasCapacityWarningCount++;
    }
  }

  return {
    valid: true,
    results,
    summary: {
      totalCount: results.length,
      canOnboardCount,
      hasDependencyRiskCount,
      hasCapacityWarningCount,
      lockdownBlockedCount,      // 封板阻断数（v2.0 新增）
      isLockedDown,              // 班次是否已封板（v2.0 新增）
    },
  };
}

export async function getReadyRequirements(
  scheduleId: string,
): Promise<any> {
  // 获取班次信息和关联的火车
  const schedule = await prisma.trainSchedule.findUnique({
    where: { id: scheduleId },
    include: { train: { include: { trainSystems: { select: { systemId: true } } } } },
  });

  if (!schedule) {
    throw errors.trainNotFound();
  }

  const systemIds = schedule.train.trainSystems.map(ts => ts.systemId);

  const requirements = await prisma.requirement.findMany({
    where: {
      status: 'READY',
      systemId: { in: systemIds },
    },
    include: {
      system: { select: { id: true, name: true } },
      ba: { select: { id: true, displayName: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return {
    list: requirements.map(req => ({
      id: req.id,
      reqCode: req.reqCode,
      title: req.title,
      system: req.system,
      priority: req.priority,
      storyPoints: req.storyPoints,
      status: req.status,
      subStatus: req.subStatus,
      ba: req.ba,
      createdAt: req.createdAt.toISOString(),
    })),
  };
}

export async function getOnboardedRequirements(
  scheduleId: string,
): Promise<any> {
  // 获取班次信息和关联的火车
  const schedule = await prisma.trainSchedule.findUnique({
    where: { id: scheduleId },
    include: { train: { include: { trainSystems: { select: { systemId: true } } } } },
  });

  if (!schedule) {
    throw errors.trainNotFound();
  }

  const systemIds = schedule.train.trainSystems.map(ts => ts.systemId);

  const requirements = await prisma.requirement.findMany({
    where: {
      status: { in: ['ONBOARDED', 'RELEASED'] }, // 已纳版 + 已投产
      scheduleId: scheduleId,                 // 只查本班次的需求
      systemId: { in: systemIds },
    },
    include: {
      system: { select: { id: true, name: true } },
      ba: { select: { id: true, displayName: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return {
    list: requirements.map(req => ({
      id: req.id,
      reqCode: req.reqCode,
      title: req.title,
      system: req.system,
      priority: req.priority,
      storyPoints: req.storyPoints,
      status: req.status,
      subStatus: req.subStatus,
      ba: req.ba,
      createdAt: req.createdAt.toISOString(),
    })),
  };
}

export async function onboardRequirements(
  scheduleId: string,
  data: any,
  userId: string,
): Promise<any> {
  const schedule = await prisma.trainSchedule.findUnique({
    where: { id: scheduleId },
  });

  if (!schedule) {
    throw errors.trainNotFound();
  }

  // 封板后的纳版限制：只允许经过紧急变更审批的需求
  const isLockedDown = (schedule.status as string) === 'LOCKED_DOWN';

  let onboardedCount = 0;

  await prisma.$transaction(async (tx) => {
    for (const reqId of data.requirementIds) {
      const req = await tx.requirement.findUnique({
        where: { id: reqId },
      });

      if (!req) {
        continue;
      }
      if (req.status !== 'READY') {
        continue;
      }

      // 封板班次：检查需求是否有已审批的紧急变更
      if (isLockedDown) {
        const emergencyApproved = await tx.emergencyChange.findFirst({
          where: { requirementId: reqId, status: 'APPROVED' },
        });
        if (!emergencyApproved) {
          continue; // 跳过未经过紧急变更审批的需求
        }
      }

      const snapshot = await tx.trainSystemSnapshot.findUnique({
        where: {
          trainScheduleId_systemId: { trainScheduleId: scheduleId, systemId: req.systemId },
        },
      });

      if (!snapshot) {
        continue;
      }

      await tx.requirement.update({
        where: { id: reqId },
        data: {
          status: 'ONBOARDED',
          subStatus: 'DEV_IN_PROGRESS',
          scheduleId: scheduleId,
        },
      });

      await tx.trainSystemSnapshot.update({
        where: { id: snapshot.id },
        data: {
          usedPoints: { increment: req.storyPoints },
        },
      });

      await tx.statusLog.create({
        data: {
          requirementId: reqId,
          operationType: 'ONBOARD',
          fromStatus: req.status,
          toStatus: 'ONBOARDED',
          operatorId: userId,
        },
      });

      onboardedCount++;
    }
  });

  return {
    success: true,
    onboardedCount,
  };
}

// ========== US2.6 - 从火车移除相关函数 ==========
export async function removeFromTrain(
  scheduleId: string,
  requirementId: string,
  reason: string,
  userId: string,
): Promise<any> {
  const schedule = await prisma.trainSchedule.findUnique({
    where: { id: scheduleId },
  });

  if (!schedule) {
    throw errors.trainNotFound();
  }

  await prisma.$transaction(async (tx) => {
    const req = await tx.requirement.findUnique({
      where: { id: requirementId },
    });

    if (!req) {
      throw errors.requirementNotFound();
    }
    if (req.status !== 'ONBOARDED') {
      throw errors.badRequest('只有已纳版的需求可移除');
    }
    if (req.scheduleId !== scheduleId) {
      throw errors.badRequest('该需求不属于本车次');
    }

    const snapshot = await tx.trainSystemSnapshot.findUnique({
      where: {
        trainScheduleId_systemId: { trainScheduleId: scheduleId, systemId: req.systemId },
      },
    });

    await tx.requirement.update({
      where: { id: requirementId },
      data: {
        status: 'READY',
        subStatus: null,
        scheduleId: null,
      },
    });

    if (snapshot) {
      await tx.trainSystemSnapshot.update({
        where: { id: snapshot.id },
        data: {
          usedPoints: { decrement: req.storyPoints },
        },
      });
    }

    await tx.statusLog.create({
      data: {
        requirementId,
        operationType: 'REMOVE',
        fromStatus: req.status,
        toStatus: 'READY',
        reason,
        operatorId: userId,
      },
    });
  });

  return { success: true };
}

export async function batchRemoveFromTrain(
  scheduleId: string,
  requirementIds: string[],
  reason: string,
  userId: string,
): Promise<any> {
  let count = 0;

  await prisma.$transaction(async (tx) => {
    for (const reqId of requirementIds) {
      const req = await tx.requirement.findUnique({
        where: { id: reqId },
      });

      if (!req || req.status !== 'ONBOARDED' || req.scheduleId !== scheduleId) {
        continue;
      }

      const snapshot = await tx.trainSystemSnapshot.findUnique({
        where: {
          trainScheduleId_systemId: { trainScheduleId: scheduleId, systemId: req.systemId },
        },
      });

      await tx.requirement.update({
        where: { id: reqId },
        data: {
          status: 'READY',
          subStatus: null,
          scheduleId: null,
        },
      });

      if (snapshot) {
        await tx.trainSystemSnapshot.update({
          where: { id: snapshot.id },
          data: {
            usedPoints: { decrement: req.storyPoints },
          },
        });
      }

      await tx.statusLog.create({
        data: {
          requirementId: reqId,
          operationType: 'REMOVE',
          fromStatus: req.status,
          toStatus: 'READY',
          reason,
          operatorId: userId,
        },
      });

      count++;
    }
  });

  return { success: true, count };
}

// ========== US2.7 - 确认投产相关函数 ==========
export async function releaseRequirement(
  scheduleId: string,
  requirementId: string,
  userId: string,
): Promise<any> {
  const schedule = await prisma.trainSchedule.findUnique({
    where: { id: scheduleId },
  });

  if (!schedule) {
    throw errors.trainNotFound();
  }

  await prisma.$transaction(async (tx) => {
    const req = await tx.requirement.findUnique({
      where: { id: requirementId },
    });

    if (!req) {
      throw errors.requirementNotFound();
    }
    if (req.status !== 'ONBOARDED') {
      throw errors.badRequest('只有已纳版的需求可投产');
    }
    if (req.scheduleId !== scheduleId) {
      throw errors.badRequest('该需求不属于本车次');
    }

    await tx.requirement.update({
      where: { id: requirementId },
      data: {
        status: 'RELEASED',
        subStatus: null,
      },
    });

    await tx.statusLog.create({
      data: {
        requirementId,
        operationType: 'RELEASE',
        fromStatus: req.status,
        toStatus: 'RELEASED',
        operatorId: userId,
      },
    });
  });

  return { success: true };
}

export async function batchReleaseRequirements(
  scheduleId: string,
  requirementIds: string[],
  userId: string,
): Promise<any> {
  let count = 0;

  await prisma.$transaction(async (tx) => {
    for (const reqId of requirementIds) {
      const req = await tx.requirement.findUnique({
        where: { id: reqId },
      });

      if (!req || req.status !== 'ONBOARDED' || req.scheduleId !== scheduleId) {
        continue;
      }

      await tx.requirement.update({
        where: { id: reqId },
        data: {
          status: 'RELEASED',
          subStatus: null,
        },
      });

      await tx.statusLog.create({
        data: {
          requirementId: reqId,
          operationType: 'RELEASE',
          fromStatus: req.status,
          toStatus: 'RELEASED',
          operatorId: userId,
        },
      });

      count++;
    }
  });

  return { success: true, count };
}

// ========== US2.8 - 回滚相关函数 ==========
export async function rollbackRequirement(
  scheduleId: string,
  requirementId: string,
  reason: string,
  userId: string,
): Promise<any> {
  const schedule = await prisma.trainSchedule.findUnique({
    where: { id: scheduleId },
  });

  if (!schedule) {
    throw errors.trainNotFound();
  }

  await prisma.$transaction(async (tx) => {
    const req = await tx.requirement.findUnique({
      where: { id: requirementId },
    });

    if (!req) {
      throw errors.requirementNotFound();
    }
    if (req.status !== 'RELEASED') {
      throw errors.badRequest('只有已投产的需求可回滚');
    }
    if (req.scheduleId !== scheduleId) {
      throw errors.badRequest('该需求不属于本车次');
    }

    await tx.requirement.update({
      where: { id: requirementId },
      data: {
        status: 'READY',
        subStatus: null,
        // 保留 scheduleId，不清除
      },
    });

    await tx.statusLog.create({
      data: {
        requirementId,
        operationType: 'ROLLBACK',
        fromStatus: req.status,
        toStatus: 'READY',
        reason,
        operatorId: userId,
      },
    });
  });

  return { success: true };
}

// ========== US2.9 - 完成火车相关函数 ==========
export async function checkComplete(
  trainId: string,
): Promise<any> {
  const train = await prisma.train.findUnique({
    where: { id: trainId },
    include: {
      schedules: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        include: {
          requirements: {
            where: { status: 'ONBOARDED' },
            select: { id: true, reqCode: true, title: true },
          },
        },
      },
    },
  });

  if (!train) {
    throw errors.trainNotFound();
  }

  const latestSchedule = train.schedules[0];
  const currentDate = new Date().toISOString().split('T')[0];
  let releaseDatePassed = false;
  let releaseDate = '';
  let onboardedRequirementsCount = 0;
  let onboardedRequirements: any[] = [];

  if (latestSchedule) {
    releaseDate = latestSchedule.releaseDate ? latestSchedule.releaseDate.toISOString().split('T')[0] : '';
    releaseDatePassed = latestSchedule.releaseDate ? new Date() >= latestSchedule.releaseDate : false;
    onboardedRequirementsCount = latestSchedule.requirements.length;
    onboardedRequirements = latestSchedule.requirements;
  }

  const canComplete = releaseDatePassed && onboardedRequirementsCount === 0;

  return {
    canComplete,
    releaseDatePassed,
    currentDate,
    releaseDate,
    onboardedRequirementsCount,
    onboardedRequirements,
  };
}

export async function completeTrain(
  trainId: string,
): Promise<any> {
  const checkResult = await checkComplete(trainId);

  if (!checkResult.canComplete) {
    throw errors.badRequest('不满足完成条件');
  }

  return { success: true };
}

// ========== API-04: 班次进度聚合 ==========
export async function getScheduleProgress(params: {
  trainId?: string;
}): Promise<ScheduleProgressItem[]> {
  const where: Prisma.TrainScheduleWhereInput = {};
  if (params.trainId) {
    where.trainId = params.trainId;
  }

  const schedules = await prisma.trainSchedule.findMany({
    where,
    include: {
      train: { select: { id: true, name: true } },
    },
    orderBy: { startDate: 'asc' },
  });

  const now = new Date();

  return Promise.all(schedules.map(async schedule => {
    let currentPhase: ScheduleProgressItem['currentPhase'] = 'planning';
    let progress: number = 0;

    // 基于班次状态计算阶段
    if (schedule.status === 'RELEASED') {
      currentPhase = 'released';
      progress = 100;
    } else if (schedule.status === 'LOCKED_DOWN') {
      currentPhase = 'pre-release';
      progress = 85;
    } else if (schedule.status === 'IN_PROGRESS') {
      currentPhase = 'testing';
      progress = 60;
    } else {
      currentPhase = 'planning';
      progress = 25;
    }

    // 查询班次下的需求统计
    const [totalRequirements, completedCount] = await Promise.all([
      prisma.requirement.count({
        where: { scheduleId: schedule.id },
      }),
      prisma.requirement.count({
        where: {
          scheduleId: schedule.id,
          status: { in: ['ONBOARDED', 'RELEASED'] },
        },
      }),
    ]);

    // 查询容量快照
    const snapshots = await prisma.trainSystemSnapshot.findMany({
      where: { trainScheduleId: schedule.id },
      select: { capacityPoints: true, usedPoints: true },
    });
    const capacityTotal = snapshots.reduce((sum, s) => sum + s.capacityPoints, 0);
    const capacityUsed = snapshots.reduce((sum, s) => sum + s.usedPoints, 0);

    const progressPercent = totalRequirements > 0
      ? Math.round((completedCount / totalRequirements) * 100)
      : progress;

    return {
      id: schedule.id,
      scheduleId: schedule.id,
      trainId: schedule.train.id,
      scheduleName: schedule.name,
      trainName: schedule.train.name,
      version: String(schedule.version),
      status: schedule.status as ScheduleProgressItem['status'],
      currentPhase,
      totalRequirements,
      completedCount,
      inProgressCount: totalRequirements - completedCount,
      capacityUsed,
      capacityTotal,
      progress,
      progressPercent,
      startDate: schedule.startDate ? schedule.startDate.toISOString() : new Date().toISOString(),
      endDate: schedule.endDate ? schedule.endDate.toISOString() : null,
      boardingDate: schedule.boardingDate ? schedule.boardingDate.toISOString() : null,
      sitDate: schedule.sitDate ? schedule.sitDate.toISOString() : null,
      uatDate: schedule.uatDate ? schedule.uatDate.toISOString() : null,
      uatEndDate: null,
      lockdownDate: schedule.lockdownDate ? schedule.lockdownDate.toISOString() : null,
      releaseDate: schedule.releaseDate ? schedule.releaseDate.toISOString() : null,
    };
  }));
}

export type {
  TrainDetailResponse,
  TrainSystemDetailResponse,
  TrainListItemResponse,
  TrainListResponseData,
  AvailableSystemResponse,
  TrainScheduleListItemResponse,
  TrainScheduleDetailResponse,
};
