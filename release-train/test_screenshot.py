#!/usr/bin/env python3
"""截图测试：查看导览实际显示情况"""
from playwright.sync_api import sync_playwright
import time

BASE_URL = "http://localhost:5173"

with sync_playwright() as p:
    browser = p.chromium.launch(headless=False)  # 改为可视化模式
    context = browser.new_context(viewport={'width': 1920, 'height': 1080})
    page = context.new_page()
    
    # 监听控制台输出
    page.on('console', lambda msg: print(f'[Console] {msg.text}'))
    
    print("=" * 60)
    print("测试: 导览显示情况")
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
    
    # 2. 等待欢迎模态框并关闭
    print("\n2. 关闭欢迎模态框...")
    time.sleep(2)
    
    # 截图1：欢迎模态框状态
    page.screenshot(path='screenshot-1-welcome-modal.png')
    print("   ✓ 截图保存: screenshot-1-welcome-modal.png")
    
    skip_button = page.locator('button:has-text("跳过，直接使用")')
    if skip_button.count() > 0:
        skip_button.click()
        time.sleep(1)
        print("   ✓ 已点击跳过按钮")
    
    # 3. 等待导览启动
    print("\n3. 等待导览启动...")
    time.sleep(3)
    
    # 截图2：导览启动状态
    page.screenshot(path='screenshot-2-tour-started.png')
    print("   ✓ 截图保存: screenshot-2-tour-started.png")
    
    # 检查导览元素
    print("\n4. 检查导览元素...")
    
    # 检查遮罩层
    overlay = page.locator('#react-joyride-portal')
    if overlay.count() > 0:
        print("   ✓ 找到导览遮罩层")
        print(f"   - 遮罩层HTML: {overlay.evaluate('el => el.outerHTML')[:200]}")
    
    # 检查tooltip
    tooltip = page.locator('.react-joyride__tooltip')
    if tooltip.count() > 0:
        print("   ✓ 找到tooltip")
        print(f"   - Tooltip内容: {tooltip.evaluate('el => el.textContent')}")
        # 截图3：tooltip详细
        page.screenshot(path='screenshot-3-tooltip-detail.png')
        print("   ✓ 截图保存: screenshot-3-tooltip-detail.png")
    else:
        print("   ✗ 未找到tooltip")
    
    # 检查spotlight
    spotlight = page.locator('.react-joyride__spotlight')
    if spotlight.count() > 0:
        print("   ✓ 找到spotlight")
    else:
        print("   ✗ 未找到spotlight")
    
    # 等待一段时间后自动关闭
    print("\n5. 等待5秒后自动关闭...")
    time.sleep(5)
    
    browser.close()