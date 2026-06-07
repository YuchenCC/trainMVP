#!/usr/bin/env python3
"""测试导览退出按钮功能"""
from playwright.sync_api import sync_playwright
import time

BASE_URL = "http://localhost:5173"

with sync_playwright() as p:
    browser = p.chromium.launch(headless=False)
    context = browser.new_context(viewport={'width': 1920, 'height': 1080})
    page = context.new_page()
    
    # 监听控制台输出
    page.on('console', lambda msg: print(f'[Console] {msg.text}'))
    
    print("=" * 60)
    print("测试导览退出按钮功能")
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
    
    # 2. 处理模态框
    print("\n2. 处理模态框...")
    time.sleep(2)
    page.keyboard.press('Escape')
    time.sleep(1)
    page.reload()
    page.wait_for_load_state('domcontentloaded')
    time.sleep(3)
    
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
    print(f"   当前URL: {page.url}")
    
    # 5. 检查导览是否启动
    print("\n5. 检查导览...")
    time.sleep(3)
    
    tooltip = page.locator('.react-joyride__tooltip')
    if tooltip.count() > 0:
        print("   ✓ 导览已启动")
        
        # 检查是否有退出按钮
        skip_button = page.locator('button:has-text("退出导览")')
        if skip_button.count() > 0:
            print("   ✓ 找到'退出导览'按钮")
            
            # 截图显示退出按钮
            page.screenshot(path='tour-with-skip-button.png')
            print("   ✓ 已截图: tour-with-skip-button.png")
            
            # 点击退出按钮
            print("\n6. 点击退出按钮...")
            skip_button.click()
            time.sleep(2)
            
            # 检查导览是否关闭
            if tooltip.count() == 0:
                print("   ✓ 导览已成功关闭")
            else:
                print("   ✗ 导览仍在运行")
        else:
            print("   ✗ 未找到'退出导览'按钮")
            
            # 检查所有按钮
            print("\n检查tooltip中的所有按钮:")
            buttons = tooltip.locator('button')
            for i in range(buttons.count()):
                btn = buttons.nth(i)
                text = btn.text_content()
                print(f"   - 按钮{i}: {text}")
    else:
        print("   ✗ 导览未启动")
    
    # 保持浏览器打开
    print("\n等待10秒后关闭...")
    time.sleep(10)
    
    browser.close()