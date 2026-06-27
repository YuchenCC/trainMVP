from playwright.sync_api import sync_playwright

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()
        
        print("=== Step 1: 访问登录页 ===")
        page.goto('http://localhost:5173/login')
        page.wait_for_load_state('networkidle')
        
        print("\n=== Step 2: 填写表单并登录 ===")
        page.fill('input[placeholder="用户名"]', 'ba')
        page.fill('input[placeholder="密码"]', 'BAPass123!')
        page.click('button.ant-btn-primary')
        
        # 等待响应
        import time
        time.sleep(3)
        
        print(f"\n登录后 URL: {page.url}")
        
        # 执行 JavaScript 检查状态
        result = page.evaluate('''() => {
            try {
                const token = localStorage.getItem('token');
                const user = localStorage.getItem('user');
                return {
                    tokenExists: !!token,
                    tokenLength: token ? token.length : 0,
                    userExists: !!user,
                    url: window.location.href,
                    pathname: window.location.pathname
                };
            } catch (e) {
                return { error: e.message };
            }
        }''')
        
        print(f"\nLocalStorage 状态:")
        print(f"  token存在: {result.get('tokenExists')}")
        print(f"  token长度: {result.get('tokenLength')}")
        print(f"  user存在: {result.get('userExists')}")
        print(f"  当前路径: {result.get('pathname')}")
        
        # 手动跳转
        if result.get('tokenExists'):
            print("\n=== Step 3: 手动跳转 ===")
            page.goto('http://localhost:5173/dashboard')
            page.wait_for_load_state('networkidle')
            print(f"跳转后 URL: {page.url}")
            
            # 检查页面内容
            buttons = page.locator('button').all()
            print(f"\n仪表盘页面按钮数量: {len(buttons)}")
            for i, btn in enumerate(buttons[:10]):
                try:
                    text = btn.text_content().strip() if btn.text_content() else ''
                    print(f"  Button {i}: text='{text[:50]}'")
                except:
                    pass
        
        browser.close()

if __name__ == '__main__':
    main()