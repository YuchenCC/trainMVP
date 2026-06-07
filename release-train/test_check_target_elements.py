#!/usr/bin/env python3
"""检查班次详情页的target元素"""
from playwright.sync_api import sync_playwright
import time

BASE_URL = "http://localhost:5173"

with sync_playwright() as p:
    browser = p.chromium.launch(headless=False)
    context = browser.new_context(viewport={'width': 1920, 'height': 1080})
    page = context.new_page()
    
    print("=" * 60)
    print("检查班次详情页的target元素")
    print("=" * 60)
    
    # 登录
    page.goto(f'{BASE_URL}/login', timeout=10000)
    page.wait_for_load_state('domcontentloaded')
    page.fill('input[placeholder="用户名"]', 'puhuiqianduan_ba')
    page.fill('input[placeholder="密码"]', '123456')
    page.click('button:has-text("登 录")')
    page.wait_for_url('**/dashboard', timeout=10000)
    
    # 清除localStorage
    page.evaluate('localStorage.removeItem("tour-progress")')
    
    # 导航到班次详情页
    train_id = 'cmpqrlvz80002zbsxqb85tfbv'
    schedule_id = 'cmpqtafju000hzbsxe3vp04t2'
    page.goto(f'{BASE_URL}/trains/{train_id}/schedules/{schedule_id}')
    page.wait_for_load_state('domcontentloaded')
    time.sleep(3)
    
    # 检查target元素
    targets = [
        '#main-navigation',
        '#schedule-detail-actions',
        '#schedule-detail-info',
        '#schedule-detail-capacity',
        '#schedule-detail-systems',
        '#schedule-detail-key-dates',
        '#schedule-detail-onboard',
    ]
    
    print("\n检查target元素:")
    for target in targets:
        element = page.locator(target)
        count = element.count()
        if count > 0:
            # 检查元素是否可见
            is_visible = element.first.is_visible()
            print(f"   ✓ {target}: 存在 (可见: {is_visible})")
            if not is_visible:
                # 获取元素的textContent
                text = element.first.text_content()
                print(f"     文本: {text[:50] if text else '无'}")
        else:
            print(f"   ✗ {target}: 不存在")
    
    # 检查页面上的所有id
    print("\n页面上的所有id属性:")
    all_ids = page.evaluate("""
        () => {
            const elements = document.querySelectorAll('[id]');
            return Array.from(elements).map(el => ({
                id: el.id,
                tagName: el.tagName,
                visible: el.offsetParent !== null
            }));
        }
    """)
    
    for el in all_ids[:20]:  # 只显示前20个
        print(f"   - #{el['id']} ({el['tagName']}, 可见: {el['visible']})")
    
    # 截图
    page.screenshot(path='schedule-detail-elements.png')
    print("\n   截图已保存: schedule-detail-elements.png")
    
    # 保持浏览器打开
    time.sleep(10)
    
    browser.close()