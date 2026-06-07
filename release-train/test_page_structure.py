#!/usr/bin/env python3
"""检查页面结构"""
from playwright.sync_api import sync_playwright
import time

BASE_URL = "http://localhost:5173"

with sync_playwright() as p:
    browser = p.chromium.launch(headless=False)
    context = browser.new_context(viewport={'width': 1920, 'height': 1080})
    page = context.new_page()
    
    print("=" * 60)
    print("检查页面结构")
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
    
    # 2. 跳转到版本火车页面
    print("\n2. 跳转到版本火车页面...")
    page.goto(f'{BASE_URL}/trains')
    page.wait_for_load_state('domcontentloaded')
    time.sleep(3)
    
    # 3. 检查表格中的链接
    print("\n3. 检查表格中的链接...")
    
    # 获取所有链接
    all_links = page.locator('a')
    link_count = all_links.count()
    print(f"   发现 {link_count} 个链接:")
    for i in range(link_count):
        link_text = all_links.nth(i).text_content()
        link_href = all_links.nth(i).get_attribute('href')
        print(f"   {i+1}. {link_text} -> {link_href}")
    
    # 4. 检查所有按钮
    print("\n4. 检查所有按钮...")
    buttons = page.locator('button')
    button_count = buttons.count()
    print(f"   发现 {button_count} 个按钮:")
    for i in range(button_count):
        button_text = buttons.nth(i).text_content()
        if button_text:
            print(f"   {i+1}. {button_text.strip()}")
    
    # 5. 检查表格行
    print("\n5. 检查表格行...")
    rows = page.locator('table tbody tr')
    row_count = rows.count()
    print(f"   发现 {row_count} 行:")
    
    for i in range(row_count):
        row_html = rows.nth(i).inner_html()
        print(f"\n   第 {i+1} 行 HTML:")
        print(f"   {row_html[:500]}...")
    
    # 截图
    page.screenshot(path='trains-page-structure.png')
    print("\n   截图已保存: trains-page-structure.png")
    
    # 保持浏览器打开
    print("\n等待10秒后关闭...")
    time.sleep(10)
    
    browser.close()