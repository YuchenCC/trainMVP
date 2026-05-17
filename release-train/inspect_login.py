from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()
    
    # 访问登录页
    print("1. 访问登录页...")
    page.goto('http://localhost:5175/login')
    page.wait_for_load_state('networkidle')
    
    # 获取所有 input 字段
    print("\n页面中的所有 input 字段：")
    inputs = page.query_selector_all('input')
    for i, input_field in enumerate(inputs):
        input_type = input_field.get_attribute('type')
        input_name = input_field.get_attribute('name')
        input_id = input_field.get_attribute('id')
        input_placeholder = input_field.get_attribute('placeholder')
        print(f"  {i+1}. type={input_type}, name={input_name}, id={input_id}, placeholder={input_placeholder}")
    
    # 截图
    page.screenshot(path='/tmp/login_page.png', full_page=True)
    print("\n✅ 已保存: /tmp/login_page.png")
    
    browser.close()
