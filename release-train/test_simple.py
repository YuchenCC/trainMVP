#!/usr/bin/env python3
"""简单测试退出按钮显示"""
from playwright.sync_api import sync_playwright
import time

BASE_URL = "http://localhost:5173"

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    context = browser.new_context(viewport={'width': 1920, 'height': 1080})
    page = context.new_page()
    
    print("=" * 60)
    print("测试退出按钮是否显示")
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
    
    # 2. 强制关闭所有可能的模态框
    print("\n2. 处理模态框...")
    time.sleep(2)
    page.evaluate('() => { document.querySelectorAll(".ant-modal-wrap").forEach(el => el.remove()); }')
    page.keyboard.press('Escape')
    time.sleep(1)
    page.evaluate('() => { document.querySelectorAll(".ant-modal-wrap").forEach(el => el.remove()); }')
    page.reload()
    page.wait_for_load_state('domcontentloaded')
    time.sleep(3)
    page.evaluate('() => { document.querySelectorAll(".ant-modal-wrap").forEach(el => el.remove()); }')
    
    # 3. 清除localStorage
    print("\n3. 清除localStorage...")
    page.evaluate('localStorage.removeItem("tour-progress")')
    time.sleep(1)
    print("   ✓ 已清除导览进度")
    
    # 4. 导航到班次详情页
    print("\n4. 导航到班次详情页...")
    train_id = 'cmpqrlvz80002zbsxqb85tfbv'
    schedule_id = 'cmpqtafju000hzbsxe3vp04t2'
    page.goto(f'{BASE_URL}/trains/{train_id}/schedules/{schedule_id}')
    page.wait_for_load_state('domcontentloaded')
    time.sleep(3)
    page.evaluate('() => { document.querySelectorAll(".ant-modal-wrap").forEach(el => el.remove()); }')
    
    # 5. 检查按钮
    print("\n5. 检查按钮...")
    time.sleep(2)
    
    tooltip = page.locator('.react-joyride__tooltip')
    if tooltip.count() > 0:
        print("   ✓ 导览已启动")
        
        # 截图
        page.screenshot(path='final-test.png')
        print("   ✓ 已截图")
        
        # 检查按钮
        buttons = tooltip.locator('button')
        print(f"\n   发现 {buttons.count()} 个按钮:")
        
        for i in range(buttons.count()):
            btn = buttons.nth(i)
            text = btn.text_content()
            print(f"   按钮{i}: '{text}'")
        
        # 检查是否有退出按钮
        skip_button = page.locator('button:has-text("退出导览")')
        if skip_button.count() > 0:
            print("\n   ✓ ✓ ✓ 成功! 退出按钮已显示!")
        else:
            print("\n   ✗ 未找到退出按钮")
    else:
        print("   ✗ 导览未启动")
        page.screenshot(path='no-tour-final.png')
    
    browser.close()
    print("\n测试完成!")
