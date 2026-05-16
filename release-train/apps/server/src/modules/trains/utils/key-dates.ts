// ========== 关键日期计算工具函数 ==========
// 用于 US2.2 火车班次创建时自动计算统一纳版日、统一封板日、统一投产日

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
 * 根据开始日期和结束日期，自动计算三个关键节点：
 * - 统一纳版日：周期过半前的最后一个周五
 * - 统一封板日：投产前一周的周五
 * - 统一投产日：结束日期
 *
 * @param startDate 火车开始日期
 * @param endDate 火车结束日期
 * @returns 包含三个关键日期的对象
 */
export function calculateKeyDates(startDate: Date, endDate: Date): {
  boardingDate: Date;
  lockdownDate: Date;
  releaseDate: Date;
} {
  // 1. 统一投产日 = 结束日期
  const releaseDate = new Date(endDate);

  // 2. 统一封板日 = 投产前一周的周五
  const oneWeekBeforeRelease = subtractDays(releaseDate, 7);
  const lockdownDate = getPreviousFriday(oneWeekBeforeRelease);

  // 3. 统一纳版日 = 周期过半前的最后一个周五
  const totalDays = calculateDaysDifference(startDate, endDate);
  const halfDays = Math.floor(totalDays / 2);
  const halfwayDate = subtractDays(startDate, -(halfDays - 1)); // 从开始日期往后推 halfDays-1 天
  const boardingDate = getPreviousFriday(halfwayDate);

  return {
    boardingDate,
    lockdownDate,
    releaseDate,
  };
}

export {
  subtractDays,
  getPreviousFriday,
  calculateDaysDifference,
};
