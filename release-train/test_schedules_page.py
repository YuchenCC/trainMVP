#!/usr/bin/env python3
"""测试班次列表页面并找到班次详情"""
from playwright.sync_api import sync_playwright
import time
import re

BASE_URL = "http://localhost:5173"

with sync_playwright() as p:
    browser = p.chromium.launch(headless=False)
    context = browser.new_context(viewport={'width': 1920, 'height': 1080})
    page = context.new_page()
    
    # 监听控制台输出
    page.on('console', lambda msg: print(f'[Console] {msg.text}'))
    
    print("=" * 60)
    print("测试班次列表页面和班次详情导览")
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
    
    # 3. 跳转到班次列表页面
    print("\n3. 跳转到班次列表页面...")
    page.goto(f'{BASE_URL}/schedules')
    page.wait_for_load_state('domcontentloaded')
    time.sleep(3)
    print(f"   URL: {page.url}")
    
    # 4. 检查页面内容
    print("\n4. 检查页面内容...")
    
    # 检查是否有班次日历或班次卡片
    schedule_cards = page.locator('[class*="schedule"], [class*="Schedule"]')
    print(f"   发现 {schedule_cards.count()} 个班次相关元素")
    
    # 检查按钮
    buttons = page.locator('button')
    print(f"   发现 {buttons.count()} 个按钮:")
    for i in range(buttons.count()):
        text = buttons.nth(i).text_content()
        if text and text.strip():
            print(f"   - {text.strip()}")
    
    # 检查链接
    print("\n5. 检查链接...")
    links = page.locator('a')
    schedule_links = []
    for i in range(links.count()):
        href = links.nth(i).get_attribute('href')
        text = links.nth(i).text_content()
        if href and '/schedules/' in href and '?' not in href:
            schedule_links.append((text, href))
        elif text and '班次' in text:
            print(f"   班次相关链接: {text} -> {href}")
    
    print(f"\n   发现 {len(schedule_links)} 个班次详情链接:")
    for text, href in schedule_links[:5]:
        print(f"   - {text}: {href}")
    
    if len(schedule_links) > 0:
        # 6. 点击第一个班次
        print("\n6. 点击第一个班次...")
        text, href = schedule_links[0]
        print(f"   点击: {text} -> {href}")
        
        # 直接导航到该URL，添加tour参数
        page.goto(f'{BASE_URL}{href}?tour=schedule-detail')
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
            
            # 检查页面状态
            page.screenshot(path='schedule-detail-no-tour.png')
            print("   截图已保存: schedule-detail-no-tour.png")
            
            # 检查tour-progress
            tour_progress = page.evaluate('localStorage.getItem("tour-progress")')
            print(f"   tour-progress: {tour_progress}")
    else:
        print("   ✗ 未找到班次链接")
        
        # 截图
        page.screenshot(path='schedules-page.png')
        print("   截图已保存: schedules-page.png")
    
    # 保持浏览器打开
    print("\n等待10秒后关闭...")
    time.sleep(10)
    
    browser.close()