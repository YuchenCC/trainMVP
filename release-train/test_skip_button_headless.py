#!/usr/bin/env python3
"""测试导览退出按钮功能 (Headless)"""
from playwright.sync_api import sync_playwright
import time

BASE_URL = "http://localhost:5173"

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    context = browser.new_context(viewport={'width': 1920, 'height': 1080})
    page = context.new_page()
    
    print("=" * 60)
    print("测试导览退出按钮功能 (Headless)")
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
    
    # 5. 检查导览
    print("\n5. 检查导览...")
    time.sleep(3)
    
    tooltip = page.locator('.react-joyride__tooltip')
    if tooltip.count() > 0:
        print("   ✓ 导览已启动")
        
        # 截图
        page.screenshot(path='tour-headless.png')
        print("   ✓ 已截图: tour-headless.png")
        
        # 检查按钮
        print("\n检查按钮:")
        buttons = tooltip.locator('button')
        print(f"   发现 {buttons.count()} 个按钮")
        
        for i in range(buttons.count()):
            btn = buttons.nth(i)
            text = btn.text_content()
            test_id = btn.get_attribute('data-testid')
            aria_label = btn.get_attribute('aria-label')
            data_action = btn.get_attribute('data-action')
            print(f"   按钮{i}:")
            print(f"      文本: '{text}'")
            print(f"      data-testid: '{test_id}'")
            print(f"      aria-label: '{aria_label}'")
            print(f"      data-action: '{data_action}'")
        
        # 查找skip按钮
        skip_button = None
        possible_texts = ['退出', 'skip', 'Skip', 'SKIP']
        
        for i in range(buttons.count()):
            btn = buttons.nth(i)
            text = btn.text_content() or ''
            test_id = btn.get_attribute('data-testid') or ''
            aria_label = btn.get_attribute('aria-label') or ''
            data_action = btn.get_attribute('data-action') or ''
            
            # 检查是否是skip按钮
            if (any(t in text for t in possible_texts) or 
                'skip' in test_id.lower() or 
                'skip' in aria_label.lower() or 
                'skip' in data_action.lower()):
                skip_button = btn
                break
        
        if skip_button:
            print("\n   ✓ 找到退出按钮!")
            print("   ✓ 成功! 退出按钮已显示")
            
            # 点击退出按钮
            print("\n6. 点击退出按钮...")
            skip_button.click(force=True)
            time.sleep(2)
            
            if tooltip.count() == 0:
                print("   ✓ 导览已成功关闭")
            else:
                print("   ✗ 导览仍在运行")
        else:
            print("\n   ✗ 未找到退出按钮")
            
            # 获取tooltip的完整HTML
            print("\nTooltip HTML:")
            print("-" * 80)
            print(tooltip.inner_html()[:1500])
    else:
        print("   ✗ 导览未启动")
        page.screenshot(path='no-tour.png')
        print("   截图已保存: no-tour.png")
    
    browser.close()
    print("\n测试完成!")