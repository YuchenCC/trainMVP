#!/usr/bin/env python3
"""单独测试班次详情导览"""
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
    
    # 2. 清除导览进度
    print("\n2. 清除导览进度...")
    page.evaluate('localStorage.removeItem("tour-progress")')
    time.sleep(1)
    print("   ✓ 已清除导览进度")
    
    # 3. 跳转到版本火车页面
    print("\n3. 跳转到版本火车页面...")
    page.goto(f'{BASE_URL}/trains')
    page.wait_for_load_state('domcontentloaded')
    time.sleep(2)
    
    # 检查是否有火车
    trains = page.locator('table tbody tr')
    train_count = trains.count()
    print(f"   发现 {train_count} 个火车")
    
    if train_count > 0:
        # 4. 点击第一个火车的"查看"按钮
        print("\n4. 点击第一个火车的查看按钮...")
        view_button = page.locator('a:has-text("查看")').first
        if view_button.count() > 0:
            view_button.click()
            page.wait_for_load_state('domcontentloaded')
            time.sleep(2)
            print(f"   ✓ 已点击查看按钮，当前URL: {page.url}")
        else:
            print("   ✗ 未找到查看按钮")
    
    # 5. 等待班次列表加载
    print("\n5. 查找班次...")
    time.sleep(2)
    
    # 查找班次列表中的链接
    schedule_links = page.locator('a[href*="/schedules/"]')
    schedule_count = schedule_links.count()
    print(f"   发现 {schedule_count} 个班次链接")
    
    if schedule_count > 0:
        # 获取第一个班次链接的href
        first_schedule_href = schedule_links.first.get_attribute('href')
        print(f"   第一个班次链接: {first_schedule_href}")
        
        # 6. 点击第一个班次
        print("\n6. 点击第一个班次...")
        schedule_links.first.click()
        page.wait_for_load_state('domcontentloaded')
        time.sleep(3)
        
        print(f"   当前URL: {page.url}")
        
        # 7. 等待导览启动
        print("\n7. 等待导览启动...")
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
            while tooltip.count() > 0:
                step_count += 1
                print(f"\n   步骤 {step_count}: {tooltip.evaluate('el => el.textContent')[:100]}...")
                
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
            
            # 检查localStorage
            tour_progress = page.evaluate('localStorage.getItem("tour-progress")')
            print(f"   tour-progress: {tour_progress}")
            
            # 截图看看页面状态
            page.screenshot(path='schedule-detail-no-tour.png')
            print("   截图已保存: schedule-detail-no-tour.png")
    else:
        print("   ✗ 未找到班次链接")
        page.screenshot(path='trains-page.png')
        print("   截图已保存: trains-page.png")
    
    # 保持浏览器打开
    print("\n等待10秒后关闭...")
    time.sleep(10)
    
    browser.close()