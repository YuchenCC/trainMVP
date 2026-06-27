import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateCorrelationId } from '../correlation';

describe('Correlation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('generateCorrelationId', () => {
    it('TC-CORR-001 - 生成新的correlationId', () => {
      const id = generateCorrelationId();
      expect(id).toBeDefined();
      expect(typeof id).toBe('string');
      expect(id).toMatch(/^[a-z0-9]+-[a-z0-9]+$/);
    });

    it('TC-CORR-002 - 生成的correlationId长度合理', () => {
      const id = generateCorrelationId();
      expect(id.length).toBeGreaterThan(8);
      expect(id.length).toBeLessThan(50);
    });

    it('TC-CORR-003 - 连续生成的correlationId不重复', () => {
      const ids = new Set();
      for (let i = 0; i < 100; i++) {
        ids.add(generateCorrelationId());
      }
      expect(ids.size).toBe(100);
    });
  });
});