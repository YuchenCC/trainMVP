import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    requirement: { findUnique: vi.fn() },
    $transaction: vi.fn(),
  },
}));

vi.mock('../../prisma/index.js', () => ({
  prisma: mockPrisma,
}));

import { reEdit } from './service.js';

function makeRequirement(overrides: Partial<any> = {}) {
  return {
    id: 'req-1',
    status: 'REJECTED',
    version: 4,
    ...overrides,
  };
}

function makeUpdatedRequirement(overrides: Partial<any> = {}) {
  const createdAt = new Date('2026-06-27T00:00:00.000Z');
  return {
    id: 'req-1',
    reqCode: 'REQ-2026-0001',
    title: 'Requirement title',
    description: '<p>Requirement description</p>',
    system: { id: 'system-1', name: 'Requirement System' },
    priority: 'P1',
    storyPoints: 3,
    ba: { id: 'ba-1', displayName: 'BA User' },
    pm: null,
    creator: { id: 'creator-1', displayName: 'Creator User' },
    trainSchedule: null,
    status: 'DRAFT',
    subStatus: null,
    reqType: null,
    sourceChannel: null,
    version: 5,
    createdAt,
    updatedAt: createdAt,
    ...overrides,
  };
}

function makeTx(updated = makeUpdatedRequirement()) {
  return {
    requirement: {
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      findUnique: vi.fn().mockResolvedValue(updated),
    },
    requirementDependency: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    statusLog: {
      create: vi.fn().mockResolvedValue({}),
      findMany: vi.fn().mockResolvedValue([]),
    },
    emergencyChange: {
      findFirst: vi.fn().mockResolvedValue(null),
    },
  };
}

describe('reEdit unit tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('moves a rejected requirement back to draft and increments the version', async () => {
    const existing = makeRequirement();
    const updated = makeUpdatedRequirement();
    const tx = makeTx(updated);
    mockPrisma.requirement.findUnique.mockResolvedValue(existing);
    mockPrisma.$transaction.mockImplementation((callback: (client: any) => Promise<unknown>) => callback(tx));

    const result = await reEdit('req-1', 'pm-1', 'PM');

    expect(result.status).toBe('DRAFT');
    expect(result.version).toBe(5);
    expect(tx.requirement.updateMany).toHaveBeenCalledWith({
      where: { id: 'req-1', version: 4 },
      data: { status: 'DRAFT', version: { increment: 1 } },
    });
    expect(tx.statusLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        requirementId: 'req-1',
        operationType: 'RE_EDIT',
        fromStatus: 'REJECTED',
        toStatus: 'DRAFT',
        operatorId: 'pm-1',
      }),
    });
  });

  it('rejects re-edit when the requirement is not rejected', async () => {
    mockPrisma.requirement.findUnique.mockResolvedValue(makeRequirement({ status: 'DRAFT' }));

    await expect(reEdit('req-1', 'pm-1', 'PM')).rejects.toMatchObject({
      code: 'REQUIREMENT_NOT_REJECTED',
    });
  });

  it('rejects re-edit for an unauthorized role', async () => {
    mockPrisma.requirement.findUnique.mockResolvedValue(makeRequirement());

    await expect(reEdit('req-1', 'admin-1', 'TRAIN_ADMIN')).rejects.toMatchObject({
      code: 'REQUIREMENT_PERMISSION_DENIED',
    });
  });

  it('rejects re-edit when the optimistic version update conflicts', async () => {
    const tx = makeTx();
    tx.requirement.updateMany.mockResolvedValue({ count: 0 });
    tx.requirement.findUnique.mockResolvedValue(makeRequirement({ version: 5 }));
    mockPrisma.requirement.findUnique.mockResolvedValue(makeRequirement());
    mockPrisma.$transaction.mockImplementation((callback: (client: any) => Promise<unknown>) => callback(tx));

    await expect(reEdit('req-1', 'pm-1', 'PM')).rejects.toMatchObject({
      code: 'REQUIREMENT_VERSION_CONFLICT',
    });
    expect(tx.statusLog.create).not.toHaveBeenCalled();
  });
});
