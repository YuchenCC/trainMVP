#!/usr/bin/env python3
"""测试修改后的导览"""
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    context = browser.new_context(viewport={'width': 1920, 'height': 1080})
    page = context.new_page()
    
    print("1. 登录...")
    page.goto('http://localhost:5173/login')
    page.wait_for_load_state('networkidle')
    page.evaluate('localStorage.clear()')
    page.reload()
    page.wait_for_load_state('networkidle')
    page.wait_for_timeout(500)
    
    page.fill('input[placeholder="用户名"]', 'puhuiqianduan_ba')
    page.fill('input[placeholder="密码"]', '123456')
    page.click('button:has-text("登 录")')
    page.wait_for_url('**/dashboard', timeout=10000)
    
    page.wait_for_timeout(2000)
    
    print("2. 开始导览...")
    start_btn = page.locator('button:has-text("开始我的专属导览")')
    if start_btn.count() > 0:
        start_btn.first.click()
        page.wait_for_timeout(2000)
        
        # 检查 tooltip
        tooltip = page.locator('.react-joyride__tooltip')
        title = page.locator('#joyride-tooltip-title')
        print(f"   tooltip 标题: {title.inner_text() if title.count() > 0 else 'N/A'}")
        
        # 检查按钮（只有一个步骤时应该显示"完成"而不是"下一步"）
        last_btn = page.locator('button:has-text("完成")')
        print(f"   完成按钮: {last_btn.count() > 0}")
        
        page.screenshot(path='/tmp/tour-single-step.png', full_page=True)
        print("   截图已保存")
    
    browser.close()
    print("\n完成!")
