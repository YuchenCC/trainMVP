import { describe, it, expect, beforeEach } from 'vitest';
import { recordBusinessOperation, getMetricsSnapshot } from '../metrics';

describe('Metrics', () => {
  beforeEach(() => {
  });

  describe('recordBusinessOperation', () => {
    it('TC-MET-005 - 记录业务操作成功', () => {
      recordBusinessOperation('test-module', 'create', 'success');
      const snapshot = getMetricsSnapshot();
      const op = snapshot.businessOperationTotal.find(
        m => m.labels.module === 'test-module' && m.labels.action === 'create' && m.labels.status === 'success'
      );
      expect(op).toBeDefined();
      expect(op?.value).toBe(1);
    });

    it('TC-MET-006 - 记录业务操作失败', () => {
      recordBusinessOperation('test-module', 'create', 'failure');
      const snapshot = getMetricsSnapshot();
      const op = snapshot.businessOperationTotal.find(
        m => m.labels.module === 'test-module' && m.labels.action === 'create' && m.labels.status === 'failure'
      );
      expect(op).toBeDefined();
      expect(op?.value).toBe(1);
    });

    it('TC-MET-007 - 按模块统计业务操作', () => {
      recordBusinessOperation('auth', 'login', 'success');
      recordBusinessOperation('auth', 'login', 'success');
      recordBusinessOperation('auth', 'logout', 'success');
      recordBusinessOperation('requirement', 'create', 'success');

      const snapshot = getMetricsSnapshot();
      const loginOps = snapshot.businessOperationTotal.filter(m => m.labels.module === 'auth');
      expect(loginOps.length).toBe(2);
    });

    it('TC-MET-008 - 获取指标快照', () => {
      recordBusinessOperation('test', 'action', 'success');
      const snapshot = getMetricsSnapshot();

      expect(snapshot).toHaveProperty('httpRequestTotal');
      expect(snapshot).toHaveProperty('httpRequestDuration');
      expect(snapshot).toHaveProperty('businessOperationTotal');
      expect(Array.isArray(snapshot.httpRequestTotal)).toBe(true);
      expect(Array.isArray(snapshot.httpRequestDuration)).toBe(true);
      expect(Array.isArray(snapshot.businessOperationTotal)).toBe(true);
    });
  });
});