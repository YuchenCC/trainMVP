from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()
    
    # 访问登录页
    print("1. 访问登录页...")
    page.goto('http://localhost:5173/login')
    page.wait_for_load_state('networkidle')
    
    # 获取页面内容
    content = page.content()
    print(f"\n页面内容长度: {len(content)} 字符")
    
    # 查找登录表单
    print("\n查找登录相关元素：")
    
    # 查找所有文本包含"登录"或"登录"的元素
    elements = page.query_selector_all('*')
    login_elements = []
    for el in elements:
        text = el.inner_text()
        if text and ('登录' in text or 'login' in text.lower()):
            login_elements.append({
                'tag': el.tag_name,
                'text': text[:50],
                'class': el.get_attribute('class')
            })
    
    print(f"找到 {len(login_elements)} 个包含'登录'的元素：")
    for i, el in enumerate(login_elements[:10]):
        print(f"  {i+1}. <{el['tag']}> {el['text']} (class: {el['class']})")
    
    # 截图
    page.screenshot(path='/tmp/login_page_detailed.png', full_page=True)
    print("\n✅ 已保存: /tmp/login_page_detailed.png")
    
    browser.close()
