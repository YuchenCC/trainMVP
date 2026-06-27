import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:5173';

async function login(page: any, username: string, password: string) {
  await page.goto(`${BASE_URL}/login`);
  await page.waitForLoadState('networkidle');
  
  // Ant Design Form.Item 的 input 没有 name 属性，用 placeholder 定位
  await page.getByPlaceholder('用户名').fill(username);
  await page.getByPlaceholder('密码').fill(password);
  await page.locator('.ant-btn-primary').click();
  
  await page.waitForLoadState('networkidle');
  await expect(page).toHaveURL(/trains|dashboard/);
}

async function logout(page: any) {
  await page.goto(`${BASE_URL}/login`);
  await page.waitForLoadState('networkidle');
}

test('simple test - login page visible', async ({ page }) => {
  await page.goto(`${BASE_URL}/login`);
  await expect(page.getByPlaceholder('用户名')).toBeVisible();
  await expect(page.getByPlaceholder('密码')).toBeVisible();
  await expect(page.getByRole('button', { name: '登录' })).toBeVisible();
});

test('Journey 1: BA 录入需求 → 发起评审 → PM 审批通过', async ({ page }) => {
  const testTitle = `E2E测试需求_${Date.now()}`;

  await login(page, 'ba', 'BAPass123!');
  await page.waitForLoadState('networkidle');

  await page.goto(`${BASE_URL}/requirements/new`);
  await page.waitForLoadState('networkidle');

  await page.getByLabel('需求标题').fill(testTitle);
  await page.getByPlaceholder('请输入需求描述').fill('<p>这是一个E2E测试需求</p>');
  
  // 选择系统
  await page.getByLabel('归属系统').click();
  await page.waitForTimeout(500);
  const systemOption = page.getByRole('option').first();
  if (await systemOption.isVisible()) {
    await systemOption.click();
  }

  await page.getByLabel('工作量(点)').fill('3');
  await page.getByRole('button', { name: '提交' }).click();

  await page.waitForLoadState('networkidle');
  await expect(page).toHaveURL(/requirements\/[a-z0-9-]+/);

  const reqId = page.url().split('/').pop();
  
  await page.getByRole('button', { name: '发起评审' }).click();
  await page.waitForLoadState('networkidle');

  await logout(page);

  await login(page, 'pm', 'PMPass123!');
  await page.waitForLoadState('networkidle');

  await page.goto(`${BASE_URL}/requirements/${reqId}`);
  await page.waitForLoadState('networkidle');

  await page.getByRole('button', { name: '评审通过' }).click();
  await page.waitForLoadState('networkidle');

  const statusTag = page.locator('.ant-tag').filter({ hasText: 'READY' });
  await statusTag.waitFor();

  await logout(page);
});

test('Journey 2: BA 录入需求 → 发起评审 → PM 拒绝 → BA 重新编辑', async ({ page }) => {
  const testTitle = `E2E测试需求_${Date.now()}_reject`;

  await login(page, 'ba', 'BAPass123!');
  await page.waitForLoadState('networkidle');

  await page.goto(`${BASE_URL}/requirements/new`);
  await page.waitForLoadState('networkidle');

  await page.getByLabel('需求标题').fill(testTitle);
  await page.getByPlaceholder('请输入需求描述').fill('<p>这是一个测试拒绝流程的需求</p>');
  
  await page.getByLabel('归属系统').click();
  await page.waitForTimeout(500);
  const systemOption = page.getByRole('option').first();
  if (await systemOption.isVisible()) {
    await systemOption.click();
  }

  await page.getByLabel('工作量(点)').fill('3');
  await page.getByRole('button', { name: '提交' }).click();

  await page.waitForLoadState('networkidle');
  await expect(page).toHaveURL(/requirements\/[a-z0-9-]+/);

  const reqId = page.url().split('/').pop();
  
  await page.getByRole('button', { name: '发起评审' }).click();
  await page.waitForLoadState('networkidle');

  await logout(page);

  await login(page, 'pm', 'PMPass123!');
  await page.waitForLoadState('networkidle');

  await page.goto(`${BASE_URL}/requirements/${reqId}`);
  await page.waitForLoadState('networkidle');

  await page.getByRole('button', { name: '评审拒绝' }).click();
  
  // 拒绝弹窗
  const rejectModal = page.getByRole('dialog').filter({ hasText: '拒绝' });
  await rejectModal.waitFor();
  await page.getByPlaceholder('请输入拒绝原因').fill('测试拒绝原因');
  await rejectModal.getByRole('button', { name: '确认' }).click();
  await page.waitForLoadState('networkidle');

  const rejectedTag = page.locator('.ant-tag').filter({ hasText: 'REJECTED' });
  await rejectedTag.waitFor();

  await logout(page);

  await login(page, 'ba', 'BAPass123!');
  await page.waitForLoadState('networkidle');

  await page.goto(`${BASE_URL}/requirements/${reqId}`);
  await page.waitForLoadState('networkidle');

  await page.getByRole('button', { name: '重新编辑' }).click();
  await page.waitForLoadState('networkidle');
  await expect(page).toHaveURL(`/requirements/${reqId}/edit`);

  await page.getByLabel('需求标题').fill(`${testTitle}_修改后`);
  await page.getByRole('button', { name: '提交' }).click();
  await page.waitForLoadState('networkidle');

  await page.getByRole('button', { name: '发起评审' }).click();
  await page.waitForLoadState('networkidle');

  await logout(page);
});

test('Journey 3: 紧急变更完整流程', async ({ page }) => {
  const testTitle = `E2E测试需求_${Date.now()}_emergency`;

  // BA 创建需求
  await login(page, 'ba', 'BAPass123!');
  await page.waitForLoadState('networkidle');

  await page.goto(`${BASE_URL}/requirements/new`);
  await page.waitForLoadState('networkidle');

  await page.getByLabel('需求标题').fill(testTitle);
  await page.getByPlaceholder('请输入需求描述').fill('<p>这是一个测试紧急变更的需求</p>');
  
  await page.getByLabel('归属系统').click();
  await page.waitForTimeout(500);
  const systemOption = page.getByRole('option').first();
  if (await systemOption.isVisible()) {
    await systemOption.click();
  }

  await page.getByLabel('工作量(点)').fill('3');
  await page.getByRole('button', { name: '提交' }).click();

  await page.waitForLoadState('networkidle');
  const reqId = page.url().split('/').pop();

  await logout(page);

  // PM 发起评审
  await login(page, 'pm', 'PMPass123!');
  await page.waitForLoadState('networkidle');

  await page.goto(`${BASE_URL}/requirements/${reqId}`);
  await page.waitForLoadState('networkidle');

  await page.getByRole('button', { name: '发起评审' }).click();
  await page.waitForLoadState('networkidle');

  await logout(page);

  // PROJECT_MGR 审批通过
  await login(page, 'project_mgr', 'PMgrPass123!');
  await page.waitForLoadState('networkidle');

  await page.goto(`${BASE_URL}/requirements/${reqId}`);
  await page.waitForLoadState('networkidle');

  await page.getByRole('button', { name: '评审通过' }).click();
  await page.waitForLoadState('networkidle');

  await logout(page);

  // PM 发起紧急变更
  await login(page, 'pm', 'PMPass123!');
  await page.waitForLoadState('networkidle');

  await page.goto(`${BASE_URL}/requirements/${reqId}`);
  await page.waitForLoadState('networkidle');

  await page.getByRole('button', { name: '紧急变更' }).click();
  
  const emergencyModal = page.getByRole('dialog').filter({ hasText: '紧急变更' });
  await emergencyModal.waitFor();
  await page.getByPlaceholder('请输入紧急变更原因').fill('测试紧急变更原因');
  await emergencyModal.getByRole('button', { name: '确认' }).click();
  await page.waitForLoadState('networkidle');

  await logout(page);

  // TEST_MGR 审批
  await login(page, 'test_mgr', 'TestPass123!');
  await page.waitForLoadState('networkidle');

  await page.goto(`${BASE_URL}/requirements/${reqId}`);
  await page.waitForLoadState('networkidle');

  await page.getByRole('button', { name: '审批通过' }).click();
  await page.waitForLoadState('networkidle');

  await logout(page);

  // PROJECT_MGR 最终审批
  await login(page, 'project_mgr', 'PMgrPass123!');
  await page.waitForLoadState('networkidle');

  await page.goto(`${BASE_URL}/requirements/${reqId}`);
  await page.waitForLoadState('networkidle');

  await page.getByRole('button', { name: '审批通过' }).click();
  await page.waitForLoadState('networkidle');

  const draftTag = page.locator('.ant-tag').filter({ hasText: 'DRAFT' });
  await draftTag.waitFor();

  await logout(page);
});