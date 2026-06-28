// ========== T2 US2.3 班次列表查询与火车切换 - L3 E2E 测试 ==========
// 测试范围：页面加载、火车下拉、切换刷新、状态按钮显示
// 参考：appendix-T2-US2.3-测试案例测试方式对照表.md（TC2.3-FE-01~12）
import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:5173';
const API_URL = 'http://localhost:3000/api';

// ========== 测试固定账号（通过 /api/auth/seed 创建）==========
const TEST_TRAIN_ADMIN = {
  username: 'e2e_train_admin',
  password: 'AdminPass123!',
  displayName: 'E2E火车管理员',
  email: 'e2e_train_admin@test.com',
};

const TEST_BA = {
  username: 'e2e_ba',
  password: 'BAPass123!',
  displayName: 'E2E BA用户',
  email: 'e2e_ba@test.com',
};

/**
 * 辅助函数：通过 seed 接口创建测试用户（使用 Playwright request API，避免 CORS）
 * @param page Playwright 页面对象
 * @param user 用户数据
 */
async function ensureTestUser(page: any, user: any) {
  // 使用 Playwright 的 request API（在 Node.js 上下文中执行，不受 CORS 限制）
  const context = page.context();
  const response = await context.request.post(`${API_URL}/auth/seed`, {
    data: user,
  });

  const body = await response.json();

  // 允许已存在的情况（返回 success: false, code: CONFLICT）
  if (body.success || body.code === 'CONFLICT') {
    return true;
  }
  throw new Error(`创建测试用户失败: ${JSON.stringify(body)}`);
}

/**
 * 辅助函数：登录火车管理员
 * @param page Playwright 页面对象
 */
async function loginTrainAdmin(page: any) {
  // 确保测试用户存在
  await ensureTestUser(page, { ...TEST_TRAIN_ADMIN, role: 'TRAIN_ADMIN' });

  await page.goto(`${BASE_URL}/login`);
  await page.waitForLoadState('networkidle');

  await page.getByPlaceholder('用户名').fill(TEST_TRAIN_ADMIN.username);
  await page.getByPlaceholder('密码').fill(TEST_TRAIN_ADMIN.password);
  await page.locator('.ant-btn-primary').click();

  await page.waitForLoadState('networkidle');
  await expect(page).toHaveURL(/trains|dashboard/);
}

/**
 * 辅助函数：登录普通用户（BA 角色）
 * @param page Playwright 页面对象
 */
async function loginBA(page: any) {
  // 确保测试用户存在
  await ensureTestUser(page, { ...TEST_BA, role: 'BA' });

  await page.goto(`${BASE_URL}/login`);
  await page.waitForLoadState('networkidle');

  await page.getByPlaceholder('用户名').fill(TEST_BA.username);
  await page.getByPlaceholder('密码').fill(TEST_BA.password);
  await page.locator('.ant-btn-primary').click();

  await page.waitForLoadState('networkidle');
  await expect(page).toHaveURL(/trains|dashboard/);
}

/**
 * 辅助函数：登出
 * @param page Playwright 页面对象
 */
async function logout(page: any) {
  await page.goto(`${BASE_URL}/login`);
  await page.waitForLoadState('networkidle');
}

// ========== TC2.3-FE-01 进入班次列表页默认加载全局班次 ==========
test('TC2.3-FE-01: 进入班次列表页默认加载全局班次', async ({ page }) => {
  await loginTrainAdmin(page);

  await page.goto(`${BASE_URL}/trains/schedules`);
  await page.waitForLoadState('networkidle');

  // 验证页面标题
  await expect(page.getByRole('heading', { name: '班次列表' })).toBeVisible();

  // 验证火车下拉框显示"全部火车"
  const trainSelect = page.locator('.ant-select').filter({ hasText: '全部火车' });
  await expect(trainSelect).toBeVisible();

  // 验证班次表格存在（可能为空或有数据）
  const table = page.locator('.ant-table');
  await expect(table).toBeVisible();
});

// ========== TC2.3-FE-02 火车下拉加载 ==========
test('TC2.3-FE-02: 火车下拉加载（下拉框包含火车选项）', async ({ page }) => {
  await loginTrainAdmin(page);

  await page.goto(`${BASE_URL}/trains/schedules`);
  await page.waitForLoadState('networkidle');

  // 点击火车下拉框
  const trainSelect = page.locator('.ant-select').filter({ hasText: '全部火车' });
  await trainSelect.click();
  await page.waitForTimeout(500);

  // 验证下拉选项存在（至少有一个火车选项）
  const options = page.locator('.ant-select-dropdown .ant-select-item');
  const optionCount = await options.count();
  expect(optionCount).toBeGreaterThan(0);

  // 关闭下拉框
  await page.keyboard.press('Escape');
});

// ========== TC2.3-FE-03 切换所属火车刷新班次列表 ==========
test('TC2.3-FE-03: 切换所属火车刷新班次列表', async ({ page }) => {
  await loginTrainAdmin(page);

  await page.goto(`${BASE_URL}/trains/schedules`);
  await page.waitForLoadState('networkidle');

  // 点击火车下拉框
  const trainSelect = page.locator('.ant-select').filter({ hasText: '全部火车' });
  await trainSelect.click();
  await page.waitForTimeout(500);

  // 选择第一个火车选项
  const firstOption = page.locator('.ant-select-dropdown .ant-select-item').first();
  const trainName = await firstOption.textContent();
  await firstOption.click();

  await page.waitForLoadState('networkidle');

  // 验证下拉框显示选中的火车名称
  const selectedTrain = page.locator('.ant-select-selection-item');
  await expect(selectedTrain).toBeVisible();

  // 验证表格刷新（数据可能变化）
  const table = page.locator('.ant-table');
  await expect(table).toBeVisible();
});

// ========== TC2.3-FE-04 清空所属火车恢复全局列表 ==========
test('TC2.3-FE-04: 清空所属火车恢复全局列表', async ({ page }) => {
  await loginTrainAdmin(page);

  await page.goto(`${BASE_URL}/trains/schedules`);
  await page.waitForLoadState('networkidle');

  // 先选择一个火车
  const trainSelect = page.locator('.ant-select').filter({ hasText: '全部火车' });
  await trainSelect.click();
  await page.waitForTimeout(500);

  const firstOption = page.locator('.ant-select-dropdown .ant-select-item').first();
  await firstOption.click();
  await page.waitForLoadState('networkidle');

  // 清空选择（点击清除按钮）
  const clearBtn = page.locator('.ant-select-clear');
  if (await clearBtn.isVisible()) {
    await clearBtn.click();
    await page.waitForLoadState('networkidle');

    // 验证下拉框恢复为"全部火车"
    await expect(trainSelect).toBeVisible();
  }
});

// ========== TC2.3-FE-06 点击班次行进入详情页 ==========
test('TC2.3-FE-06: 点击班次行进入详情页（如有数据）', async ({ page }) => {
  await loginTrainAdmin(page);

  await page.goto(`${BASE_URL}/trains/schedules`);
  await page.waitForLoadState('networkidle');

  // 检查是否有班次数据
  const tableRows = page.locator('.ant-table-tbody tr');
  const rowCount = await tableRows.count();

  if (rowCount > 0) {
    // 点击第一行（班次详情）
    const firstRow = tableRows.first();
    await firstRow.click();

    await page.waitForLoadState('networkidle');

    // 验证跳转到详情页（URL 包含 scheduleId）
    await expect(page).toHaveURL(/trains\/.*\/schedules\/[a-z0-9-]+/);
  } else {
    // 无数据时验证空状态
    const empty = page.locator('.ant-empty');
    await expect(empty).toBeVisible();
  }
});

// ========== TC2.3-FE-07 未选择火车时不可新增班次 ==========
test('TC2.3-FE-07: 未选择火车时点击新增班次提示警告', async ({ page }) => {
  await loginTrainAdmin(page);

  await page.goto(`${BASE_URL}/trains/schedules`);
  await page.waitForLoadState('networkidle');

  // 确保火车下拉框为"全部火车"状态
  const trainSelect = page.locator('.ant-select').filter({ hasText: '全部火车' });
  await expect(trainSelect).toBeVisible();

  // 点击新增班次按钮
  const addBtn = page.getByRole('button', { name: '新增班次' });
  await addBtn.click();

  // 验证警告提示出现
  const warningMessage = page.locator('.ant-message').filter({ hasText: '请先选择所属火车' });
  await expect(warningMessage).toBeVisible({ timeout: 3000 });
});

// ========== TC2.3-FE-08 选择火车后可以打开新增班次弹窗 ==========
test('TC2.3-FE-08: 选择火车后点击新增班次打开弹窗', async ({ page }) => {
  await loginTrainAdmin(page);

  await page.goto(`${BASE_URL}/trains/schedules`);
  await page.waitForLoadState('networkidle');

  // 选择一个火车
  const trainSelect = page.locator('.ant-select').filter({ hasText: '全部火车' });
  await trainSelect.click();
  await page.waitForTimeout(500);

  const firstOption = page.locator('.ant-select-dropdown .ant-select-item').first();
  await firstOption.click();
  await page.waitForLoadState('networkidle');

  // 点击新增班次按钮
  const addBtn = page.getByRole('button', { name: '新增班次' });
  await addBtn.click();
  await page.waitForTimeout(500);

  // 验证新增班次弹窗出现
  const modal = page.locator('.ant-modal').filter({ hasText: '新增班次' });
  await expect(modal).toBeVisible();

  // 验证弹窗包含开始日期、结束日期字段
  await expect(page.getByLabel('开始日期')).toBeVisible();
  await expect(page.getByLabel('结束日期')).toBeVisible();

  // 关闭弹窗
  await page.locator('.ant-modal-close').click();
});

// ========== TC2.3-FE-10 计划中班次显示开始操作 ==========
test('TC2.3-FE-10: 计划中班次显示"开始"按钮（如有 PLANNING 状态班次）', async ({ page }) => {
  await loginTrainAdmin(page);

  await page.goto(`${BASE_URL}/trains/schedules`);
  await page.waitForLoadState('networkidle');

  // 检查是否有 PLANNING 状态的班次
  const planningRow = page.locator('.ant-table-tbody tr').filter({ hasText: 'PLANNING' });
  const rowCount = await planningRow.count();

  if (rowCount > 0) {
    // 验证"开始"按钮存在
    const startBtn = planningRow.first().getByRole('button', { name: '开始' });
    await expect(startBtn).toBeVisible();
  }
});

// ========== TC2.3-FE-11 进行中班次显示封板操作 ==========
test('TC2.3-FE-11: 进行中班次显示"封板"按钮（如有 IN_PROGRESS 状态班次）', async ({ page }) => {
  await loginTrainAdmin(page);

  await page.goto(`${BASE_URL}/trains/schedules`);
  await page.waitForLoadState('networkidle');

  // 检查是否有 IN_PROGRESS 状态的班次
  const inProgressRow = page.locator('.ant-table-tbody tr').filter({ hasText: 'IN_PROGRESS' });
  const rowCount = await inProgressRow.count();

  if (rowCount > 0) {
    // 验证"封板"按钮存在
    const lockdownBtn = inProgressRow.first().getByRole('button', { name: '封板' });
    await expect(lockdownBtn).toBeVisible();
  }
});

// ========== TC2.3-FE-12 封板班次显示投产操作 ==========
test('TC2.3-FE-12: 封板班次显示"投产"按钮（如有 LOCKED_DOWN 状态班次）', async ({ page }) => {
  await loginTrainAdmin(page);

  await page.goto(`${BASE_URL}/trains/schedules`);
  await page.waitForLoadState('networkidle');

  // 检查是否有 LOCKED_DOWN 状态的班次
  const lockedRow = page.locator('.ant-table-tbody tr').filter({ hasText: 'LOCKED_DOWN' });
  const rowCount = await lockedRow.count();

  if (rowCount > 0) {
    // 验证"投产"按钮存在
    const releaseBtn = lockedRow.first().getByRole('button', { name: '投产' });
    await expect(releaseBtn).toBeVisible();
  }
});

// ========== TC2.3-FE-14 投产班次不显示操作按钮 ==========
test('TC2.3-FE-14: 投产班次不显示状态变更按钮（如有 RELEASED 状态班次）', async ({ page }) => {
  await loginTrainAdmin(page);

  await page.goto(`${BASE_URL}/trains/schedules`);
  await page.waitForLoadState('networkidle');

  // 检查是否有 RELEASED 状态的班次
  const releasedRow = page.locator('.ant-table-tbody tr').filter({ hasText: 'RELEASED' });
  const rowCount = await releasedRow.count();

  if (rowCount > 0) {
    // 验证没有"开始"、"封板"、"投产"按钮
    const firstRow = releasedRow.first();
    await expect(firstRow.getByRole('button', { name: '开始' })).not.toBeVisible();
    await expect(firstRow.getByRole('button', { name: '封板' })).not.toBeVisible();
    await expect(firstRow.getByRole('button', { name: '投产' })).not.toBeVisible();

    // 但"编辑"按钮仍然存在
    await expect(firstRow.getByRole('button', { name: '编辑' })).toBeVisible();
  }
});

// ========== TC2.3-FE-15 BA 用户无新增班次权限 ==========
test('TC2.3-FE-15: BA 用户看不到新增班次按钮或点击提示无权限', async ({ page }) => {
  await loginBA(page);

  await page.goto(`${BASE_URL}/trains/schedules`);
  await page.waitForLoadState('networkidle');

  // BA 用户应该能看到班次列表
  const table = page.locator('.ant-table');
  await expect(table).toBeVisible();

  // 验证新增班次按钮可能不存在或禁用
  const addBtn = page.getByRole('button', { name: '新增班次' });
  const isVisible = await addBtn.isVisible();

  if (isVisible) {
    // 如果按钮存在，点击应该提示无权限
    await addBtn.click();
    const warningMessage = page.locator('.ant-message').filter({ hasText: /权限|无权/ });
    await expect(warningMessage).toBeVisible({ timeout: 3000 });
  }
});

// ========== TC2.3-FE-16 刷新按钮刷新班次列表 ==========
test('TC2.3-FE-16: 点击刷新按钮刷新班次列表', async ({ page }) => {
  await loginTrainAdmin(page);

  await page.goto(`${BASE_URL}/trains/schedules`);
  await page.waitForLoadState('networkidle');

  // 点击刷新按钮
  const refreshBtn = page.getByRole('button', { name: '刷新' });
  await refreshBtn.click();

  await page.waitForLoadState('networkidle');

  // 验证表格仍然存在（刷新成功）
  const table = page.locator('.ant-table');
  await expect(table).toBeVisible();
});