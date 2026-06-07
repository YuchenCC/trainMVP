#!/usr/bin/env python3
"""全面测试导览功能"""
from playwright.sync_api import sync_playwright
import time

BASE_URL = "http://localhost:5173"

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    context = browser.new_context(viewport={'width': 1920, 'height': 1080})
    page = context.new_page()
    
    print("=" * 60)
    print("全面测试导览功能")
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
    
    # 5. 测试"下一步"按钮
    print("\n5. 测试'下一步'按钮...")
    tooltip = page.locator('.react-joyride__tooltip')
    
    if tooltip.count() > 0:
        print("   ✓ 导览已启动")
        
        # 检查按钮
        buttons = tooltip.locator('button')
        print(f"   发现 {buttons.count()} 个按钮")
        
        # 点击"下一步"按钮
        next_button = page.locator('button:has-text("下一步")')
        if next_button.count() > 0:
            print("   ✓ 找到'下一步'按钮")
            next_button.click()
            time.sleep(1)
            
            # 检查是否到了下一步
            if tooltip.count() > 0:
                print("   ✓ '下一步'按钮工作正常")
                
                # 点击"退出导览"按钮
                print("\n6. 点击'退出导览'按钮...")
                skip_button = page.locator('button:has-text("退出导览")')
                if skip_button.count() > 0:
                    skip_button.click()
                    time.sleep(2)
                    
                    # 检查是否退出
                    if tooltip.count() == 0:
                        print("   ✓ 成功退出导览!")
                    else:
                        print("   ✗ 导览仍在运行，尝试截图...")
                        page.screenshot(path='still-running.png')
                else:
                    print("   ✗ 未找到'退出导览'按钮")
        else:
            print("   ✗ 未找到'下一步'按钮")
            page.screenshot(path='no-next-button.png')
    else:
        print("   ✗ 导览未启动")
        page.screenshot(path='no-tour.png')
    
    print("\n" + "=" * 60)
    print("测试完成!")
    browser.close()
