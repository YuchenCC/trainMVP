import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    system: { findUnique: vi.fn() },
    user: { findFirst: vi.fn() },
    requirement: { findMany: vi.fn() },
    $transaction: vi.fn(),
  },
}));

vi.mock('../../prisma/index.js', () => ({
  prisma: mockPrisma,
}));

import { __testing, createRequirement } from './service.js';

function mockImmediateTimers() {
  vi.spyOn(globalThis, 'setTimeout').mockImplementation((handler: TimerHandler) => {
    if (typeof handler === 'function') {
      handler();
    }
    return 0 as unknown as ReturnType<typeof setTimeout>;
  });
  vi.spyOn(Math, 'random').mockReturnValue(0);
}

function makeTx(overrides: Partial<any> = {}) {
  const createdAt = new Date('2026-06-27T00:00:00.000Z');
  const requirement = {
    id: 'req-1',
    reqCode: 'REQ-2026-0001',
    title: 'test requirement',
    description: '<p>safe</p>',
    system: { id: 'system-1', name: 'Requirement System' },
    priority: 'P1',
    storyPoints: 3,
    ba: { id: 'ba-1', displayName: 'BA User' },
    pm: null,
    creator: { id: 'creator-1', displayName: 'Creator User' },
    status: 'DRAFT',
    subStatus: null,
    trainSchedule: null,
    reqType: null,
    sourceChannel: null,
    version: 1,
    createdAt,
    updatedAt: createdAt,
  };

  return {
    requirement: {
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockImplementation(({ data }) => Promise.resolve({
        ...requirement,
        ...data,
        system: requirement.system,
        ba: requirement.ba,
        pm: null,
        creator: requirement.creator,
        trainSchedule: null,
        createdAt,
        updatedAt: createdAt,
      })),
    },
    requirementDependency: {
      findMany: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockResolvedValue({}),
    },
    statusLog: {
      create: vi.fn().mockResolvedValue({}),
      findMany: vi.fn().mockResolvedValue([]),
    },
    emergencyChange: {
      findFirst: vi.fn().mockResolvedValue(null),
    },
    ...overrides,
  };
}

function createRequest(overrides: Partial<any> = {}) {
  return {
    title: 'test requirement',
    description: '<p>safe</p>',
    systemId: 'system-1',
    priority: 'P1',
    storyPoints: 3,
    baId: 'ba-1',
    ...overrides,
  };
}

describe('requirements service unit tests', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-27T10:00:00.000Z'));
    mockImmediateTimers();
    mockPrisma.system.findUnique.mockResolvedValue({ id: 'system-1' });
    mockPrisma.user.findFirst.mockResolvedValue({ id: 'ba-1', role: 'BA' });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  describe('generateReqCode', () => {
    it('generates 0001 when there is no existing requirement code for the year', async () => {
      const tx = makeTx();

      const reqCode = await __testing.generateReqCode(tx as any);

      expect(reqCode).toBe('REQ-2026-0001');
      expect(tx.requirement.findMany).toHaveBeenCalledWith({
        where: { reqCode: { startsWith: 'REQ-2026-' } },
        select: { reqCode: true },
      });
      expect(tx.requirement.findUnique).toHaveBeenCalledWith({
        where: { reqCode: 'REQ-2026-0001' },
        select: { id: true },
      });
    });

    it('uses numeric max sequence instead of string ordering', async () => {
      const tx = makeTx();
      tx.requirement.findMany.mockResolvedValue([
        { reqCode: 'REQ-2026-0999' },
        { reqCode: 'REQ-2026-1000' },
        { reqCode: 'REQ-2026-0009' },
      ]);

      const reqCode = await __testing.generateReqCode(tx as any);

      expect(reqCode).toBe('REQ-2026-1001');
    });

    it('handles unordered existing codes and keeps the four-digit format', async () => {
      const tx = makeTx();
      tx.requirement.findMany.mockResolvedValue([
        { reqCode: 'REQ-2026-0002' },
        { reqCode: 'REQ-2026-0010' },
        { reqCode: 'REQ-2026-0009' },
      ]);

      const reqCode = await __testing.generateReqCode(tx as any);

      expect(reqCode).toBe('REQ-2026-0011');
    });

    it('retries when the generated code already exists and then returns the next available code', async () => {
      const tx = makeTx();
      tx.requirement.findMany
        .mockResolvedValueOnce([{ reqCode: 'REQ-2026-0001' }])
        .mockResolvedValueOnce([
          { reqCode: 'REQ-2026-0001' },
          { reqCode: 'REQ-2026-0002' },
        ]);
      tx.requirement.findUnique
        .mockResolvedValueOnce({ id: 'existing-req' })
        .mockResolvedValueOnce(null);

      const reqCode = await __testing.generateReqCode(tx as any, 2);

      expect(reqCode).toBe('REQ-2026-0003');
      expect(tx.requirement.findMany).toHaveBeenCalledTimes(2);
      expect(tx.requirement.findUnique).toHaveBeenNthCalledWith(1, {
        where: { reqCode: 'REQ-2026-0002' },
        select: { id: true },
      });
      expect(tx.requirement.findUnique).toHaveBeenNthCalledWith(2, {
        where: { reqCode: 'REQ-2026-0003' },
        select: { id: true },
      });
    });

    it('throws a requirement code conflict after retry exhaustion', async () => {
      const tx = makeTx();
      tx.requirement.findMany.mockResolvedValue([{ reqCode: 'REQ-2026-0001' }]);
      tx.requirement.findUnique.mockResolvedValue({ id: 'existing-req' });

      await expect(__testing.generateReqCode(tx as any, 2)).rejects.toMatchObject({
        code: 'REQUIREMENT_CODE_CONFLICT',
      });
      expect(tx.requirement.findUnique).toHaveBeenCalledTimes(2);
    });
  });

  describe('createRequirement retry behavior', () => {
    it('retries the transaction after a reqCode unique conflict and then creates the requirement', async () => {
      const tx = makeTx();
      const reqCodeConflict = { code: 'P2002', meta: { target: ['reqCode'] } };
      mockPrisma.$transaction
        .mockRejectedValueOnce(reqCodeConflict)
        .mockImplementationOnce((callback: (tx: any) => Promise<unknown>) => callback(tx));

      const result = await createRequirement(createRequest(), 'creator-1');

      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(2);
      expect(tx.requirement.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ reqCode: 'REQ-2026-0001' }),
      }));
      expect(result.reqCode).toBe('REQ-2026-0001');
    });

    it('creates dependency records inside the retried transaction path', async () => {
      const tx = makeTx();
      mockPrisma.requirement.findMany.mockResolvedValue([{ id: 'dep-1' }]);
      mockPrisma.$transaction.mockImplementationOnce((callback: (tx: any) => Promise<unknown>) => callback(tx));

      await createRequirement(createRequest({ dependencyIds: ['dep-1'] }), 'creator-1');

      expect(tx.requirementDependency.findMany).toHaveBeenCalledWith({
        where: { dependantId: 'dep-1' },
        select: { dependencyId: true },
      });
      expect(tx.requirementDependency.create).toHaveBeenCalledWith({
        data: {
          dependantId: 'req-1',
          dependencyId: 'dep-1',
        },
      });
    });
    it('does not retry non-reqCode unique conflicts', async () => {
      const titleConflict = { code: 'P2002', meta: { target: ['title'] } };
      mockPrisma.$transaction.mockRejectedValueOnce(titleConflict);

      await expect(createRequirement(createRequest(), 'creator-1')).rejects.toBe(titleConflict);
      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
    });
  });
});