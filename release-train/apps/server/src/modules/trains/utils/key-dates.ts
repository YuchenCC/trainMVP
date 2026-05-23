// ========== 关键日期计算工具函数 ==========
// 用于 US2.2 火车班次创建时自动计算关键日期
// 节点顺序：纳版 -> 开始 -> SIT提测 -> UAT提测 -> 封板 -> 投产 -> 结束

/**
 * 日期加法工具函数
 * @param date 基准日期
 * @param days 加上的天数
 * @returns 计算后的新日期
 */
function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * 日期减法工具函数
 * @param date 基准日期
 * @param days 减去的天数
 * @returns 计算后的新日期
 */
function subtractDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() - days);
  return result;
}

/**
 * 获取指定日期之前的最后一个周五（包括当天如果是周五的话）
 * @param date 参考日期
 * @returns 最近的周五日期
 */
function getPreviousFriday(date: Date): Date {
  const result = new Date(date);
  const dayOfWeek = result.getDay(); // 0 = Sunday, 1 = Monday, ..., 5 = Friday, 6 = Saturday

  // 计算到上一个周五的天数差
  // 如果当天是周五，天数差为 0，保持当前日期
  let daysToSubtract: number;
  if (dayOfWeek >= 5) {
    // 周五、周六、周日 -> 减去 (dayOfWeek - 5) 天
    daysToSubtract = dayOfWeek - 5;
  } else {
    // 周一到周四 -> 减去 (dayOfWeek + 2) 天
    daysToSubtract = dayOfWeek + 2;
  }

  result.setDate(result.getDate() - daysToSubtract);
  return result;
}

/**
 * 计算两个日期之间的天数差（包括起始和结束日期）
 * @param startDate 开始日期
 * @param endDate 结束日期
 * @returns 天数差
 */
function calculateDaysDifference(startDate: Date, endDate: Date): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  const diffInMs = end.getTime() - start.getTime();
  return Math.floor(diffInMs / (1000 * 60 * 60 * 24)) + 1; // +1 因为包括起始和结束日期
}

/**
 * 计算关键日期
 * 根据开始日期和结束日期，自动计算关键节点：
 * - 纳版日：开始前3天
 * - SIT提测日：开始后（开始到封板周期 × 50%）天
 * - UAT提测日：SIT到封板的中点
 * - 封板日：投产前3天
 * - 投产日：结束日期
 *
 * 节点顺序：纳版 -> 开始 -> SIT提测 -> UAT提测 -> 封板 -> 投产 -> 结束
 *
 * @param startDate 火车开始日期
 * @param endDate 火车结束日期
 * @returns 包含关键日期的对象
 */
export function calculateKeyDates(startDate: Date, endDate: Date): {
  boardingDate: Date;
  sitDate: Date;
  uatDate: Date;
  lockdownDate: Date;
  releaseDate: Date;
} {
  // 1. 投产日 = 结束日期
  const releaseDate = new Date(endDate);

  // 2. 封板日 = 投产前3天
  const lockdownDate = subtractDays(releaseDate, 3);

  // 3. 计算 SIT 周期（开始 → 封板）
  const sitCycleDays = Math.round((lockdownDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

  // 4. SIT提测日 = 开始后 sitCycleDays * 50% 天
  const sitOffset = Math.floor(sitCycleDays * 0.5);
  const sitDate = addDays(startDate, sitOffset);

  // 5. UAT提测日 = SIT后一段时间，且早于封板日
  // 计算到封板日的天数（不含SIT当天），UAT提测在两者中间偏左
  const daysToLockdown = Math.round((lockdownDate.getTime() - sitDate.getTime()) / (1000 * 60 * 60 * 24));
  const uatOffset = Math.floor(daysToLockdown * 0.5);
  const uatDate = addDays(sitDate, uatOffset);

  // 6. 纳版日 = 开始前3天
  const boardingDate = subtractDays(startDate, 3);

  return {
    boardingDate,
    sitDate,
    uatDate,
    lockdownDate,
    releaseDate,
  };
}

export {
  addDays,
  subtractDays,
  getPreviousFriday,
  calculateDaysDifference,
};
