from playwright.sync_api import sync_playwright

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        
        print("=== Step 1: 登录 ===")
        page.goto('http://localhost:5173/login')
        page.wait_for_load_state('networkidle')
        
        page.fill('input[placeholder="用户名"]', 'ba')
        page.fill('input[placeholder="密码"]', 'BAPass123!')
        page.click('button.ant-btn-primary')
        page.wait_for_load_state('networkidle')
        print(f"登录后 URL: {page.url}")
        
        # 如果还在登录页，说明登录失败
        if '/login' in page.url:
            print("登录失败！检查用户名密码")
            browser.close()
            return
        
        # 关闭欢迎弹窗
        close_btns = page.locator('.ant-modal-close').all()
        if len(close_btns) > 0:
            close_btns[0].click()
            print("已关闭弹窗")
            page.wait_for_load_state('networkidle')
        
        print("\n=== Step 2: 进入需求池 ===")
        page.click('text=需求池')
        page.wait_for_load_state('networkidle')
        print(f"需求池 URL: {page.url}")
        page.screenshot(path='/tmp/e2e-requirements.png', full_page=True)
        print("截图已保存: /tmp/e2e-requirements.png")
        
        buttons = page.locator('button').all()
        print(f"\n需求池页面按钮数量: {len(buttons)}")
        for i, btn in enumerate(buttons[:20]):
            try:
                text = btn.text_content().strip() if btn.text_content() else ''
                aria_label = btn.get_attribute('aria-label') or ''
                class_name = btn.get_attribute('class') or ''
                print(f"  Button {i}: text='{text[:60]}', aria-label='{aria_label[:30]}', class='{class_name[:30]}'")
            except:
                pass
        
        print("\n=== Step 3: 点击新增需求 ===")
        try:
            add_btn = page.locator('button', has_text='新增需求')
            if add_btn.count() > 0:
                add_btn.first.click()
                page.wait_for_load_state('networkidle')
                print(f"新增需求 URL: {page.url}")
                page.screenshot(path='/tmp/e2e-new-requirement.png', full_page=True)
                print("截图已保存: /tmp/e2e-new-requirement.png")
                
                inputs = page.locator('input').all()
                textareas = page.locator('textarea').all()
                
                print(f"\n新增需求页面输入框: {len(inputs)}")
                for i, inp in enumerate(inputs):
                    try:
                        placeholder = inp.get_attribute('placeholder') or ''
                        label = inp.get_attribute('aria-label') or ''
                        name = inp.get_attribute('name') or ''
                        print(f"  Input {i}: placeholder='{placeholder[:40]}', aria-label='{label[:30]}', name='{name[:30]}'")
                    except:
                        pass
                
                print(f"\n新增需求页面文本域: {len(textareas)}")
                for i, ta in enumerate(textareas):
                    try:
                        placeholder = ta.get_attribute('placeholder') or ''
                        label = ta.get_attribute('aria-label') or ''
                        print(f"  Textarea {i}: placeholder='{placeholder[:40]}', aria-label='{label[:30]}'")
                    except:
                        pass
                
                submit_btns = page.locator('button', has_text='提交')
                print(f"\n提交按钮数量: {submit_btns.count()}")
                
            else:
                print("未找到'新增需求'按钮")
        except Exception as e:
            print(f"进入新增需求页面失败: {e}")
        
        browser.close()

if __name__ == '__main__':
    main()