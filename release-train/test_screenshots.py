from playwright.sync_api import sync_playwright
import time

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()
    
    # 1. 访问登录页
    print("1. 访问登录页...")
    page.goto('http://localhost:5173/login')
    page.wait_for_load_state('networkidle')
    page.screenshot(path='/tmp/01_login.png', full_page=True)
    print("✅ 已保存: /tmp/01_login.png")
    
    # 2. 填写登录信息并登录
    print("2. 填写登录信息...")
    page.fill('input[type="text"]', 'admin')
    page.fill('input[type="password"]', 'admin123')
    page.click('button[type="submit"]')
    page.wait_for_load_state('networkidle')
    time.sleep(2)  # 等待页面加载
    page.screenshot(path='/tmp/02_after_login.png', full_page=True)
    print("✅ 已保存: /tmp/02_after_login.png")
    
    # 3. 截图主页面（应该是班次列表）
    print("3. 班次列表页面（默认页面）...")
    page.screenshot(path='/tmp/03_schedules_list.png', full_page=True)
    print("✅ 已保存: /tmp/03_schedules_list.png")
    
    # 4. 点击"火车列表"按钮
    print("4. 点击火车列表按钮...")
    page.click('text=火车列表')
    page.wait_for_load_state('networkidle')
    time.sleep(1)
    page.screenshot(path='/tmp/04_trains_list.png', full_page=True)
    print("✅ 已保存: /tmp/04_trains_list.png")
    
    # 5. 点击"班次列表"按钮返回
    print("5. 点击班次列表按钮返回...")
    page.click('text=班次列表')
    page.wait_for_load_state('networkidle')
    time.sleep(1)
    page.screenshot(path='/tmp/05_back_to_schedules.png', full_page=True)
    print("✅ 已保存: /tmp/05_back_to_schedules.png")
    
    browser.close()
    print("\n🎉 所有截图已完成！")
    print("截图保存在 /tmp/ 目录下：")
    print("- 01_login.png - 登录页")
    print("- 02_after_login.png - 登录后页面")
    print("- 03_schedules_list.png - 班次列表（默认页面）")
    print("- 04_trains_list.png - 火车列表")
    print("- 05_back_to_schedules.png - 返回后的班次列表")
