import { describe, it, expect } from 'vitest';
import { calculateKeyDates, addDays, subtractDays, getPreviousFriday, calculateDaysDifference } from './key-dates.js';

describe('key-dates 工具函数', () => {
  describe('addDays', () => {
    it('正数天数加', () => {
      const date = new Date('2026-06-01');
      const result = addDays(date, 5);
      expect(result.toISOString().split('T')[0]).toBe('2026-06-06');
    });

    it('负数天数加（等价于减）', () => {
      const date = new Date('2026-06-06');
      const result = addDays(date, -5);
      expect(result.toISOString().split('T')[0]).toBe('2026-06-01');
    });

    it('零天数', () => {
      const date = new Date('2026-06-01');
      const result = addDays(date, 0);
      expect(result.toISOString().split('T')[0]).toBe('2026-06-01');
    });

    it('跨月份', () => {
      const date = new Date('2026-06-28');
      const result = addDays(date, 5);
      expect(result.toISOString().split('T')[0]).toBe('2026-07-03');
    });

    it('跨年份', () => {
      const date = new Date('2026-12-30');
      const result = addDays(date, 5);
      expect(result.toISOString().split('T')[0]).toBe('2027-01-04');
    });
  });

  describe('subtractDays', () => {
    it('正数天数减', () => {
      const date = new Date('2026-06-06');
      const result = subtractDays(date, 5);
      expect(result.toISOString().split('T')[0]).toBe('2026-06-01');
    });

    it('负数天数减（等价于加）', () => {
      const date = new Date('2026-06-01');
      const result = subtractDays(date, -5);
      expect(result.toISOString().split('T')[0]).toBe('2026-06-06');
    });

    it('零天数', () => {
      const date = new Date('2026-06-01');
      const result = subtractDays(date, 0);
      expect(result.toISOString().split('T')[0]).toBe('2026-06-01');
    });

    it('跨月份', () => {
      const date = new Date('2026-07-03');
      const result = subtractDays(date, 5);
      expect(result.toISOString().split('T')[0]).toBe('2026-06-28');
    });

    it('跨年份', () => {
      const date = new Date('2027-01-04');
      const result = subtractDays(date, 5);
      expect(result.toISOString().split('T')[0]).toBe('2026-12-30');
    });
  });

  describe('getPreviousFriday', () => {
    it('当天是周五', () => {
      const date = new Date('2026-06-05');
      const result = getPreviousFriday(date);
      expect(result.toISOString().split('T')[0]).toBe('2026-06-05');
    });

    it('当天是周六', () => {
      const date = new Date('2026-06-06');
      const result = getPreviousFriday(date);
      expect(result.toISOString().split('T')[0]).toBe('2026-06-05');
    });

    it('当天是周日', () => {
      const date = new Date('2026-06-07');
      const result = getPreviousFriday(date);
      expect(result.toISOString().split('T')[0]).toBe('2026-06-05');
    });

    it('当天是周一', () => {
      const date = new Date('2026-06-08');
      const result = getPreviousFriday(date);
      expect(result.toISOString().split('T')[0]).toBe('2026-06-05');
    });

    it('当天是周二', () => {
      const date = new Date('2026-06-09');
      const result = getPreviousFriday(date);
      expect(result.toISOString().split('T')[0]).toBe('2026-06-05');
    });

    it('当天是周三', () => {
      const date = new Date('2026-06-10');
      const result = getPreviousFriday(date);
      expect(result.toISOString().split('T')[0]).toBe('2026-06-05');
    });

    it('当天是周四', () => {
      const date = new Date('2026-06-11');
      const result = getPreviousFriday(date);
      expect(result.toISOString().split('T')[0]).toBe('2026-06-05');
    });
  });

  describe('calculateDaysDifference', () => {
    it('同一天', () => {
      const start = new Date('2026-06-01');
      const end = new Date('2026-06-01');
      const result = calculateDaysDifference(start, end);
      expect(result).toBe(1);
    });

    it('相差一天', () => {
      const start = new Date('2026-06-01');
      const end = new Date('2026-06-02');
      const result = calculateDaysDifference(start, end);
      expect(result).toBe(2);
    });

    it('相差一周', () => {
      const start = new Date('2026-06-01');
      const end = new Date('2026-06-07');
      const result = calculateDaysDifference(start, end);
      expect(result).toBe(7);
    });

    it('跨月份', () => {
      const start = new Date('2026-06-28');
      const end = new Date('2026-07-03');
      const result = calculateDaysDifference(start, end);
      expect(result).toBe(6);
    });

    it('跨年份', () => {
      const start = new Date('2026-12-30');
      const end = new Date('2027-01-04');
      const result = calculateDaysDifference(start, end);
      expect(result).toBe(6);
    });
  });

  describe('calculateKeyDates', () => {
    it('标准25天周期（开始到封板22天）', () => {
      const startDate = new Date('2026-06-01');
      const endDate = new Date('2026-06-26');

      const result = calculateKeyDates(startDate, endDate);

      expect(result.releaseDate.toISOString().split('T')[0]).toBe('2026-06-26');
      expect(result.lockdownDate.toISOString().split('T')[0]).toBe('2026-06-23');
      expect(result.boardingDate.toISOString().split('T')[0]).toBe('2026-05-29');
      expect(result.sitDate.toISOString().split('T')[0]).toBe('2026-06-12');
      expect(result.uatDate.toISOString().split('T')[0]).toBe('2026-06-17');
    });

    it('短周期7天', () => {
      const startDate = new Date('2026-06-01');
      const endDate = new Date('2026-06-07');

      const result = calculateKeyDates(startDate, endDate);

      expect(result.releaseDate.toISOString().split('T')[0]).toBe('2026-06-07');
      expect(result.lockdownDate.toISOString().split('T')[0]).toBe('2026-06-04');
      expect(result.boardingDate.toISOString().split('T')[0]).toBe('2026-05-29');
    });

    it('长周期30天', () => {
      const startDate = new Date('2026-06-01');
      const endDate = new Date('2026-06-30');

      const result = calculateKeyDates(startDate, endDate);

      expect(result.releaseDate.toISOString().split('T')[0]).toBe('2026-06-30');
      expect(result.lockdownDate.toISOString().split('T')[0]).toBe('2026-06-27');
      expect(result.boardingDate.toISOString().split('T')[0]).toBe('2026-05-29');
    });

    it('跨月份边界', () => {
      const startDate = new Date('2026-06-28');
      const endDate = new Date('2026-07-10');

      const result = calculateKeyDates(startDate, endDate);

      expect(result.releaseDate.toISOString().split('T')[0]).toBe('2026-07-10');
      expect(result.lockdownDate.toISOString().split('T')[0]).toBe('2026-07-07');
      expect(result.boardingDate.toISOString().split('T')[0]).toBe('2026-06-25');
    });

    it('跨年份边界', () => {
      const startDate = new Date('2026-12-28');
      const endDate = new Date('2027-01-10');

      const result = calculateKeyDates(startDate, endDate);

      expect(result.releaseDate.toISOString().split('T')[0]).toBe('2027-01-10');
      expect(result.lockdownDate.toISOString().split('T')[0]).toBe('2027-01-07');
      expect(result.boardingDate.toISOString().split('T')[0]).toBe('2026-12-25');
    });

    it('边界日期顺序验证', () => {
      const startDate = new Date('2026-06-01');
      const endDate = new Date('2026-06-26');

      const result = calculateKeyDates(startDate, endDate);

      const dates = [
        result.boardingDate,
        startDate,
        result.sitDate,
        result.uatDate,
        result.lockdownDate,
        result.releaseDate,
        endDate,
      ];

      for (let i = 0; i < dates.length - 1; i++) {
        expect(dates[i].getTime()).toBeLessThanOrEqual(dates[i + 1].getTime());
      }
    });
  });
});