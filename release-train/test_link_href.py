#!/usr/bin/env python3
"""检查链接href"""
from playwright.sync_api import sync_playwright
import time

BASE_URL = "http://localhost:5173"

with sync_playwright() as p:
    browser = p.chromium.launch(headless=False)
    context = browser.new_context(viewport={'width': 1920, 'height': 1080})
    page = context.new_page()
    
    print("=" * 60)
    print("检查链接href")
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
    page.reload()
    page.wait_for_load_state('domcontentloaded')
    time.sleep(2)
    
    # 跳转到版本火车页面
    page.goto(f'{BASE_URL}/trains')
    page.wait_for_load_state('domcontentloaded')
    time.sleep(3)
    
    # 检查所有链接
    print("\n检查表格中的所有链接:")
    table_links = page.locator('table a')
    for i in range(table_links.count()):
        link = table_links.nth(i)
        text = link.text_content()
        href = link.get_attribute('href')
        onclick = link.get_attribute('onclick')
        style = link.get_attribute('style')
        print(f"\n{i+1}. 文本: {text}")
        print(f"   href: {href}")
        print(f"   onclick: {onclick}")
        print(f"   style: {style}")
    
    # 检查表格行的完整HTML
    print("\n\n检查表格行HTML:")
    rows = page.locator('table tbody tr')
    for i in range(rows.count()):
        row_text = rows.nth(i).inner_text()
        print(f"\n第 {i+1} 行文本: {row_text[:200]}...")
    
    # 截图
    page.screenshot(path='trains-table.png')
    print("\n截图已保存: trains-table.png")
    
    # 保持浏览器打开
    time.sleep(10)
    
    browser.close()