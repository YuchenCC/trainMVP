#!/usr/bin/env python3
"""检查火车详情页结构"""
from playwright.sync_api import sync_playwright
import time

BASE_URL = "http://localhost:5173"

with sync_playwright() as p:
    browser = p.chromium.launch(headless=False)
    context = browser.new_context(viewport={'width': 1920, 'height': 1080})
    page = context.new_page()
    
    print("=" * 60)
    print("检查火车详情页结构")
    print("=" * 60)
    
    # 登录
    page.goto(f'{BASE_URL}/login', timeout=10000)
    page.wait_for_load_state('domcontentloaded')
    page.fill('input[placeholder="用户名"]', 'puhuiqianduan_ba')
    page.fill('input[placeholder="密码"]', '123456')
    page.click('button:has-text("登 录")')
    page.wait_for_url('**/dashboard', timeout=10000)
    
    # 清除模态框
    time.sleep(2)
    page.keyboard.press('Escape')
    time.sleep(1)
    
    # 跳转到火车详情页
    print("\n1. 跳转到火车详情页...")
    page.goto(f'{BASE_URL}/trains/1')
    page.wait_for_load_state('domcontentloaded')
    time.sleep(3)
    print(f"   URL: {page.url}")
    
    # 获取页面标题
    title = page.title()
    print(f"   页面标题: {title}")
    
    # 获取所有按钮
    print("\n2. 检查所有按钮:")
    buttons = page.locator('button')
    for i in range(buttons.count()):
        text = buttons.nth(i).text_content()
        if text:
            print(f"   - {text.strip()}")
    
    # 获取所有链接
    print("\n3. 检查所有链接:")
    links = page.locator('a')
    for i in range(links.count()):
        text = links.nth(i).text_content()
        href = links.nth(i).get_attribute('href')
        if text and text.strip():
            print(f"   - {text.strip()}: {href}")
    
    # 获取主要区域
    print("\n4. 检查主要区域ID:")
    sections = page.locator('[id]')
    for i in range(sections.count()):
        id_attr = sections.nth(i).get_attribute('id')
        if id_attr and 'schedule' in id_attr.lower():
            print(f"   - #{id_attr}")
    
    # 截图
    page.screenshot(path='train-detail-page-full.png')
    print("\n   截图已保存: train-detail-page-full.png")
    
    # 保持浏览器打开
    time.sleep(10)
    
    browser.close()