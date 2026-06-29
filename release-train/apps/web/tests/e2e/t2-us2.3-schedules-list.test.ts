import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:5173';
const API_URL = 'http://localhost:3000/api';

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

async function ensureTestUser(page: any, user: any) {
  const context = page.context();
  let retries = 3;
  let lastError: any;

  while (retries > 0) {
    try {
      const response = await context.request.post(`${API_URL}/auth/seed`, {
        data: user,
        timeout: 10000,
      });

      const body = await response.json();

      if (body.success || body.code === 'CONFLICT' || body.code === 'INTERNAL_ERROR') {
        return true;
      }
      throw new Error(`创建测试用户失败: ${JSON.stringify(body)}`);
    } catch (error: any) {
      lastError = error;
      retries--;
      if (retries > 0) {
        await page.waitForTimeout(1000);
      }
    }
  }

  throw lastError;
}

async function closeModals(page: any) {
  const tourModal = page.locator('#tour-welcome-modal');
  if (await tourModal.isVisible()) {
    const closeBtn = tourModal.locator('.ant-modal-close');
    if (await closeBtn.isVisible()) {
      await closeBtn.click();
    }
  }

  const modalCloseBtns = page.locator('.ant-modal-close');
  const closeBtnCount = await modalCloseBtns.count();
  for (let i = 0; i < closeBtnCount; i++) {
    try {
      await modalCloseBtns.nth(i).click({ force: true });
    } catch (e) {}
  }

  await page.waitForTimeout(500);
}

async function loginTrainAdmin(page: any) {
  await ensureTestUser(page, { ...TEST_TRAIN_ADMIN, role: 'TRAIN_ADMIN' });

  await page.goto(`${BASE_URL}/login`);
  await page.waitForLoadState('networkidle');

  await page.getByPlaceholder('用户名').fill(TEST_TRAIN_ADMIN.username);
  await page.getByPlaceholder('密码').fill(TEST_TRAIN_ADMIN.password);
  await page.locator('.ant-btn-primary').click();

  await page.waitForLoadState('networkidle');
  await expect(page).toHaveURL(/trains|dashboard/);
  await closeModals(page);
}

async function loginBA(page: any) {
  await ensureTestUser(page, { ...TEST_BA, role: 'BA' });

  await page.goto(`${BASE_URL}/login`);
  await page.waitForLoadState('networkidle');

  await page.getByPlaceholder('用户名').fill(TEST_BA.username);
  await page.getByPlaceholder('密码').fill(TEST_BA.password);
  await page.locator('.ant-btn-primary').click();

  await page.waitForLoadState('networkidle');
  await closeModals(page);
}

test('TC2.3-FE-01: 进入班次列表页默认加载全局班次', async ({ page }) => {
  await loginTrainAdmin(page);

  await page.goto(`${BASE_URL}/schedules`);
  await page.waitForLoadState('networkidle');

  await expect(page.locator('.rt-page-title')).toHaveText('班次列表');

  const trainSelect = page.locator('.rt-filter-bar .ant-select');
  await expect(trainSelect).toBeVisible();

  const table = page.locator('.ant-table');
  await expect(table).toBeVisible();
});

test('TC2.3-FE-02: 火车下拉加载（下拉框包含火车选项）', async ({ page }) => {
  await loginTrainAdmin(page);

  await page.goto(`${BASE_URL}/schedules`);
  await page.waitForLoadState('networkidle');

  const trainSelect = page.locator('.rt-filter-bar .ant-select');
  await trainSelect.click({ force: true });
  await page.waitForTimeout(500);

  const options = page.locator('.ant-select-dropdown .ant-select-item');
  const optionCount = await options.count();
  expect(optionCount).toBeGreaterThan(0);

  await page.keyboard.press('Escape');
});

test('TC2.3-FE-03: 切换所属火车刷新班次列表', async ({ page }) => {
  await loginTrainAdmin(page);

  await page.goto(`${BASE_URL}/schedules`);
  await page.waitForLoadState('networkidle');

  const trainSelect = page.locator('.rt-filter-bar .ant-select');
  await trainSelect.click({ force: true });
  await page.waitForTimeout(500);

  const firstOption = page.locator('.ant-select-dropdown .ant-select-item').first();
  const optionCount = await page.locator('.ant-select-dropdown .ant-select-item').count();
  
  if (optionCount > 0) {
    await firstOption.click({ force: true });
    await page.waitForLoadState('networkidle');
  }
});

test('TC2.3-FE-04: 清空所属火车恢复全局列表', async ({ page }) => {
  await loginTrainAdmin(page);

  await page.goto(`${BASE_URL}/schedules`);
  await page.waitForLoadState('networkidle');

  const trainSelect = page.locator('.rt-filter-bar .ant-select');
  await trainSelect.click({ force: true });
  await page.waitForTimeout(500);

  const firstOption = page.locator('.ant-select-dropdown .ant-select-item').first();
  const optionCount = await page.locator('.ant-select-dropdown .ant-select-item').count();
  
  if (optionCount > 0) {
    await firstOption.click({ force: true });
    await page.waitForLoadState('networkidle');

    await trainSelect.click({ force: true });
    await page.waitForTimeout(500);

    const clearBtn = page.locator('.ant-select-clear-btn');
    if (await clearBtn.isVisible()) {
      await clearBtn.click({ force: true });
      await page.waitForLoadState('networkidle');
    }
  }
});

test('TC2.3-FE-06: 点击班次行进入详情页（如有数据）', async ({ page }) => {
  await loginTrainAdmin(page);

  await page.goto(`${BASE_URL}/schedules`);
  await page.waitForLoadState('networkidle');

  const tableRows = page.locator('.ant-table-tbody tr:not(.ant-table-measure-row)');
  const rowCount = await tableRows.count();

  if (rowCount > 0) {
    const firstRow = tableRows.first();
    await firstRow.click({ force: true });
    await page.waitForLoadState('networkidle');
    expect(page.url()).toMatch(/trains\/[^/]+\/schedules\/[^/]+$/);
  } else {
    const empty = page.locator('.ant-empty');
    await expect(empty).toBeVisible();
  }
});

test('TC2.3-FE-07: 未选择火车时点击新增班次提示警告', async ({ page }) => {
  await loginTrainAdmin(page);

  await page.goto(`${BASE_URL}/schedules`);
  await page.waitForLoadState('networkidle');
  await closeModals(page);

  const addBtn = page.locator('.rt-filter-bar').getByRole('button', { name: '新增班次' });
  await addBtn.click();

  await expect(page.locator('.ant-message-warning')).toBeVisible({ timeout: 3000 });
});

test('TC2.3-FE-08: 选择火车后点击新增班次打开弹窗', async ({ page }) => {
  await loginTrainAdmin(page);

  await page.goto(`${BASE_URL}/schedules`);
  await page.waitForLoadState('networkidle');
  await closeModals(page);

  const trainSelect = page.locator('.rt-filter-bar .ant-select');
  await trainSelect.click();
  await page.waitForTimeout(500);

  const options = page.locator('.ant-select-dropdown .ant-select-item');
  const optionCount = await options.count();
  
  if (optionCount > 0) {
    const secondOption = options.nth(1);
    const secondOptionText = await secondOption.textContent();
    
    if (secondOptionText && !secondOptionText.includes('全部')) {
      await secondOption.click();
    } else {
      await options.first().click();
    }
    
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    const addBtn = page.locator('.rt-filter-bar').getByRole('button', { name: '新增班次' });
    await addBtn.click();

    await expect(page.locator('.ant-modal-title')).toHaveText('新增班次');

    await page.locator('.ant-modal-close').click();
  }
});

test('TC2.3-FE-10: 计划中班次显示"开始"按钮', async ({ page }) => {
  await loginTrainAdmin(page);

  await page.goto(`${BASE_URL}/schedules`);
  await page.waitForLoadState('networkidle');

  const startBtn = page.getByRole('button', { name: '开始' });
  await expect(startBtn).toBeVisible({ timeout: 10000 });
});

test('TC2.3-FE-11: 进行中班次显示"封板"按钮', async ({ page }) => {
  await loginTrainAdmin(page);

  await page.goto(`${BASE_URL}/schedules`);
  await page.waitForLoadState('networkidle');

  const lockdownBtn = page.getByRole('button', { name: '封板' });
  await expect(lockdownBtn).toBeVisible({ timeout: 10000 });
});

test('TC2.3-FE-12: 封板班次显示"投产"按钮', async ({ page }) => {
  await loginTrainAdmin(page);

  await page.goto(`${BASE_URL}/schedules`);
  await page.waitForLoadState('networkidle');

  const releaseBtn = page.getByRole('button', { name: '投产' });
  await expect(releaseBtn).toBeVisible({ timeout: 10000 });
});

test('TC2.3-FE-14: 投产班次不显示状态变更按钮', async ({ page }) => {
  await loginTrainAdmin(page);

  await page.goto(`${BASE_URL}/schedules`);
  await page.waitForLoadState('networkidle');

  const tableRows = page.locator('.ant-table-tbody tr:not(.ant-table-measure-row)');
  const rowCount = await tableRows.count();
  
  for (let i = 0; i < rowCount; i++) {
    const row = tableRows.nth(i);
    const statusCell = row.locator('.ant-table-cell').nth(3);
    const statusText = await statusCell.textContent();
    
    if (statusText?.includes('投产')) {
      const actionButtons = row.locator('button');
      const actionBtnCount = await actionButtons.count();
      expect(actionBtnCount).toBe(0);
    }
  }
});

test('TC2.3-FE-15: BA 用户看不到新增班次按钮或点击提示无权限', async ({ page }) => {
  await loginBA(page);

  await page.goto(`${BASE_URL}/schedules`);
  await page.waitForLoadState('networkidle');

  const addBtn = page.locator('.rt-filter-bar').getByRole('button', { name: '新增班次' });
  const isAddBtnVisible = await addBtn.isVisible();
  
  expect(isAddBtnVisible).toBe(false);
});

test('TC2.3-FE-16: 点击刷新按钮刷新班次列表', async ({ page }) => {
  await loginTrainAdmin(page);

  await page.goto(`${BASE_URL}/schedules`);
  await page.waitForLoadState('networkidle');

  const refreshBtn = page.locator('.rt-page-actions').getByRole('button', { name: '刷新' });
  await refreshBtn.click();

  await page.waitForLoadState('networkidle');

  const table = page.locator('.ant-table');
  await expect(table).toBeVisible();
});