#!/usr/bin/env python3
"""测试班次详情导览"""
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
    print("测试班次详情导览")
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
    
    # 2. 关闭模态框
    print("\n2. 关闭模态框...")
    time.sleep(2)
    
    # 按ESC关闭模态框
    page.keyboard.press('Escape')
    time.sleep(1)
    
    # 刷新页面确保干净状态
    page.reload()
    page.wait_for_load_state('domcontentloaded')
    time.sleep(3)
    
    # 清除导览进度
    page.evaluate('localStorage.removeItem("tour-progress")')
    print("   ✓ 已刷新页面并清除导览进度")
    
    # 3. 点击帮助按钮
    print("\n3. 点击帮助按钮...")
    help_button = page.locator('button:has-text("帮助")')
    help_button.click()
    time.sleep(1)
    
    # 4. 点击班次详情导览
    print("\n4. 点击班次详情导览...")
    schedule_tour = page.locator('text=班次详情导览')
    if schedule_tour.count() > 0:
        schedule_tour.click()
        print("   ✓ 已点击班次详情导览")
    else:
        print("   ✗ 未找到班次详情导览")
    
    # 5. 等待页面跳转
    print("\n5. 等待页面跳转...")
    time.sleep(3)
    print(f"   当前URL: {page.url}")
    
    # 6. 等待导览启动
    print("\n6. 等待导览...")
    time.sleep(3)
    
    # 检查是否有导览tooltip
    tooltip = page.locator('.react-joyride__tooltip')
    if tooltip.count() > 0:
        print(f"   ✓ 导览已启动！")
        
        # 获取导览内容
        tooltip_content = tooltip.evaluate('el => el.textContent')
        print(f"   内容: {tooltip_content[:200]}...")
        
        # 7. 逐步测试导览
        step_count = 0
        while tooltip.count() > 0 and step_count < 10:
            step_count += 1
            content = tooltip.evaluate('el => el.textContent')
            print(f"\n   步骤 {step_count}: {content[:100]}...")
            
            # 截图
            page.screenshot(path=f'schedule-tour-step-{step_count}.png')
            print(f"   截图: schedule-tour-step-{step_count}.png")
            
            # 点击下一步
            next_button = page.locator('button:has-text("下一步")')
            if next_button.count() > 0:
                next_button.click(force=True)
                time.sleep(2)
            else:
                # 检查完成按钮
                last_button = page.locator('button:has-text("完成")')
                if last_button.count() > 0:
                    last_button.click(force=True)
                    time.sleep(1)
                    break
                else:
                    page.keyboard.press('Escape')
                    time.sleep(1)
                    break
        
        print(f"\n   ✓ 导览完成，共 {step_count} 个步骤")
    else:
        print("   ✗ 导览未启动")
        page.screenshot(path='schedule-detail-no-tour.png')
        print("   截图已保存: schedule-detail-no-tour.png")
    
    # 保持浏览器打开
    print("\n等待10秒后关闭...")
    time.sleep(10)
    
    browser.close()