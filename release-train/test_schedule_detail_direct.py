#!/usr/bin/env python3
"""直接测试班次详情导览"""
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
    
    # 2. 关闭欢迎模态框
    print("\n2. 关闭欢迎模态框...")
    time.sleep(2)
    
    # 检查是否有任何模态框
    modal = page.locator('.ant-modal')
    if modal.count() > 0:
        print(f"   发现 {modal.count()} 个模态框")
        # 尝试关闭模态框
        skip_button = page.locator('button:has-text("跳过，直接使用")')
        if skip_button.count() > 0:
            skip_button.click()
            time.sleep(1)
            print("   ✓ 已点击跳过按钮")
        
        # 如果还有模态框，尝试关闭
        close_button = page.locator('.ant-modal button[class*="close"], .ant-modal-close')
        if close_button.count() > 0:
            close_button.click()
            time.sleep(1)
            print("   ✓ 已关闭模态框")
    
    # 按ESC键关闭任何剩余模态框
    page.keyboard.press('Escape')
    time.sleep(1)
    print("   ✓ 已按ESC键")
    
    # 刷新页面确保状态干净
    print("   刷新页面...")
    page.reload()
    page.wait_for_load_state('domcontentloaded')
    time.sleep(2)
    
    # 3. 清除导览进度
    print("\n3. 清除导览进度...")
    page.evaluate('localStorage.removeItem("tour-progress")')
    time.sleep(1)
    print("   ✓ 已清除导览进度")
    
    # 4. 跳转到版本火车页面
    print("\n4. 跳转到版本火车页面...")
    page.goto(f'{BASE_URL}/trains')
    page.wait_for_load_state('domcontentloaded')
    time.sleep(2)
    
    # 5. 点击火车名称进入火车详情页
    print("\n5. 点击火车名称进入火车详情页...")
    train_links = page.locator('table a')
    train_link_count = train_links.count()
    print(f"   发现 {train_link_count} 个链接")
    
    if train_link_count > 0:
        # 点击第一个火车链接
        first_link = train_links.first
        train_name = first_link.text_content()
        print(f"   点击: {train_name}")
        first_link.click(force=True)
        time.sleep(3)
        print(f"   当前URL: {page.url}")
    else:
        print("   ✗ 未找到火车链接")
    
    # 6. 查找并点击班次链接
    print("\n6. 查找班次链接...")
    time.sleep(2)
    
    # 获取当前页面的所有链接
    all_links = page.locator('a')
    schedule_links = []
    for i in range(all_links.count()):
        href = all_links.nth(i).get_attribute('href')
        if href and '/schedules/' in href:
            schedule_links.append((all_links.nth(i), href))
    
    print(f"   发现 {len(schedule_links)} 个班次链接")
    
    if len(schedule_links) > 0:
        link, href = schedule_links[0]
        print(f"   点击: {link.text_content()} -> {href}")
        link.click()
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
            
            # 检查页面HTML
            page_html = page.content()
            print(f"   页面HTML长度: {len(page_html)}")
            
            # 检查是否有react-joyride
            has_joyride = 'react-joyride' in page_html
            print(f"   页面包含 react-joyride: {has_joyride}")
            
            # 截图看看页面状态
            page.screenshot(path='schedule-detail-no-tour.png')
            print("   截图已保存: schedule-detail-no-tour.png")
    else:
        print("   ✗ 未找到班次链接")
        page.screenshot(path='train-detail-page.png')
        print("   截图已保存: train-detail-page.png")
    
    # 保持浏览器打开
    print("\n等待10秒后关闭...")
    time.sleep(10)
    
    browser.close()