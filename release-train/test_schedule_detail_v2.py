#!/usr/bin/env python3
"""直接跳转到火车详情页并测试班次详情导览"""
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
    page.keyboard.press('Escape')
    time.sleep(1)
    
    # 清除localStorage
    print("   清除localStorage...")
    page.evaluate('localStorage.removeItem("tour-progress")')
    time.sleep(1)
    
    # 3. 获取火车ID
    print("\n3. 获取火车ID...")
    page.goto(f'{BASE_URL}/trains')
    page.wait_for_load_state('domcontentloaded')
    time.sleep(2)
    
    # 获取表格数据
    rows = page.locator('table tbody tr')
    if rows.count() >= 2:
        # 获取第一个火车的名称（第二行，第一列）
        train_name = rows.nth(1).locator('td').first.inner_text()
        print(f"   火车名称: {train_name}")
    else:
        print("   ✗ 没有找到火车数据")
        browser.close()
        exit()
    
    # 4. 跳转到火车详情页
    print("\n4. 跳转到火车详情页...")
    # 根据火车名称，假设第一个火车的ID是1（实际需要从表格中获取）
    page.goto(f'{BASE_URL}/trains/1')
    page.wait_for_load_state('domcontentloaded')
    time.sleep(3)
    print(f"   当前URL: {page.url}")
    
    # 5. 查找班次链接
    print("\n5. 查找班次链接...")
    
    # 方法1：通过链接文本查找
    all_links = page.locator('a')
    schedule_links = []
    for i in range(all_links.count()):
        href = all_links.nth(i).get_attribute('href')
        text = all_links.nth(i).text_content()
        if href and '/schedules/' in href:
            schedule_links.append((text, href))
    
    print(f"   发现 {len(schedule_links)} 个班次链接")
    for text, href in schedule_links:
        print(f"   - {text}: {href}")
    
    if len(schedule_links) > 0:
        # 点击第一个班次链接
        text, href = schedule_links[0]
        print(f"\n6. 点击班次链接: {text}")
        
        # 提取班次ID
        match = re.search(r'/schedules/(\d+)', href)
        if match:
            schedule_id = match.group(1)
            # 直接导航到班次详情页，添加tour参数
            page.goto(f'{BASE_URL}/trains/1/schedules/{schedule_id}?tour=schedule-detail')
            page.wait_for_load_state('domcontentloaded')
            time.sleep(3)
            print(f"   当前URL: {page.url}")
        else:
            # 直接点击链接
            all_links.first.click()
            page.wait_for_load_state('domcontentloaded')
            time.sleep(3)
        
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
            
            # 检查是否有Joyride组件
            has_joyride = page.evaluate('document.body.innerHTML.includes("react-joyride")')
            print(f"   页面包含Joyride: {has_joyride}")
            
            # 检查tour-progress
            tour_progress = page.evaluate('localStorage.getItem("tour-progress")')
            print(f"   tour-progress: {tour_progress}")
    else:
        print("   ✗ 未找到班次链接")
        page.screenshot(path='train-detail-page.png')
    
    # 保持浏览器打开
    print("\n等待10秒后关闭...")
    time.sleep(10)
    
    browser.close()