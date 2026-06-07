#!/usr/bin/env python3
"""测试所有导览的所有步骤"""
from playwright.sync_api import sync_playwright
import time

BASE_URL = "http://localhost:5173"

def test_tour(page, tour_name, tour_id, expected_steps):
    """测试单个导览的所有步骤"""
    print(f"\n{'='*60}")
    print(f"测试导览: {tour_name}")
    print(f"{'='*60}")
    
    # 等待页面稳定
    time.sleep(1)
    
    # 点击帮助按钮
    help_button = page.locator('button:has-text("帮助")')
    help_button.click()
    time.sleep(1)
    
    # 点击对应的导览项
    tour_item = page.locator(f'text={tour_name}').first
    tour_item.click()
    
    # 等待导览启动
    time.sleep(3)
    
    # 检查导览是否启动
    tooltip = page.locator('.react-joyride__tooltip')
    if tooltip.count() == 0:
        print(f"✗ 导览未启动")
        return False
    
    print(f"✓ 导览已启动")
    
    # 验证每个步骤
    step_count = 0
    while tooltip.count() > 0:
        step_count += 1
        
        # 获取当前步骤的内容
        tooltip_content = tooltip.evaluate('el => el.textContent')
        print(f"  步骤 {step_count}: {tooltip_content[:100]}...")
        
        # 点击下一步按钮
        next_button = page.locator('button:has-text("下一步")')
        if next_button.count() > 0:
            next_button.click()
            time.sleep(2)
        else:
            # 检查是否有完成按钮
            last_button = page.locator('button:has-text("完成")')
            if last_button.count() > 0:
                last_button.click()
                time.sleep(1)
                break
            else:
                # 没有下一步或完成按钮，退出
                page.keyboard.press('Escape')
                time.sleep(1)
                break
    
    print(f"✓ 导览完成，共 {step_count} 个步骤")
    
    # 验证步骤数量
    if step_count == expected_steps:
        print(f"✓ 步骤数量正确（预期 {expected_steps} 步）")
        return True
    else:
        print(f"✗ 步骤数量不正确（预期 {expected_steps} 步，实际 {step_count} 步）")
        return False

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    context = browser.new_context(viewport={'width': 1920, 'height': 1080})
    page = context.new_page()
    
    # 监听控制台输出
    page.on('console', lambda msg: print(f'[Console] {msg.text}'))
    
    print("=" * 60)
    print("测试所有导览")
    print("=" * 60)
    
    # 1. 登录
    print("\n1. 登录...")
    page.goto(f'{BASE_URL}/login', timeout=10000)
    page.wait_for_load_state('domcontentloaded')
    page.fill('input[placeholder="用户名"]', 'puhuiqianduan_ba')
    page.fill('input[placeholder="密码"]', '123456')
    page.click('button:has-text("登 录")')
    page.wait_for_url('**/dashboard', timeout=10000)
    print("   ✓ 登录成功")
    
    # 2. 关闭欢迎模态框
    print("\n2. 关闭欢迎模态框...")
    time.sleep(2)
    skip_button = page.locator('button:has-text("跳过，直接使用")')
    if skip_button.count() > 0:
        skip_button.click()
        time.sleep(1)
        print("   ✓ 已点击跳过按钮")
    
    # 3. 等待导览启动并退出
    print("\n3. 退出初始导览...")
    time.sleep(3)
    tooltip = page.locator('.react-joyride__tooltip')
    if tooltip.count() > 0:
        # 点击完成按钮
        last_button = page.locator('button:has-text("完成")')
        if last_button.count() > 0:
            last_button.click()
            time.sleep(1)
        else:
            page.keyboard.press('Escape')
            time.sleep(1)
        print("   ✓ 已退出初始导览")
    
    # 等待页面稳定
    time.sleep(2)
    
    # 清除导览进度，确保从第1步开始
    print("\n4. 清除导览进度...")
    page.evaluate('localStorage.removeItem("tour-progress")')
    print("   ✓ 已清除导览进度")
    
    # 5. 测试各个导览
    results = {}
    
    # 测试仪表盘导览（预期8步）
    results['dashboard'] = test_tour(page, '仪表盘导览', 'dashboard', 8)
    
    # 测试需求池导览（预期4步）
    results['requirements'] = test_tour(page, '需求池导览', 'requirements', 4)
    
    # 测试月历视图导览（预期5步）
    results['calendar'] = test_tour(page, '月历视图导览', 'calendar', 5)
    
    # 测试版本火车导览（预期3步）
    results['trains'] = test_tour(page, '版本火车导览', 'trains', 3)
    
    # 测试班次详情导览（预期8步）
    # 需要先跳转到班次详情页
    print(f"\n{'='*60}")
    print(f"测试导览: 班次详情导览")
    print(f"{'='*60}")
    
    # 先跳转到版本火车页面
    page.goto(f'{BASE_URL}/trains')
    page.wait_for_load_state('domcontentloaded')
    time.sleep(2)
    
    # 点击第一个火车的查看按钮
    view_button = page.locator('button:has-text("查看")').first
    if view_button.count() > 0:
        view_button.click()
        time.sleep(2)
        
        # 等待页面跳转到火车详情页
        page.wait_for_url('**/trains/*', timeout=5000)
        
        # 点击班次列表中的第一个班次
        schedule_link = page.locator('a:has-text("班次")').first
        if schedule_link.count() > 0:
            schedule_link.click()
            time.sleep(2)
            page.wait_for_url('**/schedules/*', timeout=5000)
            
            # 等待导览启动
            time.sleep(3)
            
            # 检查导览是否启动
            tooltip = page.locator('.react-joyride__tooltip')
            if tooltip.count() > 0:
                print(f"✓ 导览已启动")
                
                # 验证每个步骤
                step_count = 0
                while tooltip.count() > 0:
                    step_count += 1
                    tooltip_content = tooltip.evaluate('el => el.textContent')
                    print(f"  步骤 {step_count}: {tooltip_content[:100]}...")
                    
                    next_button = page.locator('button:has-text("下一步")')
                    if next_button.count() > 0:
                        next_button.click()
                        time.sleep(1)
                    else:
                        last_button = page.locator('button:has-text("完成")')
                        if last_button.count() > 0:
                            last_button.click()
                            time.sleep(1)
                            break
                        else:
                            page.keyboard.press('Escape')
                            time.sleep(1)
                            break
                
                print(f"✓ 导览完成，共 {step_count} 个步骤")
                results['schedule-detail'] = (step_count == 8)
            else:
                print(f"✗ 导览未启动")
                results['schedule-detail'] = False
        else:
            print(f"✗ 未找到班次链接")
            results['schedule-detail'] = False
    else:
        print(f"✗ 未找到火车查看按钮")
        results['schedule-detail'] = False
    
    # 5. 输出测试结果
    print(f"\n{'='*60}")
    print(f"测试结果汇总")
    print(f"{'='*60}")
    
    all_passed = True
    for tour_name, passed in results.items():
        status = "✓ 通过" if passed else "✗ 失败"
        print(f"{tour_name}: {status}")
        if not passed:
            all_passed = False
    
    if all_passed:
        print("\n✓ 所有导览测试通过！")
    else:
        print("\n✗ 部分导览测试失败")
    
    browser.close()