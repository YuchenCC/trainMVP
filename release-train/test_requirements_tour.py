#!/usr/bin/env python3
"""测试需求池导览"""
from playwright.sync_api import sync_playwright
import time

with sync_playwright() as p:
    browser = p.chromium.launch(headless=False)
    context = browser.new_context(viewport={'width': 1920, 'height': 1080})
    page = context.new_page()
    
    print("1. 登录...")
    page.goto('http://localhost:5173/login')
    page.wait_for_load_state('networkidle')
    page.evaluate('localStorage.clear()')
    page.reload()
    page.wait_for_load_state('networkidle')
    
    page.fill('input[placeholder="用户名"]', 'puhuiqianduan_ba')
    page.fill('input[placeholder="密码"]', '123456')
    page.click('button:has-text("登 录")')
    page.wait_for_url('**/dashboard', timeout=10000)
    
    print("2. 导航到需求池...")
    page.click('a[href="/requirements"]')
    page.wait_for_url('**/requirements')
    page.wait_for_load_state('networkidle')
    time.sleep(1)
    
    print("3. 检查导览是否出现...")
    # 等待导览 tooltip 出现
    tooltip = page.locator('.react-joyride__tooltip')
    if tooltip.count() > 0:
        print("   ✓ 导览已启动")
        
        # 获取第一步的标题
        title = page.locator('#joyride-tooltip-title')
        print(f"   步骤 1 标题: {title.inner_text() if title.count() > 0 else 'N/A'}")
        time.sleep(0.5)
        
        # 截图
        page.screenshot(path='/tmp/requirements-tour-step1.png', full_page=True)
        
        # 点击下一步
        next_btn = page.locator('button:has-text("下一步")')
        if next_btn.count() > 0:
            next_btn.click()
            time.sleep(1)
            page.screenshot(path='/tmp/requirements-tour-step2.png', full_page=True)
            print("   ✓ 步骤 2")
        
        # 点击下一步
        if next_btn.count() > 0:
            next_btn.click()
            time.sleep(1)
            page.screenshot(path='/tmp/requirements-tour-step3.png', full_page=True)
            print("   ✓ 步骤 3")
        
        # 点击下一步
        if next_btn.count() > 0:
            next_btn.click()
            time.sleep(1)
            page.screenshot(path='/tmp/requirements-tour-step4.png', full_page=True)
            print("   ✓ 步骤 4")
        
        # 点击下一步（AI审查步骤）
        if next_btn.count() > 0:
            next_btn.click()
            time.sleep(1)
            page.screenshot(path='/tmp/requirements-tour-step5.png', full_page=True)
            print("   ✓ 步骤 5 - AI需求审查")
        
        # 完成
        finish_btn = page.locator('button:has-text("完成")')
        if finish_btn.count() > 0:
            finish_btn.click()
            time.sleep(0.5)
            print("   ✓ 导览完成")
        
        # 再次访问，检查是否不再显示
        print("\n4. 再次访问需求池，检查是否不显示导览...")
        page.reload()
        page.wait_for_load_state('networkidle')
        time.sleep(1)
        
        # 检查 localStorage
        completed = page.evaluate('() => localStorage.getItem("completed_tours")')
        print(f"   localStorage.completed_tours: {completed}")
        
        if not tooltip.count() > 0:
            print("   ✓ 导览不再显示")
        else:
            print("   ✗ 导览仍显示")
    else:
        print("   ✗ 导览未启动")
        page.screenshot(path='/tmp/requirements-tour-not-started.png', full_page=True)
    
    # 保持浏览器打开一会儿，方便手动检查
    time.sleep(3)
    browser.close()
    print("\n完成!")


