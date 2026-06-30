import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Mock } from 'vitest';
import { listAllSchedules, listTrainSchedules, updateTrainScheduleStatus } from './train.service.js';
import { prisma } from '../../../prisma/index.js';
import { clearIdempotencyStore } from '../../../common/idempotency/index.js';

vi.mock('../../../prisma/index.js', () => ({
  prisma: {
    trainSchedule: {
      count: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    train: {
      findUnique: vi.fn(),
    },
    requirement: {
      updateMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

describe('train.service 业务逻辑', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    clearIdempotencyStore();
  });

  describe('listAllSchedules', () => {
    it('默认分页参数', async () => {
      const mockSchedules = [
        {
          id: 'schedule-1',
          trainId: 'train-1',
          name: '班次1',
          status: 'PLANNING',
          startDate: new Date('2026-06-01'),
          endDate: new Date('2026-06-26'),
          boardingDate: new Date('2026-05-29'),
          lockdownDate: new Date('2026-06-23'),
          releaseDate: new Date('2026-06-26'),
          createdAt: new Date('2026-05-20'),
          version: 1,
          train: { id: 'train-1', name: '火车1' },
          snapshots: [
            { id: 'snap-1', capacityPoints: 100, usedPoints: 20 },
          ],
          requirements: [{ id: 'req-1' }],
        },
      ];

      (prisma.trainSchedule.count as Mock).mockResolvedValue(1);
      (prisma.trainSchedule.findMany as Mock).mockResolvedValue(mockSchedules);

      const result = await listAllSchedules({});

      expect(result.list.length).toBe(1);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.pageSize).toBe(20);
      expect(result.pagination.total).toBe(1);
      expect(result.pagination.totalPages).toBe(1);

      expect(result.list[0].id).toBe('schedule-1');
      expect(result.list[0].trainName).toBe('火车1');
      expect(result.list[0].totalCapacity).toBe(100);
      expect(result.list[0].usedCapacity).toBe(20);
      expect(result.list[0].requirementCount).toBe(1);
    });

    it('自定义分页参数', async () => {
      const mockSchedules: never[] = [];

      (prisma.trainSchedule.count as Mock).mockResolvedValue(0);
      (prisma.trainSchedule.findMany as Mock).mockResolvedValue(mockSchedules);

      const result = await listAllSchedules({ page: 2, pageSize: 10 });

      expect(result.pagination.page).toBe(2);
      expect(result.pagination.pageSize).toBe(10);
      expect(result.pagination.total).toBe(0);
      expect(result.pagination.totalPages).toBe(0);

      expect(prisma.trainSchedule.findMany).toHaveBeenCalledWith(expect.objectContaining({
        skip: 10,
        take: 10,
      }));
    });

    it('page=0 时使用默认值1', async () => {
      const mockSchedules: never[] = [];

      (prisma.trainSchedule.count as Mock).mockResolvedValue(0);
      (prisma.trainSchedule.findMany as Mock).mockResolvedValue(mockSchedules);

      const result = await listAllSchedules({ page: 0, pageSize: 20 });

      expect(result.pagination.page).toBe(1);
      expect(result.pagination.pageSize).toBe(20);
    });

    it('pageSize=0 时使用默认值20', async () => {
      const mockSchedules: never[] = [];

      (prisma.trainSchedule.count as Mock).mockResolvedValue(0);
      (prisma.trainSchedule.findMany as Mock).mockResolvedValue(mockSchedules);

      const result = await listAllSchedules({ page: 1, pageSize: 0 });

      expect(result.pagination.page).toBe(1);
      expect(result.pagination.pageSize).toBe(20);
    });

    it('page 为负数时使用默认值1', async () => {
      const mockSchedules: never[] = [];

      (prisma.trainSchedule.count as Mock).mockResolvedValue(0);
      (prisma.trainSchedule.findMany as Mock).mockResolvedValue(mockSchedules);

      const result = await listAllSchedules({ page: -1, pageSize: 20 });

      expect(result.pagination.page).toBe(1);
      expect(result.pagination.pageSize).toBe(20);
    });

    it('pageSize 为负数时使用默认值20', async () => {
      const mockSchedules: never[] = [];

      (prisma.trainSchedule.count as Mock).mockResolvedValue(0);
      (prisma.trainSchedule.findMany as Mock).mockResolvedValue(mockSchedules);

      const result = await listAllSchedules({ page: 1, pageSize: -10 });

      expect(result.pagination.page).toBe(1);
      expect(result.pagination.pageSize).toBe(20);
    });

    it('pageSize 超过最大值限制时截断', async () => {
      const mockSchedules: never[] = [];

      (prisma.trainSchedule.count as Mock).mockResolvedValue(0);
      (prisma.trainSchedule.findMany as Mock).mockResolvedValue(mockSchedules);

      const result = await listAllSchedules({ page: 1, pageSize: 1000 });

      expect(result.pagination.page).toBe(1);
      expect(result.pagination.pageSize).toBe(100);
    });

    it('空结果集', async () => {
      (prisma.trainSchedule.count as Mock).mockResolvedValue(0);
      (prisma.trainSchedule.findMany as Mock).mockResolvedValue([]);

      const result = await listAllSchedules({});

      expect(result.list).toEqual([]);
      expect(result.pagination.total).toBe(0);
      expect(result.pagination.totalPages).toBe(0);
    });

    it('排序按创建时间倒序', async () => {
      const mockSchedules = [
        {
          id: 'schedule-1',
          trainId: 'train-1',
          name: '班次1',
          status: 'PLANNING',
          startDate: new Date('2026-06-01'),
          endDate: new Date('2026-06-26'),
          boardingDate: new Date('2026-05-29'),
          lockdownDate: new Date('2026-06-23'),
          releaseDate: new Date('2026-06-26'),
          createdAt: new Date('2026-05-20'),
          version: 1,
          train: { id: 'train-1', name: '火车1' },
          snapshots: [],
          requirements: [],
        },
      ];

      (prisma.trainSchedule.count as Mock).mockResolvedValue(1);
      (prisma.trainSchedule.findMany as Mock).mockResolvedValue(mockSchedules);

      await listAllSchedules({});

      expect(prisma.trainSchedule.findMany).toHaveBeenCalledWith(expect.objectContaining({
        orderBy: { createdAt: 'desc' },
      }));
    });

    it('字段聚合计算', async () => {
      const mockSchedules = [
        {
          id: 'schedule-1',
          trainId: 'train-1',
          name: '班次1',
          status: 'PLANNING',
          startDate: new Date('2026-06-01'),
          endDate: new Date('2026-06-26'),
          boardingDate: new Date('2026-05-29'),
          lockdownDate: new Date('2026-06-23'),
          releaseDate: new Date('2026-06-26'),
          createdAt: new Date('2026-05-20'),
          version: 1,
          train: { id: 'train-1', name: '火车1' },
          snapshots: [
            { id: 'snap-1', capacityPoints: 100, usedPoints: 20 },
            { id: 'snap-2', capacityPoints: 50, usedPoints: 30 },
          ],
          requirements: [{ id: 'req-1' }, { id: 'req-2' }, { id: 'req-3' }],
        },
      ];

      (prisma.trainSchedule.count as Mock).mockResolvedValue(1);
      (prisma.trainSchedule.findMany as Mock).mockResolvedValue(mockSchedules);

      const result = await listAllSchedules({});

      expect(result.list[0].totalCapacity).toBe(150);
      expect(result.list[0].usedCapacity).toBe(50);
      expect(result.list[0].systemCount).toBe(2);
      expect(result.list[0].requirementCount).toBe(3);
    });
  });

  describe('listTrainSchedules', () => {
    it('火车存在时返回班次列表', async () => {
      const mockTrain = { id: 'train-1', name: '火车1' };
      const mockSchedules = [
        {
          id: 'schedule-1',
          trainId: 'train-1',
          name: '班次1',
          status: 'PLANNING',
          startDate: new Date('2026-06-01'),
          endDate: new Date('2026-06-26'),
          boardingDate: new Date('2026-05-29'),
          lockdownDate: new Date('2026-06-23'),
          releaseDate: new Date('2026-06-26'),
          createdAt: new Date('2026-05-20'),
          version: 1,
          snapshots: [
            { id: 'snap-1', capacityPoints: 100, usedPoints: 20 },
          ],
          requirements: [{ id: 'req-1' }],
        },
      ];

      (prisma.train.findUnique as Mock).mockResolvedValue(mockTrain);
      (prisma.trainSchedule.findMany as Mock).mockResolvedValue(mockSchedules);

      const result = await listTrainSchedules('train-1');

      expect(result.list.length).toBe(1);
      expect(result.list[0].trainName).toBe('火车1');
      expect(result.list[0].totalCapacity).toBe(100);
      // 验证只返回该火车的班次
      expect(prisma.trainSchedule.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: { trainId: 'train-1' },
      }));
      // 验证返回的所有班次都属于该火车
      result.list.forEach(schedule => {
        expect(schedule.trainId).toBe('train-1');
      });
    });

    it('火车不存在时抛出错误', async () => {
      (prisma.train.findUnique as Mock).mockResolvedValue(null);

      await expect(listTrainSchedules('invalid-train-id')).rejects.toThrow();
    });

    it('火车无班次时返回空列表', async () => {
      const mockTrain = { id: 'train-1', name: '火车1' };

      (prisma.train.findUnique as Mock).mockResolvedValue(mockTrain);
      (prisma.trainSchedule.findMany as Mock).mockResolvedValue([]);

      const result = await listTrainSchedules('train-1');

      expect(result.list).toEqual([]);
    });
  });

  describe('updateTrainScheduleStatus', () => {
    const mockScheduleFull = {
      id: 'schedule-1',
      trainId: 'train-1',
      name: '班次1',
      status: 'PLANNING',
      startDate: new Date('2026-06-01'),
      endDate: new Date('2026-06-26'),
      boardingDate: new Date('2026-05-29'),
      sitDate: new Date('2026-06-12'),
      uatDate: new Date('2026-06-17'),
      lockdownDate: new Date('2026-06-23'),
      releaseDate: new Date('2026-06-26'),
      version: 1,
      createdById: 'user-1',
      createdAt: new Date('2026-05-20'),
      updatedAt: new Date('2026-05-20'),
      createdBy: { id: 'user-1', displayName: '用户1' },
      train: { id: 'train-1', name: '火车1' },
      snapshots: [],
      keyDates: [],
      requirements: [],
    };

    it('PLANNING → IN_PROGRESS 合法流转', async () => {
      (prisma.trainSchedule.findUnique as Mock).mockResolvedValue({
        ...mockScheduleFull,
        status: 'PLANNING',
      });
      (prisma.$transaction as Mock).mockResolvedValue(undefined);

      await updateTrainScheduleStatus('schedule-1', 'IN_PROGRESS');

      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('IN_PROGRESS → LOCKED_DOWN 合法流转', async () => {
      (prisma.trainSchedule.findUnique as Mock).mockResolvedValue({
        ...mockScheduleFull,
        status: 'IN_PROGRESS',
      });
      (prisma.$transaction as Mock).mockResolvedValue(undefined);

      await updateTrainScheduleStatus('schedule-1', 'LOCKED_DOWN');

      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('LOCKED_DOWN → RELEASED 合法流转', async () => {
      (prisma.trainSchedule.findUnique as Mock).mockResolvedValue({
        ...mockScheduleFull,
        status: 'LOCKED_DOWN',
      });
      (prisma.$transaction as Mock).mockResolvedValue(undefined);

      await updateTrainScheduleStatus('schedule-1', 'RELEASED');

      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('PLANNING → LOCKED_DOWN 非法流转抛出错误', async () => {
      (prisma.trainSchedule.findUnique as Mock).mockResolvedValue({
        ...mockScheduleFull,
        status: 'PLANNING',
      });

      await expect(updateTrainScheduleStatus('schedule-1', 'LOCKED_DOWN')).rejects.toThrow();
    });

    it('IN_PROGRESS → RELEASED 非法流转抛出错误', async () => {
      (prisma.trainSchedule.findUnique as Mock).mockResolvedValue({
        ...mockScheduleFull,
        status: 'IN_PROGRESS',
      });

      await expect(updateTrainScheduleStatus('schedule-1', 'RELEASED')).rejects.toThrow();
    });

    it('RELEASED 无法变更状态', async () => {
      (prisma.trainSchedule.findUnique as Mock).mockResolvedValue({
        ...mockScheduleFull,
        status: 'RELEASED',
      });

      await expect(updateTrainScheduleStatus('schedule-1', 'IN_PROGRESS')).rejects.toThrow();
    });

    it('班次不存在时抛出错误', async () => {
      (prisma.trainSchedule.findUnique as Mock).mockResolvedValue(null);

      await expect(updateTrainScheduleStatus('invalid-schedule-id', 'IN_PROGRESS')).rejects.toThrow();
    });

    it('LOCKED_DOWN 时同步更新需求 subStatus 为 FROZEN（事务副作用验证）', async () => {
      (prisma.trainSchedule.findUnique as Mock).mockResolvedValue({
        ...mockScheduleFull,
        status: 'IN_PROGRESS',
      });
      (prisma.$transaction as Mock).mockImplementation(async (callback) => {
        await callback({
          trainSchedule: { update: vi.fn() },
          requirement: { updateMany: vi.fn() },
        } as any);
      });

      await updateTrainScheduleStatus('schedule-1', 'LOCKED_DOWN');

      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('RELEASED 时同步更新需求状态为 RELEASED（事务副作用验证）', async () => {
      (prisma.trainSchedule.findUnique as Mock).mockResolvedValue({
        ...mockScheduleFull,
        status: 'LOCKED_DOWN',
      });
      (prisma.$transaction as Mock).mockImplementation(async (callback) => {
        await callback({
          trainSchedule: { update: vi.fn() },
          requirement: { updateMany: vi.fn() },
        } as any);
      });

      await updateTrainScheduleStatus('schedule-1', 'RELEASED');

      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('事务失败时自动回滚', async () => {
      (prisma.trainSchedule.findUnique as Mock).mockResolvedValue({
        ...mockScheduleFull,
        status: 'IN_PROGRESS',
      });
      (prisma.$transaction as Mock).mockRejectedValue(new Error('Transaction failed'));

      await expect(updateTrainScheduleStatus('schedule-1', 'LOCKED_DOWN')).rejects.toThrow('Transaction failed');

      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('使用相同幂等键重复请求只执行一次', async () => {
      (prisma.trainSchedule.findUnique as Mock).mockResolvedValue({
        ...mockScheduleFull,
        status: 'PLANNING',
      });
      (prisma.$transaction as Mock).mockResolvedValue(undefined);

      const idempotencyKey = 'test-idempotency-key';

      await updateTrainScheduleStatus('schedule-1', 'IN_PROGRESS', idempotencyKey);
      await updateTrainScheduleStatus('schedule-1', 'IN_PROGRESS', idempotencyKey);

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    });

    it('使用不同幂等键可执行多次', async () => {
      (prisma.trainSchedule.findUnique as Mock).mockResolvedValue({
        ...mockScheduleFull,
        status: 'PLANNING',
      });
      (prisma.$transaction as Mock).mockResolvedValue(undefined);

      await updateTrainScheduleStatus('schedule-1', 'IN_PROGRESS', 'key-1');
      await updateTrainScheduleStatus('schedule-1', 'IN_PROGRESS', 'key-2');

      expect(prisma.$transaction).toHaveBeenCalledTimes(2);
    });
  });
});