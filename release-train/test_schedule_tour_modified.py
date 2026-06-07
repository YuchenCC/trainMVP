#!/usr/bin/env python3
"""测试修改后的班次详情导览"""
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
    print("测试修改后的班次详情导览")
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
    page.keyboard.press('Escape')
    time.sleep(1)
    page.evaluate('localStorage.removeItem("tour-progress")')
    time.sleep(1)
    
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
    
    # 6. 检查页面状态
    print("\n6. 检查页面状态...")
    page_text = page.inner_text('body')
    
    if '班次信息' in page_text:
        print("   ✓ 页面包含'班次信息'")
    if '容量概览' in page_text:
        print("   ✓ 页面包含'容量概览'")
    
    # 7. 等待导览启动
    print("\n7. 等待导览...")
    time.sleep(3)
    
    # 检查是否有导览tooltip
    tooltip = page.locator('.react-joyride__tooltip')
    if tooltip.count() > 0:
        print(f"   ✓ 导览已启动！")
        
        # 获取导览内容
        tooltip_content = tooltip.evaluate('el => el.textContent')
        print(f"   内容: {tooltip_content[:200]}...")
        
        # 8. 逐步测试导览
        step_count = 0
        while tooltip.count() > 0 and step_count < 10:  # 最多10步防止无限循环
            step_count += 1
            content = tooltip.evaluate('el => el.textContent')
            print(f"\n   步骤 {step_count}: {content[:100]}...")
            
            # 截图
            page.screenshot(path=f'schedule-tour-step-{step_count}.png')
            print(f"   截图: schedule-tour-step-{step_count}.png")
            
            # 点击下一步
            next_button = page.locator('button:has-text("下一步")')
            if next_button.count() > 0:
                next_button.click(force=True)  # 使用force绕过模态框拦截
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
        
        # 检查页面状态
        page.screenshot(path='schedule-detail-status.png')
        print("   截图已保存: schedule-detail-status.png")
        
        # 检查是否有错误
        error_elements = page.locator('.ant-result-title')
        if error_elements.count() > 0:
            print(f"   页面错误: {error_elements.first.inner_text()}")
    
    # 保持浏览器打开
    print("\n等待10秒后关闭...")
    time.sleep(10)
    
    browser.close()