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

import { submitReview } from './service.js';

function makeRequirement(overrides: Partial<any> = {}) {
  return {
    id: 'req-1',
    status: 'DRAFT',
    baId: 'ba-1',
    title: 'Requirement title',
    description: '<p>Requirement description</p>',
    systemId: 'system-1',
    priority: 'P1',
    storyPoints: 3,
    version: 1,
    ...overrides,
  };
}

function makeUpdatedRequirement(overrides: Partial<any> = {}) {
  const createdAt = new Date('2026-06-27T00:00:00.000Z');
  return {
    ...makeRequirement({ status: 'PENDING_REVIEW', version: 2 }),
    system: { id: 'system-1', name: 'Requirement System' },
    ba: { id: 'ba-1', displayName: 'BA User' },
    pm: null,
    creator: { id: 'creator-1', displayName: 'Creator User' },
    trainSchedule: null,
    subStatus: null,
    reqType: null,
    sourceChannel: null,
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

describe('submitReview unit tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('submits a draft requirement and returns the new state and version', async () => {
    const existing = makeRequirement();
    const updated = makeUpdatedRequirement();
    const tx = makeTx(updated);
    mockPrisma.requirement.findUnique.mockResolvedValue(existing);
    mockPrisma.$transaction.mockImplementation((callback: (client: any) => Promise<unknown>) => callback(tx));

    const result = await submitReview('req-1', 'ba-1', 'BA');

    expect(result.status).toBe('PENDING_REVIEW');
    expect(result.version).toBe(2);
    expect(tx.requirement.updateMany).toHaveBeenCalledWith({
      where: { id: 'req-1', version: 1 },
      data: { status: 'PENDING_REVIEW', version: { increment: 1 } },
    });
    expect(tx.statusLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        requirementId: 'req-1',
        operationType: 'SUBMIT_REVIEW',
        fromStatus: 'DRAFT',
        toStatus: 'PENDING_REVIEW',
        operatorId: 'ba-1',
      }),
    });
  });

  it('rejects submission when the requirement is not a draft', async () => {
    mockPrisma.requirement.findUnique.mockResolvedValue(makeRequirement({ status: 'PENDING_REVIEW' }));

    await expect(submitReview('req-1', 'ba-1', 'BA')).rejects.toMatchObject({
      code: 'REQUIREMENT_NOT_DRAFT',
    });
  });

  it('rejects a BA who does not own the requirement', async () => {
    mockPrisma.requirement.findUnique.mockResolvedValue(makeRequirement());

    await expect(submitReview('req-1', 'other-ba', 'BA')).rejects.toMatchObject({
      code: 'REQUIREMENT_PERMISSION_DENIED',
    });
  });

  it('rejects submission when a required field is missing', async () => {
    mockPrisma.requirement.findUnique.mockResolvedValue(makeRequirement({ title: '' }));

    await expect(submitReview('req-1', 'ba-1', 'BA')).rejects.toMatchObject({
      code: 'BAD_REQUEST',
      message: '标题不能为空',
    });
  });

  it('rejects submission when the optimistic version update conflicts', async () => {
    const tx = makeTx();
    tx.requirement.updateMany.mockResolvedValue({ count: 0 });
    tx.requirement.findUnique.mockResolvedValue(makeRequirement({ version: 2 }));
    mockPrisma.requirement.findUnique.mockResolvedValue(makeRequirement());
    mockPrisma.$transaction.mockImplementation((callback: (client: any) => Promise<unknown>) => callback(tx));

    await expect(submitReview('req-1', 'ba-1', 'BA')).rejects.toMatchObject({
      code: 'REQUIREMENT_VERSION_CONFLICT',
    });
    expect(tx.statusLog.create).not.toHaveBeenCalled();
  });
});
