#!/usr/bin/env python3
"""单独测试仪表盘导览"""
from playwright.sync_api import sync_playwright
import time

BASE_URL = "http://localhost:5173"

with sync_playwright() as p:
    browser = p.chromium.launch(headless=False)  # 可视化模式
    context = browser.new_context(viewport={'width': 1920, 'height': 1080})
    page = context.new_page()
    
    # 监听控制台输出
    page.on('console', lambda msg: print(f'[Console] {msg.text}'))
    
    print("=" * 60)
    print("测试仪表盘导览")
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
    
    # 3. 等待导览启动
    print("\n3. 等待导览启动...")
    time.sleep(2)
    
    # 检查导览是否启动
    tooltip = page.locator('.react-joyride__tooltip')
    if tooltip.count() > 0:
        print("   ✓ 导览已启动")
        
        # 截图
        page.screenshot(path='dashboard-tour-step-1.png')
        print("   ✓ 截图保存: dashboard-tour-step-1.png")
        
        # 验证每个步骤
        step_count = 0
        while tooltip.count() > 0:
            step_count += 1
            
            # 获取当前步骤的内容
            tooltip_content = tooltip.evaluate('el => el.textContent')
            print(f"\n  步骤 {step_count}: {tooltip_content[:200]}...")
            
            # 截图每个步骤
            page.screenshot(path=f'dashboard-tour-step-{step_count}.png')
            print(f"   ✓ 截图保存: dashboard-tour-step-{step_count}.png")
            
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
        
        print(f"\n✓ 导览完成，共 {step_count} 个步骤")
    else:
        print("   ✗ 导览未启动")
    
    # 保持浏览器打开一段时间
    print("\n浏览器保持打开10秒...")
    time.sleep(10)
    
    browser.close()