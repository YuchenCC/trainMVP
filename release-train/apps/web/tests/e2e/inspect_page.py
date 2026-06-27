from playwright.sync_api import sync_playwright

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        
        print("=== Step 1: 访问登录页 ===")
        page.goto('http://localhost:5173/login')
        page.wait_for_load_state('networkidle')
        print(f"URL: {page.url}")
        print(f"Title: {page.title()}")
        
        # 截图
        page.screenshot(path='/tmp/e2e-login.png', full_page=True)
        print("截图已保存: /tmp/e2e-login.png")
        
        # 查找所有按钮和输入框
        buttons = page.locator('button').all()
        inputs = page.locator('input').all()
        links = page.locator('a').all()
        
        print(f"\n=== 页面元素 ===")
        print(f"按钮数量: {len(buttons)}")
        for i, btn in enumerate(buttons):
            try:
                text = btn.text_content().strip() if btn.text_content() else ''
                aria_label = btn.get_attribute('aria-label') or ''
                print(f"  Button {i}: text='{text[:50]}', aria-label='{aria_label[:50]}'")
            except:
                pass
        
        print(f"\n输入框数量: {len(inputs)}")
        for i, inp in enumerate(inputs):
            try:
                placeholder = inp.get_attribute('placeholder') or ''
                label = inp.get_attribute('aria-label') or ''
                print(f"  Input {i}: placeholder='{placeholder}', aria-label='{label}'")
            except:
                pass
        
        print(f"\n链接数量: {len(links)}")
        for i, link in enumerate(links[:10]):
            try:
                text = link.text_content().strip() if link.text_content() else ''
                href = link.get_attribute('href') or ''
                print(f"  Link {i}: text='{text[:50]}', href='{href[:50]}'")
            except:
                pass
        
        # 尝试登录
        print("\n=== Step 2: 尝试登录 ===")
        try:
            page.fill('input[placeholder="用户名"]', 'ba')
            page.fill('input[placeholder="密码"]', 'BAPass123!')
            page.click('button.ant-btn-primary')
            page.wait_for_load_state('networkidle', timeout=10000)
            print(f"登录后 URL: {page.url}")
            page.screenshot(path='/tmp/e2e-after-login.png', full_page=True)
            print("截图已保存: /tmp/e2e-after-login.png")
            
            # 查看登录后的页面结构
            buttons = page.locator('button').all()
            print(f"\n登录后按钮数量: {len(buttons)}")
            for i, btn in enumerate(buttons[:15]):
                try:
                    text = btn.text_content().strip() if btn.text_content() else ''
                    aria_label = btn.get_attribute('aria-label') or ''
                    class_name = btn.get_attribute('class') or ''
                    print(f"  Button {i}: text='{text[:50]}', aria-label='{aria_label[:50]}', class='{class_name[:50]}'")
                except:
                    pass
            
            # 查找导航链接
            nav_items = page.locator('.ant-menu-item').all()
            print(f"\n导航菜单项: {len(nav_items)}")
            for i, item in enumerate(nav_items):
                try:
                    text = item.text_content().strip() if item.text_content() else ''
                    print(f"  Nav {i}: text='{text[:50]}'")
                except:
                    pass
            
        except Exception as e:
            print(f"登录失败: {e}")
        
        browser.close()

if __name__ == '__main__':
    main()