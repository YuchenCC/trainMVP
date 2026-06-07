#!/usr/bin/env python3
"""直接访问班次详情页测试导览"""
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
    print("直接访问班次详情页测试导览")
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
    
    # 2. 清除模态框和localStorage
    print("\n2. 清除模态框和localStorage...")
    time.sleep(2)
    page.keyboard.press('Escape')
    time.sleep(1)
    page.evaluate('localStorage.removeItem("tour-progress")')
    time.sleep(1)
    
    # 3. 直接访问班次详情页
    print("\n3. 访问班次详情页...")
    # 尝试不同的URL格式
    test_urls = [
        f'{BASE_URL}/trains/1/schedules/1?tour=schedule-detail',
        f'{BASE_URL}/trains/1/schedules/1',
        f'{BASE_URL}/schedules/1',
    ]
    
    for url in test_urls:
        print(f"\n   尝试: {url}")
        page.goto(url)
        page.wait_for_load_state('domcontentloaded')
        time.sleep(3)
        print(f"   当前URL: {page.url}")
        
        # 检查页面内容
        page_text = page.inner_text('body')
        
        # 检查是否有"班次信息"等关键文本
        if '班次信息' in page_text or 'schedule-detail' in page_text.lower():
            print(f"   ✓ 找到班次详情页面内容")
            
            # 检查页面是否有错误
            error_elements = page.locator('.ant-result-title, .ant-empty-description')
            if error_elements.count() > 0:
                print(f"   ✗ 页面显示错误或空状态")
                for i in range(min(3, error_elements.count())):
                    print(f"     - {error_elements.nth(i).inner_text()}")
            break
        else:
            print(f"   ✗ 未找到班次详情页面内容")
            # 检查是否有"访问被拒绝"等错误
            if '访问' in page_text or '权限' in page_text or '403' in page_text:
                print(f"   ⚠️ 可能存在权限问题")
    
    # 4. 检查最终页面状态
    print("\n4. 检查最终页面状态...")
    page_text = page.inner_text('body')
    
    # 截图
    page.screenshot(path='schedule-detail-final.png')
    print(f"   截图已保存: schedule-detail-final.png")
    
    # 检查是否显示了班次详情
    if '班次信息' in page_text:
        print("   ✓ 页面包含'班次信息'")
    if '容量概览' in page_text:
        print("   ✓ 页面包含'容量概览'")
    if '搭载系统' in page_text:
        print("   ✓ 页面包含'搭载系统'")
    
    # 5. 等待导览
    print("\n5. 等待导览...")
    time.sleep(3)
    
    # 检查是否有导览tooltip
    tooltip = page.locator('.react-joyride__tooltip')
    if tooltip.count() > 0:
        print(f"   ✓ 导览已启动！")
        
        # 获取导览内容
        tooltip_content = tooltip.evaluate('el => el.textContent')
        print(f"   内容: {tooltip_content[:200]}...")
        
        # 6. 逐步测试导览
        step_count = 0
        while tooltip.count() > 0:
            step_count += 1
            content = tooltip.evaluate('el => el.textContent')
            print(f"\n   步骤 {step_count}: {content[:100]}...")
            
            # 截图
            page.screenshot(path=f'schedule-tour-step-{step_count}.png')
            print(f"   截图: schedule-tour-step-{step_count}.png")
            
            # 点击下一步
            next_button = page.locator('button:has-text("下一步")')
            if next_button.count() > 0:
                next_button.click()
                time.sleep(2)
            else:
                # 检查完成按钮
                last_button = page.locator('button:has-text("完成")')
                if last_button.count() > 0:
                    last_button.click()
                    time.sleep(1)
                    break
                else:
                    page.keyboard.press('Escape')
                    time.sleep(1)
                    break
        
        print(f"\n   ✓ 导览完成，共 {step_count} 个步骤")
    else:
        print("   ✗ 导览未启动")
        
        # 检查tour-progress
        tour_progress = page.evaluate('localStorage.getItem("tour-progress")')
        print(f"   tour-progress: {tour_progress}")
        
        # 检查URL参数
        url = page.url
        print(f"   当前URL: {url}")
        if 'tour=' in url:
            print(f"   URL包含tour参数")
        else:
            print(f"   ✗ URL不包含tour参数")
    
    # 保持浏览器打开
    print("\n等待10秒后关闭...")
    time.sleep(10)
    
    browser.close()