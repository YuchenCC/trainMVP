#!/usr/bin/env python3
"""检查Joyride tooltip的DOM结构"""
from playwright.sync_api import sync_playwright
import time

BASE_URL = "http://localhost:5173"

with sync_playwright() as p:
    browser = p.chromium.launch(headless=False)
    context = browser.new_context(viewport={'width': 1920, 'height': 1080})
    page = context.new_page()
    
    print("=" * 60)
    print("检查Joyride tooltip的DOM结构")
    print("=" * 60)
    
    # 登录
    page.goto(f'{BASE_URL}/login', timeout=10000)
    page.wait_for_load_state('domcontentloaded')
    page.fill('input[placeholder="用户名"]', 'puhuiqianduan_ba')
    page.fill('input[placeholder="密码"]', '123456')
    page.click('button:has-text("登 录")')
    page.wait_for_url('**/dashboard', timeout=10000)
    
    # 处理模态框
    time.sleep(2)
    page.keyboard.press('Escape')
    time.sleep(1)
    page.reload()
    page.wait_for_load_state('domcontentloaded')
    time.sleep(3)
    
    # 清除localStorage
    page.evaluate('localStorage.removeItem("tour-progress")')
    
    # 导航到班次详情页
    train_id = 'cmpqrlvz80002zbsxqb85tfbv'
    schedule_id = 'cmpqtafju000hzbsxe3vp04t2'
    page.goto(f'{BASE_URL}/trains/{train_id}/schedules/{schedule_id}')
    page.wait_for_load_state('domcontentloaded')
    time.sleep(3)
    
    # 等待导览
    print("\n等待导览启动...")
    time.sleep(3)
    
    # 获取tooltip的HTML
    tooltip = page.locator('.react-joyride__tooltip')
    if tooltip.count() > 0:
        html = tooltip.inner_html()
        print("\nTooltip HTML:")
        print("-" * 80)
        print(html[:1000])  # 只显示前1000字符
        
        # 获取所有按钮
        print("\n\n所有按钮:")
        buttons = tooltip.locator('button')
        for i in range(buttons.count()):
            btn = buttons.nth(i)
            text = btn.text_content()
            html_attr = btn.inner_html()
            print(f"   按钮{i}:")
            print(f"      文本: '{text}'")
            print(f"      HTML: '{html_attr[:100]}'")
        
        # 获取所有元素的class
        print("\n\n所有元素的class:")
        elements = tooltip.locator('*')
        classes = set()
        for i in range(min(elements.count(), 30)):
            el = elements.nth(i)
            cls = el.get_attribute('class')
            if cls:
                classes.add(cls)
        
        for cls in sorted(classes):
            print(f"   - {cls}")
    
    # 截图
    page.screenshot(path='tooltip-structure.png')
    print("\n截图已保存: tooltip-structure.png")
    
    # 保持浏览器打开
    time.sleep(10)
    
    browser.close()